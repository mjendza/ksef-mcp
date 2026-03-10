import * as fs from "node:fs";
import * as path from "node:path";

const LOG_FILE = process.env.KSEF_LOG_FILE
  || path.join(process.env.TEMP || process.env.TMP || "/tmp", "ksef-mcp.log");

let logStream: fs.WriteStream | null = null;

function getStream(): fs.WriteStream {
  if (!logStream) {
    logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });
  }
  return logStream;
}

function timestamp(): string {
  return new Date().toISOString();
}

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 2)))
    .join(" ");
}

export const logger = {
  info(...args: unknown[]): void {
    getStream().write(`[${timestamp()}] INFO  ${formatArgs(args)}\n`);
  },
  error(...args: unknown[]): void {
    getStream().write(`[${timestamp()}] ERROR ${formatArgs(args)}\n`);
  },
  debug(...args: unknown[]): void {
    getStream().write(`[${timestamp()}] DEBUG ${formatArgs(args)}\n`);
  },
  getLogFile(): string {
    return LOG_FILE;
  },
};
