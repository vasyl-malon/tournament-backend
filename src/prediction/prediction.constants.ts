export const PredictionErrors = {
  TOURNAMENT_NOT_FOUND: 'Tournament not found',
  USER_NOT_FOUND: 'User not found in this tournament',
  MATCH_NOT_FOUND: 'Match not found',

  BETTING_CLOSED: 'Betting is closed for this match.',
  INVALID_ADVANCING_TEAM:
    'The selected advancing team does not belong to this match.',

  BONUS_PREDICTIONS_CLOSED:
    'Bonus predictions are closed for this tournament.',

  INVALID_CHAMPION_TEAM:
    'The selected champion team is not participating in this tournament.',

  INVALID_RUNNER_UP_TEAM:
    'The selected runner-up team is not participating in this tournament.',

  INVALID_TOP_SCORER:
    'The selected player is not participating in this tournament.',

  DUPLICATE_FINALISTS:
    'Champion and runner-up must be different teams.',
} as const;