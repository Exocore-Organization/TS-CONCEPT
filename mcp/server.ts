#!/usr/bin/env tsx
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const server = new Server(
  { name: "ts-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "ts_typecheck",
      description: "Run tsc --noEmit on the project. Returns errors and warnings.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "ts_read_skill",
      description: "Read a skill file from .agents/skills/. Pass subfolder name (e.g. 'ts-philosophy').",
      inputSchema: {
        type: "object",
        properties: {
          skill: {
            type: "string",
            description: "Skill subfolder name (ts-philosophy, ts-patterns, ts-jsdoc, ts-config-tooling, ts-ai-behavior)",
          },
        },
        required: ["skill"],
      },
    },
    {
      name: "ts_list_skills",
      description: "List all available skills under .agents/skills/.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler("tools/call", async (req) => {
  const { name } = req.params;

  if (name === "ts_typecheck") {
    try {
      const out = execSync("npx tsc --noEmit 2>&1 || true", { cwd: root, encoding: "utf-8" });
      return { content: [{ type: "text", text: out || "No type errors." }] };
    } catch {
      return { content: [{ type: "text", text: "tsc command failed." }] };
    }
  }

  if (name === "ts_read_skill") {
    const skill = String(req.params.arguments?.skill ?? "");
    const path = join(root, ".agents", "skills", skill, "SKILL.md");
    try {
      const text = readFileSync(path, "utf-8");
      return { content: [{ type: "text", text }] };
    } catch {
      return { content: [{ type: "text", text: `Skill '${skill}' not found.` }] };
    }
  }

  if (name === "ts_list_skills") {
    const { readdirSync } = await import("node:fs");
    const dirs = readdirSync(join(root, ".agents", "skills"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    return { content: [{ type: "text", text: dirs.join("\n") }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
