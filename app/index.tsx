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
import { Player } from '../src/types';

export default function SessionScreen() {
  const { session, startSession, endSession, addTransaction } = useSessionStore();
  const { players } = usePlayersStore();
  const { gameValue } = useConfigStore();

  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txInitialFrom, setTxInitialFrom] = useState<string | undefined>();
  const [selectPlayersVisible, setSelectPlayersVisible] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

  // Build a map from playerId → Player for fast lookup
  const playerMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])) as Record<string, Player>,
    [players]
  );

  const totalBalance = session ? getTotalBalance(session.players) : 0;

  // ---- Handlers ----

  const handleQuickAdd = (toPlayerId: string) => {
    // +1 game means someone else pays. If only 2 players, auto-select the other.
    if (!session) return;
    const others = session.players.filter((p) => p.playerId !== toPlayerId);
    if (others.length === 1) {
      addTransaction(others[0].playerId, toPlayerId, gameValue, '+1 game');
    } else {
      setTxInitialFrom(undefined);
      // Open modal pre-filled with toId would be nice, but TransactionModal controls from/to.
      // We set the initial from blank and let user pick.
      setTxModalVisible(true);
    }
  };

  const handleQuickSub = (fromPlayerId: string) => {
    if (!session) return;
    const others = session.players.filter((p) => p.playerId !== fromPlayerId);
    if (others.length === 1) {
      addTransaction(fromPlayerId, others[0].playerId, gameValue, '-1 game');
    } else {
      setTxInitialFrom(fromPlayerId);
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

  const handleEndSession = () => {
    Alert.alert(
      'Terminar partida',
      '¿Terminar la sesión? Se borrarán todos los datos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Terminar', style: 'destructive', onPress: () => endSession() },
      ]
    );
  };

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
  const sessionPlayers = session.players;

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
              onQuickAdd={handleQuickAdd}
              onQuickSub={handleQuickSub}
              onPress={handleCardPress}
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
          onPress={() => { setTxInitialFrom(undefined); setTxModalVisible(true); }}
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
        onClose={() => setTxModalVisible(false)}
        onConfirm={handleTxConfirm}
      />
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
});
