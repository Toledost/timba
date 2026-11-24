import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { Player, SessionPlayer } from '../types';
import { formatCurrency, formatGames } from '../utils/currency';
import { Colors, Spacing, FontSize } from '../theme';

interface PlayerCardProps {
  player: Player;
  sessionPlayer: SessionPlayer;
  gameValue: number;
  onSellToPlayer: (fromPlayerId: string) => void;  // +1j vende a otro jugador
  onPress: (playerId: string) => void;
  onBuyFromBanca: (playerId: string, amount: number) => void;  // -B
  onReturnToBanca: (playerId: string, amount: number) => void; // +B
}

export function PlayerCard({
  player,
  sessionPlayer,
  gameValue,
  onSellToPlayer,
  onPress,
  onBuyFromBanca,
  onReturnToBanca,
}: PlayerCardProps) {
  const { balance } = sessionPlayer;
  const balanceColor =
    balance > 0 ? Colors.green : balance < 0 ? Colors.red : Colors.textSecondary;

  const displayName = player.alias ? `${player.name} (${player.alias})` : player.name;

  const [bancaModal, setBancaModal] = useState(false);
  const [bancaType, setBancaType] = useState<'buy' | 'return'>('buy');
  const [amountStr, setAmountStr] = useState('');

  const openBanca = (type: 'buy' | 'return') => {
    setBancaType(type);
    setAmountStr('');
    setBancaModal(true);
  };

  const handleBancaGame = () => {
    if (bancaType === 'buy') onBuyFromBanca(sessionPlayer.playerId, gameValue);
    else onReturnToBanca(sessionPlayer.playerId, gameValue);
    setBancaModal(false);
  };

  const handleBancaAmount = () => {
    const val = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      Alert.alert('Monto inválido', 'Ingresá un monto mayor a 0');
      return;
    }
    if (bancaType === 'buy') onBuyFromBanca(sessionPlayer.playerId, val);
    else onReturnToBanca(sessionPlayer.playerId, val);
    setBancaModal(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(sessionPlayer.playerId)}
        activeOpacity={0.75}
      >
        <View style={styles.left}>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          <Text style={[styles.balance, { color: balanceColor }]}>
            {formatCurrency(balance)}
          </Text>
          <Text style={[styles.games, { color: balanceColor }]}>
            {formatGames(balance, gameValue)}
          </Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.btn, styles.btnGreen]}
            onPress={() => onSellToPlayer(sessionPlayer.playerId)}
          >
            <Text style={styles.btnText}>+1j</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnBancaRed]}
            onPress={() => openBanca('buy')}
          >
            <Text style={styles.btnTextSmall}>-B</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnBancaGreen]}
            onPress={() => openBanca('return')}
          >
            <Text style={styles.btnTextSmall}>+B</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <Modal visible={bancaModal} transparent animationType="slide" onRequestClose={() => setBancaModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {bancaType === 'buy' ? '🔴 Compra juego (entra en deuda)' : '🟢 Devuelve juego (cobra a banca)'}
            </Text>
            <Text style={styles.sheetSubtitle}>{displayName}</Text>

            <TouchableOpacity style={styles.gameBtn} onPress={handleBancaGame}>
              <Text style={styles.gameBtnText}>1 juego ({formatCurrency(gameValue)})</Text>
            </TouchableOpacity>

            <Text style={styles.orLabel}>— o monto libre —</Text>

            <TextInput
              style={styles.input}
              placeholder="Monto $"
              placeholderTextColor={Colors.textSecondary}
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={handleBancaAmount}
            />

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: bancaType === 'buy' ? '#3a1a1a' : '#1a3a1a' }]}
              onPress={handleBancaAmount}
            >
              <Text style={[styles.confirmBtnText, { color: bancaType === 'buy' ? Colors.red : Colors.green }]}>
                Confirmar monto
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setBancaModal(false)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: { flex: 1 },
  name: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  balance: { fontSize: FontSize.xl, fontWeight: '800' },
  games: { fontSize: FontSize.sm, marginTop: 2 },
  buttons: { gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  btn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGreen: { backgroundColor: '#1a3a1a', borderWidth: 1, borderColor: Colors.green },
  btnRed: { backgroundColor: '#3a1a1a', borderWidth: 1, borderColor: Colors.red },
  btnBancaGreen: { backgroundColor: '#0d2a1a', borderWidth: 1, borderColor: '#2a6a3a' },
  btnBancaRed: { backgroundColor: '#2a0d0d', borderWidth: 1, borderColor: '#6a2a2a' },
  btnText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  btnTextSmall: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: Spacing.md,
    paddingBottom: 32,
  },
  sheetTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: 4 },
  sheetSubtitle: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.md },
  gameBtn: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.blue,
    marginBottom: Spacing.md,
  },
  gameBtnText: { color: Colors.blue, fontSize: FontSize.md, fontWeight: '700' },
  orLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, textAlign: 'center', marginBottom: Spacing.md },
  input: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    color: Colors.text,
    fontSize: FontSize.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  confirmBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  confirmBtnText: { fontSize: FontSize.md, fontWeight: '700' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm },
});
