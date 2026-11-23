import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Player, SessionPlayer } from '../types';
import { formatCurrency, formatGames } from '../utils/currency';
import { Colors, Spacing, FontSize } from '../theme';

interface PlayerCardProps {
  player: Player;
  sessionPlayer: SessionPlayer;
  gameValue: number;
  onQuickAdd: (playerId: string) => void;   // receives 1 game
  onQuickSub: (playerId: string) => void;   // loses 1 game
  onPress: (playerId: string) => void;       // open transaction modal
}

export function PlayerCard({
  player,
  sessionPlayer,
  gameValue,
  onQuickAdd,
  onQuickSub,
  onPress,
}: PlayerCardProps) {
  const { balance } = sessionPlayer;
  const balanceColor =
    balance > 0 ? Colors.green : balance < 0 ? Colors.red : Colors.textSecondary;

  const displayName = player.alias ? `${player.name} (${player.alias})` : player.name;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(sessionPlayer.playerId)}
      activeOpacity={0.75}
    >
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={[styles.balance, { color: balanceColor }]}>
          {formatCurrency(balance)}
        </Text>
        <Text style={[styles.games, { color: balanceColor }]}>
          {formatGames(balance, gameValue)}
        </Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, styles.btnRed]}
          onPress={() => onQuickSub(sessionPlayer.playerId)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
        >
          <Text style={styles.btnText}>-1g</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnGreen]}
          onPress={() => onQuickAdd(sessionPlayer.playerId)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        >
          <Text style={styles.btnText}>+1g</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: {
    flex: 1,
  },
  name: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  balance: {
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  games: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGreen: {
    backgroundColor: '#1a3a1a',
    borderWidth: 1,
    borderColor: Colors.green,
  },
  btnRed: {
    backgroundColor: '#3a1a1a',
    borderWidth: 1,
    borderColor: Colors.red,
  },
  btnText: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
