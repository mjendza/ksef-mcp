import { KsefClient } from "./client.js";
import { InvoiceQueryResponse } from "./types.js";

export class KsefInvoices {
  private client: KsefClient;

  constructor(client: KsefClient) {
    this.client = client;
  }

  async getInvoice(ksefNumber: string): Promise<string> {
    return this.client.getXml(`/invoices/ksef/${ksefNumber}`);
  }

  async queryInvoices(params: {
    subjectType: "Subject1" | "Subject2" | "Subject3" | "SubjectAuthorized";
    dateFrom: string;
    dateTo: string;
    dateType?: "Issue" | "Invoicing" | "PermanentStorage";
    amountType?: "Brutto" | "Netto";
    amountFrom?: number;
    amountTo?: number;
  }): Promise<InvoiceQueryResponse> {
    const body: Record<string, unknown> = {
      subjectType: params.subjectType,
      dateRange: {
        dateType: params.dateType || "PermanentStorage",
        from: params.dateFrom + "T00:00:00.000Z",
        to: params.dateTo + "T23:59:59.999Z",
      },
    };

    if (params.amountFrom !== undefined || params.amountTo !== undefined) {
      body.amount = {
        type: params.amountType || "Brutto",
        ...(params.amountFrom !== undefined && { from: params.amountFrom }),
        ...(params.amountTo !== undefined && { to: params.amountTo }),
      };
    }

    return this.client.post<InvoiceQueryResponse>(
      "/invoices/query/metadata",
      body
    );
  }

  async getSessionInvoices(
    referenceNumber: string,
    pageSize = 10,
    pageOffset = 0
  ): Promise<unknown> {
    return this.client.get(
      `/sessions/${referenceNumber}/invoices?pageSize=${pageSize}&pageOffset=${pageOffset}`
    );
  }
}
