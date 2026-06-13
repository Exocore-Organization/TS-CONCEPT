# Exocore

**Modern TypeScript monorepo** — built with 2026 standards, zero legacy patterns.

## Stack

| Layer | Tool |
|-------|------|
| Runtime | [tsx](https://www.npmjs.com/package/tsx) (ESM) |
| Compiler | TypeScript `tsc` — `target: esnext`, `strict: true` |
| Types | `@types/node` |
| Module | ESM (`"type": "module"`) |

## Quick Start

```bash
npm install
npm run dev        # tsx watch
npm run build      # tsc
npm run typecheck  # tsc --noEmit
```

## Coding Standards

See [SKILLS.md](./SKILLS.md) for the full coding guide — rules for TypeScript, JSDoc, and project conventions that both humans and AI agents follow.

## Philosophy

- **No `any`** — every type is known at compile time.
- **No `var`** — `const` / `let` only.
- **No legacy patterns** — class-based OOP is out; pure functions, discriminated unions, and branded types are in.
- **JSDoc on every export** — AI agents and humans alike rely on clear docstrings.
- **2026 idioms** — `using`, `namespace`-free, `satisfies`, `as const` everywhere.
