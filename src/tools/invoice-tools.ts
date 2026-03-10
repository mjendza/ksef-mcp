import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { KsefAuth } from "../ksef/auth.js";
import { KsefInvoices } from "../ksef/invoices.js";

export function registerInvoiceTools(
  server: McpServer,
  auth: KsefAuth,
  invoices: KsefInvoices
): void {
  server.tool(
    "ksef_get_invoice",
    "Fetch a single invoice by its KSeF number. Returns the invoice XML content.",
    {
      ksefNumber: z
        .string()
        .describe("KSeF invoice number (e.g., 1234567890-20240101-ABCDEF123456-78)"),
    },
    async ({ ksefNumber }) => {
      try {
        if (!auth.isAuthenticated()) {
          return {
            content: [{ type: "text" as const, text: "Not authenticated. Call ksef_authenticate first." }],
            isError: true,
          };
        }

        const xml = await invoices.getInvoice(ksefNumber);
        return {
          content: [
            {
              type: "text" as const,
              text: xml,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to get invoice: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "ksef_query_invoices",
    "Search for invoices by criteria: date range, amounts. Returns invoice metadata.",
    {
      subjectType: z
        .enum(["Subject1", "Subject2", "Subject3", "SubjectAuthorized"])
        .describe("Subject1 = invoices issued BY you, Subject2 = invoices issued TO you, Subject3 = third party, SubjectAuthorized = authorized entity"),
      dateFrom: z.string().describe("Start date in YYYY-MM-DD format"),
      dateTo: z.string().describe("End date in YYYY-MM-DD format (max 3 months range)"),
      dateType: z
        .enum(["Issue", "Invoicing", "PermanentStorage"])
        .optional()
        .describe("Filter by issue date, invoicing date, or permanent storage date (default: PermanentStorage)"),
      amountType: z
        .enum(["Brutto", "Netto"])
        .optional()
        .describe("Amount type for filtering (default: Brutto)"),
      amountFrom: z.number().optional().describe("Minimum amount"),
      amountTo: z.number().optional().describe("Maximum amount"),
    },
    async (params) => {
      try {
        if (!auth.isAuthenticated()) {
          return {
            content: [{ type: "text" as const, text: "Not authenticated. Call ksef_authenticate first." }],
            isError: true,
          };
        }

        const result = await invoices.queryInvoices(params);

        const summary = {
          hasMore: result.hasMore,
          isTruncated: result.isTruncated,
          invoiceCount: result.invoices?.length ?? 0,
          invoices: result.invoices?.map((inv) => ({
            ksefNumber: inv.ksefNumber,
            invoiceNumber: inv.invoiceNumber,
            issueDate: inv.issueDate,
            invoicingDate: inv.invoicingDate,
            sellerNip: inv.seller?.nip,
            sellerName: inv.seller?.name,
            buyerIdentifier: inv.buyer?.identifier?.value,
            buyerName: inv.buyer?.name,
            netAmount: inv.netAmount,
            vatAmount: inv.vatAmount,
            grossAmount: inv.grossAmount,
            currency: inv.currency,
            invoiceType: inv.invoiceType,
          })) ?? [],
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to query invoices: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "ksef_session_invoices",
    "List invoices processed in a session.",
    {
      pageSize: z.number().optional().default(10).describe("Number of results per page"),
      pageOffset: z.number().optional().default(0).describe("Page offset"),
    },
    async ({ pageSize, pageOffset }) => {
      try {
        const sessionCtx = auth.getSession();
        if (!sessionCtx) {
          return {
            content: [{ type: "text" as const, text: "No active session. Call ksef_authenticate first." }],
            isError: true,
          };
        }

        const result = await invoices.getSessionInvoices(
          sessionCtx.referenceNumber,
          pageSize,
          pageOffset
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to list session invoices: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
