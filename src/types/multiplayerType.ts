export interface NetworkPlayer {
  id: string;
  name: string;
  isHost: boolean;
  hp: number;
  coins: number;
  isAlive: boolean;
  currentRoundScore: number;
  totalScore: number;
  roundFinished: boolean;
  shopReady: boolean;
}

export interface RoundResolutionResult {
  playerId: string;
  name: string;
  roundScore: number;
  rank: number;
  damage: number;
  newHp: number;
  coinsEarned: number;
  isAlive: boolean;
}

export interface FinalLeaderboardEntry {
  playerId: string;
  name: string;
  totalScore: number;
  isWinner: boolean;
  rank: number;
  hp: number;
}

export type GameMode = 'menu' | 'solo' | 'lobby' | 'multiplayer';
