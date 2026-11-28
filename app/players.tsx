import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlayersStore, useHistoryStore, useSessionStore } from '../src/store';
import { Player } from '../src/types';
import { Colors, Spacing, FontSize } from '../src/theme';
import { formatDateTime, formatCurrency } from '../src/utils/currency';

export default function PlayersScreen() {
  const { players, addPlayer, updatePlayer, deletePlayer } = usePlayersStore();
  const { archivedSessions } = useHistoryStore();
  const { session } = useSessionStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [aliasInput, setAliasInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null);
  const [nameError, setNameError] = useState('');
  const [statsPlayer, setStatsPlayer] = useState<Player | null>(null);

  const playerStats = useMemo(() => {
    if (!statsPlayer) return null;
    const sessions = archivedSessions
      .filter((as) => as.playerResults.some((pr) => pr.playerId === statsPlayer.id))
      .sort((a, b) => b.startedAt - a.startedAt);

    const totalNet = sessions.reduce((sum, as) => {
      const pr = as.playerResults.find((r) => r.playerId === statsPlayer.id);
      return sum + (pr?.netResult ?? 0);
    }, 0);

    const results = sessions.map((as) => as.playerResults.find((r) => r.playerId === statsPlayer.id)!);
    const best = results.length > 0 ? results.reduce((a, b) => (a.netResult > b.netResult ? a : b)) : null;
    const worst = results.length > 0 ? results.reduce((a, b) => (a.netResult < b.netResult ? a : b)) : null;
    const wins = results.filter((r) => r.netResult > 0).length;
    const losses = results.filter((r) => r.netResult < 0).length;
    const totalWon = results.reduce((s, r) => s + (r.netResult > 0 ? r.netResult : 0), 0);
    const totalLost = results.reduce((s, r) => s + (r.netResult < 0 ? Math.abs(r.netResult) : 0), 0);

    // racha actual
    let streak = 0;
    let streakType: 'win' | 'loss' | null = null;
    for (const r of results) {
      const type = r.netResult > 0 ? 'win' : r.netResult < 0 ? 'loss' : null;
      if (streak === 0 && type) { streak = 1; streakType = type; }
      else if (type === streakType) streak++;
      else break;
    }

    return { sessions, totalNet, best, worst, wins, losses, totalWon, totalLost, streak, streakType };
  }, [statsPlayer, archivedSessions]);

  const openAdd = () => {
    setEditingPlayer(null);
    setNameInput('');
    setAliasInput('');
    setModalVisible(true);
  };

  const openEdit = (p: Player) => {
    setEditingPlayer(p);
    setNameInput(p.name);
    setAliasInput(p.alias ?? '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!nameInput.trim()) {
      setNameError('El nombre es requerido');
      return;
    }
    setNameError('');
    if (editingPlayer) {
      await updatePlayer(editingPlayer.id, nameInput.trim(), aliasInput.trim() || undefined);
    } else {
      await addPlayer(nameInput.trim(), aliasInput.trim() || undefined);
    }
    setModalVisible(false);
  };

  const isInActiveSession = (id: string) =>
    !!session?.isActive && session.players.some((sp) => sp.playerId === id);

  const handleDelete = (p: Player) => {
    if (isInActiveSession(p.id)) return;
    setDeleteTarget(p);
  };

  const renderPlayer = ({ item }: { item: Player }) => {
    const sessionsWithPlayer = archivedSessions.filter((as) =>
      as.playerResults.some((pr) => pr.playerId === item.id)
    );
    const totalNet = sessionsWithPlayer.reduce((sum, as) => {
      const pr = as.playerResults.find((r) => r.playerId === item.id);
      return sum + (pr?.netResult ?? 0);
    }, 0);
    const hasStats = sessionsWithPlayer.length > 0;

    return (
    <View style={styles.playerRow}>
      <TouchableOpacity style={styles.playerInfo} onPress={() => setStatsPlayer(item)}>
        <Text style={styles.playerName}>{item.name}</Text>
        {item.alias ? (
          <Text style={styles.playerAlias}>{item.alias}</Text>
        ) : null}
        <Text style={styles.playerDate}>
          Creado: {formatDateTime(item.createdAt)}
        </Text>
        {hasStats && (
          <View style={styles.statsRow}>
            <Text style={[
              styles.statNet,
              totalNet > 0 ? { color: Colors.green } : totalNet < 0 ? { color: Colors.red } : { color: Colors.textSecondary },
            ]}>
              {totalNet > 0 ? '+' : ''}{formatCurrency(totalNet)}
            </Text>
            <Text style={styles.statGames}>
              {' · '}{sessionsWithPlayer.length} partida{sessionsWithPlayer.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.playerActions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => openEdit(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
        >
          <Text style={styles.editBtnText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteBtn, isInActiveSession(item.id) && styles.deleteBtnDisabled]}
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          disabled={isInActiveSession(item.id)}
        >
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={players}
        keyExtractor={(p) => p.id}
        renderItem={renderPlayer}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyTitle}>Sin jugadores</Text>
            <Text style={styles.emptySubtitle}>
              Agrega jugadores para usarlos en las partidas
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <Text style={styles.countLabel}>
            {players.length} jugador{players.length !== 1 ? 'es' : ''}
          </Text>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+ Jugador</Text>
      </TouchableOpacity>

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {editingPlayer ? 'Editar Jugador' : 'Nuevo Jugador'}
            </Text>

            <Text style={styles.inputLabel}>Nombre *</Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              value={nameInput}
              onChangeText={(v) => { setNameInput(v); if (nameError) setNameError(''); }}
              placeholder="Nombre del jugador"
              placeholderTextColor={Colors.textSecondary}
              autoFocus
              returnKeyType="next"
              maxLength={40}
            />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

            <Text style={styles.inputLabel}>Alias (opcional)</Text>
            <TextInput
              style={styles.input}
              value={aliasInput}
              onChangeText={setAliasInput}
              placeholder="Apodo o alias"
              placeholderTextColor={Colors.textSecondary}
              returnKeyType="done"
              maxLength={30}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>
                {editingPlayer ? 'Guardar Cambios' : 'Agregar Jugador'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!statsPlayer} transparent animationType="slide" onRequestClose={() => setStatsPlayer(null)}>
        <View style={styles.deleteOverlay}>
          <View style={[styles.deleteSheet, { maxHeight: '85%' }]}>
            {statsPlayer && playerStats && (
              <>
                <Text style={styles.modalTitle}>
                  {statsPlayer.alias ?? statsPlayer.name}
                  {statsPlayer.alias ? <Text style={{ color: Colors.textSecondary, fontSize: FontSize.sm }}> ({statsPlayer.name})</Text> : ''}
                </Text>

                {/* Resumen de partidas */}
                {(() => {
                  const { totalWon, totalLost, wins, losses, sessions } = playerStats;
                  const totalVolume = totalWon + totalLost;
                  const pctWin = totalVolume > 0 ? (totalWon / totalVolume) * 100 : 0;
                  const pctLoss = totalVolume > 0 ? (totalLost / totalVolume) * 100 : 0;
                  const even = sessions.length - wins - losses;
                  return (
                    <View style={styles.winBarSection}>
                      <View style={styles.winBarRow}>
                        <Text style={styles.winBarLabel}>
                          <Text style={{ color: Colors.green }}>{wins} positivas</Text>
                          {even > 0 ? <Text style={{ color: Colors.textSecondary }}>  ·  {even} neutras</Text> : null}
                          <Text style={{ color: Colors.red }}>  ·  {losses} negativas</Text>
                          <Text style={{ color: Colors.textSecondary }}>  ({sessions.length} partidas)</Text>
                        </Text>
                      </View>
                      <View style={styles.winBar}>
                        {pctWin > 0 && (
                          <View style={[styles.winBarSegment, { flex: pctWin, backgroundColor: Colors.green }]} />
                        )}
                        {pctLoss > 0 && (
                          <View style={[styles.winBarSegment, { flex: pctLoss, backgroundColor: Colors.red }]} />
                        )}
                        {totalVolume === 0 && (
                          <View style={[styles.winBarSegment, { flex: 1, backgroundColor: Colors.border }]} />
                        )}
                      </View>
                      {totalVolume > 0 && (
                        <View style={styles.winBarPctRow}>
                          <Text style={[styles.winBarPct, { color: Colors.green }]}>{Math.round(pctWin)}% ganado</Text>
                          <Text style={[styles.winBarPct, { color: Colors.red }]}>{Math.round(pctLoss)}% perdido</Text>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Total neto */}
                <View style={[styles.totalRow, playerStats.totalNet > 0 ? styles.totalPos : playerStats.totalNet < 0 ? styles.totalNeg : styles.totalZero]}>
                  <Text style={styles.totalLabel}>Resultado total</Text>
                  <Text style={[styles.totalVal, { color: playerStats.totalNet > 0 ? Colors.green : playerStats.totalNet < 0 ? Colors.red : Colors.textSecondary }]}>
                    {playerStats.totalNet > 0 ? '+' : ''}{formatCurrency(playerStats.totalNet)}
                  </Text>
                </View>

                {/* Mejor / Peor */}
                {playerStats.best && (
                  <View style={styles.extremesRow}>
                    <View style={styles.extremeChip}>
                      <Text style={styles.statChipLbl}>Mejor partida</Text>
                      <Text style={[styles.statChipVal, { color: playerStats.best.netResult >= 0 ? Colors.green : Colors.red }]}>
                        {playerStats.best.netResult > 0 ? '+' : ''}{formatCurrency(playerStats.best.netResult)}
                      </Text>
                    </View>
                    <View style={styles.extremeChip}>
                      <Text style={styles.statChipLbl}>Peor partida</Text>
                      <Text style={[styles.statChipVal, { color: Colors.red }]}>
                        {formatCurrency(playerStats.worst?.netResult ?? 0)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Racha */}
                {playerStats.streak > 0 && (
                  <View style={[styles.streakRow, { borderColor: playerStats.streakType === 'win' ? Colors.green : Colors.red }]}>
                    <Text style={{ color: playerStats.streakType === 'win' ? Colors.green : Colors.red, fontWeight: '700', fontSize: FontSize.sm }}>
                      {playerStats.streakType === 'win' ? '🔥' : '❄️'} Racha de {playerStats.streak} {playerStats.streakType === 'win' ? 'cierres positivos' : 'cierres negativos'}
                    </Text>
                  </View>
                )}

                {/* Historial */}
                <Text style={[styles.statChipLbl, { marginTop: Spacing.md, marginBottom: Spacing.xs }]}>HISTORIAL</Text>
                <ScrollView style={{ maxHeight: 200 }}>
                  {playerStats.sessions.map((as) => {
                    const pr = as.playerResults.find((r) => r.playerId === statsPlayer.id)!;
                    return (
                      <View key={as.id} style={styles.historyRow}>
                        <Text style={styles.historyDate}>{formatDateTime(as.startedAt)}</Text>
                        <Text style={[styles.historyNet, pr.netResult > 0 ? { color: Colors.green } : pr.netResult < 0 ? { color: Colors.red } : { color: Colors.textSecondary }]}>
                          {pr.netResult > 0 ? '+' : ''}{formatCurrency(pr.netResult)}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            )}
            {statsPlayer && playerStats && playerStats.sessions.length === 0 && (
              <Text style={{ color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', marginVertical: Spacing.md, marginTop: Spacing.sm }}>
                Sin partidas registradas aún
              </Text>
            )}
            {statsPlayer && !playerStats && (
              <Text style={{ color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', marginVertical: Spacing.md }}>
                Sin partidas registradas aún
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: Spacing.md }}>
              <TouchableOpacity style={[styles.deleteConfirmBtn, { flex: 1, backgroundColor: Colors.surfaceRaised, borderWidth: 1, borderColor: Colors.border }]}
                onPress={() => { setStatsPlayer(null); openEdit(statsPlayer!); }}>
                <Text style={[styles.deleteConfirmText, { color: Colors.text }]}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteConfirmBtn, { flex: 2, backgroundColor: Colors.blue }]} onPress={() => setStatsPlayer(null)}>
                <Text style={styles.deleteConfirmText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteSheet}>
            <Text style={styles.deleteTitle}>¿Eliminar jugador?</Text>
            <Text style={styles.deleteSubtitle}>{deleteTarget?.name} será eliminado permanentemente.</Text>
            <TouchableOpacity
              style={styles.deleteConfirmBtn}
              onPress={() => { deletePlayer(deleteTarget!.id); setDeleteTarget(null); }}
            >
              <Text style={styles.deleteConfirmText}>Eliminar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteTarget(null)}>
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
  countLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    padding: Spacing.md,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  playerAlias: {
    color: Colors.blue,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  playerDate: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  playerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editBtnText: {
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  deleteBtn: {
    backgroundColor: '#3a1a1a',
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnDisabled: {
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
    opacity: 0.4,
  },
  deleteBtnText: {
    color: Colors.red,
    fontSize: FontSize.sm,
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: Spacing.md,
    left: Spacing.md,
    backgroundColor: Colors.blue,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  fabText: {
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
    paddingBottom: 36,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: Spacing.md,
  },
  saveBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statNet: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  statGames: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  statChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  statChip: {
    flex: 1,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  statChipVal: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  statChipLbl: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  totalPos: {
    backgroundColor: '#0d2b15',
    borderColor: Colors.green,
  },
  totalNeg: {
    backgroundColor: '#2b1010',
    borderColor: Colors.red,
  },
  totalZero: {
    backgroundColor: Colors.surfaceRaised,
    borderColor: Colors.border,
  },
  totalLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  totalVal: {
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  extremesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  extremeChip: {
    flex: 1,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  streakRow: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyDate: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  historyNet: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  inputError: {
    borderColor: Colors.red,
  },
  errorText: {
    color: Colors.red,
    fontSize: FontSize.xs,
    marginTop: -8,
    marginBottom: Spacing.sm,
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  deleteSheet: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deleteTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: 6,
  },
  deleteSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  deleteConfirmBtn: {
    backgroundColor: Colors.red,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  deleteConfirmText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  winBarSection: {
    marginBottom: Spacing.sm,
  },
  winBarRow: {
    marginBottom: Spacing.xs,
  },
  winBarLabel: {
    fontSize: FontSize.xs,
  },
  winBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: Colors.border,
  },
  winBarSegment: {
    height: 10,
  },
  winBarPctRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  winBarPct: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});
