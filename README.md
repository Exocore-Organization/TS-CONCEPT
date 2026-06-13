# Exocore

**TypeScript Coding Standards (2026)** — safe, modern, no legacy.

## For AI Agents

Tell your AI agent to load the standards before coding:

```
/ts-all build a user authentication module
/ts-all refactor this function
/ts-all review this PR
```

Or load individual skills:

```
/ts-philosophy explain why any is banned
/ts-patterns show me branded types
/ts-jsdocs add JSDoc to this file
/ts-config-tooling generate a tsconfig
/ts-ai-behavior review my code
```

The AI will follow all rules: no `any`, no `var`, no legacy patterns, JSDoc on every export, branded types, discriminated unions, `satisfies`, `as const`, and strict TypeScript.

## Quick Start

```bash
npm install
npx tsx src/main.ts     # run
npx tsc --noEmit        # type-check
```

## Stack

| Layer | Tool |
|-------|------|
| Runtime | [tsx](https://www.npmjs.com/package/tsx) (ESM) |
| Compiler | TypeScript `tsc` — `target: esnext`, `strict: true` |
| Types | `@types/node` |
| Module | ESM |

## Philosophy

- **No `any`** — every type is known at compile time.
- **No `var`** — `const` / `let` only.
- **No legacy patterns** — class-based OOP is out; pure functions, discriminated unions, and branded types are in.
- **JSDoc on every export** — AI agents and humans alike rely on clear docstrings.
- **2026 idioms** — `using`, `namespace`-free, `satisfies`, `as const` everywhere.
