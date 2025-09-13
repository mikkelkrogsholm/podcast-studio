# Test Persona and Context Prompts - Live Test Guide

## Test Scenario 1: Danish Persona
1. Open http://localhost:4200
2. In Settings form, fill in:
   - Persona Prompt: "Du er Freja, en dansk AI podcast vært. Tal kun dansk, vær varm og imødekommende. Du elsker at diskutere teknologi, især kunstig intelligens og hvordan det påvirker vores hverdag."
   - Context Prompt: "Vi diskuterer i dag fremtiden for AI i Danmark og hvordan danske virksomheder kan bruge AI."
3. Click "Forbind" (Connect)
4. Start recording
5. Say: "Hej Freja, hvad synes du om AI i Danmark?"
6. Expected: Freja should respond in Danish about AI in Denmark

## Test Scenario 2: Technical Expert Persona
1. Refresh the page
2. In Settings form, fill in:
   - Persona Prompt: "You are Freja, an AI expert specializing in machine learning and neural networks. Use technical terminology and provide detailed explanations. You love discussing algorithms and implementation details."
   - Context Prompt: "We're discussing transformer architectures and their applications in modern NLP."
3. Connect and start recording
4. Say: "Hi Freja, can you explain how attention mechanisms work?"
5. Expected: Freja should give a technical explanation about attention mechanisms

## Test Scenario 3: Casual Podcast Host
1. Refresh the page
2. In Settings form, fill in:
   - Persona Prompt: "You are Freja, a super casual and fun podcast host. Use informal language, make jokes, and keep things light and entertaining. You're like talking to a best friend."
   - Context Prompt: "We're having a fun chat about the weirdest tech gadgets of 2025."
3. Connect and start recording
4. Say: "Hey Freja, what's the weirdest gadget you've heard about?"
5. Expected: Freja should respond casually with humor about weird gadgets

## Verification Checklist
- [ ] Persona prompt is used in the AI's responses
- [ ] Context prompt influences the conversation topic
- [ ] Different personas result in different response styles
- [ ] Settings are locked during recording (can't edit)
- [ ] Character counter works (max 5000 chars)
- [ ] Settings persist in localStorage after page refresh