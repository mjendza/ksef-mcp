import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { KsefAuth } from "../ksef/auth.js";
import { KsefSession } from "../ksef/session.js";
import { KsefInvoices } from "../ksef/invoices.js";
import { registerAuthTools } from "./auth-tools.js";
import { registerInvoiceTools } from "./invoice-tools.js";

export function registerAllTools(
  server: McpServer,
  auth: KsefAuth,
  session: KsefSession,
  invoices: KsefInvoices
): void {
  registerAuthTools(server, auth, session);
  registerInvoiceTools(server, auth, invoices);
}
