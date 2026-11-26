import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, Transaction, BANCA_ID } from '../types';
import { applyTransaction, reverseTransaction } from '../utils/balance';

const SESSION_KEY = '@timba:session';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface SessionState {
  session: Session | null;
  lastSessionPlayers: Session['players'] | null;
  lastSessionTransactions: Session['transactions'] | null;
  isLoaded: boolean;
  loadSession: () => Promise<void>;
  startSession: (playerIds: string[]) => Promise<void>;
  endSession: () => Promise<void>;
  addTransaction: (
    fromPlayerId: string,
    toPlayerId: string,
    amount: number,
    note?: string
  ) => Promise<void>;
  undoLastTransaction: () => Promise<void>;
  removeTransaction: (txId: string) => Promise<void>;
  buyFromBanca: (playerId: string, amount: number) => Promise<void>;
  returnToBanca: (playerId: string, amount: number) => Promise<void>;
  addPlayerToSession: (playerId: string) => Promise<void>;
  removePlayerFromSession: (playerId: string) => Promise<void>;
}

async function persist(session: Session | null) {
  if (session) {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    await AsyncStorage.removeItem(SESSION_KEY);
  }
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  lastSessionPlayers: null,
  lastSessionTransactions: null,
  isLoaded: false,

  loadSession: async () => {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw) {
        const session: Session = JSON.parse(raw);
        set({ session, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  startSession: async (playerIds: string[]) => {
    const session: Session = {
      id: generateId(),
      startedAt: Date.now(),
      players: [
        { playerId: BANCA_ID, balance: 0 },
        ...playerIds.map((playerId) => ({ playerId, balance: 0 })),
      ],
      transactions: [],
      isActive: true,
    };
    await persist(session);
    set({ session });
  },

  endSession: async () => {
    const { session } = get();
    await persist(null);
    set({
      session: null,
      lastSessionPlayers: session?.players ?? null,
      lastSessionTransactions: session?.transactions ?? null,
    });
  },

  addTransaction: async (
    fromPlayerId: string,
    toPlayerId: string,
    amount: number,
    note?: string
  ) => {
    const { session } = get();
    if (!session) return;

    const tx: Transaction = {
      id: generateId(),
      timestamp: Date.now(),
      fromPlayerId,
      toPlayerId,
      amount,
      note,
    };

    const newPlayers = applyTransaction(session.players, tx);
    const newSession: Session = {
      ...session,
      players: newPlayers,
      transactions: [...session.transactions, tx],
    };

    await persist(newSession);
    set({ session: newSession });
  },

  removeTransaction: async (txId: string) => {
    const { session } = get();
    if (!session) return;
    const remaining = session.transactions.filter((tx) => tx.id !== txId);
    const resetPlayers = session.players.map((p) => ({ ...p, balance: 0 }));
    const newPlayers = remaining.reduce(applyTransaction, resetPlayers);
    const newSession: Session = { ...session, players: newPlayers, transactions: remaining };
    await persist(newSession);
    set({ session: newSession });
  },

  undoLastTransaction: async () => {
    const { session } = get();
    if (!session || session.transactions.length === 0) return;

    const lastTx = session.transactions[session.transactions.length - 1];
    const newPlayers = reverseTransaction(session.players, lastTx);
    const newSession: Session = {
      ...session,
      players: newPlayers,
      transactions: session.transactions.slice(0, -1),
    };

    await persist(newSession);
    set({ session: newSession });
  },

  buyFromBanca: async (playerId: string, amount: number) => {
    // Comprar a banca = jugador se endeuda (balance baja), banca recibe (balance sube)
    const { session } = get();
    if (!session) return;
    const tx: Transaction = {
      id: generateId(),
      timestamp: Date.now(),
      fromPlayerId: playerId,
      toPlayerId: BANCA_ID,
      amount,
      note: 'Compra a banca',
    };
    const newSession = { ...session, players: applyTransaction(session.players, tx), transactions: [...session.transactions, tx] };
    await persist(newSession);
    set({ session: newSession });
  },

  returnToBanca: async (playerId: string, amount: number) => {
    // Devolver a banca = jugador cobra (balance sube), banca paga (balance baja)
    const { session } = get();
    if (!session) return;
    const tx: Transaction = {
      id: generateId(),
      timestamp: Date.now(),
      fromPlayerId: BANCA_ID,
      toPlayerId: playerId,
      amount,
      note: 'Devuelve a banca',
    };
    const newSession = { ...session, players: applyTransaction(session.players, tx), transactions: [...session.transactions, tx] };
    await persist(newSession);
    set({ session: newSession });
  },

  addPlayerToSession: async (playerId: string) => {
    const { session } = get();
    if (!session) return;
    if (session.players.some((p) => p.playerId === playerId)) return;

    const newSession: Session = {
      ...session,
      players: [...session.players, { playerId, balance: 0 }],
    };
    await persist(newSession);
    set({ session: newSession });
  },

  removePlayerFromSession: async (playerId: string) => {
    const { session } = get();
    if (!session) return;

    // Only remove if balance is zero
    const player = session.players.find((p) => p.playerId === playerId);
    if (!player || player.balance !== 0) return;

    const newSession: Session = {
      ...session,
      players: session.players.filter((p) => p.playerId !== playerId),
    };
    await persist(newSession);
    set({ session: newSession });
  },
}));
