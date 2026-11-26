import React, { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore, usePlayersStore, useConfigStore, useHistoryStore } from '../src/store';
import { BANCA_ID } from '../src/types';
import { formatCurrency, formatDateTime } from '../src/utils/currency';
import { Colors, Spacing, FontSize } from '../src/theme';
import { ChipCountSection } from '../src/components/ChipCountSection';
import { TransactionModal } from '../src/components/TransactionModal';

export default function HistoryScreen() {
  const { session, lastSessionId, lastSessionPlayers, lastSessionTransactions, removeTransaction, editTransaction } = useSessionStore();
  const { players } = usePlayersStore();
  const { config, gameValue } = useConfigStore();
  const { archivedSessions, deleteSession } = useHistoryStore();

  const { openChips } = useLocalSearchParams<{ openChips?: string }>();

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const [confirmTx, setConfirmTx] = useState<string | null>(null);
  const [editTxId, setEditTxId] = useState<string | null>(null);
  const sessionEnded = !session && !!lastSessionPlayers;
  const [chipCountOpen, setChipCountOpen] = useState(false);
  const [historyOpenOverride, setHistoryOpenOverride] = useState<boolean | null>(null);

  const isHistoryOpen = historyOpenOverride !== null ? historyOpenOverride : !sessionEnded;

  useEffect(() => {
    if (openChips === '1') {
      setChipCountOpen(true);
      setHistoryOpenOverride(false);
    }
  }, [openChips]);
  const renderChipCountFooter = () => {
    const sessionPlayers = session?.players ?? lastSessionPlayers;
    const allPlayers = session?.players ?? lastSessionPlayers ?? [];
    if (!sessionPlayers || !config) return null;
    return (
      <View style={styles.chipSection}>
        <TouchableOpacity
          style={styles.chipSectionHeader}
          onPress={() => setChipCountOpen((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.chipSectionTitle}>🎲 Conteo de fichas</Text>
          <Text style={styles.chipSectionChevron}>{chipCountOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {chipCountOpen && (
          <ChipCountSection
            sessionId={session?.id ?? lastSessionId ?? ''}
            sessionPlayers={sessionPlayers}
            allPlayers={allPlayers}
            playerMap={playerMap}
            config={config}
          />
        )}
      </View>
    );
  };

  const transactions = [...(session?.transactions ?? lastSessionTransactions ?? [])].reverse();

  const getName = (id: string) =>
    id === BANCA_ID ? 'Banca' : playerMap[id]?.alias || playerMap[id]?.name || id;

  const [archivedOpen, setArchivedOpen] = useState(false);
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<string | null>(null);

  const renderArchivedSessions = () => (
    <View style={styles.chipSection}>
      <TouchableOpacity
        style={styles.chipSectionHeader}
        onPress={() => setArchivedOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.chipSectionTitle}>📚 Partidas anteriores ({archivedSessions.length})</Text>
        <Text style={styles.chipSectionChevron}>{archivedOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {archivedOpen && (
        <View style={styles.chipSectionBody}>
          {archivedSessions.length === 0 ? (
            <Text style={{ color: Colors.textSecondary, padding: Spacing.md, fontSize: FontSize.sm }}>
              Sin partidas anteriores
            </Text>
          ) : (
            archivedSessions.map((as) => {
              const durationMs = as.endedAt - as.startedAt;
              const durationH = Math.floor(durationMs / 3600000);
              const durationM = Math.floor((durationMs % 3600000) / 60000);
              const durationStr = `${String(durationH).padStart(2, '0')}:${String(durationM).padStart(2, '0')}`;
              return (
                <View key={as.id} style={styles.archivedCard}>
                  <View style={styles.archivedHeader}>
                    <Text style={styles.archivedDate}>{formatDateTime(as.startedAt)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={styles.archivedMeta}>{durationStr} · {as.transactionCount} mov.</Text>
                      <TouchableOpacity
                        onPress={() => setDeleteSessionTarget(as.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.archivedDeleteBtn}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {as.playerResults.map((pr) => (
                    <View key={pr.playerId} style={styles.archivedPlayerRow}>
                      <Text style={styles.archivedPlayerName}>{pr.playerName}</Text>
                      <Text style={[
                        styles.archivedPlayerResult,
                        pr.netResult > 0 ? { color: Colors.green } : pr.netResult < 0 ? { color: Colors.red } : { color: Colors.textSecondary },
                      ]}>
                        {pr.netResult > 0 ? '+' : ''}{formatCurrency(pr.netResult)}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );

  const renderHistorySection = () => (
    <View style={styles.chipSection}>
      <TouchableOpacity
        style={styles.chipSectionHeader}
        onPress={() => setHistoryOpenOverride((v) => !(v !== null ? v : !sessionEnded))}
        activeOpacity={0.7}
      >
        <Text style={styles.chipSectionTitle}>📋 Movimientos ({transactions.length})</Text>
        <Text style={styles.chipSectionChevron}>{isHistoryOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {isHistoryOpen && (
        <View style={styles.chipSectionBody}>
          {transactions.length === 0 ? (
            <Text style={{ color: Colors.textSecondary, padding: Spacing.md, fontSize: FontSize.sm }}>Sin movimientos</Text>
          ) : (
            transactions.map((item) => (
              <View key={item.id} style={[styles.txRow, { marginHorizontal: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderBottomWidth: 1, borderBottomColor: Colors.border }]}>
                <View style={styles.txLeft}>
                  <View style={styles.txPlayers}>
                    <Text style={styles.txFrom}>{getName(item.fromPlayerId)}</Text>
                    <Text style={styles.txArrow}>→</Text>
                    <Text style={styles.txTo}>{getName(item.toPlayerId)}</Text>
                  </View>
                  <Text style={styles.txTime}>{formatDateTime(item.timestamp)}</Text>
                  {item.note ? <Text style={styles.txNote}>{item.note}</Text> : null}
                </View>
                <View style={styles.txRight}>
                  <Text style={styles.txAmount}>{formatCurrency(item.amount)}</Text>
                  {session && (
                    <View style={styles.txActions}>
                      <TouchableOpacity onPress={() => setEditTxId(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={styles.txEditBtn}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setConfirmTx(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={styles.txUndoBtn}>↩</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );

  const renderDeleteSessionModal = () => (
    <Modal visible={!!deleteSessionTarget} transparent animationType="fade" onRequestClose={() => setDeleteSessionTarget(null)}>
      <View style={styles.overlay}>
        <View style={styles.confirmSheet}>
          <Text style={styles.confirmTitle}>¿Eliminar partida?</Text>
          <Text style={styles.confirmDetail}>
            {(() => {
              const as = archivedSessions.find((s) => s.id === deleteSessionTarget);
              return as ? formatDateTime(as.startedAt) : '';
            })()}
          </Text>
          <TouchableOpacity
            style={styles.undoConfirmBtn}
            onPress={() => { deleteSession(deleteSessionTarget!); setDeleteSessionTarget(null); }}
          >
            <Text style={styles.undoConfirmText}>Eliminar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteSessionTarget(null)}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        {lastSessionPlayers ? (
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Partida finalizada</Text>
            </View>
            <FlatList
              data={[]}
              renderItem={() => null}
              ListFooterComponent={() => (
                <>
                  {renderHistorySection()}
                  {renderChipCountFooter()}
                  {renderArchivedSessions()}
                </>
              )}
              contentContainerStyle={{ paddingBottom: 32 }}
            />
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sin partida activa</Text>
            <Text style={styles.emptySubtitle}>
              El historial aparece aquí durante una partida
            </Text>
          </View>
        )}
        {renderDeleteSessionModal()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historial</Text>
      </View>

      <FlatList
        data={[]}
        renderItem={() => null}
        ListFooterComponent={() => (
          <>
            {renderHistorySection()}
            {renderChipCountFooter()}
            {renderArchivedSessions()}
          </>
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
      />

      {session && (() => {
        const editTx = session.transactions.find((t) => t.id === editTxId);
        const sessionPlayers = session.players.filter(p => p.playerId !== BANCA_ID);
        return (
          <TransactionModal
            visible={!!editTxId}
            players={sessionPlayers}
            playerMap={playerMap}
            gameValue={gameValue}
            initialFromId={editTx?.fromPlayerId}
            initialToId={editTx?.toPlayerId}
            onClose={() => setEditTxId(null)}
            onConfirm={(fromId, toId, amount, note) => {
              editTransaction(editTxId!, fromId, toId, amount, note);
              setEditTxId(null);
            }}
          />
        );
      })()}

      {renderDeleteSessionModal()}

      {session && (
        <Modal visible={!!confirmTx} transparent animationType="fade" onRequestClose={() => setConfirmTx(null)}>
          <View style={styles.overlay}>
            <View style={styles.confirmSheet}>
              <Text style={styles.confirmTitle}>¿Eliminar movimiento?</Text>
              {(() => {
                const tx = session.transactions.find((t) => t.id === confirmTx);
                if (!tx) return null;
                return (
                  <Text style={styles.confirmDetail}>
                    {getName(tx.fromPlayerId)} → {getName(tx.toPlayerId)} · {formatCurrency(tx.amount)}
                  </Text>
                );
              })()}
              <TouchableOpacity
                style={styles.undoConfirmBtn}
                onPress={() => { const id = confirmTx!; setConfirmTx(null); removeTransaction(id); }}
              >
                <Text style={styles.undoConfirmText}>↩ Eliminar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmTx(null)}>
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
  txActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    justifyContent: 'flex-end',
  },
  txEditBtn: {
    fontSize: FontSize.md,
  },
  txUndoBtn: {
    color: Colors.red,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  undoBtnInline: {
    backgroundColor: '#3a1a1a',
    borderTopWidth: 1,
    borderColor: Colors.red,
    paddingVertical: 12,
    alignItems: 'center',
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

  // Archived sessions
  archivedCard: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
  },
  archivedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  archivedDate: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  archivedMeta: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  archivedPlayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  archivedDeleteBtn: {
    color: Colors.red,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  archivedPlayerName: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  archivedPlayerResult: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },

  // Chip count section
  chipSection: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  chipSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  chipSectionTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  chipSectionChevron: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  chipSectionBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  chipPlayer: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chipPlayerName: {
    color: Colors.blue,
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  chipDenomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  chipDenomLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    width: 48,
  },
  chipInput: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    color: Colors.text,
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    width: 64,
    textAlign: 'center',
  },
  chipDenomSubtotal: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginLeft: Spacing.sm,
    flex: 1,
    textAlign: 'right',
  },
  chipPlayerTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  chipPlayerTotalLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  chipPlayerTotal: {
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  chipTotalPositive: {
    color: Colors.green,
  },
  chipTotalNegative: {
    color: Colors.red,
  },
  chipTotalZero: {
    color: Colors.textSecondary,
  },
  chipTotalYellow: {
    color: Colors.yellow,
  },
  chipGrandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  chipGrandTotalOk: {
    backgroundColor: '#0d2b15',
  },
  chipGrandTotalWarn: {
    backgroundColor: '#2b1f0d',
  },
  chipGrandTotalLabel: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  chipGrandTotalValue: {
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  bancaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#0d1a2b',
  },
  bancaLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  bancaValue: {
    color: Colors.blue,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  verifyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  verifyName: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  verifyRight: {
    alignItems: 'flex-end',
  },
  verifyChips: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  verifyDiff: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  settlementsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  copyBtn: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  copyBtnText: {
    color: Colors.blue,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  settlementsSection: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  settlementsTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  settlementRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 8,
    padding: 12,
    marginBottom: Spacing.xs,
  },
  settlementFrom: {
    color: Colors.red,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  settlementArrow: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  settlementTo: {
    color: Colors.green,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  settlementAmount: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
});
