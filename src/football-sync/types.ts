export type GetTeamsResponse = {
  teams: Array<{
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
    squad: Array<{
      id: number;
      name: string;
      position: string;
      dateOfBirth: string;
      nationality: string;
    }>;
  }>;
};

export type GetMatchesResponse = {
  matches: Array<{
    id: number;
    utcDate: string;
    status: string;
    matchday: null;
    stage: string;
    group: null;
    homeTeam: {
      id: number;
      name: string;
      shortName: string;
      tla: string;
      crest: string;
    };
    awayTeam: {
      id: number;
      name: string;
      shortName: string;
      tla: string;
      crest: string;
    };
    score: {
      winner: string;
      duration: string;
      fullTime: {
        home: number | null;
        away: number | null;
      };
      halfTime: {
        home: number | null;
        away: number | null;
      };
      regularTime: {
        home: number | null;
        away: number | null;
      };
      extraTime: {
        home: number | null;
        away: number | null;
      };
      penalties: {
        home: number | null;
        away: number | null;
      };
    };
  }>;
};
