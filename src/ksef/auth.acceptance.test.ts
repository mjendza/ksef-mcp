import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { KsefClient } from "./client.js";
import { KsefAuth } from "./auth.js";
import { KsefConfig, KsefEnvironment } from "../config.js";

/**
 * KSeF 2.0 Authentication Acceptance Tests
 *
 * These tests hit the REAL KSeF API. They require environment variables:
 *   KSEF_NIP   - Polish NIP number
 *   KSEF_TOKEN - KSeF authorization token
 *   KSEF_ENV   - "test", "demo", or "prod" (defaults to "test")
 *
 * Run: KSEF_NIP=... KSEF_TOKEN=... npx vitest run src/ksef/auth.acceptance.test.ts
 */

const BASE_URLS: Record<KsefEnvironment, string> = {
  test: "https://api-test.ksef.mf.gov.pl/v2",
  demo: "https://api-demo.ksef.mf.gov.pl/v2",
  prod: "https://api.ksef.mf.gov.pl/v2",
};

function getConfig(): KsefConfig {
  const nip = process.env.KSEF_NIP||"";
  const token = process.env.KSEF_TOKEN||"";
  const env = (process.env.KSEF_ENV || "prod") as KsefEnvironment;

  if (!nip || !token) {
    throw new Error(
      "KSEF_NIP and KSEF_TOKEN environment variables are required for acceptance tests"
    );
  }

  return {
    nip,
    token,
    env,
    baseUrl: process.env.KSEF_BASE_URL || BASE_URLS[env],
  };
}

const canRun = true;

describe.skipIf(!canRun)("KSeF 2.0 Authentication - Acceptance Tests", () => {
  let config: KsefConfig;
  let client: KsefClient;
  let auth: KsefAuth;

  beforeAll(() => {
    config = getConfig();
    client = new KsefClient(config);
    auth = new KsefAuth(client, config);
  });

  afterAll(async () => {
    // Clean up: terminate session if active
    if (auth.isAuthenticated()) {
      try {
        await auth.terminateSession();
      } catch {
        // ignore cleanup errors
      }
    }
  });

  it("should fetch auth challenge from KSeF API", async () => {
    const response = await client.post<{
      challenge: string;
      timestamp: string;
      timestampMs: number;
      clientIp: string;
    }>("/auth/challenge");

    expect(response).toBeDefined();
    expect(response.challenge).toBeTypeOf("string");
    expect(response.challenge.length).toBeGreaterThan(0);
    expect(response.timestampMs).toBeTypeOf("number");
    expect(response.timestampMs).toBeGreaterThan(0);
    expect(response.clientIp).toBeTypeOf("string");
  });

  it("should fetch public key certificates", async () => {
    const certs = await client.get<
      Array<{
        certificate: string;
        validFrom: string;
        validTo: string;
        usage: string[];
      }>
    >("/security/public-key-certificates");

    expect(certs).toBeDefined();
    expect(Array.isArray(certs)).toBe(true);
    expect(certs.length).toBeGreaterThan(0);

    // Find encryption key
    const encKey = certs.find((c) =>
      c.usage.includes("KsefTokenEncryption")
    );
    expect(encKey).toBeDefined();
    expect(encKey!.certificate).toBeTypeOf("string");
    expect(encKey!.certificate.length).toBeGreaterThan(100);
  });

  it(
    "should complete full authentication flow (challenge → encrypt → ksef-token → poll → redeem)",
    { timeout: 60_000 },
    async () => {
      const session = await auth.authenticate();

      expect(session).toBeDefined();
      expect(session.accessToken).toBeTypeOf("string");
      expect(session.accessToken.length).toBeGreaterThan(0);
      expect(session.refreshToken).toBeTypeOf("string");
      expect(session.refreshToken.length).toBeGreaterThan(0);
      expect(session.referenceNumber).toBeTypeOf("string");
      expect(session.isActive).toBe(true);
      expect(auth.isAuthenticated()).toBe(true);

      // Verify client has the access token set
      expect(client.getAccessToken()).toBe(session.accessToken);
    }
  );

  it(
    "should terminate the active session",
    { timeout: 60_000 },
    async () => {
      // Ensure we have an active session first
      if (!auth.isAuthenticated()) {
        await auth.authenticate();
      }

      await auth.terminateSession();

      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.getSession()).toBeNull();
      expect(client.getAccessToken()).toBeNull();
    }
  );
});
