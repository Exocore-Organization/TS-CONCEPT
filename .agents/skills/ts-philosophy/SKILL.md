---
name: ts-philosophy
description: "Core TypeScript philosophy — no `any`, no `var`, no legacy patterns. Pure functions, discriminated unions, branded types. JSDoc on every export. 2026 idioms: `using`, `satisfies`, `as const`."
trigger: /ts-philosophy
---

# TypeScript Philosophy (2026)

## Core Principles

- **No `any`** — every type is known at compile time.
- **No `var`** — `const` / `let` only.
- **No legacy patterns** — class-based OOP is out; pure functions, discriminated unions, and branded types are in.
- **JSDoc on every export** — AI agents and humans alike rely on clear docstrings.
- **2026 idioms** — `using`, `namespace`-free, `satisfies`, `as const` everywhere.

## Quick Rules

| ❌ Banned | ✅ Replacement |
|-----------|---------------|
| `any` | `unknown`, generics, branded types |
| `var` | `const` / `let` |
| `as` | `satisfies`, `as const`, branded constructors |
| `namespace` / `module` | ESM imports |
| `Function` type | Explicit callback signatures |
| `enum` (non-const) | `as const` objects + `satisfies` |
| `require()` | ESM `import` / `import()` |
| implicit `any` | Explicit types everywhere |
| inline `//` comments | JSDoc `@param`, `@returns`, `@throws` |
