// Normalizes CSV exports from real banks into the canonical row shape the
// Transactions importer expects: { Date: 'YYYY-MM-DD', Amount: <signed number
// string, negative = expense>, Merchant, Account, Category, Notes }.
//
// Handles: Monarch (native format, passes through), Chase ("Transaction Date"
// + signed Amount + Type), Bank of America ("Date"/"Description"/"Amount"),
// Amex, Capital One (separate Debit/Credit columns), Mint ("Transaction Type"
// debit/credit with all-positive amounts), and MM/DD/YYYY dates generally.
// Dates MUST come out as YYYY-MM-DD — the forecast engine compares date
// strings lexicographically, so a US-format date would silently corrupt the
// roadmap, not just render oddly.
//
// Known limitation (documented, not guessed at): Discover exports use
// POSITIVE amounts for purchases with no type column; those import as income.
// Better a visible wrong sign the user can fix than a silent heuristic flip.

const strip = (h) => (h || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()

// Ordered alias lists — first header present in the file wins.
const COLUMN_ALIASES = {
  date: ['date', 'transaction date', 'trans date', 'posted date', 'post date', 'posting date'],
  amount: ['amount', 'transaction amount', 'amount usd'],
  debit: ['debit', 'debit amount', 'withdrawals', 'withdrawal amount'],
  credit: ['credit', 'credit amount', 'deposits', 'deposit amount'],
  merchant: ['merchant', 'merchant name', 'description', 'payee', 'name', 'original description'],
  notes: ['original statement', 'original description', 'memo', 'notes', 'extended description'],
  category: ['category'],
  account: ['account', 'account name'],
  type: ['transaction type', 'type'],
}

// Type-column values that mean "money out" (used only to sign positive amounts)
// 'payment' deliberately absent: on card exports a payment is money INTO the
// account (banks export it positive) — flipping it would double-count the spend
const DEBIT_TYPES = new Set(['debit', 'sale', 'purchase', 'withdrawal', 'fee', 'ach debit', 'pos'])

function findColumns (headers) {
  const byStripped = new Map()
  for (const h of headers) {
    const s = strip(h)
    if (s && !byStripped.has(s)) byStripped.set(s, h)
  }
  const cols = {}
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      if (byStripped.has(alias)) { cols[key] = byStripped.get(alias); break }
    }
  }
  // Never let merchant and notes resolve to the same physical column
  if (cols.merchant && cols.notes && cols.merchant === cols.notes) delete cols.notes
  return cols
}

// → 'YYYY-MM-DD' or null. Accepts YYYY-MM-DD (kept), MM/DD/YYYY, M/D/YY (US).
function normalizeDate (raw) {
  const v = (raw || '').trim()
  if (!v) return null
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) {
    let [, mo, dy, yr] = m
    if (yr.length === 2) yr = (parseInt(yr, 10) > 69 ? '19' : '20') + yr
    mo = mo.padStart(2, '0')
    dy = dy.padStart(2, '0')
    if (+mo < 1 || +mo > 12 || +dy < 1 || +dy > 31) return null
    return `${yr}-${mo}-${dy}`
  }
  return null
}

// → signed number or null. Strips $/commas/spaces; (12.34) = negative.
function parseAmount (raw) {
  if (raw === null || raw === undefined) return null
  let v = String(raw).trim()
  if (!v) return null
  let negative = false
  if (/^\(.*\)$/.test(v)) { negative = true; v = v.slice(1, -1) }
  v = v.replace(/[$,\s]/g, '')
  if (v.startsWith('-')) { negative = true; v = v.slice(1) }
  else if (v.startsWith('+')) v = v.slice(1)
  if (!/^\d*\.?\d+$/.test(v)) return null
  const n = parseFloat(v)
  if (isNaN(n)) return null
  return negative ? -n : n
}

/**
 * rows: array of objects from Papa.parse({header:true}).
 * Returns { rows, skipped, detected } where rows are canonical-shape objects.
 * Throws a user-facing Error when no date or amount column can be identified.
 */
export function normalizeCsvRows (rows) {
  if (!rows || rows.length === 0) return { rows: [], skipped: 0, detected: {} }
  const headers = Object.keys(rows[0])
  const cols = findColumns(headers)

  if (!cols.date || (!cols.amount && !cols.debit && !cols.credit)) {
    throw new Error(
      'Could not find date/amount columns in this CSV. Headers seen: ' +
      headers.slice(0, 8).join(', ') +
      '. Expected something like Date + Amount (or Debit/Credit columns).'
    )
  }

  const out = []
  let skipped = 0
  for (const row of rows) {
    const date = normalizeDate(row[cols.date])
    let amount = null
    if (cols.amount) amount = parseAmount(row[cols.amount])
    if (amount === null && (cols.debit || cols.credit)) {
      const debit = cols.debit ? parseAmount(row[cols.debit]) : null
      const credit = cols.credit ? parseAmount(row[cols.credit]) : null
      if (debit !== null && debit !== 0) amount = -Math.abs(debit)
      else if (credit !== null) amount = Math.abs(credit)
    }
    // Sign-only use of the type column: never flip an already-negative amount
    if (amount !== null && amount > 0 && cols.type) {
      const t = strip(row[cols.type])
      if (DEBIT_TYPES.has(t)) amount = -amount
    }
    if (!date || amount === null) { skipped++; continue }
    out.push({
      Date: date,
      Amount: String(amount),
      Merchant: (row[cols.merchant] || '').trim() || null,
      Account: (row[cols.account] || '').trim() || null,
      Category: (row[cols.category] || '').trim() || null,
      Notes: (row[cols.notes] || '').trim() || null,
    })
  }
  return { rows: out, skipped, detected: cols }
}
