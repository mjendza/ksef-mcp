import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { KsefAuth } from "../ksef/auth.js";
import { KsefSession } from "../ksef/session.js";
import { logger } from "../logger.js";

export function registerAuthTools(
  server: McpServer,
  auth: KsefAuth,
  session: KsefSession
): void {
  server.tool(
    "ksef_authenticate",
    "Authenticate with KSeF 2.0 and obtain access tokens. Must be called before using other KSeF tools.",
    {},
    async () => {
      try {
        const sessionCtx = await auth.authenticate();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  referenceNumber: sessionCtx.referenceNumber,
                  message: "Successfully authenticated with KSeF 2.0. Access token obtained.",
                  logFile: logger.getLogFile(),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error("Authentication failed:", errorMsg);
        if (error instanceof Error && error.stack) {
          logger.error("Stack:", error.stack);
        }
        return {
          content: [
            {
              type: "text" as const,
              text: `Authentication failed: ${errorMsg}\n\nCheck logs at: ${logger.getLogFile()}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "ksef_session_status",
    "Get the status of a KSeF session by its reference number.",
    {},
    async () => {
      try {
        const sessionCtx = auth.getSession();
        if (!sessionCtx) {
          return {
            content: [{ type: "text" as const, text: "No active session. Call ksef_authenticate first." }],
            isError: true,
          };
        }

        const status = await session.getSessionStatus(
          sessionCtx.referenceNumber
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to get session status: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "ksef_terminate_session",
    "Revoke the current KSeF authentication session.",
    {},
    async () => {
      try {
        await auth.terminateSession();
        return {
          content: [
            {
              type: "text" as const,
              text: "Session terminated successfully.",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to terminate session: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
