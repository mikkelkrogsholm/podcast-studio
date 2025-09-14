# Testing Gotchas - Local vs CI

## Common Issues When Tests Pass Locally but Fail in CI

### 1. TypeScript Read-Only Properties
**Problem**: `Cannot assign to 'mediaDevices' because it is a read-only property`
**Solution**: Use `Object.defineProperty` instead of direct assignment:
```typescript
// ❌ Wrong
global.navigator.mediaDevices = { ... }

// ✅ Correct
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { ... },
  writable: true,
});
```

### 2. Mixing Test Runners (Vitest vs Playwright)
**Problem**: Vitest tries to run Playwright tests and fails with "Playwright Test did not expect test() to be called here"
**Solution**: Exclude e2e tests from Vitest in `vitest.config.ts`:
```typescript
test: {
  exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/*.spec.ts'],
}
```

### 3. Test Runner Conventions
- **Vitest tests**: Use `.test.ts` extension
- **Playwright E2E tests**: Use `.spec.ts` extension
- Keep them in separate directories (`src/` vs `e2e/`)

### 4. Environment Differences
- CI runs in Ubuntu Linux, local might be macOS/Windows
- File paths are case-sensitive in Linux
- Missing environment variables in CI
- Different Node.js versions

### 5. Debugging CI Failures
```bash
# View failed CI logs
gh pr checks <PR_NUMBER>
gh run view <RUN_ID> --log-failed

# Test locally in similar environment
pnpm typecheck  # Run TypeScript checks
pnpm test       # Run all tests
pnpm lint       # Run linting
```

### 6. Always Test Before Pushing
Run these commands locally before pushing:
```bash
pnpm typecheck && pnpm test && pnpm lint
```

## Project-Specific Setup

This project uses:
- **Unit/Integration tests**: Vitest (in `src/` directories)
- **E2E tests**: Playwright (in `e2e/` directories)
- **API tests**: Vitest (in `apps/api/src/`)
- **Web tests**: Vitest (in `apps/web/src/`)

Never mix test frameworks in the same file or directory!