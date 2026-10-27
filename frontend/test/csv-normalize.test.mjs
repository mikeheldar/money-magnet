// Tests for the CSV header normalizer (src/services/csv-normalize.js) — the
// front door for ALL transaction data until the Cloud Functions deploy, and
// the guard that keeps US-format dates out of the string-comparing forecast
// engine. The 2026-09-12 fixture checks were ad-hoc and never committed;
// this suite pins the same behaviors for good. Run: npm test.
//
// Same loader as forecast-engine.test.mjs: the frontend package is CJS to
// node, so the ESM module is copied to a temp .mjs — it has zero imports,
// which is the property that keeps this trick (and the module) simple. If
// the loader breaks, someone added an import: stop and rethink, don't patch.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '../src/services/csv-normalize.js'), 'utf8')
const tmp = join(mkdtempSync(join(tmpdir(), 'mm-csv-')), 'csv-normalize.mjs')
writeFileSync(tmp, src)
const { normalizeCsvRows } = await import(pathToFileURL(tmp))

test('Monarch native format passes through byte-equivalent', () => {
  const { rows, skipped, detected } = normalizeCsvRows([
    { Date: '2026-09-15', Merchant: 'Kroger', Category: 'Groceries', Account: 'Checking', Notes: 'weekly', Amount: '-82.45' },
    { Date: '2026-09-16', Merchant: 'Payroll', Category: 'Income', Account: 'Checking', Notes: '', Amount: '2500' },
  ])
  assert.equal(skipped, 0)
  assert.deepEqual(rows[0], { Date: '2026-09-15', Amount: '-82.45', Merchant: 'Kroger', Account: 'Checking', Category: 'Groceries', Notes: 'weekly' })
  assert.deepEqual(rows[1], { Date: '2026-09-16', Amount: '2500', Merchant: 'Payroll', Account: 'Checking', Category: 'Income', Notes: null })
  assert.equal(detected.date, 'Date')
  assert.equal(detected.amount, 'Amount')
})

test('Chase: Transaction Date preferred over Post Date; MM/DD/YYYY normalized', () => {
  const { rows, detected } = normalizeCsvRows([
    { 'Transaction Date': '09/03/2026', 'Post Date': '09/05/2026', Description: 'STARBUCKS', Category: 'Food & Drink', Type: 'Sale', Amount: '-6.75' },
  ])
  assert.equal(detected.date, 'Transaction Date')
  assert.equal(rows[0].Date, '2026-09-03')
  // already-negative amount is never re-flipped by the Type column
  assert.equal(rows[0].Amount, '-6.75')
  assert.equal(rows[0].Merchant, 'STARBUCKS')
})

test('type column signs positive amounts out, but "payment" is deliberately excluded', () => {
  const { rows } = normalizeCsvRows([
    { Date: '09/01/2026', Description: 'AMAZON', Type: 'Sale', Amount: '19.99' },
    { Date: '09/02/2026', Description: 'ATM', Type: 'Withdrawal', Amount: '100.00' },
    { Date: '09/03/2026', Description: 'AUTOPAY', Type: 'Payment', Amount: '450.00' },
    { Date: '09/04/2026', Description: 'REFUND', Type: 'Credit', Amount: '12.00' },
  ])
  assert.equal(rows[0].Amount, '-19.99')  // sale → money out
  assert.equal(rows[1].Amount, '-100')    // withdrawal → money out
  assert.equal(rows[2].Amount, '450')     // payment = money INTO the account, never flipped
  assert.equal(rows[3].Amount, '12')      // credit stays in
})

test('Capital One split Debit/Credit columns → signed amounts', () => {
  const { rows, skipped, detected } = normalizeCsvRows([
    { 'Transaction Date': '2026-09-10', 'Posted Date': '2026-09-11', Description: 'TARGET', Debit: '54.20', Credit: '' },
    { 'Transaction Date': '2026-09-12', 'Posted Date': '2026-09-13', Description: 'PAYMENT THANK YOU', Debit: '', Credit: '300.00' },
    { 'Transaction Date': '2026-09-14', 'Posted Date': '2026-09-15', Description: 'ZERO DEBIT', Debit: '0', Credit: '25.00' },
  ])
  assert.equal(skipped, 0)
  assert.ok(detected.debit && detected.credit)
  assert.equal(rows[0].Amount, '-54.2')
  assert.equal(rows[1].Amount, '300')
  assert.equal(rows[2].Amount, '25')  // a 0 debit falls through to the credit column
})

test('Mint: all-positive amounts signed by Transaction Type; description vs original description split', () => {
  const { rows, detected } = normalizeCsvRows([
    { Date: '9/05/2026', Description: 'Spotify', 'Original Description': 'SPOTIFY USA 8777781161', Amount: '11.99', 'Transaction Type': 'debit', Category: 'Music', 'Account Name': 'Visa' },
    { Date: '9/06/2026', Description: 'Paycheck', 'Original Description': 'ACME CORP PAYROLL', Amount: '2100.00', 'Transaction Type': 'credit', Category: 'Income', 'Account Name': 'Checking' },
  ])
  assert.equal(detected.merchant, 'Description')
  assert.equal(detected.notes, 'Original Description')
  assert.equal(detected.account, 'Account Name')
  assert.equal(rows[0].Amount, '-11.99')
  assert.equal(rows[0].Notes, 'SPOTIFY USA 8777781161')
  assert.equal(rows[1].Amount, '2100')
})

test('merchant and notes never resolve to the same physical column', () => {
  const { rows, detected } = normalizeCsvRows([
    { Date: '2026-09-01', 'Original Description': 'DELTA AIR 0062341', Amount: '-412.30' },
  ])
  assert.equal(detected.merchant, 'Original Description')
  assert.equal(detected.notes, undefined)
  assert.equal(rows[0].Merchant, 'DELTA AIR 0062341')
  assert.equal(rows[0].Notes, null)
})

test('amount parsing: $/commas, parens-negative, leading +', () => {
  const { rows } = normalizeCsvRows([
    { Date: '2026-09-01', Description: 'a', Amount: '$1,234.56' },
    { Date: '2026-09-02', Description: 'b', Amount: '(45.00)' },
    { Date: '2026-09-03', Description: 'c', Amount: '+10' },
    { Date: '2026-09-04', Description: 'd', Amount: '-$2,000.10' },
  ])
  assert.deepEqual(rows.map(r => r.Amount), ['1234.56', '-45', '10', '-2000.1'])
})

test('dates: 2-digit years pivot at 69, ISO timestamps keep the day, bad parts rejected', () => {
  const { rows, skipped } = normalizeCsvRows([
    { Date: '1/5/24', Description: 'a', Amount: '1' },
    { Date: '12/31/99', Description: 'b', Amount: '1' },
    { Date: '2026-09-15T10:30:00Z', Description: 'c', Amount: '1' },
    { Date: '13/01/2026', Description: 'bad month', Amount: '1' },
    { Date: 'not a date', Description: 'bad', Amount: '1' },
  ])
  assert.deepEqual(rows.map(r => r.Date), ['2024-01-05', '1999-12-31', '2026-09-15'])
  assert.equal(skipped, 2)
})

test('unparsable rows are counted as skipped, good rows survive', () => {
  const { rows, skipped } = normalizeCsvRows([
    { Date: '2026-09-01', Description: 'good', Amount: '5.00' },
    { Date: '', Description: 'no date', Amount: '5.00' },
    { Date: '2026-09-02', Description: 'no amount', Amount: 'N/A' },
    { Date: '2026-09-03', Description: 'also good', Amount: '(7.25)' },
  ])
  assert.equal(rows.length, 2)
  assert.equal(skipped, 2)
})

test('unrecognizable file throws a friendly error naming the headers seen', () => {
  assert.throws(
    () => normalizeCsvRows([{ Foo: '1', Bar: '2', Baz: '3' }]),
    (err) => err.message.includes('Could not find date/amount columns') &&
             err.message.includes('Foo') && err.message.includes('Bar')
  )
})

test('empty input returns an empty result, no throw', () => {
  assert.deepEqual(normalizeCsvRows([]), { rows: [], skipped: 0, detected: {} })
  assert.deepEqual(normalizeCsvRows(null), { rows: [], skipped: 0, detected: {} })
})

test('fields are trimmed; empty strings become null', () => {
  const { rows } = normalizeCsvRows([
    { Date: '2026-09-01', Description: '  Trader Joes  ', Amount: '-30', Category: '  ', Account: ' Checking ' },
  ])
  assert.equal(rows[0].Merchant, 'Trader Joes')
  assert.equal(rows[0].Category, null)
  assert.equal(rows[0].Account, 'Checking')
})
