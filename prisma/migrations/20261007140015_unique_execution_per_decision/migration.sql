/*
  Warnings:

  - A unique constraint covering the columns `[decisionId]` on the table `Execution` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Execution_decisionId_createdAt_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Execution_decisionId_key" ON "Execution"("decisionId");
