import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Player, SessionPlayer } from '../types';
import { formatCurrency } from '../utils/currency';
import { Colors, Spacing, FontSize } from '../theme';

interface TransactionModalProps {
  visible: boolean;
  players: SessionPlayer[];
  playerMap: Record<string, Player>;
  gameValue: number;
  initialFromId?: string;
  onClose: () => void;
  onConfirm: (fromId: string, toId: string, amount: number, note?: string) => void;
}

export function TransactionModal({
  visible,
  players,
  playerMap,
  gameValue,
  initialFromId,
  onClose,
  onConfirm,
}: TransactionModalProps) {
  const [fromId, setFromId] = useState<string>(initialFromId ?? '');
  const [toId, setToId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [useGames, setUseGames] = useState(true);

  const reset = useCallback(() => {
    setFromId(initialFromId ?? '');
    setToId('');
    setAmountStr('');
    setNote('');
    setUseGames(true);
  }, [initialFromId]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirm = () => {
    if (!fromId) {
      Alert.alert('Error', 'Selecciona quién paga');
      return;
    }
    if (!toId) {
      Alert.alert('Error', 'Selecciona quién recibe');
      return;
    }
    if (fromId === toId) {
      Alert.alert('Error', 'El origen y destino no pueden ser el mismo jugador');
      return;
    }

    let amount: number;
    if (useGames) {
      const games = parseFloat(amountStr);
      if (isNaN(games) || games <= 0) {
        Alert.alert('Error', 'Ingresa un número de games válido');
        return;
      }
      amount = games * gameValue;
    } else {
      amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Error', 'Ingresa un monto válido');
        return;
      }
    }

    onConfirm(fromId, toId, amount, note.trim() || undefined);
    reset();
  };

  const presets = [0.5, 1, 1.5, 2];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Nueva Transacción</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* FROM selector */}
            <Text style={styles.sectionLabel}>PAGA (pierde fichas)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerScroll}>
              {players.map((sp) => {
                const p = playerMap[sp.playerId];
                if (!p) return null;
                const selected = fromId === sp.playerId;
                return (
                  <TouchableOpacity
                    key={sp.playerId}
                    style={[styles.playerChip, selected && styles.playerChipFromSelected]}
                    onPress={() => setFromId(sp.playerId)}
                  >
                    <Text style={[styles.playerChipText, selected && styles.playerChipTextSelected]}>
                      {p.alias || p.name}
                    </Text>
                    <Text style={[styles.playerChipBalance, { color: sp.balance >= 0 ? Colors.green : Colors.red }]}>
                      {formatCurrency(sp.balance)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* TO selector */}
            <Text style={styles.sectionLabel}>RECIBE (gana fichas)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerScroll}>
              {players.map((sp) => {
                const p = playerMap[sp.playerId];
                if (!p) return null;
                const selected = toId === sp.playerId;
                return (
                  <TouchableOpacity
                    key={sp.playerId}
                    style={[styles.playerChip, selected && styles.playerChipToSelected]}
                    onPress={() => setToId(sp.playerId)}
                  >
                    <Text style={[styles.playerChipText, selected && styles.playerChipTextSelected]}>
                      {p.alias || p.name}
                    </Text>
                    <Text style={[styles.playerChipBalance, { color: sp.balance >= 0 ? Colors.green : Colors.red }]}>
                      {formatCurrency(sp.balance)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Amount type toggle */}
            <Text style={styles.sectionLabel}>TIPO DE MONTO</Text>
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, useGames && styles.toggleBtnActive]}
                onPress={() => { setUseGames(true); setAmountStr(''); }}
              >
                <Text style={[styles.toggleBtnText, useGames && styles.toggleBtnTextActive]}>
                  Games ({formatCurrency(gameValue)})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, !useGames && styles.toggleBtnActive]}
                onPress={() => { setUseGames(false); setAmountStr(''); }}
              >
                <Text style={[styles.toggleBtnText, !useGames && styles.toggleBtnTextActive]}>
                  Monto $
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick presets for games */}
            {useGames && (
              <View style={styles.presets}>
                {presets.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={styles.presetBtn}
                    onPress={() => setAmountStr(String(g))}
                  >
                    <Text style={styles.presetBtnText}>{g}g</Text>
                    <Text style={styles.presetBtnSub}>{formatCurrency(g * gameValue)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Amount input */}
            <View style={styles.inputRow}>
              <Text style={styles.inputPrefix}>{useGames ? 'Games' : '$'}</Text>
              <TextInput
                style={styles.input}
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="decimal-pad"
                placeholder={useGames ? '1' : '4550'}
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
            {amountStr !== '' && !isNaN(parseFloat(amountStr)) && (
              <Text style={styles.amountPreview}>
                = {formatCurrency(
                  useGames
                    ? parseFloat(amountStr) * gameValue
                    : parseFloat(amountStr)
                )}
              </Text>
            )}

            {/* Note */}
            <Text style={styles.sectionLabel}>NOTA (opcional)</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              value={note}
              onChangeText={setNote}
              placeholder="Ej: buy-in, rebuy..."
              placeholderTextColor={Colors.textSecondary}
              maxLength={80}
            />

            {/* Confirm */}
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Registrar Transacción</Text>
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '90%',
    paddingTop: 16,
    paddingHorizontal: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  closeBtn: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    padding: 4,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  playerScroll: {
    marginBottom: 4,
  },
  playerChip: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  playerChipFromSelected: {
    borderColor: Colors.red,
    backgroundColor: '#3a1a1a',
  },
  playerChipToSelected: {
    borderColor: Colors.green,
    backgroundColor: '#1a3a1a',
  },
  playerChipText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  playerChipTextSelected: {
    color: Colors.text,
  },
  playerChipBalance: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 8,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: Colors.blue,
  },
  toggleBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: Colors.white,
  },
  presets: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  presetBtnText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  presetBtnSub: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  inputPrefix: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
    minWidth: 44,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    color: Colors.text,
    fontSize: FontSize.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteInput: {
    marginTop: 0,
    flex: 0,
  },
  amountPreview: {
    color: Colors.blue,
    fontSize: FontSize.sm,
    marginTop: 4,
    marginLeft: 52,
  },
  confirmBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
