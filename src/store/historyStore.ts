import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArchivedSession, Session, Player, BANCA_ID } from '../types';

const HISTORY_KEY = '@timba:history';
const HISTORY_VERSION_KEY = '@timba:history:version';
const CURRENT_VERSION = 2;

function migrateArchivedSession(raw: ArchivedSession): ArchivedSession {
  const results = raw.playerResults;
  const withStats: ArchivedSession = { ...raw };
  if (withStats.durationMs === undefined) {
    withStats.durationMs = raw.endedAt - raw.startedAt;
  }
  if (withStats.totalInPlay === undefined) {
    withStats.totalInPlay = raw.gameValue;
  }
  if (withStats.biggestWinner === undefined && results.length > 0) {
    const winner = results.reduce((a, b) => (a.netResult > b.netResult ? a : b));
    if (winner.netResult > 0) withStats.biggestWinner = { name: winner.playerName, amount: winner.netResult };
  }
  if (withStats.biggestLoser === undefined && results.length > 0) {
    const loser = results.reduce((a, b) => (a.netResult < b.netResult ? a : b));
    if (loser.netResult < 0) withStats.biggestLoser = { name: loser.playerName, amount: loser.netResult };
  }
  return withStats;
}

interface HistoryState {
  archivedSessions: ArchivedSession[];
  isLoaded: boolean;
  loadHistory: () => Promise<void>;
  archiveSession: (
    session: Session,
    playerMap: Record<string, Player>,
    gameValue: number,
    netResults: Record<string, number>
  ) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  archivedSessions: [],
  isLoaded: false,

  loadHistory: async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      const versionRaw = await AsyncStorage.getItem(HISTORY_VERSION_KEY);
      const storedVersion = versionRaw ? parseInt(versionRaw, 10) : 1;
      if (raw) {
        const parsed: ArchivedSession[] = JSON.parse(raw);
        const migrated = storedVersion < CURRENT_VERSION
          ? parsed.map(migrateArchivedSession)
          : parsed;
        const seen = new Set<string>();
        const archivedSessions = migrated.filter((s) => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        if (storedVersion < CURRENT_VERSION || archivedSessions.length !== migrated.length) {
          await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(archivedSessions));
          await AsyncStorage.setItem(HISTORY_VERSION_KEY, String(CURRENT_VERSION));
        }
        set({ archivedSessions, isLoaded: true });
      } else {
        await AsyncStorage.setItem(HISTORY_VERSION_KEY, String(CURRENT_VERSION));
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  archiveSession: async (session, playerMap, gameValue, netResults) => {
    const endedAt = Date.now();
    const playerResults = session.players
      .filter((sp) => sp.playerId !== BANCA_ID)
      .map((sp) => ({
        playerId: sp.playerId,
        playerName: playerMap[sp.playerId]?.name ?? sp.playerId,
        netResult: netResults[sp.playerId] ?? 0,
      }));

    const winner = playerResults.length > 0
      ? playerResults.reduce((a, b) => (a.netResult > b.netResult ? a : b))
      : null;
    const loser = playerResults.length > 0
      ? playerResults.reduce((a, b) => (a.netResult < b.netResult ? a : b))
      : null;

    const archived: ArchivedSession = {
      id: session.id,
      startedAt: session.startedAt,
      endedAt,
      playerResults,
      transactionCount: session.transactions.length,
      gameValue,
      durationMs: endedAt - session.startedAt,
      totalInPlay: gameValue * playerResults.length,
      biggestWinner: winner && winner.netResult > 0 ? { name: winner.playerName, amount: winner.netResult } : undefined,
      biggestLoser: loser && loser.netResult < 0 ? { name: loser.playerName, amount: loser.netResult } : undefined,
    };

    const { archivedSessions } = get();
    if (archivedSessions.some((s) => s.id === archived.id)) return;
    const updated = [archived, ...archivedSessions];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    await AsyncStorage.setItem(HISTORY_VERSION_KEY, String(CURRENT_VERSION));
    set({ archivedSessions: updated });
  },

  deleteSession: async (id: string) => {
    const { archivedSessions } = get();
    const updated = archivedSessions.filter((s) => s.id !== id);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    set({ archivedSessions: updated });
  },

  clearHistory: async () => {
    await AsyncStorage.removeItem(HISTORY_KEY);
    set({ archivedSessions: [] });
  },
}));
