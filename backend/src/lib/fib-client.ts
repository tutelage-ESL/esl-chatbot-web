// Own FIB Subscription API client (replaces the broken fibsubscribe npm package).
// Source-verified against fibsubscribe@1.0.0 — all endpoints and payloads match.
import { logger } from "../config/index.ts";

export type FibEnvironment = "stage" | "production";

export type FibSubStatus =
  | "DRAFT"
  | "TRIAL"
  | "ACTIVE"
  | "REJECTED"
  | "CANCELLED";

export interface CreateSubscriptionOptions {
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  interval: string;
  trialPeriod?: string;
  expiresIn?: string;
  statusCallbackUrl?: string;
}

export interface CreateSubscriptionResult {
  subscriptionId: string;
  readableCode: string;
  qrCode: string;
  validUntil: string;
  appLink: string;
}

export interface SubscriptionDetails {
  id: string;
  readableCode: string;
  title: string;
  description?: string;
  monetaryValue: { amount: number; currency: string };
  interval: string;
  trialPeriod?: string | null;
  status: FibSubStatus;
  activeUntil: number | null;  // unix milliseconds — convert with new Date(activeUntil)
  lastPaymentAt: number | null; // unix milliseconds
}

export class FibSubscribeError extends Error {
  statusCode: number;
  body: unknown;

  constructor(message: string, statusCode: number, body: unknown) {
    super(message);
    this.name = "FibSubscribeError";
    this.statusCode = statusCode;
    this.body = body;
  }
}

const BASE_URLS: Record<FibEnvironment, string> = {
  stage: "https://fib-stage.fib.iq",
  production: "https://fib.prod.fib.iq",
};

const AUTH_PATH =
  "/auth/realms/fib-online-shop/protocol/openid-connect/token";

const TERMINAL_STATUSES = new Set<FibSubStatus>([
  "ACTIVE",
  "TRIAL",
  "REJECTED",
  "CANCELLED",
]);

export class FibClient {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(opts: {
    clientId: string;
    clientSecret: string;
    environment?: FibEnvironment;
  }) {
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.baseUrl = BASE_URLS[opts.environment ?? "stage"];
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }
    const res = await fetch(`${this.baseUrl}${AUTH_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });
    if (!res.ok) {
      const rawText = await res.text();
      let parsed: Record<string, string> = {};
      try { parsed = JSON.parse(rawText) as Record<string, string>; } catch { /* not JSON */ }
      const message = parsed["error_description"] ?? `FIB authentication failed (${res.status})`;
      logger.error("[fib-client] Auth failed", { status: res.status, message });
      throw new FibSubscribeError(message, res.status, parsed);
    }
    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.cachedToken = data.access_token;
    // Subtract 30s buffer so we never use a token right at the edge of expiry
    this.tokenExpiresAt = Date.now() + (data.expires_in - 30) * 1000;
    return this.cachedToken;
  }

  // ── Core request ──────────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        // FIB returns translated error messages when Accept-Language is set.
        // Without it, errors come back as raw i18n keys (e.g. "general_invalid_request_title").
        "Accept-Language": "en",
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    // 202 Accepted (cancel) and 204 No Content return no body
    if (res.status === 202 || res.status === 204) return null as T;
    const rawText = await res.text();
    let payload: Record<string, unknown> = {};
    try { payload = JSON.parse(rawText) as Record<string, unknown>; } catch { /* not JSON */ }
    if (!res.ok) {
      logger.error("[fib-client] Request failed", { method, path, status: res.status });
      throw new FibSubscribeError(
        String(
          payload["message"] ??
            payload["error"] ??
            `FIB request failed (${res.status})`,
        ),
        res.status,
        payload,
      );
    }
    return payload as T;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async createSubscription(
    opts: CreateSubscriptionOptions,
  ): Promise<CreateSubscriptionResult> {
    const payload: Record<string, unknown> = {
      title: opts.title,
      monetaryValue: {
        amount: String(opts.amount),
        currency: opts.currency ?? "IQD",
      },
      interval: opts.interval,
    };
    if (opts.description) payload["description"] = opts.description;
    if (opts.trialPeriod) payload["trialPeriod"] = opts.trialPeriod;
    if (opts.expiresIn) payload["expiresIn"] = opts.expiresIn;
    if (opts.statusCallbackUrl)
      payload["statusCallbackUrl"] = opts.statusCallbackUrl;

    return this.request<CreateSubscriptionResult>(
      "POST",
      "/protected/v1/subscriptions",
      payload,
    );
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionDetails> {
    return this.request<SubscriptionDetails>(
      "GET",
      `/protected/v1/subscriptions/${subscriptionId}`,
    );
  }

  async cancelSubscription(subscriptionId: string): Promise<null> {
    return this.request<null>(
      "POST",
      `/protected/v1/subscriptions/${subscriptionId}/cancel`,
    );
  }

  async waitForActivation(
    subscriptionId: string,
    opts: { intervalMs?: number; timeoutMs?: number } = {},
  ): Promise<SubscriptionDetails> {
    const { intervalMs = 4000, timeoutMs = 300_000 } = opts;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const details = await this.getSubscription(subscriptionId);
      if (TERMINAL_STATUSES.has(details.status)) return details;
      await new Promise<void>((r) => setTimeout(r, intervalMs));
    }
    throw new FibSubscribeError(
      `Timed out waiting for subscription ${subscriptionId} to activate`,
      408,
      null,
    );
  }
}
