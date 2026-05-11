import { describe, it, expect, beforeEach, vi } from "vitest";
import { KsefInvoices } from "./invoices.js";
import { KsefClient } from "./client.js";

function makeClient() {
  const client = {
    post: vi.fn().mockResolvedValue({ invoices: [] }),
    get: vi.fn().mockResolvedValue({}),
    getXml: vi.fn().mockResolvedValue("<xml/>"),
  };
  return client as unknown as KsefClient & typeof client;
}

describe("KsefInvoices.queryInvoices", () => {
  let client: ReturnType<typeof makeClient>;
  let invoices: KsefInvoices;

  beforeEach(() => {
    client = makeClient();
    invoices = new KsefInvoices(client);
  });

  it("formats date range with day boundaries and applies default dateType", async () => {
    await invoices.queryInvoices({
      subjectType: "Subject1",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });

    expect(client.post).toHaveBeenCalledWith("/invoices/query/metadata", {
      subjectType: "Subject1",
      dateRange: {
        dateType: "PermanentStorage",
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-01-31T23:59:59.999Z",
      },
    });
  });

  it("uses provided dateType when supplied", async () => {
    await invoices.queryInvoices({
      subjectType: "Subject2",
      dateFrom: "2026-02-01",
      dateTo: "2026-02-28",
      dateType: "Issue",
    });

    const body = client.post.mock.calls[0]![1] as { dateRange: { dateType: string } };
    expect(body.dateRange.dateType).toBe("Issue");
  });

  it("omits the amount block when no amount bounds are given", async () => {
    await invoices.queryInvoices({
      subjectType: "Subject1",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });

    const body = client.post.mock.calls[0]![1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("amount");
  });

  it("includes amount with default Brutto type when only amountFrom is given", async () => {
    await invoices.queryInvoices({
      subjectType: "Subject1",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      amountFrom: 100,
    });

    const body = client.post.mock.calls[0]![1] as { amount: Record<string, unknown> };
    expect(body.amount).toEqual({ type: "Brutto", from: 100 });
  });

  it("includes amount with both bounds and respects amountType override", async () => {
    await invoices.queryInvoices({
      subjectType: "Subject1",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      amountType: "Netto",
      amountFrom: 100,
      amountTo: 500,
    });

    const body = client.post.mock.calls[0]![1] as { amount: Record<string, unknown> };
    expect(body.amount).toEqual({ type: "Netto", from: 100, to: 500 });
  });
});

describe("KsefInvoices.getInvoice", () => {
  it("requests XML at the correct path", async () => {
    const client = makeClient();
    const invoices = new KsefInvoices(client);

    const xml = await invoices.getInvoice("KSEF-12345");

    expect(client.getXml).toHaveBeenCalledWith("/invoices/ksef/KSEF-12345");
    expect(xml).toBe("<xml/>");
  });
});

describe("KsefInvoices.getSessionInvoices", () => {
  it("uses pagination defaults", async () => {
    const client = makeClient();
    const invoices = new KsefInvoices(client);

    await invoices.getSessionInvoices("REF-1");

    expect(client.get).toHaveBeenCalledWith(
      "/sessions/REF-1/invoices?pageSize=10&pageOffset=0"
    );
  });

  it("forwards custom pagination params", async () => {
    const client = makeClient();
    const invoices = new KsefInvoices(client);

    await invoices.getSessionInvoices("REF-1", 50, 100);

    expect(client.get).toHaveBeenCalledWith(
      "/sessions/REF-1/invoices?pageSize=50&pageOffset=100"
    );
  });
});
