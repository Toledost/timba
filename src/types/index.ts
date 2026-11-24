export interface Player {
  id: string;
  name: string;
  alias?: string;
  createdAt: number;
}

export interface Denomination {
  value: number;
  count: number;
}

export interface GameConfig {
  multiplier: number; // default 10
  denominations: Denomination[]; // [{50,5},{25,5},{10,5},{5,5},{1,5}]
}

export interface SessionPlayer {
  playerId: string;
  balance: number; // in $, positive = winning, negative = owing
}

export const BANCA_ID = '__banca__';

export interface Transaction {
  id: string;
  timestamp: number;
  fromPlayerId: string; // who pays / loses chips — BANCA_ID = banca
  toPlayerId: string;   // who receives / gains chips — BANCA_ID = banca
  amount: number;       // always positive
  note?: string;
}

export interface Session {
  id: string;
  startedAt: number;
  players: SessionPlayer[];
  transactions: Transaction[];
  isActive: boolean;
}
