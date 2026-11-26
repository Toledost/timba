import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArchivedSession, Session, Player, BANCA_ID } from '../types';

const HISTORY_KEY = '@timba:history';

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
      if (raw) {
        const archivedSessions: ArchivedSession[] = JSON.parse(raw);
        set({ archivedSessions, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  archiveSession: async (session, playerMap, gameValue, netResults) => {
    const playerResults = session.players
      .filter((sp) => sp.playerId !== BANCA_ID)
      .map((sp) => ({
        playerId: sp.playerId,
        playerName: playerMap[sp.playerId]?.name ?? sp.playerId,
        netResult: netResults[sp.playerId] ?? 0,
      }));

    const archived: ArchivedSession = {
      id: session.id,
      startedAt: session.startedAt,
      endedAt: Date.now(),
      playerResults,
      transactionCount: session.transactions.length,
      gameValue,
    };

    const { archivedSessions } = get();
    const updated = [archived, ...archivedSessions];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
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
