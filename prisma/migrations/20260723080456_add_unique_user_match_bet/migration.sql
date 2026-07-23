/*
  Warnings:

  - A unique constraint covering the columns `[userId,matchId]` on the table `Bet` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Bet_userId_matchId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Bet_userId_matchId_key" ON "Bet"("userId", "matchId");
