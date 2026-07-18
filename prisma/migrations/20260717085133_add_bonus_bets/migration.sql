/*
  Warnings:

  - You are about to drop the column `pointsEarned` on the `BonusPrediction` table. All the data in the column will be lost.
  - You are about to drop the column `pointsWorth` on the `BonusPrediction` table. All the data in the column will be lost.
  - You are about to drop the column `predictedPlayerId` on the `BonusPrediction` table. All the data in the column will be lost.
  - You are about to drop the column `predictedTeamId` on the `BonusPrediction` table. All the data in the column will be lost.
  - You are about to drop the column `predictionLogo` on the `BonusPrediction` table. All the data in the column will be lost.
  - You are about to drop the column `predictionValue` on the `BonusPrediction` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `BonusPrediction` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `BonusPrediction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,tournamentId]` on the table `BonusPrediction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "BonusPrediction" DROP CONSTRAINT "BonusPrediction_predictedPlayerId_fkey";

-- DropForeignKey
ALTER TABLE "BonusPrediction" DROP CONSTRAINT "BonusPrediction_predictedTeamId_fkey";

-- DropIndex
DROP INDEX "Bet_matchId_idx";

-- DropIndex
DROP INDEX "Bet_userId_idx";

-- DropIndex
DROP INDEX "BonusPrediction_userId_type_key";

-- DropIndex
DROP INDEX "Invitation_email_idx";

-- DropIndex
DROP INDEX "Invitation_status_idx";

-- DropIndex
DROP INDEX "TournamentParticipant_tournamentId_idx";

-- DropIndex
DROP INDEX "TournamentParticipant_userId_idx";

-- AlterTable
ALTER TABLE "BonusPrediction" DROP COLUMN "pointsEarned",
DROP COLUMN "pointsWorth",
DROP COLUMN "predictedPlayerId",
DROP COLUMN "predictedTeamId",
DROP COLUMN "predictionLogo",
DROP COLUMN "predictionValue",
DROP COLUMN "status",
DROP COLUMN "type",
ADD COLUMN     "championTeamId" INTEGER,
ADD COLUMN     "runnerUpTeamId" INTEGER,
ADD COLUMN     "topScorerId" INTEGER;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "championTeamId" INTEGER,
ADD COLUMN     "runnerUpTeamId" INTEGER,
ADD COLUMN     "topScorerId" INTEGER;

-- DropEnum
DROP TYPE "PredictionStatus";

-- DropEnum
DROP TYPE "PredictionType";

-- CreateIndex
CREATE INDEX "Bet_userId_matchId_idx" ON "Bet"("userId", "matchId");

-- CreateIndex
CREATE UNIQUE INDEX "BonusPrediction_userId_tournamentId_key" ON "BonusPrediction"("userId", "tournamentId");

-- CreateIndex
CREATE INDEX "Invitation_email_status_idx" ON "Invitation"("email", "status");

-- CreateIndex
CREATE INDEX "TournamentParticipant_userId_tournamentId_idx" ON "TournamentParticipant"("userId", "tournamentId");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_championTeamId_fkey" FOREIGN KEY ("championTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_runnerUpTeamId_fkey" FOREIGN KEY ("runnerUpTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_topScorerId_fkey" FOREIGN KEY ("topScorerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPrediction" ADD CONSTRAINT "BonusPrediction_championTeamId_fkey" FOREIGN KEY ("championTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPrediction" ADD CONSTRAINT "BonusPrediction_runnerUpTeamId_fkey" FOREIGN KEY ("runnerUpTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPrediction" ADD CONSTRAINT "BonusPrediction_topScorerId_fkey" FOREIGN KEY ("topScorerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
