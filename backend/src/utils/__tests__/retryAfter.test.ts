import { describe, it, expect } from "bun:test";
import express from "express";
import request from "supertest";
import { waitText, secondsUntilNextDay } from "../retryAfter.ts";
import { AppError } from "../AppError.ts";
import { errorHandler } from "../../middlewares/errorHandler.ts";

// Pure unit tests — no database needed.

describe("waitText", () => {
  it.each([
    [1, "1 second"],
    [45, "45 seconds"],
    [60, "1 minute"],
    [61, "2 minutes"],
    [900, "15 minutes"],
    [3600, "1 hour"],
    [5400, "2 hours"],
  ])("%i s → %s", (seconds, text) => {
    expect(waitText(seconds)).toBe(text);
  });
});

describe("secondsUntilNextDay", () => {
  it("counts to the next local midnight", () => {
    const now = new Date(2026, 5, 15, 23, 30, 0);
    expect(secondsUntilNextDay(now)).toBe(30 * 60);
  });

  it("is a full day right after midnight", () => {
    const now = new Date(2026, 5, 15, 0, 0, 0);
    expect(secondsUntilNextDay(now)).toBe(24 * 60 * 60);
  });
});

describe("errorHandler + AppError retryAfter", () => {
  const appWith = (err: Error) => {
    const app = express();
    app.get("/", () => { throw err; });
    app.use(errorHandler);
    return app;
  };

  it("sends Retry-After and keeps the server message on a 429 that knows its wait", async () => {
    const res = await request(appWith(new AppError("Daily message limit reached (20).", 429, { retryAfter: 120 }))).get("/");
    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBe("120");
    expect(res.body).toEqual({ success: false, message: "Daily message limit reached (20).", data: null, retryAfter: 120 });
  });

  it("sends no Retry-After when the error has no wait (e.g. per-session cap)", async () => {
    const res = await request(appWith(new AppError("Session message limit reached.", 429))).get("/");
    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBeUndefined();
  });
});
