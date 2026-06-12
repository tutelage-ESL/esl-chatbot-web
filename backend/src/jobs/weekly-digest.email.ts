export interface SkillSnapshot {
  grammar: number;
  vocabulary: number;
  fluency: number;
}

export interface GoalSummary {
  description: string;
  progress: number;
  type: string;
}

export interface DigestData {
  displayName: string;
  weeklyStudyMinutes: number;
  weeklySessions: number;
  weeklyMessages: number;
  weeklyVocabPracticed: number;
  streak: number;
  activeGoals: GoalSummary[];
  vocabDue: number;
  estimatedLevel: string | null;
  grammarSkill: number;
  vocabularySkill: number;
  fluencySkill: number;
  skillDelta: SkillSnapshot | null;
  appUrl: string;
}

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatWeekLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function deltaStr(n: number): string {
  return n > 0 ? `<span style="color:#16a34a;font-size:12px;">(+${n} this week)</span>`
    : n < 0 ? `<span style="color:#dc2626;font-size:12px;">(${n} this week)</span>`
    : "";
}

export function buildDigestHtml(data: DigestData): string {
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
    grammarSkill,
    vocabularySkill,
    fluencySkill,
    skillDelta,
    appUrl,
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
                `<li style="margin-bottom:6px;">${esc(truncate(g.description, 80))} — <strong>${Math.round(g.progress)}% complete</strong></li>`,
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

  const hasSkills = grammarSkill > 0 || vocabularySkill > 0 || fluencySkill > 0;
  const skillsHtml = hasSkills
    ? `
      <h3 style="margin-bottom:8px;">Skill scores</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;text-align:center;">
        <tr>
          <td style="padding:12px 8px;border:1px solid #e5e7eb;">
            <div style="font-size:22px;font-weight:700;">${Math.round(grammarSkill)}</div>
            <div style="font-size:13px;color:#6b7280;margin-top:2px;">Grammar</div>
            ${skillDelta ? deltaStr(Math.round(grammarSkill) - Math.round(skillDelta.grammar)) : ""}
          </td>
          <td style="padding:12px 8px;border:1px solid #e5e7eb;">
            <div style="font-size:22px;font-weight:700;">${Math.round(vocabularySkill)}</div>
            <div style="font-size:13px;color:#6b7280;margin-top:2px;">Vocabulary</div>
            ${skillDelta ? deltaStr(Math.round(vocabularySkill) - Math.round(skillDelta.vocabulary)) : ""}
          </td>
          <td style="padding:12px 8px;border:1px solid #e5e7eb;">
            <div style="font-size:22px;font-weight:700;">${Math.round(fluencySkill)}</div>
            <div style="font-size:13px;color:#6b7280;margin-top:2px;">Fluency</div>
            ${skillDelta ? deltaStr(Math.round(fluencySkill) - Math.round(skillDelta.fluency)) : ""}
          </td>
        </tr>
      </table>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
    `
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

        ${skillsHtml}

        ${goalsHtml}

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

        <div style="text-align:center;margin:24px 0;">
          <a href="${appUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;">
            Continue learning →
          </a>
        </div>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
        <p style="color:#6b7280;font-size:13px;margin:0;">
          You're receiving this weekly digest as a Tutelage learner.
          You can turn this digest off anytime in <strong>Settings → Profile</strong>.<br/>
          — The Tutelage Team
        </p>
      </div>
    </div>
  `;
}
