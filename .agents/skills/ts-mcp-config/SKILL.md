---
name: ts-mcp-config
description: "MCP server for TypeScript tools. Provides ts_typecheck (run tsc), ts_read_skill (read skill docs), ts_list_skills. Config files for OpenCode, Codex, Exocode, Hermes, Gemini."
trigger: /ts-mcp-config
---

# /ts-mcp-config

MCP server for TypeScript coding standards — works with any MCP-compatible AI.

## Tools

| Tool | Description |
|------|-------------|
| `ts_typecheck` | Run `tsc --noEmit`. Returns errors/warnings. |
| `ts_read_skill` | Read a skill file by name (`ts-philosophy`, `ts-patterns`, etc). |
| `ts_list_skills` | List all available skills under `.agents/skills/`. |

## Config Files

MCP server: `npx tsx mcp/server.ts` (stdio transport, `@modelcontextprotocol/sdk`)

### OpenCode — `opencode.json`
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

### Codex — `.codex/config.toml`
```toml
[mcp.ts-helpers]
type = "local"
command = ["npx", "tsx", "mcp/server.ts"]
```

### Exocode — `exocode.json`
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

### Hermes — `hermes.json`
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

### Gemini (gemcli)
```bash
gemcli chat "Run ts_typecheck on the project" --mcp ts-helpers
```

## Files

```
opencode.json           # OpenCode
.codex/config.toml      # Codex
exocode.json            # Exocode
hermes.json             # Hermes
mcp/
├── package.json
└── server.ts
```
