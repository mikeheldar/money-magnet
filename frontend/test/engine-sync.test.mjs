// Drift guard: functions/forecast-engine.mjs is a committed copy of the
// frontend engine (Firebase deploy only packages functions/, and the whole
// point of the extraction is ONE engine). If this fails, run
// `npm run sync-engine` in functions/ and commit both files together.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

test('functions/forecast-engine.mjs is byte-identical to the frontend engine', () => {
  const frontend = readFileSync(join(root, 'frontend/src/services/forecast-engine.js'), 'utf8')
  const server = readFileSync(join(root, 'functions/forecast-engine.mjs'), 'utf8')
  assert.equal(server, frontend,
    'engine copies differ — run `npm run sync-engine` in functions/ and commit both')
})
