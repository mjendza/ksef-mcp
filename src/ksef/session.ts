import { KsefClient } from "./client.js";
import { SessionStatusResponse } from "./types.js";

export class KsefSession {
  private client: KsefClient;

  constructor(client: KsefClient) {
    this.client = client;
  }

  async getSessionStatus(
    referenceNumber: string
  ): Promise<SessionStatusResponse> {
    return this.client.get<SessionStatusResponse>(
      `/sessions/${referenceNumber}`
    );
  }
}
