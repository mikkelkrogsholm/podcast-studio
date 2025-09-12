import { sqlite } from './index.js'

// Basic migration: create sessions table
const migrations = [
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    status TEXT DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`
]

export async function runMigrations(): Promise<void> {
  // Begin transaction
  sqlite.exec('BEGIN')

  try {
    // Get current version
    const currentVersion = getDbVersionSync()
    
    // Apply migrations starting from current version
    for (let i = currentVersion; i < migrations.length; i++) {
      sqlite.exec(migrations[i])
    }
    
    // Update user_version to reflect the latest migration
    if (currentVersion < migrations.length) {
      sqlite.pragma(`user_version = ${migrations.length}`)
    }
    
    sqlite.exec('COMMIT')
  } catch (error) {
    sqlite.exec('ROLLBACK')
    throw error
  }
}

export async function getDbVersion(): Promise<number> {
  return getDbVersionSync()
}

function getDbVersionSync(): number {
  const result = sqlite.pragma('user_version', { simple: true })
  return typeof result === 'number' ? result : 0
}