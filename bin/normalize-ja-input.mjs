#!/usr/bin/env node
import { parseArgs } from "node:util"
import { jaInputPresets, normalizeJaInput, normalizeJaInputWithChanges } from "../dist/index.js"

const command = "normalize-ja-input"
const presets = Object.keys(jaInputPresets).join(", ")

function usageError(message) {
  process.stderr.write(`${command}: ${message}\nRun ${command} --help for usage.\n`)
  process.exitCode = 2
}

function ioError(error) {
  process.stderr.write(`${command}: ${error.message}\n`)
  process.exitCode = 1
}

process.stdout.on("error", ioError)

async function main() {
  let parsed
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        preset: { type: "string" },
        changes: { type: "boolean" },
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

Normalize one text argument or read UTF-8 text from standard input.

  --preset <name>  Use a preset (${presets})
  --changes        Print the result and changes as JSON
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
  const options = preset === undefined ? undefined : jaInputPresets[preset]
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
