import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from '../utils/currency';
import { Colors } from '../theme';

interface BalanceIndicatorProps {
  totalBalance: number;
  playerCount: number;
}

export function BalanceIndicator({ totalBalance, playerCount }: BalanceIndicatorProps) {
  const isBalanced = Math.abs(totalBalance) < 0.001;
  const color = isBalanced ? Colors.green : Colors.red;

  return (
    <View style={[styles.container, { borderColor: color }]}>
      <View style={styles.row}>
        <Text style={styles.label}>Mesa</Text>
        <Text style={[styles.amount, { color }]}>
          {isBalanced ? '$0' : formatCurrency(totalBalance)}
        </Text>
      </View>
      {!isBalanced && (
        <Text style={styles.warning}>
          Desbalanceado — revisa las transacciones
        </Text>
      )}
      {isBalanced && playerCount > 0 && (
        <Text style={styles.ok}>Zero-sum OK</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amount: {
    fontSize: 22,
    fontWeight: '800',
  },
  warning: {
    color: Colors.red,
    fontSize: 12,
    marginTop: 4,
  },
  ok: {
    color: Colors.green,
    fontSize: 12,
    marginTop: 2,
  },
});
