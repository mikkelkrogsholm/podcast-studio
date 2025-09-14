import Database, { type Database as DatabaseType } from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'

// Create or connect to the SQLite database
// Use unique database for each test file to avoid conflicts
const dbName = process.env['NODE_ENV'] === 'test'
  ? `test-${process.pid}-${Date.now()}.db`
  : 'podcast-studio.db'

// Export the database name for cleanup purposes
export const databaseFileName = dbName

const sqlite: DatabaseType = new Database(dbName)

// Only enable WAL mode and foreign keys in development
// CI environment has issues with these settings
if (process.env['NODE_ENV'] !== 'test') {
  // Enable WAL mode for better concurrent access
  sqlite.pragma('journal_mode = WAL')
  
  // Enable foreign key constraints
  sqlite.pragma('foreign_keys = ON')
}

// Create the Drizzle ORM instance
export const db = drizzle(sqlite, { schema })

// Export the raw sqlite connection for migration purposes
export { sqlite }