---
name: ts-mcp-config
description: "MCP server for TypeScript tools. Use `ts_typecheck` to validate code, `ts_read_skill` to load any skill doc, `ts_list_skills` to see what's available. Compatible with Claude, AGY, Antigravity, OpenCode, Codex, Exocode, Hermes, Gemini."
trigger: /ts-mcp-config
---

# /ts-mcp-config

This project has an MCP server at `mcp/server.ts` that gives you tools to validate TypeScript and read skill documentation. **Use these tools instead of guessing.**

## Available Tools

### `ts_typecheck`
Run `tsc --noEmit` on the project. Use this **before and after** making code changes.

```
When to use:
- Before writing code → check current errors
- After writing code → confirm no new errors
- Before saying "done" → final validation
```

### `ts_read_skill`
Read any skill file from `.agents/skills/`. Pass the subfolder name.

```
ts_read_skill("ts-philosophy")    → coding philosophy & banned patterns
ts_read_skill("ts-patterns")      → branded types, discriminated unions, etc
ts_read_skill("ts-jsdoc")         → JSDoc standards
ts_read_skill("ts-config-tooling") → tsconfig, tooling commands
ts_read_skill("ts-ai-behavior")   → AI agent rules
```

### `ts_list_skills`
List all available skill subfolders. Use this if you're not sure what's here.

## How to Use (All Agents)

Claude, AGY, Antigravity, and any MCP-compatible agent:

1. Call `ts_list_skills` to see available docs
2. Call `ts_read_skill("<name>")` to load the rules
3. Write code following those rules
4. Call `ts_typecheck` to validate
5. If errors, fix and re-run `ts_typecheck`

## Platform Config Files (for reference)

These files exist so the platforms can find the MCP server — **you don't need to read them**:

| File | Platform |
|------|----------|
| `opencode.json` | OpenCode |
| `.codex/config.toml` | Codex |
| `exocode.json` | Exocode |
| `hermes.json` | Hermes |
| `gemcli --mcp ts-helpers` | Gemini |

## Server Details

- **Path:** `mcp/server.ts`
- **Run with:** `npx tsx mcp/server.ts` (stdio transport)
- **Dependency:** `@modelcontextprotocol/sdk`
