import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.KSEF_NIP;
    delete process.env.KSEF_TOKEN;
    delete process.env.KSEF_ENV;
    delete process.env.KSEF_BASE_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws when KSEF_NIP is missing", () => {
    process.env.KSEF_TOKEN = "tok";
    expect(() => loadConfig()).toThrow(/KSEF_NIP/);
  });

  it("throws when KSEF_TOKEN is missing", () => {
    process.env.KSEF_NIP = "1234567890";
    expect(() => loadConfig()).toThrow(/KSEF_TOKEN/);
  });

  it("throws when KSEF_ENV is invalid", () => {
    process.env.KSEF_NIP = "1234567890";
    process.env.KSEF_TOKEN = "tok";
    process.env.KSEF_ENV = "staging";
    expect(() => loadConfig()).toThrow(/KSEF_ENV must be one of/);
  });

  it("defaults env to 'test' and resolves the test base URL", () => {
    process.env.KSEF_NIP = "1234567890";
    process.env.KSEF_TOKEN = "tok";

    const cfg = loadConfig();

    expect(cfg.env).toBe("test");
    expect(cfg.baseUrl).toBe("https://api-test.ksef.mf.gov.pl/v2");
    expect(cfg.nip).toBe("1234567890");
    expect(cfg.token).toBe("tok");
  });

  it("resolves prod and demo base URLs from KSEF_ENV", () => {
    process.env.KSEF_NIP = "1234567890";
    process.env.KSEF_TOKEN = "tok";

    process.env.KSEF_ENV = "prod";
    expect(loadConfig().baseUrl).toBe("https://api.ksef.mf.gov.pl/v2");

    process.env.KSEF_ENV = "demo";
    expect(loadConfig().baseUrl).toBe("https://api-demo.ksef.mf.gov.pl/v2");
  });

  it("KSEF_BASE_URL overrides the env-derived base URL", () => {
    process.env.KSEF_NIP = "1234567890";
    process.env.KSEF_TOKEN = "tok";
    process.env.KSEF_ENV = "prod";
    process.env.KSEF_BASE_URL = "https://custom.example/v2";

    expect(loadConfig().baseUrl).toBe("https://custom.example/v2");
  });
});
