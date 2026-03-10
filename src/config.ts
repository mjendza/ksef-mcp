export type KsefEnvironment = "test" | "demo" | "prod";

const BASE_URLS: Record<KsefEnvironment, string> = {
  test: "https://api-test.ksef.mf.gov.pl/v2",
  demo: "https://api-demo.ksef.mf.gov.pl/v2",
  prod: "https://api.ksef.mf.gov.pl/v2",
};

export interface KsefConfig {
  nip: string;
  token: string;
  env: KsefEnvironment;
  baseUrl: string;
}

export function loadConfig(): KsefConfig {
  const nip = process.env.KSEF_NIP;
  const token = process.env.KSEF_TOKEN;
  const env = (process.env.KSEF_ENV || "test") as KsefEnvironment;

  if (!nip) {
    throw new Error("KSEF_NIP environment variable is required");
  }
  if (!token) {
    throw new Error("KSEF_TOKEN environment variable is required");
  }
  if (!["test", "demo", "prod"].includes(env)) {
    throw new Error(`KSEF_ENV must be one of: test, demo, prod. Got: ${env}`);
  }

  return {
    nip,
    token,
    env,
    baseUrl: process.env.KSEF_BASE_URL || BASE_URLS[env],
  };
}
