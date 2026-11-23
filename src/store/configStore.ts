import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameConfig, Denomination } from '../types';
import { computeGameValue } from '../utils/balance';

const CONFIG_KEY = '@timba:config';

const DEFAULT_DENOMINATIONS: Denomination[] = [
  { value: 50, count: 5 },
  { value: 25, count: 5 },
  { value: 10, count: 5 },
  { value: 5, count: 5 },
  { value: 1, count: 5 },
];

const DEFAULT_CONFIG: GameConfig = {
  multiplier: 10,
  denominations: DEFAULT_DENOMINATIONS,
};

interface ConfigState {
  config: GameConfig;
  gameValue: number;
  isLoaded: boolean;
  loadConfig: () => Promise<void>;
  updateMultiplier: (multiplier: number) => Promise<void>;
  updateDenomination: (index: number, count: number) => Promise<void>;
  resetConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: DEFAULT_CONFIG,
  gameValue: computeGameValue(DEFAULT_DENOMINATIONS, DEFAULT_CONFIG.multiplier),
  isLoaded: false,

  loadConfig: async () => {
    try {
      const raw = await AsyncStorage.getItem(CONFIG_KEY);
      if (raw) {
        const config: GameConfig = JSON.parse(raw);
        set({
          config,
          gameValue: computeGameValue(config.denominations, config.multiplier),
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  updateMultiplier: async (multiplier: number) => {
    const { config } = get();
    const newConfig = { ...config, multiplier };
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
    set({
      config: newConfig,
      gameValue: computeGameValue(newConfig.denominations, multiplier),
    });
  },

  updateDenomination: async (index: number, count: number) => {
    const { config } = get();
    const newDenominations = config.denominations.map((d, i) =>
      i === index ? { ...d, count } : d
    );
    const newConfig = { ...config, denominations: newDenominations };
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
    set({
      config: newConfig,
      gameValue: computeGameValue(newDenominations, newConfig.multiplier),
    });
  },

  resetConfig: async () => {
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
    set({
      config: DEFAULT_CONFIG,
      gameValue: computeGameValue(DEFAULT_DENOMINATIONS, DEFAULT_CONFIG.multiplier),
    });
  },
}));
