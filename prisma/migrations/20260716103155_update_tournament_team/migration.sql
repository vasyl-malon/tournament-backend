/*
  Warnings:

  - The `predictedTeamId` column on the `BonusPrediction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `predictedPlayerId` column on the `BonusPrediction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Player` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Team` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TournamentPlayer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TournamentTeam` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `OutrightBet` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `dateOfBirth` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nationality` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `Player` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `teamId` on the `Player` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Team` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `playerId` on the `TournamentPlayer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `teamId` on the `TournamentTeam` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "BonusPrediction" DROP CONSTRAINT "BonusPrediction_predictedPlayerId_fkey";

-- DropForeignKey
ALTER TABLE "BonusPrediction" DROP CONSTRAINT "BonusPrediction_predictedTeamId_fkey";

-- DropForeignKey
ALTER TABLE "OutrightBet" DROP CONSTRAINT "OutrightBet_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "OutrightBet" DROP CONSTRAINT "OutrightBet_userId_fkey";

-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentPlayer" DROP CONSTRAINT "TournamentPlayer_playerId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentTeam" DROP CONSTRAINT "TournamentTeam_teamId_fkey";

-- AlterTable
ALTER TABLE "BonusPrediction" DROP COLUMN "predictedTeamId",
ADD COLUMN     "predictedTeamId" INTEGER,
DROP COLUMN "predictedPlayerId",
ADD COLUMN     "predictedPlayerId" INTEGER;

-- AlterTable
ALTER TABLE "Player" DROP CONSTRAINT "Player_pkey",
ADD COLUMN     "dateOfBirth" TEXT NOT NULL,
ADD COLUMN     "nationality" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" INTEGER NOT NULL,
DROP COLUMN "teamId",
ADD COLUMN     "teamId" INTEGER NOT NULL,
ADD CONSTRAINT "Player_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Team" DROP CONSTRAINT "Team_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" INTEGER NOT NULL,
ADD CONSTRAINT "Team_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TournamentPlayer" DROP CONSTRAINT "TournamentPlayer_pkey",
DROP COLUMN "playerId",
ADD COLUMN     "playerId" INTEGER NOT NULL,
ADD CONSTRAINT "TournamentPlayer_pkey" PRIMARY KEY ("tournamentId", "playerId");

-- AlterTable
ALTER TABLE "TournamentTeam" DROP CONSTRAINT "TournamentTeam_pkey",
DROP COLUMN "teamId",
ADD COLUMN     "teamId" INTEGER NOT NULL,
ADD CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("tournamentId", "teamId");

-- DropTable
DROP TABLE "OutrightBet";

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPrediction" ADD CONSTRAINT "BonusPrediction_predictedTeamId_fkey" FOREIGN KEY ("predictedTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPrediction" ADD CONSTRAINT "BonusPrediction_predictedPlayerId_fkey" FOREIGN KEY ("predictedPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
