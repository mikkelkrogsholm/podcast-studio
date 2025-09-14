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

### 6. Mocking React Context with Vitest
**Problem**: Tests fail with "vi.mocked(...).mockReturnValue is not a function" or type errors
**Solution**:
```typescript
// ❌ Wrong - trying to use external variable in vi.mock
const mockUseLanguage = vi.fn();
vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: mockUseLanguage // Error: can't access before initialization
}));

// ✅ Correct - define mock inline and use vi.mocked in tests
vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({ /* default mock */ }))
}));

// In tests:
import { useLanguage } from '../contexts/LanguageContext';
vi.mocked(useLanguage).mockReturnValueOnce({ /* test-specific mock */ });
```

### 7. TypeScript Strict Checks in Tests
**Problem**: Mock objects fail TypeScript checks due to missing properties
**Solution**: Use `as any` for partial mocks in tests:
```typescript
// ❌ Wrong - TypeScript complains about missing properties
const mockTranslations = {
  transcript: { title: 'Test' }
}; // Error: Missing properties from Translations interface

// ✅ Correct - cast to any for test mocks
const mockTranslations = {
  transcript: { title: 'Test' }
} as any;
```

### 8. Mock Persistence in Nested Components
**Problem**: Child components don't get mocked values (e.g., Transcript renders MessageBlock)
**Solution**: Use `mockReturnValue` instead of `mockReturnValueOnce` for persistent mocks:
```typescript
// ❌ Wrong - only mocks first call
vi.mocked(useLanguage).mockReturnValueOnce({ /* mock */ });

// ✅ Correct - mocks all calls in the test
vi.mocked(useLanguage).mockReturnValue({ /* mock */ });
// Remember to reset after test!
```

### 9. Always Test Before Pushing
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