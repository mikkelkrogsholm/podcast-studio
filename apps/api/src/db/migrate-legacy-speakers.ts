import { db, sqlite } from './index.js'
import { audioFiles, messages } from './schema.js'
import { eq, or } from 'drizzle-orm'
import path from 'path'
import { promises as fs } from 'fs'

async function fileExists(p: string) {
  try { await fs.stat(p); return true } catch { return false }
}

async function renameIfNeeded(oldPath: string, newPath: string) {
  if (oldPath === newPath) return false
  const hasOld = await fileExists(oldPath)
  if (!hasOld) return false
  const hasNew = await fileExists(newPath)
  if (hasNew) return false
  await fs.mkdir(path.dirname(newPath), { recursive: true })
  await fs.rename(oldPath, newPath)
  return true
}

async function run() {
  console.log('Starting legacy speaker migration (mikkel/freja → human/ai)')
  const now = Date.now()

  const legacy = await db.select().from(audioFiles).where(
    or(eq(audioFiles.speaker, 'mikkel'), eq(audioFiles.speaker, 'freja'))
  )

  let filesUpdated = 0
  for (const f of legacy) {
    const canonical = f.speaker === 'mikkel' ? 'human' : 'ai'
    const oldPath = f.filePath
    const newPath = oldPath
      .replace(/mikkel\.wav$/, 'human.wav')
      .replace(/freja\.wav$/, 'ai.wav')

    try {
      await renameIfNeeded(oldPath, newPath)
    } catch (e) {
      console.warn('Rename failed (continuing):', oldPath, '→', newPath, e)
    }

    await db.update(audioFiles)
      .set({ speaker: canonical, filePath: newPath, updatedAt: now })
      .where(eq(audioFiles.id, f.id))
    filesUpdated++
  }

  const msgUpdated = await db.update(messages)
    .set({ speaker: 'human' as any })
    .where(eq(messages.speaker, 'mikkel'))

  const msgUpdated2 = await db.update(messages)
    .set({ speaker: 'ai' as any })
    .where(eq(messages.speaker, 'freja'))

  console.log('Audio files updated:', filesUpdated)
  console.log('Messages updated (mikkel→human):', (msgUpdated as any).changes ?? '')
  console.log('Messages updated (freja→ai):', (msgUpdated2 as any).changes ?? '')
}

run().then(() => {
  // Ensure DB file is flushed
  sqlite.close()
  console.log('Legacy speaker migration completed.')
}).catch(err => {
  console.error('Migration failed', err)
  process.exitCode = 1
})