-- CreateTable
CREATE TABLE "TournamentTeam" (
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("tournamentId","teamId")
);

-- CreateTable
CREATE TABLE "TournamentPlayer" (
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "TournamentPlayer_pkey" PRIMARY KEY ("tournamentId","playerId")
);

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
