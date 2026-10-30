// Writes a consistent, compressed copy of the SQLite database and prunes old ones.
const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')
const { pipeline } = require('node:stream/promises')
const sqlite3 = require('sqlite3')

const { DATABASE_PATH, BACKUP_DIR, BACKUP_RETENTION } = process.env
const PREFIX = 'inventory-'
const SUFFIX = '.sqlite.gz'

function open(file) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY, (err) =>
      err ? reject(err) : resolve(db),
    )
  })
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
  })
}

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()))
  })
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const name = `${PREFIX}${stamp}${SUFFIX}`
  const copy = path.join(BACKUP_DIR, `.${stamp}.sqlite`)
  const partial = path.join(BACKUP_DIR, `.${name}`)

  try {
    const source = await open(DATABASE_PATH)
    await get(source, 'VACUUM INTO ?', [copy])
    await close(source)

    const backup = await open(copy)
    const { integrity_check: integrity } = await get(backup, 'PRAGMA integrity_check')
    await close(backup)
    if (integrity !== 'ok') throw new Error(`integrity_check failed: ${integrity}`)

    await pipeline(
      fs.createReadStream(copy),
      zlib.createGzip(),
      fs.createWriteStream(partial, { mode: 0o600 }),
    )
    fs.renameSync(partial, path.join(BACKUP_DIR, name))
  } finally {
    fs.rmSync(copy, { force: true })
    fs.rmSync(partial, { force: true })
  }
  console.log(`created ${name}`)

  // Only reached after a successful backup, so a failing job never removes old copies.
  const backups = fs
    .readdirSync(BACKUP_DIR)
    .filter((file) => file.startsWith(PREFIX) && file.endsWith(SUFFIX))
    .sort()
  for (const file of backups.slice(0, -Number(BACKUP_RETENTION))) {
    fs.rmSync(path.join(BACKUP_DIR, file))
    console.log(`removed ${file}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
