-- Class word lists: tutors/admins assign a named set of words to students of a class.
CREATE TABLE "vocabulary_lists" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vocabulary_lists_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vocabulary_lists_classId_idx" ON "vocabulary_lists"("classId");
ALTER TABLE "vocabulary_lists" ADD CONSTRAINT "vocabulary_lists_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vocabulary_lists" ADD CONSTRAINT "vocabulary_lists_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Each student's copy of a list word points back to its list.
ALTER TABLE "vocabularies" ADD COLUMN "listId" TEXT;
CREATE INDEX "vocabularies_listId_idx" ON "vocabularies"("listId");
ALTER TABLE "vocabularies" ADD CONSTRAINT "vocabularies_listId_fkey" FOREIGN KEY ("listId") REFERENCES "vocabulary_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
