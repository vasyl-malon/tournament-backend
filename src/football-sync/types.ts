export enum MatchStage {
  FINAL = "FINAL",
  THIRD_PLACE = "THIRD_PLACE",
  SEMI_FINALS = "SEMI_FINALS",
  QUARTER_FINALS = "QUARTER_FINALS",
  LAST_16 = "LAST_16",
  LAST_32 = "LAST_32",
  LAST_64 = "LAST_64",
  LEAGUE_STAGE = "LEAGUE_STAGE",
  GROUP_STAGE = "GROUP_STAGE",
  KNOCKOUT_ROUND_PLAY_OFFS = "KNOCKOUT_ROUND_PLAY_OFFS",
  REGULAR_SEASON = "REGULAR_SEASON",
  PLAYOFFS = "PLAYOFFS",
  PRELIMINARY_ROUND = "PRELIMINARY_ROUND",
  QUALIFICATION_ROUND_1 = "QUALIFICATION_ROUND_1",
  QUALIFICATION_ROUND_2 = "QUALIFICATION_ROUND_2",
  QUALIFICATION_ROUND_3 = "QUALIFICATION_ROUND_3",
  PLAYOFF_ROUND = "PLAYOFF_ROUND",
}

export enum MatchDuration {
  REGULAR = 'REGULAR',
  EXTRA_TIME = 'EXTRA_TIME',
  PENALTY_SHOOTOUT = 'PENALTY_SHOOTOUT',
}

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
