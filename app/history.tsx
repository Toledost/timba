import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore, usePlayersStore, useConfigStore } from '../src/store';
import { Transaction, BANCA_ID } from '../src/types';
import { formatCurrency, formatGames, formatDateTime } from '../src/utils/currency';
import { Colors, Spacing, FontSize } from '../src/theme';

export default function HistoryScreen() {
  const { session, undoLastTransaction } = useSessionStore();
  const { players } = usePlayersStore();
  const { gameValue } = useConfigStore();

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const [confirmUndo, setConfirmUndo] = useState(false);

  const transactions = session ? [...session.transactions].reverse() : [];

  const getName = (id: string) =>
    id === BANCA_ID ? 'Banca' : playerMap[id]?.alias || playerMap[id]?.name || id;

  const handleUndo = () => {
    if (!session || session.transactions.length === 0) return;
    setConfirmUndo(true);
  };

  const renderTx = ({ item, index }: { item: Transaction; index: number }) => {
    const isLast = index === 0;
    return (
      <View style={[styles.txRow, isLast && styles.txRowLast]}>
        <View style={styles.txLeft}>
          <View style={styles.txPlayers}>
            <Text style={styles.txFrom}>{getName(item.fromPlayerId)}</Text>
            <Text style={styles.txArrow}>→</Text>
            <Text style={styles.txTo}>{getName(item.toPlayerId)}</Text>
          </View>
          <Text style={styles.txTime}>{formatDateTime(item.timestamp)}</Text>
          {item.note ? (
            <Text style={styles.txNote}>{item.note}</Text>
          ) : null}
        </View>
        <View style={styles.txRight}>
          <Text style={styles.txAmount}>{formatCurrency(item.amount)}</Text>
          <Text style={styles.txGames}>{formatGames(item.amount, gameValue)}</Text>
        </View>
        {isLast && (
          <View style={styles.lastBadge}>
            <Text style={styles.lastBadgeText}>último</Text>
          </View>
        )}
      </View>
    );
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Sin partida activa</Text>
          <Text style={styles.emptySubtitle}>
            El historial aparece aquí durante una partida
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Historial</Text>
          <Text style={styles.headerSub}>
            {session.transactions.length} transacciones
          </Text>
        </View>
        {session.transactions.length > 0 && (
          <TouchableOpacity style={styles.undoBtn} onPress={handleUndo}>
            <Text style={styles.undoBtnText}>↩ Deshacer</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(tx) => tx.id}
        renderItem={renderTx}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sin transacciones</Text>
            <Text style={styles.emptySubtitle}>
              Las transacciones aparecerán aquí
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />

      {session && session.transactions.length > 0 && (
        <Modal visible={confirmUndo} transparent animationType="fade" onRequestClose={() => setConfirmUndo(false)}>
          <View style={styles.overlay}>
            <View style={styles.confirmSheet}>
              <Text style={styles.confirmTitle}>¿Deshacer última transacción?</Text>
              {(() => {
                const last = session.transactions[session.transactions.length - 1];
                return (
                  <Text style={styles.confirmDetail}>
                    {getName(last.fromPlayerId)} → {getName(last.toPlayerId)} · {formatCurrency(last.amount)}
                  </Text>
                );
              })()}
              <TouchableOpacity
                style={styles.undoConfirmBtn}
                onPress={() => { setConfirmUndo(false); undoLastTransaction(); }}
              >
                <Text style={styles.undoConfirmText}>↩ Deshacer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmUndo(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  headerSub: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  undoBtn: {
    backgroundColor: '#3a1a1a',
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  undoBtnText: {
    color: Colors.red,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  txRow: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  txRowLast: {
    borderColor: Colors.yellow,
  },
  txLeft: {
    flex: 1,
  },
  txPlayers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  txFrom: {
    color: Colors.red,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  txArrow: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  txTo: {
    color: Colors.green,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  txTime: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  txNote: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  txGames: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  lastBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: Colors.yellow,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lastBadgeText: {
    color: Colors.background,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    padding: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  confirmSheet: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.md,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  confirmDetail: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  undoConfirmBtn: {
    backgroundColor: '#3a1a1a',
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  undoConfirmText: {
    color: Colors.red,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
});
