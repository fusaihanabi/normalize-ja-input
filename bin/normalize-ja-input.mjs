#!/usr/bin/env node
import { parseArgs, promisify, TextDecoder } from "node:util"
import { jaInputPresets, normalizeJaInput, normalizeJaInputWithChanges } from "../dist/index.js"

const command = "normalize-ja-input"
const presets = Object.keys(jaInputPresets).join(", ")
const writeOutput = promisify(process.stdout.write.bind(process.stdout))
const jsonWhitespace = /[ \t\r\n]/

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

function skipJsonWhitespace(text, index) {
  while (index < text.length && jsonWhitespace.test(text[index])) index += 1
  return index
}

function endOfJsonString(text, start) {
  let index = start + 1
  while (text[index] !== '"') {
    index += text[index] === "\\" ? 2 : 1
  }
  return index + 1
}

function endOfJsonValue(text, start) {
  let depth = 0
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"') {
      index = endOfJsonString(text, index) - 1
    } else if (char === "{" || char === "[") {
      depth += 1
    } else if (depth === 0 && (char === "," || char === "}" || jsonWhitespace.test(char))) {
      return index
    } else if (char === "}" || char === "]") {
      depth -= 1
    }
  }
  return text.length
}

// JSON.parse has already validated the record. Walk its top-level members
// to recover the original offsets without serializing the other values.
function findFieldRanges(text, field) {
  const ranges = []
  let nameStart = skipJsonWhitespace(text, skipJsonWhitespace(text, 0) + 1)

  while (text[nameStart] !== "}") {
    const nameEnd = endOfJsonString(text, nameStart)
    const valueStart = skipJsonWhitespace(text, skipJsonWhitespace(text, nameEnd) + 1)
    const valueEnd = endOfJsonValue(text, valueStart)
    if (JSON.parse(text.slice(nameStart, nameEnd)) === field) {
      ranges.push([valueStart, valueEnd])
      if (ranges.length === 2) break
    }
    const separator = skipJsonWhitespace(text, valueEnd)
    if (text[separator] === "}") break
    nameStart = skipJsonWhitespace(text, separator + 1)
  }
  return ranges
}

function normalizeJsonlField(text, field, options, includeChanges) {
  const ranges = findFieldRanges(text, field)
  if (ranges.length === 0) {
    return { error: `is missing field ${JSON.stringify(field)}.` }
  }
  if (ranges.length > 1) {
    return { error: `contains duplicate field ${JSON.stringify(field)}.` }
  }

  const [[start, end]] = ranges
  if (text[start] !== '"') {
    return { error: `field ${JSON.stringify(field)} must contain a JSON string.` }
  }
  const input = JSON.parse(text.slice(start, end))
  const result = includeChanges
    ? normalizeJaInputWithChanges(input, options)
    : { value: normalizeJaInput(input, options) }
  const record = result.value === input
    ? text
    : text.slice(0, start) + JSON.stringify(result.value) + text.slice(end)
  const output = includeChanges
    ? `{"value":${record},"changes":${JSON.stringify(result.changes)}}`
    : record
  return { output }
}

async function normalizeJsonl(input, options, includeChanges, field) {
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
  let lineNumber = 0

  for await (const line of readLines(input)) {
    lineNumber += 1
    let text
    try {
      text = decoder.decode(line).replace(/\r$/, "")
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

    if (field !== undefined) {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        usageError(`Line ${lineNumber} must contain a JSON object when using --field.`)
        return
      }
      const { output, error } = normalizeJsonlField(text, field, options, includeChanges)
      if (error) {
        usageError(`Line ${lineNumber} ${error}`)
        return
      }
      await writeOutput(`${output}\n`)
      continue
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
        field: { type: "string" },
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
${command} [--preset <name>] [--changes] --jsonl [--field <name>]

Normalize one text argument or read UTF-8 text from standard input.

  --preset <name>  Use a preset (${presets})
  --changes        Print the result and changes as JSON
  --jsonl          Normalize one JSON record per line from standard input
  --field <name>   Normalize one top-level string field in each JSON object with --jsonl
  --help           Show this help
  --               Treat the following text as an argument
`)
    return
  }

  const { preset, field } = values
  if (preset !== undefined && !Object.hasOwn(jaInputPresets, preset)) {
    usageError(`Unknown preset "${preset}". Choose from ${presets}.`)
    return
  }
  if (field !== undefined && !values.jsonl) {
    usageError("--field requires --jsonl.")
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
    await normalizeJsonl(process.stdin, options, values.changes, field)
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
