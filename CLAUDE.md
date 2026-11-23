# Timba — Claude Code Project Guide

## Overview
Timba is a React Native + Expo mobile app for tracking poker chip balances during live sessions. It runs 100% offline using AsyncStorage for local persistence. No backend, no login.

## Tech Stack
- **React Native 0.74** + **Expo ~51** (managed workflow)
- **TypeScript** (strict mode)
- **Expo Router v3** (file-based routing, tab navigator)
- **Zustand ^4** (state management)
- **@react-native-async-storage/async-storage 1.23** (local persistence)

## Project Structure
```
timba/
├── app/              # Expo Router screens (tab pages)
│   ├── _layout.tsx   # Root tab layout + store hydration
│   ├── index.tsx     # Main session screen (Mesa)
│   ├── players.tsx   # Player CRUD
│   ├── history.tsx   # Transaction history + undo
│   └── settings.tsx  # Game configuration
├── src/
│   ├── components/   # Reusable UI components
│   ├── store/        # Zustand stores (config, players, session)
│   ├── hooks/        # Custom hooks
│   ├── utils/        # Pure helpers (currency, balance math)
│   ├── types/        # Shared TypeScript types
│   └── theme.ts      # Design tokens (colors, spacing, fonts)
└── assets/           # Icons / splash (Expo managed)
```

## Key Business Rules

### Zero-Sum Invariant
All session player balances must sum to exactly $0. Every transaction debits one player and credits another by the same amount. The `BalanceIndicator` component shows a warning if `sum ≠ 0`.

### Game Value Calculation
```
gameValue = denominations.reduce((sum, d) => sum + d.value * d.count, 0) * multiplier
```
Default denominations: 5×$50 + 5×$25 + 5×$10 + 5×$5 + 5×$1 = $455 base  
Default multiplier: ×10 → **$4,550 per game**

### Transaction Flow
1. User picks `fromPlayer` (pays/loses) and `toPlayer` (receives/gains)
2. `amount` is positive dollars
3. `fromPlayer.balance -= amount`; `toPlayer.balance += amount`
4. Transaction pushed to `session.transactions`
5. Undo reverses the last transaction and pops it from the array

## Store Architecture
Each store has its own AsyncStorage key and a `loadX()` action called once from `app/_layout.tsx` on mount.

| Store | Key | Responsibility |
|-------|-----|----------------|
| `useConfigStore` | `@timba:config` | GameConfig (multiplier, denominations) |
| `usePlayersStore` | `@timba:players` | Saved Player[] with CRUD |
| `useSessionStore` | `@timba:session` | Active Session with transactions |

## Development Commands
```bash
npm install          # Install dependencies
npx expo start       # Start dev server (scan QR with Expo Go)
npx expo start --android
npx expo start --ios
```

## Color Scheme
| Token | Hex | Use |
|-------|-----|-----|
| background | #0d1117 | Screen backgrounds |
| surface | #161b22 | Cards, sheets |
| surfaceRaised | #1c2128 | Inputs, chips |
| border | #30363d | Dividers |
| text | #e6edf3 | Primary text |
| textSecondary | #8b949e | Labels, hints |
| green | #3fb950 | Positive balance, gains |
| red | #f85149 | Negative balance, losses |
| yellow | #d29922 | Warnings, latest tx badge |
| blue | #58a6ff | Actions, selections |

## Common Gotchas
- **Expo Router entry**: `"main": "expo-router/entry"` in package.json is required.
- **SafeAreaView**: Always import from `react-native-safe-area-context`, not `react-native`.
- **Keyboard avoidance**: Use `KeyboardAvoidingView` with `behavior="padding"` on iOS and `"height"` on Android in modals.
- **AsyncStorage is async**: All store mutation actions are `async`; always `await` them in effects or handlers that chain operations.
