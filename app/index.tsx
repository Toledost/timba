import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
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
import { TransactionModal } from '../src/components/TransactionModal';
import { formatDateTime } from '../src/utils/currency';
import { Colors, Spacing, FontSize } from '../src/theme';
import { Player, BANCA_ID } from '../src/types';

export default function SessionScreen() {
  const router = useRouter();
  const { session, startSession, endSession, addTransaction, buyFromBanca, returnToBanca } = useSessionStore();
  const { players } = usePlayersStore();
  const { gameValue } = useConfigStore();

  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txInitialFrom, setTxInitialFrom] = useState<string | undefined>();
  const [txInitialTo, setTxInitialTo] = useState<string | undefined>();
  const [selectPlayersVisible, setSelectPlayersVisible] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  // Build a map from playerId → Player for fast lookup
  const playerMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])) as Record<string, Player>,
    [players]
  );

  // ---- Handlers ----

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

  const handleStartSession = async () => {
    if (selectedPlayerIds.size < 2) {
      Alert.alert('Faltan jugadores', 'Selecciona al menos 2 jugadores');
      return;
    }
    const ids = Array.from(selectedPlayerIds);
    await startSession(ids);
    for (const id of ids) {
      await buyFromBanca(id, gameValue);
    }
    setSelectPlayersVisible(false);
    setSelectedPlayerIds(new Set());
  };

  const [confirmEndVisible, setConfirmEndVisible] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!session?.isActive) { setElapsed(0); return; }
    setElapsed(Math.floor((Date.now() - session.startedAt) / 1000));
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - session.startedAt) / 1000));
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [session?.id, session?.isActive]);

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
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionInfoText}>
          Inicio: {formatDateTime(session.startedAt)} · {String(Math.floor(elapsed / 3600)).padStart(2, '0')}:{String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
        </Text>
        <Text style={styles.sessionInfoText}>
          {sessionPlayers.length} jugadores · {session.transactions.length} movimientos
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

      <Modal visible={confirmEndVisible} transparent animationType="fade" onRequestClose={() => setConfirmEndVisible(false)}>
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <View style={styles.confirmSheet}>
            <Text style={styles.confirmTitle}>¿Terminás la partida?</Text>
            <Text style={styles.confirmSubtitle}>Vas a poder contar las fichas antes de ver los pagos.</Text>
            <TouchableOpacity
              style={styles.confirmEndBtn}
              onPress={() => { setConfirmEndVisible(false); endSession(); router.push('/history?openChips=1'); }}
            >
              <Text style={styles.confirmEndBtnText}>Terminar</Text>
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
    fontSize: FontSize.sm,
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
  confirmSheet: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    margin: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: 6,
  },
  confirmSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  confirmEndBtn: {
    backgroundColor: Colors.red,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  confirmEndBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
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
