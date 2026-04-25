const PLAID_BASE_URLS = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
} as const;

type PlaidEnvironment = keyof typeof PLAID_BASE_URLS;

type PlaidErrorCause = {
  display_message?: string | null;
  error_message?: string | null;
};

type PlaidErrorResponse = {
  display_message?: string | null;
  error_message?: string | null;
  error_code?: string | null;
  error_type?: string | null;
  request_id?: string | null;
  causes?: PlaidErrorCause[] | null;
};

type PlaidTransferAuthorization = {
  id?: string;
  decision?: "approved" | "declined" | "user_action_required" | string;
  decision_rationale?: {
    code?: string | null;
    description?: string | null;
  } | null;
};

type PlaidTransferAuthDecision = {
  authorization?: PlaidTransferAuthorization | null;
};

type PlaidTransferCreateResponse = {
  transfer?: {
    id?: string;
    status?: string;
  } | null;
  transfer_id?: string;
  transfer_status?: string;
};

type PlaidLinkTokenResponse = {
  link_token: string;
  expiration: string;
  request_id: string;
};

type PlaidExchangeTokenResponse = {
  access_token: string;
  item_id: string;
  request_id: string;
};

type PlaidAccountsGetResponse = {
  accounts?: Array<{
    account_id: string;
    balances?: {
      available?: number | null;
      current?: number | null;
      iso_currency_code?: string | null;
    } | null;
    mask?: string | null;
    name?: string | null;
    official_name?: string | null;
    subtype?: string | null;
    type?: string | null;
  }>;
  item?: {
    item_id?: string;
  } | null;
  request_id?: string;
};

type PlaidLedgerGetResponse = {
  ledger_id?: string;
  balance?: {
    available?: string;
    pending?: string;
  } | null;
  request_id?: string;
};

type PlaidLedgerSweepResponse = {
  sweep?: {
    id?: string;
    ledger_id?: string | null;
    status?: string | null;
  } | null;
  request_id?: string;
};

export class PlaidApiError extends Error {
  status: number;
  code: string | null;
  type: string | null;
  requestId: string | null;

  constructor(status: number, payload: PlaidErrorResponse) {
    const causeMessage =
      payload.causes?.find((cause) => cause.display_message || cause.error_message)
        ?.display_message ||
      payload.causes?.find((cause) => cause.display_message || cause.error_message)
        ?.error_message;

    super(
      payload.display_message ||
        payload.error_message ||
        causeMessage ||
        "Plaid request failed."
    );
    this.name = "PlaidApiError";
    this.status = status;
    this.code = payload.error_code ?? null;
    this.type = payload.error_type ?? null;
    this.requestId = payload.request_id ?? null;
  }
}

function getPlaidEnvironment(): PlaidEnvironment {
  const env = (process.env.PLAID_ENV || "sandbox").toLowerCase();
  if (env === "development" || env === "production" || env === "sandbox") {
    return env;
  }
  return "sandbox";
}

function getPlaidBaseUrl() {
  return PLAID_BASE_URLS[getPlaidEnvironment()];
}

function getPlaidCredentials() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;

  if (!clientId || !secret) {
    throw new Error("Plaid credentials are not configured.");
  }

  return { clientId, secret };
}

async function plaidRequest<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const { clientId, secret } = getPlaidCredentials();

  const response = await fetch(`${getPlaidBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      ...body,
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as T & PlaidErrorResponse;

  if (!response.ok) {
    throw new PlaidApiError(response.status, payload);
  }

  return payload;
}

export function isSandboxPlaid() {
  return getPlaidEnvironment() === "sandbox";
}

export async function createPlaidLinkToken(params: {
  clientUserId: string;
  legalName?: string;
}) {
  return plaidRequest<PlaidLinkTokenResponse>("/link/token/create", {
    user: {
      client_user_id: params.clientUserId,
      legal_name: params.legalName,
    },
    client_name: "Vitality Bank",
    products: ["auth", "transfer"],
    language: "en",
    country_codes: ["US"],
    account_filters: {
      depository: {
        account_subtypes: ["checking", "savings"],
      },
    },
  });
}

export async function exchangePlaidPublicToken(publicToken: string) {
  return plaidRequest<PlaidExchangeTokenResponse>("/item/public_token/exchange", {
    public_token: publicToken,
  });
}

export async function getPlaidAccounts(accessToken: string) {
  return plaidRequest<PlaidAccountsGetResponse>("/accounts/get", {
    access_token: accessToken,
  });
}

export async function createPlaidTransferAuthorization(params: {
  accessToken: string;
  accountId: string;
  legalName: string;
  amount: string;
  direction: "inbound" | "outbound";
  idempotencyKey: string;
}) {
  const type = params.direction === "inbound" ? "debit" : "credit";
  const achClass = params.direction === "inbound" ? "web" : "ppd";

  return plaidRequest<PlaidTransferAuthDecision>("/transfer/authorization/create", {
    access_token: params.accessToken,
    account_id: params.accountId,
    type,
    network: "ach",
    ach_class: achClass,
    amount: params.amount,
    user: {
      legal_name: params.legalName,
    },
    idempotency_key: params.idempotencyKey,
  });
}

export async function createPlaidTransfer(params: {
  accessToken: string;
  accountId: string;
  authorizationId: string;
  amount: string;
  description: string;
}) {
  return plaidRequest<PlaidTransferCreateResponse>("/transfer/create", {
    access_token: params.accessToken,
    account_id: params.accountId,
    authorization_id: params.authorizationId,
    amount: params.amount,
    description: params.description,
  });
}

export async function getPlaidLedgerBalance() {
  return plaidRequest<PlaidLedgerGetResponse>("/transfer/ledger/get", {});
}

export async function createPlaidLedgerDeposit(params: {
  amount: string;
  idempotencyKey: string;
  description?: string;
  ledgerId?: string;
}) {
  return plaidRequest<PlaidLedgerSweepResponse>("/transfer/ledger/deposit", {
    amount: params.amount,
    network: "ach",
    idempotency_key: params.idempotencyKey,
    description: params.description ?? "TOPUP",
    ledger_id: params.ledgerId,
  });
}

export async function simulateSandboxTransfer(
  transferId: string,
  eventType: "posted" | "settled" | "funds_available"
) {
  if (!isSandboxPlaid()) {
    return;
  }

  await plaidRequest<{ request_id: string }>("/sandbox/transfer/simulate", {
    transfer_id: transferId,
    event_type: eventType,
  });
}

export async function simulateSandboxLedgerDeposit(
  sweepId: string,
  eventType: "sweep.posted" | "sweep.settled"
) {
  if (!isSandboxPlaid()) {
    return;
  }

  await plaidRequest<{ request_id: string }>(
    "/sandbox/transfer/ledger/deposit/simulate",
    {
      sweep_id: sweepId,
      event_type: eventType,
    }
  );
}

export async function simulateSandboxLedgerAvailable(ledgerId?: string) {
  if (!isSandboxPlaid()) {
    return;
  }

  await plaidRequest<{ request_id: string }>(
    "/sandbox/transfer/ledger/simulate_available",
    {
      ledger_id: ledgerId,
    }
  );
}
