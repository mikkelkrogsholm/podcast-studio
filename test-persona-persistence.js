// Quick test to verify persona persistence
// To be run in browser console

// Test 1: Save data to localStorage
const testSettings = {
  model: 'gpt-4o-realtime-preview',
  voice: 'alloy',
  temperature: 0.8,
  top_p: 1.0,
  language: 'da-DK',
  silence_ms: 900,
  persona_prompt: 'Du er Freja, vær hjælpsom og nysgerrig.',
  context_prompt: 'Vi diskuterer blockchain teknologi i dag.'
};

localStorage.setItem('podcast-studio-settings', JSON.stringify(testSettings));
console.log('Saved test settings to localStorage');

// Test 2: Read data back
const retrieved = localStorage.getItem('podcast-studio-settings');
console.log('Retrieved settings:', JSON.parse(retrieved));

// Test 3: Check if persona fields are there
const parsed = JSON.parse(retrieved);
console.log('Persona prompt:', parsed.persona_prompt);
console.log('Context prompt:', parsed.context_prompt);