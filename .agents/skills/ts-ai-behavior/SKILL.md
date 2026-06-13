---
name: ts-ai-behavior
description: "AI agent behavior rules for TypeScript code. REJECT any/var/as. REQUIRE JSDoc. ENFORCE branded types. PREFER discriminated unions, satisfies, as const. VERIFY with tsc."
trigger: /ts-ai-behavior
---

# /ts-ai-behavior

AI agent rules for writing and reviewing TypeScript code.

When writing code or reviewing PRs as an AI agent:

1. **REJECT** any code containing: `any`, `var`, `as` (type assertions), `namespace`, `Function`, `object` (as type), `enum` (non-const), `require()`.
2. **REQUIRE** JSDoc on every exported symbol — `@param`, `@returns`, `@throws`, `@example`.
3. **ENFORCE** typed function signatures and branded types for domain primitives.
4. **PREFER** discriminated unions over class hierarchies, pure functions over methods, `as const` over enums, `satisfies` over type assertions.
5. **VERIFY** with `npx tsc --noEmit` before considering work complete.
