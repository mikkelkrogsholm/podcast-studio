import { sqlite } from './index.js'

// Basic migration: create sessions table
const migrations = [
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    status TEXT DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS audio_files (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    speaker TEXT NOT NULL,
    file_path TEXT NOT NULL,
    size INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0,
    format TEXT DEFAULT 'webm',
    sample_rate INTEGER DEFAULT 48000,
    channels INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions (id)
  )`,
  // Step 5: Add auto-save and crash recovery fields
  `ALTER TABLE sessions ADD COLUMN last_heartbeat INTEGER`,
  `ALTER TABLE sessions ADD COLUMN completed_at INTEGER`,
  // Step 6: Add messages table for transcript persistence
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    speaker TEXT NOT NULL,
    text TEXT NOT NULL,
    ts_ms INTEGER NOT NULL,
    raw_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions (id)
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
      const migration = migrations[i]
      if (migration) {
        sqlite.exec(migration)
      }
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