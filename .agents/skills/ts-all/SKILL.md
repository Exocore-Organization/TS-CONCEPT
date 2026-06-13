---
name: ts-all
description: "Complete TypeScript coding standards (2026) — philosophy, patterns, JSDoc, config, tooling, and AI behavior. One skill to load them all."
trigger: /ts-all
---

# /ts-all

Complete TypeScript coding standards — load this once instead of loading each `/ts-*` individually.

## Philosophy

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

## Code Patterns

### Prefer `unknown` over `any`
```typescript
function parse(data: unknown): Result { ... }
```

### Use `as const` for literals
```typescript
const Status = { Active: "active", Inactive: "inactive" } as const;
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

**Rules:**
- `@param` — every parameter, typed in plain English
- `@returns` — always, even for `void` (say "Nothing.")
- `@throws` — document expected errors
- `@example` — one realistic usage with inferred type annotation
- `@deprecated` — with migration path
- No inline comments (`//`) that explain *what* — only *why*

## Config & Tooling

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

## AI Agent Behavior

1. **REJECT** any code containing: `any`, `var`, `as` (type assertions), `namespace`, `Function`, `object` (as type), `enum` (non-const), `require()`.
2. **REQUIRE** JSDoc on every exported symbol — `@param`, `@returns`, `@throws`, `@example`.
3. **ENFORCE** typed function signatures and branded types for domain primitives.
4. **PREFER** discriminated unions over class hierarchies, pure functions over methods, `as const` over enums, `satisfies` over type assertions.
5. **VERIFY** with `npx tsc --noEmit` before considering work complete.
