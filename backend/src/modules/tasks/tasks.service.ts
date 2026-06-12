import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import { createNotification } from "../notifications/notifications.service.ts";
import type { TaskItem, TaskSubmissionItem } from "./tasks.types.ts";

const TASK_SELECT = {
  id: true,
  classId: true,
  createdById: true,
  title: true,
  description: true,
  deadline: true,
  status: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, displayName: true, avatarUrl: true } },
  _count: { select: { submissions: true } },
} as const;

const SUBMISSION_SELECT = {
  id: true,
  taskId: true,
  studentId: true,
  content: true,
  fileUrl: true,
  feedback: true,
  feedbackAt: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, displayName: true, avatarUrl: true } },
} as const;

// ── Membership helpers ────────────────────────────────────

async function assertClassMember(classId: string, userId: string, role: string) {
  if (role === "ADMIN") {
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true } });
    if (!cls) throw new AppError("Class not found", 404);
    return;
  }
  const membership = await prisma.classUser.findUnique({
    where: { classId_userId: { classId, userId } },
    select: { id: true },
  });
  if (!membership) throw new AppError("Class not found", 404);
}

async function assertClassTutor(classId: string, userId: string, role: string) {
  if (role === "ADMIN") {
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true } });
    if (!cls) throw new AppError("Class not found", 404);
    return;
  }
  const membership = await prisma.classUser.findUnique({
    where: { classId_userId: { classId, userId } },
    select: { role: true },
  });
  if (!membership) throw new AppError("Class not found", 404);
  if (membership.role !== "TUTOR") throw new AppError("Only tutors can manage tasks", 403);
}

async function getTaskOrThrow(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, classId: true, status: true },
  });
  if (!task) throw new AppError("Task not found", 404);
  return task;
}

type RawTask = Prisma.TaskGetPayload<{ select: typeof TASK_SELECT }>;

function shapeTask(raw: RawTask): TaskItem {
  return {
    id: raw.id,
    classId: raw.classId,
    createdById: raw.createdById,
    title: raw.title,
    description: raw.description,
    deadline: raw.deadline,
    status: raw.status,
    closedAt: raw.closedAt,
    createdBy: raw.createdBy,
    submissionCount: raw._count.submissions,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// ── Task CRUD ─────────────────────────────────────────────

export async function createTask(
  classId: string,
  actorId: string,
  actorRole: string,
  data: { title: string; description: string; deadline?: string },
): Promise<TaskItem> {
  await assertClassTutor(classId, actorId, actorRole);

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { className: true, archived: true },
  });
  if (!cls) throw new AppError("Class not found", 404);
  if (cls.archived) throw new AppError("Cannot add tasks to an archived class", 409);

  const task = await prisma.task.create({
    data: {
      classId,
      createdById: actorId,
      title: data.title,
      description: data.description,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
    },
    select: TASK_SELECT,
  });

  // Notify all student members (internal stealth accounts excluded)
  const students = await prisma.classUser.findMany({
    where: { classId, role: "STUDENT", user: { isInternal: false } },
    select: { userId: true },
  });
  await Promise.all(
    students.map((s) =>
      createNotification(s.userId, "TASK_ASSIGNED", `New task in ${cls.className}: ${data.title}`),
    ),
  ).catch(() => {});

  return shapeTask(task);
}

export async function listClassTasks(
  classId: string,
  actorId: string,
  actorRole: string,
  page: number,
  limit: number,
): Promise<{ tasks: TaskItem[]; total: number }> {
  await assertClassMember(classId, actorId, actorRole);

  const skip = (page - 1) * limit;
  const [rawTasks, total] = await prisma.$transaction([
    prisma.task.findMany({
      where: { classId },
      select: TASK_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.task.count({ where: { classId } }),
  ]);

  // For students, attach their own submission to each task
  const isStudent = actorRole === "STUDENT";
  let submissionMap: Map<string, TaskSubmissionItem> = new Map();
  if (isStudent && rawTasks.length > 0) {
    const taskIds = rawTasks.map((t) => t.id);
    const submissions = await prisma.taskSubmission.findMany({
      where: { taskId: { in: taskIds }, studentId: actorId },
      select: SUBMISSION_SELECT,
    });
    for (const s of submissions) submissionMap.set(s.taskId, s as TaskSubmissionItem);
  }

  const tasks = rawTasks.map((t) => ({
    ...shapeTask(t),
    ...(isStudent ? { mySubmission: submissionMap.get(t.id) ?? null } : {}),
  }));

  return { tasks, total };
}

export async function getTask(
  taskId: string,
  actorId: string,
  actorRole: string,
): Promise<TaskItem> {
  const { classId } = await getTaskOrThrow(taskId);
  await assertClassMember(classId, actorId, actorRole);

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: TASK_SELECT });
  if (!task) throw new AppError("Task not found", 404);

  const shaped = shapeTask(task);
  if (actorRole === "STUDENT") {
    const sub = await prisma.taskSubmission.findUnique({
      where: { taskId_studentId: { taskId, studentId: actorId } },
      select: SUBMISSION_SELECT,
    });
    shaped.mySubmission = (sub as TaskSubmissionItem) ?? null;
  }
  return shaped;
}

export async function updateTask(
  taskId: string,
  actorId: string,
  actorRole: string,
  data: { title?: string; description?: string; deadline?: string | null; closed?: boolean },
): Promise<TaskItem> {
  const { classId } = await getTaskOrThrow(taskId);
  await assertClassTutor(classId, actorId, actorRole);

  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if ("deadline" in data) update.deadline = data.deadline ? new Date(data.deadline) : null;
  if (data.closed === true) {
    update.status = "CLOSED";
    update.closedAt = new Date();
  } else if (data.closed === false) {
    update.status = "OPEN";
    update.closedAt = null;
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: update,
    select: TASK_SELECT,
  });
  return shapeTask(task);
}

export async function deleteTask(
  taskId: string,
  actorId: string,
  actorRole: string,
): Promise<void> {
  const { classId } = await getTaskOrThrow(taskId);
  await assertClassTutor(classId, actorId, actorRole);
  await prisma.task.delete({ where: { id: taskId } });
}

// ── Submissions ───────────────────────────────────────────

export async function createSubmission(
  taskId: string,
  actorId: string,
  actorRole: string,
  data: { content?: string; fileUrl?: string },
): Promise<TaskSubmissionItem> {
  if (actorRole !== "STUDENT") throw new AppError("Only students can submit tasks", 403);

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, classId: true, status: true, title: true, class: { select: { className: true } } },
  });
  if (!task) throw new AppError("Task not found", 404);
  if (task.status === "CLOSED") throw new AppError("Task is closed and no longer accepting submissions", 409);

  await assertClassMember(task.classId, actorId, actorRole);

  const existing = await prisma.taskSubmission.findUnique({
    where: { taskId_studentId: { taskId, studentId: actorId } },
    select: { id: true },
  });
  if (existing) throw new AppError("You have already submitted this task", 409);

  const submission = await prisma.taskSubmission.create({
    data: { taskId, studentId: actorId, content: data.content, fileUrl: data.fileUrl },
    select: SUBMISSION_SELECT,
  });

  // Notify tutor(s) of the class (internal stealth accounts excluded)
  const tutors = await prisma.classUser.findMany({
    where: { classId: task.classId, role: "TUTOR", user: { isInternal: false } },
    select: { userId: true },
  });
  const student = await prisma.user.findUnique({
    where: { id: actorId },
    select: { displayName: true },
  });
  await Promise.all(
    tutors.map((t) =>
      createNotification(
        t.userId,
        "TASK_SUBMITTED",
        `${student?.displayName ?? "A student"} submitted "${task.title}"`,
      ),
    ),
  ).catch(() => {});

  return submission as TaskSubmissionItem;
}

export async function listSubmissions(
  taskId: string,
  actorId: string,
  actorRole: string,
  page: number,
  limit: number,
): Promise<{ submissions: TaskSubmissionItem[]; total: number }> {
  const { classId } = await getTaskOrThrow(taskId);
  await assertClassTutor(classId, actorId, actorRole);

  const skip = (page - 1) * limit;
  const [submissions, total] = await prisma.$transaction([
    prisma.taskSubmission.findMany({
      where: { taskId },
      select: SUBMISSION_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.taskSubmission.count({ where: { taskId } }),
  ]);

  return { submissions: submissions as TaskSubmissionItem[], total };
}

export async function updateFeedback(
  taskId: string,
  submissionId: string,
  actorId: string,
  actorRole: string,
  feedback: string,
): Promise<TaskSubmissionItem> {
  const { classId } = await getTaskOrThrow(taskId);
  await assertClassTutor(classId, actorId, actorRole);

  const existing = await prisma.taskSubmission.findFirst({
    where: { id: submissionId, taskId },
    select: { id: true },
  });
  if (!existing) throw new AppError("Submission not found", 404);

  const submission = await prisma.taskSubmission.update({
    where: { id: submissionId },
    data: { feedback, feedbackAt: new Date() },
    select: SUBMISSION_SELECT,
  });
  return submission as TaskSubmissionItem;
}
