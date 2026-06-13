---
name: ts-jsdoc
description: "JSDoc standards for TypeScript. Every export must have `@param`, `@returns`, `@throws`, `@example`. No inline `//` comments explaining what — only why."
trigger: /ts-jsdocs
---

# /ts-jsdocs

JSDoc standards — `@param`, `@returns`, `@throws`, `@example` on every export.

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
