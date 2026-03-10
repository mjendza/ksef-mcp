// === Auth types (KSeF 2.0) ===

export interface AuthChallengeResponse {
  challenge: string;
  timestamp: string;
  timestampMs: number;
  clientIp: string;
}

export interface AuthKsefTokenRequest {
  challenge: string;
  contextIdentifier: {
    type: string;
    value: string;
  };
  encryptedToken: string;
}

export interface AuthInitResponse {
  referenceNumber: string;
  authenticationToken: {
    token: string;
    validUntil: string;
  };
}

export interface AuthStatusResponse {
  status: StatusInfo;
  startDate: string;
  authenticationMethod: string;
  isTokenRedeemed?: boolean;
  refreshTokenValidUntil?: string;
}

export interface AuthTokensResponse {
  accessToken: TokenInfo;
  refreshToken: TokenInfo;
}

export interface TokenInfo {
  token: string;
  validUntil: string;
}

export interface StatusInfo {
  code: number;
  description: string;
  details?: string[];
}

export interface PublicKeyCertificate {
  certificate: string;
  validFrom: string;
  validTo: string;
  usage: string[];
}

// === Session types ===

export interface SessionStatusResponse {
  status: StatusInfo;
  dateCreated: string;
  dateUpdated: string;
  validUntil?: string;
  invoiceCount?: number;
  successfulInvoiceCount?: number;
  failedInvoiceCount?: number;
}

// === Invoice types ===

export interface InvoiceQueryRequest {
  subjectType: string;
  dateRange: {
    dateType: string;
    from: string;
    to: string;
  };
  amount?: {
    type: string;
    from?: number;
    to?: number;
  };
}

export interface InvoiceQueryResponse {
  hasMore: boolean;
  isTruncated: boolean;
  permanentStorageHwmDate?: string;
  invoices: InvoiceMetadata[];
}

export interface InvoiceMetadata {
  ksefNumber: string;
  invoiceNumber: string;
  issueDate: string;
  invoicingDate: string;
  acquisitionDate: string;
  permanentStorageDate: string;
  seller: {
    nip: string;
    name: string;
  };
  buyer?: {
    identifier?: {
      type: string;
      value: string;
    };
    name?: string;
  };
  netAmount?: number;
  grossAmount?: number;
  vatAmount?: number;
  currency?: string;
  invoicingMode?: string;
  invoiceType?: string;
  formCode?: {
    systemCode: string;
    schemaVersion: string;
    value: string;
  };
}

// === Session context (internal) ===

export interface SessionContext {
  accessToken: string;
  refreshToken: string;
  referenceNumber: string;
  isActive: boolean;
}

// === Error types ===

export interface KsefError {
  exception?: {
    exceptionDetailList?: Array<{
      exceptionCode: number;
      exceptionDescription: string;
      details?: string[];
    }>;
    referenceNumber?: string;
    timestamp?: string;
  };
}
