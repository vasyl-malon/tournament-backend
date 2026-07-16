-- CreateEnum
CREATE TYPE "PredictionType" AS ENUM ('CHAMPION', 'RUNNER_UP', 'THIRD_PLACE', 'TOP_SCORER');

-- CreateEnum
CREATE TYPE "PredictionStatus" AS ENUM ('PENDING', 'CORRECT', 'INCORRECT');

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "logo" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusPrediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PredictionType" NOT NULL,
    "status" "PredictionStatus" NOT NULL DEFAULT 'PENDING',
    "pointsWorth" INTEGER NOT NULL DEFAULT 10,
    "pointsEarned" INTEGER,
    "tournamentId" TEXT NOT NULL,
    "predictedTeamId" TEXT,
    "predictedPlayerId" TEXT,
    "predictionValue" TEXT NOT NULL,
    "predictionLogo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonusPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BonusPrediction_userId_type_key" ON "BonusPrediction"("userId", "type");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPrediction" ADD CONSTRAINT "BonusPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPrediction" ADD CONSTRAINT "BonusPrediction_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPrediction" ADD CONSTRAINT "BonusPrediction_predictedTeamId_fkey" FOREIGN KEY ("predictedTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPrediction" ADD CONSTRAINT "BonusPrediction_predictedPlayerId_fkey" FOREIGN KEY ("predictedPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
