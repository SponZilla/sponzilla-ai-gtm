-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'INTERNAL_SERVICE',
    "actorId" TEXT,
    "outcome" TEXT NOT NULL,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_resourceType_resourceId_idx" ON "AdminAuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorId_createdAt_idx" ON "AdminAuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
