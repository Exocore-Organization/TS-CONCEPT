---
name: ts-mcp-config
description: "MCP server configuration for TypeScript tools. Provides ts_typecheck (run tsc), ts_read_skill (read skill docs), ts_list_skills (list all skills). Supports OpenCode, Gemini, Codex, Exocode, Hermes, and any MCP-compatible agent."
trigger: /ts-mcp-config
---

# /ts-mcp-config

MCP server for TypeScript coding standards — works with any MCP-compatible AI platform.

## Tools

| Tool | Description |
|------|-------------|
| `ts_typecheck` | Run `tsc --noEmit` on the project. Returns errors/warnings. |
| `ts_read_skill` | Read a skill file by name (e.g. `ts-philosophy`). |
| `ts_list_skills` | List all available skills under `.agents/skills/`. |

## Platform Setup

### OpenCode

Add to `opencode.json`:
```json
{
  "mcp": {
    "ts-helpers": {
      "type": "local",
      "command": ["npx", "tsx", "mcp/server.ts"],
      "enabled": true
    }
  }
}
```

Prompt: `use ts_typecheck to validate the code`

### Gemini (gemini-web-mcp / gemcli)

```bash
gemcli chat "Run ts_typecheck on the project" --mcp ts-helpers
```

### Codex

```json
{
  "mcp": {
    "ts-helpers": {
      "type": "local",
      "command": ["npx", "tsx", "mcp/server.ts"]
    }
  }
}
```

### Exocode / Hermes / others

Same MCP stdio config pattern — point to `npx tsx mcp/server.ts` and the tools become available.

## Files

```
mcp/
├── package.json        # dependencies (@modelcontextprotocol/sdk)
├── server.ts           # MCP server (stdio transport)
opencode.json           # MCP config (OpenCode)
```
