-- AlterTable
ALTER TABLE "Execution" ADD COLUMN     "lastHeartbeatAt" TIMESTAMP(3),
ADD COLUMN     "lastReconciledAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Execution_status_startedAt_idx" ON "Execution"("status", "startedAt");
