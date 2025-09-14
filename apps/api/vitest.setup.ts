import { afterAll } from 'vitest'
import { unlinkSync, rmSync } from 'fs'
import { globSync } from 'glob'
import { join } from 'path'

// We'll get the actual database name from the db module when it's imported

// Clean up test artifacts after all tests complete
afterAll(async () => {
  console.log('Cleaning up test artifacts...')

  // 1. Close database connection and get the database file name
  let dbFileName: string | null = null
  try {
    const { sqlite, databaseFileName } = await import('./src/db/index.js')
    dbFileName = databaseFileName
    sqlite.close()
    console.log('Closed database connection')
  } catch (error) {
    console.error('Failed to close database connection:', error)
  }

  // 2. Delete the test database file for this run
  if (dbFileName) {
    try {
      unlinkSync(dbFileName)
      console.log(`Cleaned up test database: ${dbFileName}`)

      // Also try to delete WAL and SHM files if they exist
      try {
        unlinkSync(`${dbFileName}-wal`)
        unlinkSync(`${dbFileName}-shm`)
      } catch {
        // Ignore if these don't exist
      }
    } catch (error) {
      // Only log if it's not a "file not found" error
      if ((error as any).code !== 'ENOENT') {
        console.error(`Failed to delete test database: ${dbFileName}`, error)
      }
    }
  }

  // 3. Clean up any orphaned test databases (belt and suspenders approach)
  // This handles cases where tests crash without cleanup
  const orphanedDbs = globSync('test-*.db*')
  for (const db of orphanedDbs) {
    try {
      unlinkSync(db)
      console.log(`Cleaned up orphaned database file: ${db}`)
    } catch (error) {
      // Ignore errors for databases that might be in use by other test processes
    }
  }

  // 4. Clean up test session folders
  const testSessionPattern = join(process.cwd(), 'sessions', 'test-*')
  const testSessions = globSync(testSessionPattern)
  for (const sessionDir of testSessions) {
    try {
      rmSync(sessionDir, { recursive: true, force: true })
      console.log(`Cleaned up test session directory: ${sessionDir}`)
    } catch (error) {
      // Ignore errors for directories in use
    }
  }

  console.log('Test cleanup completed')
})