import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { GameConfig } from '../types';
import { formatCurrency } from '../utils/currency';
import { computeGameValue } from '../utils/balance';
import { Colors, Spacing, FontSize } from '../theme';

interface GameConfigFormProps {
  config: GameConfig;
  onUpdateMultiplier: (m: number) => void;
  onUpdateDenomination: (index: number, count: number) => void;
  onUpdateDenominationValue: (index: number, value: number) => void;
  onAddDenomination: () => void;
  onRemoveDenomination: (index: number) => void;
  onReset: () => void;
}

export function GameConfigForm({
  config,
  onUpdateMultiplier,
  onUpdateDenomination,
  onUpdateDenominationValue,
  onAddDenomination,
  onRemoveDenomination,
  onReset,
}: GameConfigFormProps) {
  const [multiplierStr, setMultiplierStr] = useState(String(config.multiplier));
  const [denomValueStrs, setDenomValueStrs] = useState<string[]>(
    config.denominations.map((d) => String(d.value))
  );
  const [confirmReset, setConfirmReset] = useState(false);

  const gameValue = computeGameValue(config.denominations, config.multiplier);

  const handleMultiplierBlur = () => {
    const val = parseFloat(multiplierStr);
    if (isNaN(val) || val <= 0) {
      setMultiplierStr(String(config.multiplier));
      return;
    }
    onUpdateMultiplier(val);
  };

  const handleDenomValueBlur = (idx: number) => {
    const val = parseFloat(denomValueStrs[idx]);
    if (isNaN(val) || val <= 0) {
      setDenomValueStrs((prev) => prev.map((s, i) => i === idx ? String(config.denominations[idx].value) : s));
      return;
    }
    onUpdateDenominationValue(idx, val);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Configuración de Partida</Text>

      {/* Multiplier */}
      <View style={styles.row}>
        <Text style={styles.label}>Valor de ficha ×</Text>
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
        <View key={i} style={styles.denomRow}>
          <Text style={styles.denomSign}>$</Text>
          <TextInput
            style={styles.denomValueInput}
            value={denomValueStrs[i] ?? String(d.value)}
            onChangeText={(v) => setDenomValueStrs((prev) => prev.map((s, idx) => idx === i ? v : s))}
            onBlur={() => handleDenomValueBlur(i)}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
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
          {config.denominations.length > 1 && (
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => {
                onRemoveDenomination(i);
                setDenomValueStrs((prev) => prev.filter((_, idx) => idx !== i));
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={styles.addDenomBtn}
        onPress={() => {
          onAddDenomination();
          setDenomValueStrs((prev) => [...prev, '1']);
        }}
      >
        <Text style={styles.addDenomBtnText}>+ Agregar denominación</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetBtn} onPress={() => setConfirmReset(true)}>
        <Text style={styles.resetBtnText}>Restaurar por defecto</Text>
      </TouchableOpacity>

      <Modal visible={confirmReset} transparent animationType="fade" onRequestClose={() => setConfirmReset(false)}>
        <View style={styles.overlay}>
          <View style={styles.confirmSheet}>
            <Text style={styles.confirmTitle}>¿Restaurar configuración?</Text>
            <Text style={styles.confirmSubtitle}>Se volverá a la configuración por defecto.</Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                setConfirmReset(false);
                onReset();
                setMultiplierStr('10');
                setDenomValueStrs(['50', '25', '10', '5', '1']);
              }}
            >
              <Text style={styles.confirmBtnText}>Restaurar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmReset(false)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  denomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    marginBottom: Spacing.xs,
    gap: 6,
  },
  denomSign: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  denomValueInput: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 56,
    textAlign: 'center',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  counterBtn: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    width: 30,
    height: 30,
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
    minWidth: 22,
    textAlign: 'center',
  },
  subtotal: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    minWidth: 44,
    textAlign: 'right',
  },
  removeBtn: {
    padding: 4,
  },
  removeBtnText: {
    color: Colors.red,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  addDenomBtn: {
    borderWidth: 1,
    borderColor: Colors.blue,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  addDenomBtnText: {
    color: Colors.blue,
    fontSize: FontSize.sm,
    fontWeight: '600',
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  confirmSheet: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
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
  confirmBtn: {
    backgroundColor: Colors.red,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  confirmBtnText: {
    color: Colors.white,
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
});
