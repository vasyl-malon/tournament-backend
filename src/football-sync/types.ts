export type GetTeamsResponse = {
  teams: Array<{
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  }>;
};

export type GetTeamDetailsResponse = {
  squad: Array<{
    id: number;
    name: string;
    position: string;
    dateOfBirth: string;
    nationality: string;
  }>;
};
