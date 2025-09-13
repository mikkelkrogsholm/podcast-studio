#!/usr/bin/env tsx

import { db } from './index.js';
import { messages, audioFiles } from './schema.js';
import { eq } from 'drizzle-orm';

function migrateLegacySpeakers() {
  console.log('Starting legacy speaker migration...');
  
  try {
    // Update messages table
    const messageUpdates = db.transaction((tx) => {
      // Update 'host' to 'mikkel'
      const hostToMikkel = tx
        .update(messages)
        .set({ speaker: 'mikkel' })
        .where(eq(messages.speaker, 'host'))
        .returning()
        .all();
      
      // Update 'ai' to 'freja'
      const aiToFreja = tx
        .update(messages)
        .set({ speaker: 'freja' })
        .where(eq(messages.speaker, 'ai'))
        .returning()
        .all();
      
      return {
        hostToMikkel: hostToMikkel.length,
        aiToFreja: aiToFreja.length
      };
    })();
    
    console.log(`Updated messages table:`);
    console.log(`  - 'host' -> 'mikkel': ${messageUpdates.hostToMikkel} records`);
    console.log(`  - 'ai' -> 'freja': ${messageUpdates.aiToFreja} records`);
    
    // Update audioFiles table
    const audioUpdates = db.transaction((tx) => {
      // Update 'host' to 'mikkel'
      const hostToMikkel = tx
        .update(audioFiles)
        .set({ speaker: 'mikkel' })
        .where(eq(audioFiles.speaker, 'host'))
        .returning()
        .all();
      
      // Update 'ai' to 'freja'
      const aiToFreja = tx
        .update(audioFiles)
        .set({ speaker: 'freja' })
        .where(eq(audioFiles.speaker, 'ai'))
        .returning()
        .all();
      
      return {
        hostToMikkel: hostToMikkel.length,
        aiToFreja: aiToFreja.length
      };
    })();
    
    console.log(`Updated audioFiles table:`);
    console.log(`  - 'host' -> 'mikkel': ${audioUpdates.hostToMikkel} records`);
    console.log(`  - 'ai' -> 'freja': ${audioUpdates.aiToFreja} records`);
    
    console.log('\nMigration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run migration
migrateLegacySpeakers();