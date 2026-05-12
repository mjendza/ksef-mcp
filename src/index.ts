#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { KsefClient } from "./ksef/client.js";
import { KsefAuth } from "./ksef/auth.js";
import { KsefSession } from "./ksef/session.js";
import { KsefInvoices } from "./ksef/invoices.js";
import { registerAllTools } from "./tools/index.js";
import { logger } from "./logger.js";

const pkg = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"),
) as { version: string };

async function main(): Promise<void> {
  logger.info("=== KSeF MCP Server Starting ===");
  logger.info(`Log file: ${logger.getLogFile()}`);

  const config = loadConfig();
  logger.info(`Config: env=${config.env}, baseUrl=${config.baseUrl}, nip=${config.nip}`);

  const client = new KsefClient(config);
  const auth = new KsefAuth(client, config);
  const session = new KsefSession(client);
  const invoices = new KsefInvoices(client);

  const server = new McpServer({
    name: "ksef-mcp",
    version: pkg.version,
  });

  registerAllTools(server, auth, session, invoices);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
