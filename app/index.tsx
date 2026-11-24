import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore, usePlayersStore, useConfigStore } from '../src/store';
import { PlayerCard } from '../src/components/PlayerCard';
import { BalanceIndicator } from '../src/components/BalanceIndicator';
import { TransactionModal } from '../src/components/TransactionModal';
import { getTotalBalance } from '../src/utils/balance';
import { formatCurrency, formatDateTime } from '../src/utils/currency';
import { Colors, Spacing, FontSize } from '../src/theme';
import { Player, BANCA_ID } from '../src/types';

export default function SessionScreen() {
  const { session, startSession, endSession, addTransaction, buyFromBanca, returnToBanca } = useSessionStore();
  const { players } = usePlayersStore();
  const { gameValue } = useConfigStore();

  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txInitialFrom, setTxInitialFrom] = useState<string | undefined>();
  const [txInitialTo, setTxInitialTo] = useState<string | undefined>();
  const [selectPlayersVisible, setSelectPlayersVisible] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [confirmEndVisible, setConfirmEndVisible] = useState(false);

  // Build a map from playerId → Player for fast lookup
  const playerMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])) as Record<string, Player>,
    [players]
  );

  const totalBalance = session ? getTotalBalance(session.players) : 0;

  // ---- Handlers ----

  // +1j: este jugador VENDE 1 juego a otro
  // from = comprador (pierde plata), to = vendedor (gana plata)
  const handleSellToPlayer = (sellerPlayerId: string) => {
    if (!session) return;
    const others = sessionPlayers.filter((p) => p.playerId !== sellerPlayerId);
    if (others.length === 1) {
      addTransaction(others[0].playerId, sellerPlayerId, gameValue, 'Venta de juego');
    } else {
      setTxInitialFrom(undefined);
      setTxInitialTo(sellerPlayerId);
      setTxModalVisible(true);
    }
  };

  const handleCardPress = (playerId: string) => {
    setTxInitialFrom(playerId);
    setTxModalVisible(true);
  };

  const handleTxConfirm = (
    fromId: string,
    toId: string,
    amount: number,
    note?: string
  ) => {
    addTransaction(fromId, toId, amount, note);
    setTxModalVisible(false);
  };

  const handleStartSession = () => {
    if (selectedPlayerIds.size < 2) {
      Alert.alert('Faltan jugadores', 'Selecciona al menos 2 jugadores');
      return;
    }
    startSession(Array.from(selectedPlayerIds));
    setSelectPlayersVisible(false);
    setSelectedPlayerIds(new Set());
  };

  const handleEndSession = () => setConfirmEndVisible(true);

  const togglePlayerSelect = (id: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ---- No active session ----
  if (!session || !session.isActive) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>♠</Text>
          <Text style={styles.emptyTitle}>Timba</Text>
          <Text style={styles.emptySubtitle}>No hay partida activa</Text>

          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => setSelectPlayersVisible(true)}
          >
            <Text style={styles.startBtnText}>Nueva Partida</Text>
          </TouchableOpacity>

          {players.length === 0 && (
            <Text style={styles.hint}>
              Primero agrega jugadores en la tab "Jugadores"
            </Text>
          )}
        </View>

        {/* Player selection modal */}
        <Modal
          visible={selectPlayersVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectPlayersVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Seleccionar Jugadores</Text>
              <Text style={styles.modalSubtitle}>
                {selectedPlayerIds.size} seleccionados (mínimo 2)
              </Text>

              <ScrollView style={{ maxHeight: 320, marginBottom: 16 }}>
                {players.length === 0 ? (
                  <Text style={styles.emptyList}>
                    No hay jugadores. Agrégalos en la tab Jugadores.
                  </Text>
                ) : (
                  players.map((p) => {
                    const sel = selectedPlayerIds.has(p.id);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.selectItem, sel && styles.selectItemActive]}
                        onPress={() => togglePlayerSelect(p.id)}
                      >
                        <Text style={styles.selectItemText}>
                          {p.name}{p.alias ? ` (${p.alias})` : ''}
                        </Text>
                        {sel && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              <TouchableOpacity style={styles.startBtn} onPress={handleStartSession}>
                <Text style={styles.startBtnText}>Comenzar Partida</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSelectPlayersVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ---- Active session ----
  const sessionPlayers = session.players.filter(p => p.playerId !== BANCA_ID);

  return (
    <SafeAreaView style={styles.safe}>
      <BalanceIndicator
        totalBalance={totalBalance}
        playerCount={sessionPlayers.length}
      />

      <View style={styles.sessionInfo}>
        <Text style={styles.sessionInfoText}>
          Inicio: {formatDateTime(session.startedAt)}
        </Text>
        <Text style={styles.sessionInfoText}>
          {sessionPlayers.length} jugadores · {session.transactions.length} txns
        </Text>
      </View>

      <FlatList
        data={sessionPlayers}
        keyExtractor={(sp) => sp.playerId}
        renderItem={({ item: sp }) => {
          const player = playerMap[sp.playerId];
          if (!player) return null;
          return (
            <PlayerCard
              player={player}
              sessionPlayer={sp}
              gameValue={gameValue}
              onSellToPlayer={handleSellToPlayer}
              onPress={handleCardPress}
              onBuyFromBanca={buyFromBanca}
              onReturnToBanca={returnToBanca}
            />
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyList}>Sin jugadores en la sesión</Text>
        }
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.newTxBtn}
          onPress={() => { setTxInitialFrom(undefined); setTxInitialTo(undefined); setTxModalVisible(true); }}
        >
          <Text style={styles.newTxBtnText}>+ Transacción</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.endBtn} onPress={handleEndSession}>
          <Text style={styles.endBtnText}>Terminar</Text>
        </TouchableOpacity>
      </View>

      <TransactionModal
        visible={txModalVisible}
        players={sessionPlayers}
        playerMap={playerMap}
        gameValue={gameValue}
        initialFromId={txInitialFrom}
        initialToId={txInitialTo}
        onClose={() => { setTxModalVisible(false); setTxInitialTo(undefined); }}
        onConfirm={handleTxConfirm}
      />

      <Modal visible={confirmEndVisible} transparent animationType="slide" onRequestClose={() => setConfirmEndVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { borderRadius: 14, maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>Resumen de partida</Text>

            <ScrollView style={{ marginBottom: 16 }} showsVerticalScrollIndicator={false}>
              {/* Balance por jugador */}
              <Text style={styles.summarySection}>Saldos finales</Text>
              {session && session.players.map((sp) => {
                const p = playerMap[sp.playerId];
                if (!p) return null;
                const color = sp.balance > 0 ? Colors.green : sp.balance < 0 ? Colors.red : Colors.textSecondary;
                const games = gameValue > 0 ? (sp.balance / gameValue) : 0;
                return (
                  <View key={sp.playerId} style={styles.summaryRow}>
                    <Text style={styles.summaryName}>{p.alias || p.name}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.summaryBalance, { color }]}>{formatCurrency(sp.balance)}</Text>
                      <Text style={styles.summaryGames}>{games > 0 ? '+' : ''}{games.toFixed(2)}j</Text>
                    </View>
                  </View>
                );
              })}

              {/* Deudas: quién le debe a quién */}
              {(() => {
                if (!session) return null;
                const debtors = session.players.filter(p => p.balance < 0).map(p => ({ ...p, bal: p.balance }));
                const creditors = session.players.filter(p => p.balance > 0).map(p => ({ ...p, bal: p.balance }));
                if (debtors.length === 0 || creditors.length === 0) return null;

                const settlements: { from: string; to: string; amount: number }[] = [];
                const d = debtors.map(p => ({ id: p.playerId, bal: -p.balance }));
                const c = creditors.map(p => ({ id: p.playerId, bal: p.balance }));
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
                    <Text style={[styles.summarySection, { marginTop: 16 }]}>Pagos a realizar</Text>
                    {settlements.map((s, idx) => {
                      const from = playerMap[s.from];
                      const to = playerMap[s.to];
                      return (
                        <View key={idx} style={styles.settlementRow}>
                          <Text style={styles.settlementFrom}>{from?.alias || from?.name || s.from}</Text>
                          <Text style={styles.settlementArrow}> le paga a </Text>
                          <Text style={styles.settlementTo}>{to?.alias || to?.name || s.to}</Text>
                          <Text style={styles.settlementAmount}> {formatCurrency(s.amount)}</Text>
                        </View>
                      );
                    })}
                  </>
                );
              })()}
            </ScrollView>

            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: Colors.red, marginBottom: 8 }]}
              onPress={() => { setConfirmEndVisible(false); endSession(); }}
            >
              <Text style={styles.startBtnText}>Terminar partida</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmEndVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 2,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  emptyList: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: FontSize.sm,
  },
  startBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  sessionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sessionInfoText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  newTxBtn: {
    flex: 2,
    backgroundColor: Colors.blue,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  newTxBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  endBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.red,
  },
  endBtnText: {
    color: Colors.red,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: Spacing.md,
    paddingBottom: 32,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  selectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: Spacing.xs,
  },
  selectItemActive: {
    borderColor: Colors.blue,
    backgroundColor: '#0d1f36',
  },
  selectItemText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  checkmark: {
    color: Colors.blue,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  summarySection: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 8,
    padding: 12,
    marginBottom: Spacing.xs,
  },
  summaryName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  summaryBalance: {
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  summaryGames: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 2,
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
