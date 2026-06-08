import { prisma } from "../config/database.ts";
import { logger } from "../config/index.ts";
import { resend } from "../config/resend.ts";
import { env } from "../config/env.ts";

interface GoalSummary {
  description: string;
  progress: number;
  type: string;
}

interface DigestData {
  displayName: string;
  weeklyStudyMinutes: number;
  weeklySessions: number;
  weeklyMessages: number;
  weeklyVocabPracticed: number;
  streak: number;
  activeGoals: GoalSummary[];
  vocabDue: number;
  estimatedLevel: string | null;
}

export async function runWeeklyDigestJob(): Promise<void> {
  if (!resend || !env.RESEND_API_KEY) {
    logger.warn("[cron:weekly-digest] RESEND_API_KEY not configured — skipping");
    return;
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      emailVerified: true,
      role: "STUDENT",
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      metrics: {
        select: {
          currentStreak: true,
          estimatedLevel: true,
        },
      },
      progress: {
        where: { date: { gte: weekStart } },
        select: {
          studyMinutes: true,
          sessionsCount: true,
          messagesCount: true,
          vocabularyPracticed: true,
        },
      },
      goals: {
        where: { status: "ACTIVE" },
        select: { description: true, progress: true, type: true },
        take: 3,
        orderBy: { lastProgressUpdate: "desc" },
      },
      _count: {
        select: {
          vocabularies: { where: { srsDue: { lte: today } } },
        },
      },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const weeklyStudyMinutes = user.progress.reduce((acc, p) => acc + p.studyMinutes, 0);
      const weeklySessions = user.progress.reduce((acc, p) => acc + p.sessionsCount, 0);
      const weeklyMessages = user.progress.reduce((acc, p) => acc + p.messagesCount, 0);
      const weeklyVocabPracticed = user.progress.reduce((acc, p) => acc + p.vocabularyPracticed, 0);

      const html = buildDigestHtml({
        displayName: user.displayName,
        weeklyStudyMinutes,
        weeklySessions,
        weeklyMessages,
        weeklyVocabPracticed,
        streak: user.metrics?.currentStreak ?? 0,
        activeGoals: user.goals,
        vocabDue: user._count.vocabularies,
        estimatedLevel: user.metrics?.estimatedLevel ?? null,
      });

      await resend.emails.send({
        from: env.EMAIL_FROM ?? "noreply@resend.dev",
        to: user.email,
        subject: `Your weekly Tutelage progress — ${formatWeekLabel(weekStart, now)}`,
        html,
      });

      sent++;
    } catch (err) {
      logger.error(`[cron:weekly-digest] Failed to send to ${user.email}`, { error: err });
      failed++;
    }
  }

  logger.info(`[cron:weekly-digest] Sent ${sent} digest(s), ${failed} failed, ${users.length} total`);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatWeekLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

function buildDigestHtml(data: DigestData): string {
  const {
    displayName,
    weeklyStudyMinutes,
    weeklySessions,
    weeklyMessages,
    weeklyVocabPracticed,
    streak,
    activeGoals,
    vocabDue,
    estimatedLevel,
  } = data;

  const hours = Math.floor(weeklyStudyMinutes / 60);
  const minutes = weeklyStudyMinutes % 60;
  const studyTimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const streakLine =
    streak === 0
      ? "You haven't studied yet this week — now's a great time to start!"
      : streak >= 30
        ? `🔥 ${streak}-day streak — incredible consistency!`
        : streak >= 7
          ? `🔥 ${streak}-day streak — keep the momentum going!`
          : `${streak}-day streak — build that habit!`;

  const goalsHtml =
    activeGoals.length > 0
      ? `
        <h3 style="margin-bottom:8px;">Active goals</h3>
        <ul style="margin:0;padding-left:20px;">
          ${activeGoals
            .map(
              (g) =>
                `<li style="margin-bottom:6px;">${esc(g.description)} — <strong>${Math.round(g.progress)}% complete</strong></li>`,
            )
            .join("")}
        </ul>
      `
      : `<p style="color:#6b7280;">No active goals set yet. Add one from your profile to stay on track.</p>`;

  const vocabDueHtml =
    vocabDue > 0
      ? `<p>📚 You have <strong>${vocabDue} vocabulary card${vocabDue !== 1 ? "s" : ""}</strong> due for review today.</p>`
      : `<p>✅ No vocabulary cards due — you're all caught up!</p>`;

  const levelLine = estimatedLevel
    ? `<p><strong>Estimated level:</strong> ${esc(estimatedLevel)}</p>`
    : "";

  const noActivityNote =
    weeklySessions === 0
      ? `<p style="background:#fef9c3;border-left:4px solid #facc15;padding:12px;margin:16px 0;">
          You didn't have any sessions last week. Even one 10-minute chat can keep your skills sharp — give it a try!
        </p>`
      : "";

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.6;">
      <div style="background:#4f46e5;padding:24px 32px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:22px;">Your weekly progress</h1>
        <p style="color:#c7d2fe;margin:4px 0 0;">Tutelage — English Learning</p>
      </div>

      <div style="padding:24px 32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        <p>Hi ${esc(displayName)},</p>
        <p>Here's a look at your English learning activity over the past 7 days.</p>

        ${noActivityNote}

        <h3 style="margin-bottom:8px;">Last 7 days</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;text-align:center;">
          <tr>
            <td style="padding:16px 8px;border:1px solid #e5e7eb;border-radius:4px;">
              <div style="font-size:26px;font-weight:700;">${studyTimeStr}</div>
              <div style="font-size:13px;color:#6b7280;margin-top:2px;">Study time</div>
            </td>
            <td style="padding:16px 8px;border:1px solid #e5e7eb;">
              <div style="font-size:26px;font-weight:700;">${weeklySessions}</div>
              <div style="font-size:13px;color:#6b7280;margin-top:2px;">Sessions</div>
            </td>
            <td style="padding:16px 8px;border:1px solid #e5e7eb;">
              <div style="font-size:26px;font-weight:700;">${weeklyMessages}</div>
              <div style="font-size:13px;color:#6b7280;margin-top:2px;">Messages</div>
            </td>
            <td style="padding:16px 8px;border:1px solid #e5e7eb;border-radius:4px;">
              <div style="font-size:26px;font-weight:700;">${weeklyVocabPracticed}</div>
              <div style="font-size:13px;color:#6b7280;margin-top:2px;">Vocab reviewed</div>
            </td>
          </tr>
        </table>

        <p><strong>Streak:</strong> ${streakLine}</p>
        ${levelLine}
        ${vocabDueHtml}

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
        ${goalsHtml}

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
        <p style="color:#6b7280;font-size:13px;margin:0;">
          You're receiving this weekly digest as a Tutelage learner.<br/>
          — The Tutelage Team
        </p>
      </div>
    </div>
  `;
}
