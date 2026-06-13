---
name: ts-js-coding-standards
description: "Modern TypeScript/JavaScript coding standards for 2026. Enforces no `any`, no `var`, no legacy patterns. Requires JSDoc on exports, `esnext` target, `tsx` runtime, `@types/node`, and strict TypeScript config. Use for all code reviews, PRs, and new code generation."
trigger: /ts-standards
---

# TypeScript & JSDoc Coding Standards (2026)

**Target:** `esnext` · **Runtime:** `tsx` · **Types:** `@types/node` · **Strictness:** maximum

## Quick Rules

| Rule | Detail |
|------|--------|
| **No `any`** | Use `unknown`, generics, or branded types |
| **No `var`** | `const` / `let` only |
| **No `as`** | Use `satisfies`, `as const`, branded constructors |
| **No `namespace` / `module`** | ESM imports only |
| **No `Function` type** | Explicit callback signatures |
| **No `enum`** (except `const enum`) | `as const` objects + `satisfies` |
| **No `require()`** | ESM `import` / `import()` |
| **No implicit `any`** | Every parameter and export must be typed |
| **JSDoc on exports** | `@param`, `@returns`, `@throws`, `@example` |

## TypeScript Configuration

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

## Code Patterns

### Prefer `unknown` over `any`
```typescript
// ❌
function parse(data: any): Result { ... }

// ✅
function parse(data: unknown): Result { ... }
```

### Use `as const` for literals
```typescript
const Status = {
  Active: "active",
  Inactive: "inactive",
} as const;
type Status = (typeof Status)[keyof typeof Status];
```

### Branded types for domain primitives
```typescript
type UserId = string & { readonly __brand: "UserId" };
function UserId(id: string): UserId {
  if (!/^u_\w{16}$/.test(id)) throw new Error("Invalid UserId");
  return id as UserId;
}
```

### Discriminated unions over inheritance
```typescript
type ApiError =
  | { kind: "network"; status: number }
  | { kind: "auth"; reason: string }
  | { kind: "parse"; errors: string[] };
```

### `satisfies` over `as`
```typescript
// ❌
const config = { port: 3000 } as const;

// ✅
const config = { port: 3000 } satisfies Record<string, unknown>;
```

### `using` for disposables
```typescript
using file = await openFile("data.json");
using db = await connectDB();
```

## JSDoc Standards

Every exported declaration **must** have a JSDoc block.

```typescript
/**
 * Parses a raw API response into a validated `User` object.
 *
 * @param raw - The unvalidated JSON payload from the wire.
 * @returns A `User` with all fields validated.
 * @throws {ValidationError} When `raw` is missing required fields or types mismatch.
 *
 * @example
 * ```ts
 * const user = parseUser(raw);
 * //            ^? User
 * ```
 */
export function parseUser(raw: unknown): User { ... }
```

**JSDoc Rules:**
- `@param` — every parameter, typed in plain English
- `@returns` — always, even for `void` (say "Nothing.")
- `@throws` — document expected errors
- `@example` — one realistic usage with inferred type annotation
- `@deprecated` — with migration path
- No inline comments (`//`) that explain *what* — only *why*

## Project Structure

```
src/
├── main.ts          # entry point (light — delegates to modules)
├── types/           # shared types, branded types, guards
├── lib/             # pure functions, utilities
├── api/             # I/O layer (fetch, DB, files)
├── services/        # business logic
└── __tests__/       # co-located tests
```

## Tooling

```bash
# Run
npx tsx src/main.ts

# Type-check (CI)
npx tsc --noEmit

# Lint
npx eslint src/ --max-warnings=0

# Format
npx prettier --check src/
```

## AI Agent Behavior

When writing code or reviewing PRs as an AI agent:

1. **REJECT** any code containing: `any`, `var`, `as` (type assertions), `namespace`, `Function`, `object` (as type), `enum` (non-const), `require()`.
2. **REQUIRE** JSDoc on every exported symbol — `@param`, `@returns`, `@throws`, `@example`.
3. **ENFORCE** typed function signatures and branded types for domain primitives.
4. **PREFER** discriminated unions over class hierarchies, pure functions over methods, `as const` over enums, `satisfies` over type assertions.
5. **VERIFY** with `npx tsc --noEmit` before considering work complete.
