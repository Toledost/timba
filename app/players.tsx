import React, { useState } from 'react';
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
      <TouchableOpacity style={styles.playerInfo} onPress={() => openEdit(item)}>
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
});
