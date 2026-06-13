---
name: ts-config-tooling
description: "TypeScript configuration and tooling: `tsconfig.json` with `esnext`, `strict`, `erasableSyntaxOnly`. Runtime with `tsx`, type-check with `tsc --noEmit`. Project structure."
trigger: /ts-config-tooling
---

# TypeScript Config & Tooling (2026)

## Configuration

```jsonc
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "erasableSyntaxOnly": true
  }
}
```

## Tooling

```bash
npx tsx src/main.ts           # run
npx tsc --noEmit              # type-check
npx eslint src/ --max-warnings=0   # lint
npx prettier --check src/     # format
```

## Project Structure

```
src/
├── main.ts          # entry point (light)
├── types/           # shared types, branded types, guards
├── lib/             # pure functions, utilities
├── api/             # I/O layer (fetch, DB, files)
├── services/        # business logic
└── __tests__/       # co-located tests
```
