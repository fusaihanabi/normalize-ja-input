#!/usr/bin/env node
import { parseArgs, promisify, TextDecoder } from "node:util"
import { jaInputPresets, normalizeJaInput, normalizeJaInputWithChanges } from "../dist/index.js"

const command = "normalize-ja-input"
const presets = Object.keys(jaInputPresets).join(", ")
const writeOutput = promisify(process.stdout.write.bind(process.stdout))
const writeDiagnostic = promisify(process.stderr.write.bind(process.stderr))
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

function reportNormalizationNeeded(message) {
  process.exitCode = 3
  return writeDiagnostic(`${message}\n`)
}

process.stdout.on("error", ioError)
process.stderr.on("error", () => { process.exitCode = 1 })

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
function findFieldRanges(text, fields) {
  const ranges = new Map()
  let nameStart = skipJsonWhitespace(text, skipJsonWhitespace(text, 0) + 1)

  while (text[nameStart] !== "}") {
    const nameEnd = endOfJsonString(text, nameStart)
    const valueStart = skipJsonWhitespace(text, skipJsonWhitespace(text, nameEnd) + 1)
    const valueEnd = endOfJsonValue(text, valueStart)
    const field = JSON.parse(text.slice(nameStart, nameEnd))
    if (fields.has(field)) {
      if (ranges.has(field)) {
        return { error: `contains duplicate field ${JSON.stringify(field)}.` }
      }
      ranges.set(field, [valueStart, valueEnd])
    }
    const separator = skipJsonWhitespace(text, valueEnd)
    if (text[separator] === "}") break
    nameStart = skipJsonWhitespace(text, separator + 1)
  }
  return { ranges }
}

function normalizeJsonlFields(text, fields, { includeChanges, singleField, check }) {
  const { ranges, error } = findFieldRanges(text, fields)
  if (error) return { error }

  for (const field of fields.keys()) {
    const range = ranges.get(field)
    if (!range) {
      return { error: `is missing field ${JSON.stringify(field)}.` }
    }
    if (text[range[0]] !== '"') {
      return { error: `field ${JSON.stringify(field)} must contain a JSON string.` }
    }
  }

  const parts = []
  const changes = []
  const changedFields = []
  let copiedUntil = 0
  // The ranges are in source order, so each offset refers to the unchanged input.
  for (const [field, [start, end]] of ranges) {
    const input = JSON.parse(text.slice(start, end))
    const options = fields.get(field)
    const result = includeChanges
      ? normalizeJaInputWithChanges(input, options)
      : { value: normalizeJaInput(input, options) }
    if (includeChanges) {
      changes.push([field, result.changes])
    }
    if (result.value === input) continue
    if (check) {
      changedFields.push(field)
      continue
    }
    parts.push(text.slice(copiedUntil, start), JSON.stringify(result.value))
    copiedUntil = end
  }

  if (check) return { changedFields }

  const record = parts.join("") + text.slice(copiedUntil)
  if (!includeChanges) return { output: record }

  const reportedChanges = singleField ? changes[0][1] : Object.fromEntries(changes)
  return { output: `{"value":${record},"changes":${JSON.stringify(reportedChanges)}}` }
}

function parseFieldPresets(assignments) {
  const fields = new Map()
  for (const assignment of assignments) {
    const separator = assignment.lastIndexOf("=")
    if (separator === -1) {
      return { error: "Expected --field-preset <name>=<preset>." }
    }

    const field = assignment.slice(0, separator)
    const preset = assignment.slice(separator + 1)
    if (!Object.hasOwn(jaInputPresets, preset)) {
      return { error: `Unknown preset ${JSON.stringify(preset)} for field ${JSON.stringify(field)}. Choose from ${presets}.` }
    }
    if (fields.has(field)) {
      return { error: `Duplicate --field-preset for field ${JSON.stringify(field)}.` }
    }
    fields.set(field, jaInputPresets[preset])
  }
  return { fields }
}

async function normalizeJsonl(input, { options, includeChanges, field, fieldPresets, check }) {
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
  const singleField = field !== undefined
  const fields = singleField ? new Map([[field, options]]) : fieldPresets
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

    if (fields) {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        const option = singleField ? "--field" : "--field-preset"
        usageError(`Line ${lineNumber} must contain a JSON object when using ${option}.`)
        return
      }
      const { output, changedFields, error } = normalizeJsonlFields(text, fields, {
        includeChanges, singleField, check,
      })
      if (error) {
        usageError(`Line ${lineNumber} ${error}`)
        return
      }
      if (check) {
        if (changedFields.length > 0) {
          const label = changedFields.length === 1 ? "field" : "fields"
          const names = changedFields.map(name => JSON.stringify(name)).join(", ")
          await reportNormalizationNeeded(`Line ${lineNumber} needs normalization in ${label} ${names}.`)
        }
      } else {
        await writeOutput(`${output}\n`)
      }
      continue
    }

    if (typeof value !== "string") {
      usageError(`Line ${lineNumber} must contain a JSON string.`)
      return
    }

    if (check) {
      if (normalizeJaInput(value, options) !== value) {
        await reportNormalizationNeeded(`Line ${lineNumber} needs normalization.`)
      }
      continue
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
        check: { type: "boolean" },
        jsonl: { type: "boolean" },
        field: { type: "string" },
        "field-preset": { type: "string", multiple: true },
        help: { type: "boolean" },
      },
    })
  } catch (error) {
    usageError(error.message)
    return
  }

  const { values, positionals } = parsed
  if (values.help) {
    process.stdout.write(`${command} [--preset <name>] [--changes | --check] [--] [text]
${command} [--preset <name>] [--changes | --check] --jsonl [--field <name>]
${command} [--changes | --check] --jsonl --field-preset <name>=<preset> [--field-preset <name>=<preset> ...]

Normalize one text argument or read UTF-8 text from standard input.

  --preset <name>  Use a preset (${presets})
  --changes        Print the result and changes as JSON
  --check          Report required normalization to standard error and exit with 3 if any
  --jsonl          Normalize one JSON record per line from standard input
  --field <name>   Normalize one top-level string field in each JSON object with --jsonl
  --field-preset   Use a preset for each named field with --jsonl (repeatable)
  --help           Show this help
  --               Treat the following text as an argument
`)
    return
  }

  if (values.check && values.changes) {
    usageError("--check cannot be combined with --changes.")
    return
  }

  const { preset, field, "field-preset": fieldPresetArgs } = values
  let fieldPresets
  if (fieldPresetArgs !== undefined) {
    if (!values.jsonl) {
      usageError("--field-preset requires --jsonl.")
      return
    }
    if (field !== undefined || preset !== undefined) {
      usageError("--field-preset cannot be combined with --field or --preset.")
      return
    }
    const { fields, error } = parseFieldPresets(fieldPresetArgs)
    if (error) {
      usageError(error)
      return
    }
    fieldPresets = fields
  }

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
    await normalizeJsonl(process.stdin, {
      options, includeChanges: values.changes, field, fieldPresets, check: values.check,
    })
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
  if (values.check) {
    if (normalizeJaInput(input, options) !== input) {
      await reportNormalizationNeeded("Input needs normalization.")
    }
    return
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
