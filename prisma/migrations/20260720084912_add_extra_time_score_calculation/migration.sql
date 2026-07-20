-- AlterTable
ALTER TABLE "Bet" ADD COLUMN     "advancingPointsEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "predictedAdvancingTeam" TEXT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "advancingTeam" TEXT,
ADD COLUMN     "awayScorePen" INTEGER,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "homeScorePen" INTEGER;
