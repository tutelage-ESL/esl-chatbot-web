import type { ClassStatus } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import type { ClassListItem, ClassDetail } from "./classes.types.ts";

export async function getClasses(
  page: number,
  limit: number,
  status?: ClassStatus,
): Promise<{ classes: ClassListItem[]; total: number }> {
  const skip = (page - 1) * limit;
  const where = status ? { classStatus: status } : {};

  const [rawClasses, total] = await prisma.$transaction([
    prisma.class.findMany({
      where,
      select: {
        id: true,
        className: true,
        classCode: true,
        classCategory: true,
        classStatus: true,
        createdAt: true,
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.class.count({ where }),
  ]);

  const classes: ClassListItem[] = rawClasses.map((c) => ({
    id: c.id,
    className: c.className,
    classCode: c.classCode,
    classCategory: c.classCategory,
    classStatus: c.classStatus,
    createdAt: c.createdAt,
    memberCount: c._count.users,
  }));

  return { classes, total };
}

export async function getClassById(id: string): Promise<ClassDetail> {
  const cls = await prisma.class.findUnique({
    where: { id },
    select: {
      id: true,
      className: true,
      classCode: true,
      classCategory: true,
      classStatus: true,
      createdAt: true,
      updatedAt: true,
      users: {
        select: {
          id: true,
          role: true,
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cls) throw new AppError("Class not found", 404);

  return {
    ...cls,
    members: cls.users,
  };
}
