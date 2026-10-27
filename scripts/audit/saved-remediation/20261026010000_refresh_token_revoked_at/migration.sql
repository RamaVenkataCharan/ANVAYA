-- AlterTable
ALTER TABLE "RefreshToken" DROP COLUMN "revoked",
DROP COLUMN "tokenHash",
ADD COLUMN "hash" TEXT NOT NULL,
ADD COLUMN "revokedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_hash_key" ON "RefreshToken"("hash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_revokedAt_idx" ON "RefreshToken"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "RefreshToken_hash_idx" ON "RefreshToken"("hash");
