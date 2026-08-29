# Contributing

## Development

Requirements: Node.js 20+ and Git.

```bash
npm ci
npm run check
```

Tests exercise the public CLI against temporary real Git repositories. Prefer a
new observable CLI scenario over mocks of internal functions. Focused domain
tests are appropriate for path classification, risk boundaries, and canonical
serialization.

## Pull requests

1. Explain the user-visible problem before the implementation.
2. Add or update a behavior test.
3. Keep Policy execution direct (`shell: false`) and output bounded.
4. Update `CONTEXT.md` when introducing domain terminology.
5. Run `npm run check` and include the resulting DiffLedger Verdict.

Please keep unrelated changes in separate pull requests.

