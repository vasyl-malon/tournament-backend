/*
  Warnings:

  - You are about to drop the column `predictedAdvancingTeam` on the `Bet` table. All the data in the column will be lost.
  - You are about to drop the column `advancingTeam` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `awayTeam` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `awayTeamLogo` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `homeTeam` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `homeTeamLogo` on the `Match` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Bet" DROP COLUMN "predictedAdvancingTeam",
ADD COLUMN     "predictedAdvancingTeamId" INTEGER;

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "advancingTeam",
DROP COLUMN "awayTeam",
DROP COLUMN "awayTeamLogo",
DROP COLUMN "homeTeam",
DROP COLUMN "homeTeamLogo",
ADD COLUMN     "advancingTeamId" INTEGER,
ADD COLUMN     "awayTeamId" INTEGER,
ADD COLUMN     "homeTeamId" INTEGER;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "emblem" TEXT;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_advancingTeamId_fkey" FOREIGN KEY ("advancingTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
