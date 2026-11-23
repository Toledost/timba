import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { GameConfig } from '../types';
import { formatCurrency } from '../utils/currency';
import { computeGameValue } from '../utils/balance';
import { Colors, Spacing, FontSize } from '../theme';

interface GameConfigFormProps {
  config: GameConfig;
  onUpdateMultiplier: (m: number) => void;
  onUpdateDenomination: (index: number, count: number) => void;
  onReset: () => void;
}

export function GameConfigForm({
  config,
  onUpdateMultiplier,
  onUpdateDenomination,
  onReset,
}: GameConfigFormProps) {
  const [multiplierStr, setMultiplierStr] = useState(String(config.multiplier));

  const gameValue = computeGameValue(config.denominations, config.multiplier);

  const handleMultiplierBlur = () => {
    const val = parseFloat(multiplierStr);
    if (isNaN(val) || val <= 0) {
      setMultiplierStr(String(config.multiplier));
      Alert.alert('Error', 'El multiplicador debe ser un número positivo');
      return;
    }
    onUpdateMultiplier(val);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Configuración de Partida</Text>

      {/* Multiplier */}
      <View style={styles.row}>
        <Text style={styles.label}>Multiplicador</Text>
        <TextInput
          style={styles.input}
          value={multiplierStr}
          onChangeText={setMultiplierStr}
          onBlur={handleMultiplierBlur}
          keyboardType="decimal-pad"
          returnKeyType="done"
        />
      </View>

      {/* Game value preview */}
      <View style={styles.previewBox}>
        <Text style={styles.previewLabel}>Valor de 1 partida</Text>
        <Text style={styles.previewValue}>{formatCurrency(gameValue)}</Text>
      </View>

      {/* Denominations */}
      <Text style={styles.sectionTitle}>Fichas por denominación</Text>
      {config.denominations.map((d, i) => (
        <View key={d.value} style={styles.row}>
          <Text style={styles.label}>${d.value} chips</Text>
          <View style={styles.counter}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => onUpdateDenomination(i, Math.max(0, d.count - 1))}
            >
              <Text style={styles.counterBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.counterValue}>{d.count}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => onUpdateDenomination(i, d.count + 1)}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtotal}>{formatCurrency(d.value * d.count)}</Text>
        </View>
      ))}

      <TouchableOpacity
        style={styles.resetBtn}
        onPress={() => {
          Alert.alert(
            'Restaurar defaults',
            '¿Restaurar la configuración por defecto?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Restaurar', style: 'destructive', onPress: () => { onReset(); setMultiplierStr('10'); } },
            ]
          );
        }}
      >
        <Text style={styles.resetBtnText}>Restaurar por defecto</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.xs,
  },
  label: {
    color: Colors.text,
    fontSize: FontSize.md,
    flex: 1,
  },
  input: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 70,
    textAlign: 'right',
  },
  previewBox: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.blue,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  previewLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  previewValue: {
    color: Colors.blue,
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterBtn: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    lineHeight: 22,
  },
  counterValue: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  subtotal: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    minWidth: 52,
    textAlign: 'right',
  },
  resetBtn: {
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetBtnText: {
    color: Colors.red,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
