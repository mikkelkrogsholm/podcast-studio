# Testing Guide

## Overview
This project uses Test-Driven Development (TDD) with two testing frameworks: Vitest for API unit tests and Playwright for E2E browser tests. Tests ensure code quality and feature functionality across the monorepo.

## Test Types

### API Tests (Vitest)
- **Location**: `apps/api/src/**/*.test.ts` and `apps/api/tests/**/*.test.ts`
- **Purpose**: Test backend endpoints, database operations, and business logic
- **No servers required**: Tests run with in-memory test server

### E2E Tests (Playwright)
- **Location**: `apps/web/e2e/**/*.spec.ts`
- **Purpose**: Test user interactions and full application flow
- **Servers required**: Both API (4201) and Web (4200) must be running

## Running Tests

### Quick Commands

```bash
# Run ALL tests (API + E2E)
pnpm test           # Runs API tests only (no servers needed)
pnpm test:e2e       # Runs E2E tests (requires servers)

# Run specific test suites
pnpm test:api       # API tests only
pnpm test:web       # Web unit tests (if any)
```

### Correct Test Workflow

#### 1. API Tests (No Servers Needed)
```bash
pnpm test:api
```
Expected output:
- ✓ Health endpoint test
- ✓ Token endpoint test  
- ✓ OpenAI smoke test (skips without API key)
- ✓ Database migrations test

#### 2. E2E Tests (Servers Required)

**Step 1: Start both servers**
```bash
# Start both servers in parallel (recommended)
pnpm dev

# OR start individually in separate terminals
pnpm dev:api    # Terminal 1 - API on port 4201
pnpm dev:web    # Terminal 2 - Web on port 4200
```

**Step 2: Run E2E tests**
```bash
pnpm test:e2e
```

Expected output:
- ✓ Homepage shows "App ready"
- ✓ Connect button shows "Connected" status

## Port Configuration

| Service | Port | Command |
|---------|------|---------|
| Web Frontend | 4200 | `pnpm dev:web` |
| API Backend | 4201 | `pnpm dev:api` |

## Test Files

### Key Test Files
- `apps/api/src/server.test.ts` - API server endpoints
- `apps/api/src/db/migrations.test.ts` - Database migrations
- `apps/api/tests/openai.test.ts` - OpenAI connection (@live tag)
- `apps/web/e2e/homepage.spec.ts` - Homepage rendering
- `apps/web/e2e/connection.spec.ts` - WebRTC connection flow

### Test Configuration
- `apps/api/vitest.config.ts` - Vitest configuration
- `apps/web/playwright.config.ts` - Playwright configuration

## Environment Variables

### For Live Tests
```bash
# .env file (not committed)
OPENAI_API_KEY=sk-proj-...
```

Without this key:
- OpenAI smoke test will skip
- Connection will use mock mode
- All other tests still pass

## Common Issues & Solutions

### Issue: E2E tests fail with "ERR_CONNECTION_REFUSED"
**Solution**: Ensure both servers are running on correct ports
```bash
# Check if servers are running
lsof -i :4200 -i :4201

# If not, start them
pnpm dev
```

### Issue: Port already in use
**Solution**: Kill existing processes
```bash
# Kill specific port
lsof -ti :4200 | xargs kill -9
lsof -ti :4201 | xargs kill -9

# Or kill all Node processes
pkill -f node
```

### Issue: Tests timeout
**Solution**: Increase timeout in test files
```typescript
test('my test', async ({ page }) => {
  // test code
}, { timeout: 60000 }); // 60 seconds
```

## CI/CD Considerations

For CI environments:
1. API tests run without any setup
2. E2E tests need both servers running
3. Playwright automatically starts servers if configured in `playwright.config.ts`

## TDD Workflow

1. Write failing test first
2. Run test to confirm it fails
3. Implement minimal code to pass
4. Run test to confirm it passes
5. Refactor if needed
6. Commit when green

## Test Coverage

Currently testing:
- ✅ API health checks
- ✅ Token endpoint authentication
- ✅ OpenAI connectivity (when API key present)
- ✅ Database migrations
- ✅ Homepage rendering
- ✅ WebRTC connection establishment
- ✅ UI status updates

## Debug Mode

### Playwright Debug
```bash
# Run with UI mode
pnpm exec playwright test --ui

# Run with headed browser
pnpm exec playwright test --headed

# Debug specific test
pnpm exec playwright test connection.spec.ts --debug
```

### Vitest Debug
```bash
# Run with UI
pnpm test:ui

# Run in watch mode
cd apps/api && pnpm vitest --watch
```