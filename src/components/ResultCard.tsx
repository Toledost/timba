import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArchivedSession } from '../types';
import { formatCurrency, formatDateTime } from '../utils/currency';
import { Colors, Spacing, FontSize } from '../theme';

interface Props {
  session: ArchivedSession;
}

export function ResultCard({ session }: Props) {
  const sorted = [...session.playerResults].sort((a, b) => b.netResult - a.netResult);
  const winner = sorted[0];
  const loser = sorted[sorted.length - 1];
  const allEven = sorted.every((pr) => pr.netResult === 0);

  const durationMs = session.durationMs ?? (session.endedAt - session.startedAt);
  const durationH = Math.floor(durationMs / 3600000);
  const durationM = Math.floor((durationMs % 3600000) / 60000);
  const durationStr = `${String(durationH).padStart(2, '0')}:${String(durationM).padStart(2, '0')}`;

  return (
    <View style={styles.wrapper}>
      {/* Card visual */}
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>♠ Timba</Text>
          <Text style={styles.headerDate}>{formatDateTime(session.startedAt)}</Text>
          <Text style={styles.headerMeta}>{durationStr} · {session.transactionCount} movimientos</Text>
        </View>

        {allEven ? (
          <View style={styles.winnerBlock}>
            <Text style={styles.trophy}>🤝</Text>
            <Text style={styles.winnerName}>Todos iguales</Text>
            <Text style={styles.winnerLabel}>SIN GANADOR</Text>
          </View>
        ) : winner && winner.netResult > 0 ? (
          <View style={styles.winnerBlock}>
            <Text style={styles.trophy}>🏆</Text>
            <Text style={styles.winnerName}>{winner.playerName}</Text>
            <Text style={styles.winnerAmount}>+{formatCurrency(winner.netResult)}</Text>
            <Text style={styles.winnerLabel}>GANADOR</Text>
          </View>
        ) : null}

        <View style={styles.resultsBlock}>
          {sorted.map((pr, i) => {
            const isWinner = i === 0 && pr.netResult > 0;
            const isLoser = i === sorted.length - 1 && pr.netResult < 0;
            return (
              <View key={pr.playerId} style={styles.resultRow}>
                <Text style={styles.resultEmoji}>
                  {isWinner ? '🥇' : isLoser ? '😭' : '▪'}
                </Text>
                <Text style={styles.resultName}>{pr.playerName}</Text>
                <Text style={[
                  styles.resultAmount,
                  pr.netResult > 0 ? styles.positive : pr.netResult < 0 ? styles.negative : styles.zero,
                ]}>
                  {pr.netResult > 0 ? '+' : ''}{formatCurrency(pr.netResult)}
                </Text>
              </View>
            );
          })}
        </View>

        {loser && loser.netResult < 0 && loser.playerId !== winner?.playerId && (
          <View style={styles.loserBlock}>
            <Text style={styles.loserEmoji}>😭</Text>
            <Text style={styles.loserName}>{loser.playerName}</Text>
            <Text style={styles.loserAmount}>{formatCurrency(loser.netResult)}</Text>
            <Text style={styles.loserLabel}>PERDEDOR</Text>
          </View>
        )}

        <Text style={styles.footer}>Generado con Timba</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    padding: Spacing.md,
  },
  card: {
    backgroundColor: '#0d1117',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.yellow,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#161b22',
    padding: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.yellow,
  },
  headerTitle: {
    color: Colors.yellow,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerDate: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  headerMeta: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  winnerBlock: {
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: '#0d2b15',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  trophy: { fontSize: 48 },
  winnerName: {
    color: Colors.green,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  winnerAmount: {
    color: Colors.green,
    fontSize: 20,
    fontWeight: '700',
  },
  winnerLabel: {
    color: Colors.green,
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 2,
    opacity: 0.7,
  },
  resultsBlock: {
    padding: Spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultEmoji: { fontSize: 16, width: 28 },
  resultName: {
    color: Colors.text,
    fontSize: FontSize.md,
    flex: 1,
    fontWeight: '600',
  },
  resultAmount: {
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  positive: { color: Colors.green },
  negative: { color: Colors.red },
  zero: { color: Colors.textSecondary },
  loserBlock: {
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: '#2b1010',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  loserEmoji: { fontSize: 40 },
  loserName: {
    color: Colors.red,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  loserAmount: {
    color: Colors.red,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  loserLabel: {
    color: Colors.red,
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 2,
    opacity: 0.7,
  },
  footer: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    textAlign: 'center',
    padding: Spacing.sm,
    opacity: 0.5,
  },
});
