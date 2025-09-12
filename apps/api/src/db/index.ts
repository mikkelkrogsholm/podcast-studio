import Database, { type Database as DatabaseType } from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'

// Create or connect to the SQLite database
const sqlite: DatabaseType = new Database('podcast-studio.db')

// Enable WAL mode for better concurrent access
sqlite.pragma('journal_mode = WAL')

// Create the Drizzle ORM instance
export const db = drizzle(sqlite, { schema })

// Export the raw sqlite connection for migration purposes
export { sqlite }