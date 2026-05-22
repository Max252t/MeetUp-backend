-- CreateTable
CREATE TABLE "MediaObject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "url" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaObject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaObject_key_key" ON "MediaObject"("key");

-- CreateIndex
CREATE INDEX "MediaObject_userId_idx" ON "MediaObject"("userId");

-- CreateIndex
CREATE INDEX "MediaObject_status_idx" ON "MediaObject"("status");
