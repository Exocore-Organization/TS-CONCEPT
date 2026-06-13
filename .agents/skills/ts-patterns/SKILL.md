---
name: ts-patterns
description: "TypeScript code patterns: branded types, discriminated unions, `satisfies`, `as const`, `using`, and `unknown`-first design. Examples for every pattern."
trigger: /ts-patterns
---

# /ts-patterns

TypeScript code patterns: branded types, discriminated unions, `satisfies`, `as const`, `using`.

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
// ❌ as
const config = { port: 3000 } as const;
// ✅ satisfies
const config = { port: 3000 } satisfies Record<string, unknown>;
```

### `using` for disposables
```typescript
using file = await openFile("data.json");
using db = await connectDB();
```
