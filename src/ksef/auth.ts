import * as crypto from "node:crypto";
import { KsefConfig } from "../config.js";
import { KsefClient } from "./client.js";
import {
  AuthChallengeResponse,
  AuthInitResponse,
  AuthStatusResponse,
  AuthTokensResponse,
  PublicKeyCertificate,
  SessionContext,
} from "./types.js";
import { logger } from "../logger.js";

const AUTH_POLL_INTERVAL_MS = 1000;
const AUTH_POLL_MAX_ATTEMPTS = 30;

export class KsefAuth {
  private client: KsefClient;
  private config: KsefConfig;
  private session: SessionContext | null = null;

  constructor(client: KsefClient, config: KsefConfig) {
    this.client = client;
    this.config = config;
  }

  getSession(): SessionContext | null {
    return this.session;
  }

  async authenticate(): Promise<SessionContext> {
    logger.info("=== KSeF 2.0 Authentication Started ===");
    logger.info(`Environment: ${this.config.env}`);
    logger.info(`Base URL: ${this.config.baseUrl}`);
    logger.info(`NIP: ${this.config.nip}`);
    logger.info(`Token (first 8 chars): ${this.config.token.substring(0, 8)}...`);

    // Step 1: Get auth challenge
    logger.info("Step 1: Requesting auth challenge...");
    const challengeResponse = await this.client.post<AuthChallengeResponse>(
      "/auth/challenge"
    );
    const { challenge, timestampMs } = challengeResponse;
    logger.info(`Step 1 OK: challenge=${challenge}, timestampMs=${timestampMs}`);

    // Step 2: Fetch KSeF public key for token encryption
    logger.info("Step 2: Fetching KSeF public key...");
    const publicKeyPem = await this.fetchPublicKey();
    logger.info(`Step 2 OK: public key length=${publicKeyPem.length}`);

    // Step 3: Encrypt the token with RSA-OAEP
    logger.info("Step 3: Encrypting token with RSA-OAEP...");
    const encryptedToken = this.encryptToken(
      this.config.token,
      timestampMs,
      publicKeyPem
    );
    logger.info(`Step 3 OK: encrypted token length=${encryptedToken.length}`);

    // Step 4: Submit KSeF token auth request (async - returns referenceNumber + authenticationToken)
    logger.info("Step 4: Submitting ksef-token auth request...");
    const initResponse = await this.client.post<AuthInitResponse>(
      "/auth/ksef-token",
      {
        challenge,
        contextIdentifier: {
          type: "Nip",
          value: this.config.nip,
        },
        encryptedToken,
      }
    );
    const { referenceNumber, authenticationToken } = initResponse;
    logger.info(`Step 4 OK: referenceNumber=${referenceNumber}`);

    // Step 5: Poll auth status until success
    logger.info("Step 5: Polling auth status...");
    await this.waitForAuthCompletion(referenceNumber, authenticationToken.token);
    logger.info("Step 5 OK: Authentication completed");

    // Step 6: Redeem tokens (get accessToken + refreshToken)
    logger.info("Step 6: Redeeming access tokens...");
    const tokens = await this.client.post<AuthTokensResponse>(
      "/auth/token/redeem",
      undefined,
      authenticationToken.token
    );
    logger.info(`Step 6 OK: accessToken valid until ${tokens.accessToken.validUntil}`);

    this.client.setAccessToken(tokens.accessToken.token);

    this.session = {
      accessToken: tokens.accessToken.token,
      refreshToken: tokens.refreshToken.token,
      referenceNumber,
      isActive: true,
    };

    logger.info("=== KSeF 2.0 Authentication Completed Successfully ===");
    return this.session;
  }

  private async fetchPublicKey(): Promise<string> {
    logger.debug("Fetching public key from /security/public-key-certificates");
    const certificates = await this.client.get<PublicKeyCertificate[]>(
      "/security/public-key-certificates"
    );

    if (!certificates || certificates.length === 0) {
      logger.error("No public key certificates available");
      throw new Error("No public key certificates available from KSeF");
    }

    // Find key usable for KsefTokenEncryption
    const encryptionKey = certificates.find(
      (cert) => cert.usage.includes("KsefTokenEncryption")
    ) || certificates[0];

    logger.info(`Using public key: usage=${encryptionKey.usage.join(",")}, validTo=${encryptionKey.validTo}`);
    return encryptionKey.certificate;
  }

  private encryptToken(
    token: string,
    timestampMs: number,
    publicKeyCert: string
  ): string {
    // Format: token|timestamp_in_millis
    const plainText = `${token}|${timestampMs}`;
    logger.debug(`Encryption input: <token>|${timestampMs} (length=${plainText.length})`);

    // The KSeF API returns X.509 certificates, not raw public keys.
    // We need to parse the certificate and extract the public key.
    let pem = publicKeyCert.trim();
    if (!pem.startsWith("-----BEGIN")) {
      pem = `-----BEGIN CERTIFICATE-----\n${pem}\n-----END CERTIFICATE-----`;
    }

    // Extract the public key from the X.509 certificate
    const x509 = new crypto.X509Certificate(pem);
    const publicKey = x509.publicKey;
    logger.debug(`Extracted public key from certificate, subject: ${x509.subject}`);

    // Encrypt with RSA-OAEP, SHA-256, MGF1
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(plainText, "utf-8")
    );

    return encrypted.toString("base64");
  }

  private async waitForAuthCompletion(
    referenceNumber: string,
    authenticationToken: string
  ): Promise<void> {
    for (let attempt = 0; attempt < AUTH_POLL_MAX_ATTEMPTS; attempt++) {
      const status = await this.client.get<AuthStatusResponse>(
        `/auth/${referenceNumber}`,
        authenticationToken
      );

      logger.info(`Auth status poll ${attempt + 1}: code=${status.status.code}, desc=${status.status.description}`);

      if (status.status.code === 200) {
        return; // Success
      }

      if (status.status.code >= 400) {
        const details = status.status.details?.join("; ") || status.status.description;
        throw new Error(`Authentication failed (${status.status.code}): ${details}`);
      }

      // Status 100 = in progress, keep polling
      await new Promise((resolve) => setTimeout(resolve, AUTH_POLL_INTERVAL_MS));
    }

    throw new Error(`Authentication timed out after ${AUTH_POLL_MAX_ATTEMPTS} attempts`);
  }

  async refreshAccessToken(): Promise<void> {
    if (!this.session) {
      throw new Error("No active session to refresh");
    }

    logger.info("Refreshing access token...");
    const tokens = await this.client.post<AuthTokensResponse>(
      "/auth/token/refresh",
      undefined,
      this.session.refreshToken
    );

    this.session.accessToken = tokens.accessToken.token;
    this.client.setAccessToken(tokens.accessToken.token);
    logger.info(`Access token refreshed, valid until ${tokens.accessToken.validUntil}`);
  }

  async terminateSession(): Promise<void> {
    if (!this.session) {
      throw new Error("No active session to terminate");
    }

    logger.info(`Terminating current session...`);
    await this.client.delete("/auth/sessions/current");

    this.session.isActive = false;
    this.client.setAccessToken(null);
    this.session = null;
    logger.info("Session terminated successfully");
  }

  isAuthenticated(): boolean {
    return this.session !== null && this.session.isActive;
  }
}
