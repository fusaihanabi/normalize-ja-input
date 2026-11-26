#!/usr/bin/env node
import { parseArgs, promisify, TextDecoder } from "node:util"
import { jaInputPresets, normalizeJaInput, normalizeJaInputWithChanges } from "../dist/index.js"

const command = "normalize-ja-input"
const presets = Object.keys(jaInputPresets).join(", ")
const writeOutput = promisify(process.stdout.write.bind(process.stdout))

function usageError(message) {
  process.stderr.write(`${command}: ${message}\nRun ${command} --help for usage.\n`)
  process.exitCode = 2
}

function ioError(error) {
  if (process.exitCode !== 1) {
    process.exitCode = 1
    process.stderr.write(`${command}: ${error.message}\n`)
  }
}

process.stdout.on("error", ioError)

async function* readLines(input) {
  const fragments = []
  for await (const chunk of input) {
    let start = 0
    for (let end = chunk.indexOf(0x0a); end !== -1; end = chunk.indexOf(0x0a, start)) {
      fragments.push(chunk.subarray(start, end))
      yield fragments.length === 1 ? fragments[0] : Buffer.concat(fragments)
      fragments.length = 0
      start = end + 1
    }
    if (start < chunk.length) {
      fragments.push(chunk.subarray(start))
    }
  }
  if (fragments.length > 0) {
    yield Buffer.concat(fragments)
  }
}

async function normalizeJsonl(input, options, includeChanges) {
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
  let lineNumber = 0

  for await (const line of readLines(input)) {
    lineNumber += 1
    let text
    try {
      text = decoder.decode(line)
    } catch {
      usageError(`Line ${lineNumber} is not valid UTF-8.`)
      return
    }

    let value
    try {
      value = JSON.parse(text)
    } catch {
      usageError(`Line ${lineNumber} is not valid JSON.`)
      return
    }
    if (typeof value !== "string") {
      usageError(`Line ${lineNumber} must contain a JSON string.`)
      return
    }

    const result = includeChanges
      ? normalizeJaInputWithChanges(value, options)
      : normalizeJaInput(value, options)
    await writeOutput(`${JSON.stringify(result)}\n`)
  }
}

async function main() {
  let parsed
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        preset: { type: "string" },
        changes: { type: "boolean" },
        jsonl: { type: "boolean" },
        help: { type: "boolean" },
      },
    })
  } catch (error) {
    usageError(error.message)
    return
  }

  const { values, positionals } = parsed
  if (values.help) {
    process.stdout.write(`${command} [--preset <name>] [--changes] [--] [text]
${command} [--preset <name>] [--changes] --jsonl

Normalize one text argument or read UTF-8 text from standard input.

  --preset <name>  Use a preset (${presets})
  --changes        Print the result and changes as JSON
  --jsonl          Normalize one JSON string per line from standard input
  --help           Show this help
  --               Treat the following text as an argument
`)
    return
  }

  const { preset } = values
  if (preset !== undefined && !Object.hasOwn(jaInputPresets, preset)) {
    usageError(`Unknown preset "${preset}". Choose from ${presets}.`)
    return
  }
  const options = preset === undefined ? undefined : jaInputPresets[preset]
  if (values.jsonl) {
    if (positionals.length > 0) {
      usageError("--jsonl reads standard input and does not accept a text argument.")
      return
    }
    if (process.stdin.isTTY) {
      usageError("Pipe UTF-8 JSON Lines to standard input when using --jsonl.")
      return
    }
    await normalizeJsonl(process.stdin, options, values.changes)
    return
  }

  if (positionals.length > 1) {
    usageError("Expected at most one text argument.")
    return
  }
  let input = positionals[0]
  if (input === undefined) {
    const { stdin } = process
    if (stdin.isTTY) {
      usageError("Provide a text argument or pipe text to standard input.")
      return
    }
    stdin.setEncoding("utf8")
    input = ""
    for await (const chunk of stdin) {
      input += chunk
    }
  }
  const output = values.changes
    ? `${JSON.stringify(normalizeJaInputWithChanges(input, options))}\n`
    : normalizeJaInput(input, options)
  process.stdout.write(output)
}

try {
  await main()
} catch (error) {
  ioError(error)
}
