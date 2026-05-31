import { describe, it, expect, afterAll } from "bun:test";
import {
  app,
  request,
  prisma,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../../test/helpers.ts";
import type { NotificationType } from "@prisma/client";

// ───────────────────────────────────────────────────────────────────────────
// Notifications — in-app feed for the authenticated user
//   GET   /api/v1/users/me/notifications          (paginated, ?read=false filter)
//   PATCH /api/v1/users/me/notifications/read-all
//
// Notifications are inserted directly via Prisma (the socket push is a silent
// no-op in tests since the Socket.io server is not initialised).
// ───────────────────────────────────────────────────────────────────────────

const createdUserIds: string[] = [];
const track = (u: TestUser) => (createdUserIds.push(u.id), u);
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

async function makeNotification(
  userId: string,
  opts: { type?: NotificationType; read?: boolean; message?: string } = {},
) {
  return prisma.notification.create({
    data: {
      userId,
      type: opts.type ?? "STREAK_MILESTONE",
      message: opts.message ?? "You hit a 7-day streak!",
      read: opts.read ?? false,
    },
    select: { id: true },
  });
}

afterAll(async () => {
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/users/me/notifications — list", () => {
  it("200 — lists the caller's notifications newest-first with pagination meta", async () => {
    const u = track(await createTestUser());
    await makeNotification(u.id, { message: "older" });
    await new Promise((r) => setTimeout(r, 5)); // ensure distinct createdAt ordering
    await makeNotification(u.id, { message: "newer" });

    const res = await request(app).get("/api/v1/users/me/notifications").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].message).toBe("newer"); // newest first
    expect(res.body.meta.total).toBe(2);
  });

  it("200 — only returns the caller's own notifications", async () => {
    const owner = track(await createTestUser());
    const other = track(await createTestUser());
    await makeNotification(owner.id);
    await makeNotification(other.id);

    const res = await request(app).get("/api/v1/users/me/notifications").set(auth(owner.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it("200 — ?read=false returns only unread notifications", async () => {
    const u = track(await createTestUser());
    await makeNotification(u.id, { read: false });
    await makeNotification(u.id, { read: true });

    const res = await request(app)
      .get("/api/v1/users/me/notifications?read=false")
      .set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data.every((n: { read: boolean }) => n.read === false)).toBe(true);
  });

  it("200 — ?read=true returns only read notifications", async () => {
    const u = track(await createTestUser());
    await makeNotification(u.id, { read: false });
    await makeNotification(u.id, { read: true });

    const res = await request(app)
      .get("/api/v1/users/me/notifications?read=true")
      .set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data.every((n: { read: boolean }) => n.read === true)).toBe(true);
  });

  it("422 — limit over the max of 100", async () => {
    const u = track(await createTestUser());
    const res = await request(app)
      .get("/api/v1/users/me/notifications?limit=999")
      .set(auth(u.token));
    expect(res.status).toBe(422);
  });

  it("401 — no token", async () => {
    const res = await request(app).get("/api/v1/users/me/notifications");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("PATCH /api/v1/users/me/notifications/read-all — mark all read", () => {
  it("200 — marks all of the caller's unread notifications as read", async () => {
    const u = track(await createTestUser());
    await makeNotification(u.id, { read: false });
    await makeNotification(u.id, { read: false });

    const res = await request(app)
      .patch("/api/v1/users/me/notifications/read-all")
      .set(auth(u.token));
    expect(res.status).toBe(200);

    const remaining = await prisma.notification.count({
      where: { userId: u.id, read: false },
    });
    expect(remaining).toBe(0);
  });

  it("200 — does not touch another user's notifications", async () => {
    const owner = track(await createTestUser());
    const other = track(await createTestUser());
    await makeNotification(owner.id, { read: false });
    await makeNotification(other.id, { read: false });

    await request(app)
      .patch("/api/v1/users/me/notifications/read-all")
      .set(auth(owner.token));

    const otherUnread = await prisma.notification.count({
      where: { userId: other.id, read: false },
    });
    expect(otherUnread).toBe(1);
  });

  it("401 — no token", async () => {
    const res = await request(app).patch("/api/v1/users/me/notifications/read-all");
    expect(res.status).toBe(401);
  });
});
