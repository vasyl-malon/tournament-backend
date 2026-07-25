/*
  Warnings:

  - A unique constraint covering the columns `[email,tournamentId]` on the table `Invitation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tournamentId` to the `Invitation` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Invitation_email_status_idx";

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "tournamentId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Invitation_token_tournamentId_idx" ON "Invitation"("token", "tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_email_tournamentId_key" ON "Invitation"("email", "tournamentId");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
