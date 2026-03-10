import { KsefConfig } from "../config.js";
import { KsefError } from "./types.js";
import { logger } from "../logger.js";

export class KsefApiError extends Error {
  constructor(
    public statusCode: number,
    public details: KsefError | null,
    message: string
  ) {
    super(message);
    this.name = "KsefApiError";
  }
}

export class KsefClient {
  private config: KsefConfig;
  private accessToken: string | null = null;

  constructor(config: KsefConfig) {
    this.config = config;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private buildUrl(path: string): string {
    const base = this.config.baseUrl.replace(/\/$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }

  private buildHeaders(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  async get<T>(path: string, bearerOverride?: string): Promise<T> {
    const url = this.buildUrl(path);
    const headers = this.buildHeaders();
    if (bearerOverride) {
      headers["Authorization"] = `Bearer ${bearerOverride}`;
    }
    logger.info(`GET ${url}`);
    logger.debug("Request headers:", headers);
    const response = await fetch(url, { method: "GET", headers });
    logger.info(`GET ${url} -> ${response.status} ${response.statusText}`);
    return this.handleResponse<T>(response);
  }

  async getXml(path: string): Promise<string> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      Accept: "application/octet-stream",
    };
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }
    logger.info(`GET (xml) ${url}`);
    logger.debug("Request headers:", headers);
    const response = await fetch(url, { method: "GET", headers });
    logger.info(`GET (xml) ${url} -> ${response.status} ${response.statusText}`);
    if (!response.ok) {
      await this.throwApiError(response);
    }
    return response.text();
  }

  async post<T>(path: string, body?: unknown, bearerOverride?: string): Promise<T> {
    const url = this.buildUrl(path);
    const headers = this.buildHeaders(body !== undefined ? "application/json" : undefined);
    if (bearerOverride) {
      headers["Authorization"] = `Bearer ${bearerOverride}`;
    }
    logger.info(`POST ${url}`);
    logger.debug("Request headers:", headers);
    if (body !== undefined) {
      logger.debug("Request body:", body);
    }
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    logger.info(`POST ${url} -> ${response.status} ${response.statusText}`);
    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string): Promise<T> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: "DELETE",
      headers: this.buildHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      await this.throwApiError(response);
    }
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    logger.debug("Response content-type:", contentType);
    logger.debug("Response body:", text.substring(0, 1000));
    if (!text) {
      return {} as T;
    }

    // Detect HTML responses even on 200 OK (e.g. service shutdown pages)
    if (contentType.includes("text/html") || text.trimStart().startsWith("<!") || text.trimStart().startsWith("<html")) {
      throw new KsefApiError(
        response.status,
        null,
        `KSeF returned HTML instead of JSON (HTTP ${response.status}). The API endpoint may be unavailable or decommissioned. URL: ${response.url}`
      );
    }

    return JSON.parse(text) as T;
  }

  private async throwApiError(response: Response): Promise<never> {
    const contentType = response.headers.get("content-type") || "";
    const body = await response.text();

    logger.error(`HTTP ${response.status} ${response.statusText} from ${response.url}`);
    logger.error("Response content-type:", contentType);
    logger.error("Response body:", body.substring(0, 2000));

    // Detect HTML responses (wrong endpoint or server error page)
    if (contentType.includes("text/html") || body.trimStart().startsWith("<!") || body.trimStart().startsWith("<html")) {
      throw new KsefApiError(
        response.status,
        null,
        `KSeF returned HTML instead of JSON (${response.status}). URL: ${response.url}. This usually means the endpoint path is incorrect or the service is unavailable.`
      );
    }

    let details: KsefError | null = null;
    try {
      details = JSON.parse(body) as KsefError;
    } catch {
      // response may not be JSON
    }
    const message = details?.exception?.exceptionDetailList
      ?.map((e) => `[${e.exceptionCode}] ${e.exceptionDescription}`)
      .join("; ") || `KSeF API error: ${response.status} ${response.statusText}. Body: ${body.substring(0, 200)}`;
    throw new KsefApiError(response.status, details, message);
  }
}
