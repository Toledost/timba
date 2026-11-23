import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlayersStore } from '../src/store';
import { Player } from '../src/types';
import { Colors, Spacing, FontSize } from '../src/theme';
import { formatDateTime } from '../src/utils/currency';

export default function PlayersScreen() {
  const { players, addPlayer, updatePlayer, deletePlayer } = usePlayersStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [aliasInput, setAliasInput] = useState('');

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
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    if (editingPlayer) {
      await updatePlayer(editingPlayer.id, nameInput.trim(), aliasInput.trim() || undefined);
    } else {
      await addPlayer(nameInput.trim(), aliasInput.trim() || undefined);
    }
    setModalVisible(false);
  };

  const handleDelete = (p: Player) => {
    Alert.alert(
      'Eliminar jugador',
      `¿Eliminar a ${p.name}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deletePlayer(p.id),
        },
      ]
    );
  };

  const renderPlayer = ({ item }: { item: Player }) => (
    <View style={styles.playerRow}>
      <TouchableOpacity style={styles.playerInfo} onPress={() => openEdit(item)}>
        <Text style={styles.playerName}>{item.name}</Text>
        {item.alias ? (
          <Text style={styles.playerAlias}>{item.alias}</Text>
        ) : null}
        <Text style={styles.playerDate}>
          Creado: {formatDateTime(item.createdAt)}
        </Text>
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
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        >
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
              style={styles.input}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Nombre del jugador"
              placeholderTextColor={Colors.textSecondary}
              autoFocus
              returnKeyType="next"
              maxLength={40}
            />

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
});
