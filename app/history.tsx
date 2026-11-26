import React, { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore, usePlayersStore, useConfigStore } from '../src/store';
import { Transaction, BANCA_ID } from '../src/types';
import { formatCurrency, formatGames, formatDateTime } from '../src/utils/currency';
import { Colors, Spacing, FontSize } from '../src/theme';

export default function HistoryScreen() {
  const { session, lastSessionPlayers, lastSessionTransactions, undoLastTransaction } = useSessionStore();
  const { players } = usePlayersStore();
  const { gameValue, config } = useConfigStore();

  const { openChips } = useLocalSearchParams<{ openChips?: string }>();

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const [confirmUndo, setConfirmUndo] = useState(false);
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
  // Record<playerId, Record<denominationIndex, quantity string>>
  const [chipCounts, setChipCounts] = useState<Record<string, Record<number, string>>>({});
  const [copied, setCopied] = useState(false);

  const setDenomCount = (playerId: string, denomIdx: number, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setChipCounts((prev) => ({
      ...prev,
      [playerId]: { ...(prev[playerId] ?? {}), [denomIdx]: sanitized },
    }));
  };

  const getPlayerTotal = (playerId: string): number => {
    if (!config) return 0;
    return config.denominations.reduce((sum, denom, idx) => {
      const qty = parseInt(chipCounts[playerId]?.[idx] ?? '0', 10) || 0;
      return sum + qty * denom.value * config.multiplier;
    }, 0);
  };

  const renderChipCountFooter = () => {
    const sessionPlayers = session?.players ?? lastSessionPlayers;
    if (!sessionPlayers || !config) return null;
    const humanPlayers = sessionPlayers.filter((sp) => sp.playerId !== BANCA_ID);

    return (
      <View style={styles.chipSection}>
        {/* Collapsible header */}
        <TouchableOpacity
          style={styles.chipSectionHeader}
          onPress={() => setChipCountOpen((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.chipSectionTitle}>🎲 Conteo de fichas</Text>
          <Text style={styles.chipSectionChevron}>{chipCountOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {chipCountOpen && (
          <View style={styles.chipSectionBody}>
            {humanPlayers.map((sp) => {
              const name =
                sp.playerId === BANCA_ID
                  ? 'Banca'
                  : playerMap[sp.playerId]?.alias || playerMap[sp.playerId]?.name || sp.playerId;
              const playerTotal = getPlayerTotal(sp.playerId);

              return (
                <View key={sp.playerId} style={styles.chipPlayer}>
                  <Text style={styles.chipPlayerName}>{name}</Text>
                  {config.denominations.map((denom, idx) => {
                    const qty = chipCounts[sp.playerId]?.[idx] ?? '';
                    const subtotal = (parseInt(qty || '0', 10) || 0) * denom.value;
                    return (
                      <View key={idx} style={styles.chipDenomRow}>
                        <Text style={styles.chipDenomLabel}>{formatCurrency(denom.value)}</Text>
                        <TextInput
                          style={styles.chipInput}
                          value={qty}
                          onChangeText={(v) => setDenomCount(sp.playerId, idx, v)}
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor={Colors.textSecondary}
                          maxLength={4}
                        />
                        <Text style={styles.chipDenomSubtotal}>
                          {subtotal > 0 ? formatCurrency(subtotal) : '—'}
                        </Text>
                      </View>
                    );
                  })}
                  <View style={styles.chipPlayerTotalRow}>
                    <Text style={styles.chipPlayerTotalLabel}>Total</Text>
                    <Text
                      style={[
                        styles.chipPlayerTotal,
                        playerTotal > 0
                          ? styles.chipTotalPositive
                          : playerTotal < 0
                          ? styles.chipTotalNegative
                          : styles.chipTotalZero,
                      ]}
                    >
                      {formatCurrency(playerTotal)}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Saldo banca = lo que todos compraron en total */}
            {(() => {
              const allPlayers = session?.players ?? lastSessionPlayers ?? [];
              const bancaBal = allPlayers.find((p) => p.playerId === BANCA_ID)?.balance ?? 0;
              if (bancaBal === 0) return null;
              return (
                <View style={styles.bancaRow}>
                  <Text style={styles.bancaLabel}>Saldo banca (referencia)</Text>
                  <Text style={styles.bancaValue}>{formatCurrency(bancaBal)}</Text>
                </View>
              );
            })()}

            {/* Saldos netos + pagos — solo si hay fichas cargadas */}
            {(() => {
              const anyFilled = humanPlayers.some((sp) => getPlayerTotal(sp.playerId) !== 0);
              if (!anyFilled) return null;

              const allPlayers = session?.players ?? lastSessionPlayers ?? [];

              // neto = fichas_reales + saldo_sesion
              // saldo_sesion es negativo para quien compró a banca y no recuperó
              // ej: compró 1j (-4550) y tiene 2500 en fichas → neto = 2500 + (-4550) = -2050...
              // PERO si vendió 1j a otro: saldo_sesion = -4550 + 4550 = 0 → neto = 2500
              // La fórmula correcta: neto = fichas - inversión_neta
              // inversión_neta = -(saldo_sesion) cuando saldo < 0 (lo que debe a banca)
              // O más simple: neto = fichas + saldo_sesion (saldo ya incluye todo)
              const nets = humanPlayers.map((sp) => {
                const sessionBal = allPlayers.find((p) => p.playerId === sp.playerId)?.balance ?? 0;
                const chips = getPlayerTotal(sp.playerId);
                return { id: sp.playerId, net: chips + sessionBal };
              });

              const debtors = nets.filter((t) => t.net < 0).map((t) => ({ id: t.id, bal: -t.net }));
              const creditors = nets.filter((t) => t.net > 0).map((t) => ({ id: t.id, bal: t.net }));

              const settlements: { from: string; to: string; amount: number }[] = [];
              const d = debtors.map((t) => ({ ...t }));
              const c = creditors.map((t) => ({ ...t }));
              let i = 0, j = 0;
              while (i < d.length && j < c.length) {
                const amount = Math.min(d[i].bal, c[j].bal);
                settlements.push({ from: d[i].id, to: c[j].id, amount });
                d[i].bal -= amount;
                c[j].bal -= amount;
                if (d[i].bal < 0.01) i++;
                if (c[j].bal < 0.01) j++;
              }

              return (
                <>
                  <View style={styles.settlementsSection}>
                    <Text style={styles.settlementsTitle}>SALDOS NETOS</Text>
                    {nets.map((t) => {
                      const name = playerMap[t.id]?.alias || playerMap[t.id]?.name || t.id;
                      const color = t.net > 0 ? Colors.green : t.net < 0 ? Colors.red : Colors.textSecondary;
                      return (
                        <View key={t.id} style={styles.verifyRow}>
                          <Text style={styles.verifyName}>{name}</Text>
                          <Text style={[styles.verifyChips, { color }]}>
                            {t.net > 0 ? '+' : ''}{formatCurrency(t.net)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {settlements.length > 0 && (
                    <View style={[styles.settlementsSection, { borderTopWidth: 0 }]}>
                      <View style={styles.settlementsTitleRow}>
                        <Text style={styles.settlementsTitle}>PAGOS A REALIZAR</Text>
                        <TouchableOpacity
                          onPress={async () => {
                            const lines = settlements.map((s) => {
                              const f = playerMap[s.from]?.alias || playerMap[s.from]?.name || s.from;
                              const t = playerMap[s.to]?.alias || playerMap[s.to]?.name || s.to;
                              return `• ${f} le paga a ${t}: ${formatCurrency(s.amount)}`;
                            });
                            const msg = `🃏 *Pagos de la partida*\n\n${lines.join('\n')}`;
                            await Clipboard.setStringAsync(msg);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          style={styles.copyBtn}
                        >
                          <Text style={styles.copyBtnText}>{copied ? '✓ Copiado' : '📋 Copiar'}</Text>
                        </TouchableOpacity>
                      </View>
                      {settlements.map((s, idx) => {
                        const fromName = playerMap[s.from]?.alias || playerMap[s.from]?.name || s.from;
                        const toName = playerMap[s.to]?.alias || playerMap[s.to]?.name || s.to;
                        return (
                          <View key={idx} style={styles.settlementRow}>
                            <Text style={styles.settlementFrom}>{fromName}</Text>
                            <Text style={styles.settlementArrow}> le paga a </Text>
                            <Text style={styles.settlementTo}>{toName}</Text>
                            <Text style={styles.settlementAmount}> {formatCurrency(s.amount)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        )}
      </View>
    );
  };

  const transactions = [...(session?.transactions ?? lastSessionTransactions ?? [])].reverse();

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
                  <Text style={styles.txGames}>{formatGames(item.amount, gameValue)}</Text>
                </View>
              </View>
            ))
          )}
          {session && transactions.length > 0 && (
            <TouchableOpacity style={styles.undoBtnInline} onPress={handleUndo}>
              <Text style={styles.undoBtnText}>↩ Deshacer último</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
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
          </>
        )}
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
