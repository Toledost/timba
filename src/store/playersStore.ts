import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Player } from '../types';

const PLAYERS_KEY = '@timba:players';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface PlayersState {
  players: Player[];
  isLoaded: boolean;
  loadPlayers: () => Promise<void>;
  addPlayer: (name: string, alias?: string) => Promise<Player>;
  updatePlayer: (id: string, name: string, alias?: string) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  getPlayer: (id: string) => Player | undefined;
}

export const usePlayersStore = create<PlayersState>((set, get) => ({
  players: [],
  isLoaded: false,

  loadPlayers: async () => {
    try {
      const raw = await AsyncStorage.getItem(PLAYERS_KEY);
      if (raw) {
        const players: Player[] = JSON.parse(raw);
        set({ players, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  addPlayer: async (name: string, alias?: string) => {
    const newPlayer: Player = {
      id: generateId(),
      name: name.trim(),
      alias: alias?.trim() || undefined,
      createdAt: Date.now(),
    };
    const players = [...get().players, newPlayer];
    await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
    set({ players });
    return newPlayer;
  },

  updatePlayer: async (id: string, name: string, alias?: string) => {
    const players = get().players.map((p) =>
      p.id === id
        ? { ...p, name: name.trim(), alias: alias?.trim() || undefined }
        : p
    );
    await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
    set({ players });
  },

  deletePlayer: async (id: string) => {
    const players = get().players.filter((p) => p.id !== id);
    await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
    set({ players });
  },

  getPlayer: (id: string) => {
    return get().players.find((p) => p.id === id);
  },
}));
