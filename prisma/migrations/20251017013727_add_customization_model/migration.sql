-- CreateTable
CREATE TABLE "customizations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "majorName" TEXT NOT NULL,
    "originalEssay" TEXT NOT NULL,
    "customizedEssay" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "responseTime" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customizations_userId_idx" ON "customizations"("userId");

-- CreateIndex
CREATE INDEX "customizations_draftId_idx" ON "customizations"("draftId");

-- CreateIndex
CREATE INDEX "customizations_createdAt_idx" ON "customizations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "customizations_draftId_schoolName_majorName_key" ON "customizations"("draftId", "schoolName", "majorName");

-- AddForeignKey
ALTER TABLE "customizations" ADD CONSTRAINT "customizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customizations" ADD CONSTRAINT "customizations_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
