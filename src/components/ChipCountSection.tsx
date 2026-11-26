import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SessionPlayer, GameConfig, BANCA_ID } from '../types';
import { formatCurrency } from '../utils/currency';
import { Colors, Spacing, FontSize } from '../theme';

interface Props {
  sessionPlayers: SessionPlayer[];
  allPlayers: SessionPlayer[];
  playerMap: Record<string, { name: string; alias?: string }>;
  config: GameConfig;
}

const DenomRow = React.memo(function DenomRow({
  denomValue,
  qty,
  onChange,
}: {
  denomValue: number;
  qty: string;
  onChange: (v: string) => void;
}) {
  const subtotal = (parseInt(qty || '0', 10) || 0) * denomValue;
  return (
    <View style={styles.chipDenomRow}>
      <Text style={styles.chipDenomLabel}>{formatCurrency(denomValue)}</Text>
      <TextInput
        style={styles.chipInput}
        value={qty}
        onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={Colors.textSecondary}
        maxLength={4}
      />
      <Text style={styles.chipDenomSubtotal}>
        {subtotal > 0 ? formatCurrency(subtotal) : '—'}
      </Text>
    </View>
  );
});

export function ChipCountSection({ sessionPlayers, allPlayers, playerMap, config }: Props) {
  const [chipCounts, setChipCounts] = useState<Record<string, Record<number, string>>>({});
  const [copied, setCopied] = useState(false);

  const setDenomCount = useCallback((playerId: string, denomIdx: number, value: string) => {
    setChipCounts((prev) => ({
      ...prev,
      [playerId]: { ...(prev[playerId] ?? {}), [denomIdx]: value },
    }));
  }, []);

  const getPlayerTotal = (playerId: string): number =>
    config.denominations.reduce((sum, denom, idx) => {
      const qty = parseInt(chipCounts[playerId]?.[idx] ?? '0', 10) || 0;
      return sum + qty * denom.value * config.multiplier;
    }, 0);

  const humanPlayers = sessionPlayers.filter((sp) => sp.playerId !== BANCA_ID);
  const getName = (id: string) =>
    playerMap[id]?.alias || playerMap[id]?.name || id;

  const bancaBal = allPlayers.find((p) => p.playerId === BANCA_ID)?.balance ?? 0;
  const anyFilled = humanPlayers.some((sp) => getPlayerTotal(sp.playerId) !== 0);
  const totalChips = humanPlayers.reduce((sum, sp) => sum + getPlayerTotal(sp.playerId), 0);
  const expectedTotal = Math.abs(bancaBal);
  const chipsMatch = anyFilled && Math.abs(totalChips - expectedTotal) < 1;

  const nets = humanPlayers.map((sp) => {
    const sessionBal = allPlayers.find((p) => p.playerId === sp.playerId)?.balance ?? 0;
    const chips = getPlayerTotal(sp.playerId);
    return { id: sp.playerId, net: chips + sessionBal };
  });

  const debtors = nets.filter((t) => t.net < 0).map((t) => ({ id: t.id, bal: -t.net }));
  const creditors = nets.filter((t) => t.net > 0).map((t) => ({ id: t.id, bal: t.net }));
  const settlements: { from: string; to: string; amount: number }[] = [];

  if (anyFilled) {
    const d = debtors.map((t) => ({ ...t }));
    const c = creditors.map((t) => ({ ...t }));
    let i = 0, j = 0;
    while (i < d.length && j < c.length) {
      const amount = Math.min(d[i].bal, c[j].bal);
      settlements.push({ from: d[i].id, to: c[j].id, amount });
      d[i].bal -= amount;
      c[j].bal -= amount;
      if (d[i].bal < 0.01) i++;
      if (c[j].bal < 0.01) j++;
    }
  }

  return (
    <View style={styles.body}>
      {humanPlayers.map((sp) => {
        const playerTotal = getPlayerTotal(sp.playerId);
        return (
          <View key={sp.playerId} style={styles.chipPlayer}>
            <Text style={styles.chipPlayerName}>{getName(sp.playerId)}</Text>
            {config.denominations.map((denom, idx) => (
              <DenomRow
                key={idx}
                denomValue={denom.value}
                qty={chipCounts[sp.playerId]?.[idx] ?? ''}
                onChange={(v) => setDenomCount(sp.playerId, idx, v)}
              />
            ))}
            <View style={styles.chipPlayerTotalRow}>
              <Text style={styles.chipPlayerTotalLabel}>Total</Text>
              <Text
                style={[
                  styles.chipPlayerTotal,
                  playerTotal > 0
                    ? styles.chipTotalPositive
                    : playerTotal < 0
                    ? styles.chipTotalNegative
                    : styles.chipTotalZero,
                ]}
              >
                {formatCurrency(playerTotal)}
              </Text>
            </View>
          </View>
        );
      })}

      {bancaBal !== 0 && (
        <View style={styles.bancaRow}>
          <Text style={styles.bancaLabel}>Saldo banca (referencia)</Text>
          <Text style={styles.bancaValue}>{formatCurrency(bancaBal)}</Text>
        </View>
      )}

      {anyFilled && (
        <View style={[styles.chipSumRow, chipsMatch ? styles.chipSumOk : styles.chipSumWarn]}>
          <Text style={styles.chipSumLabel}>
            {chipsMatch ? '✓ Fichas cuadran' : '⚠ Fichas no cuadran'}
          </Text>
          <Text style={styles.chipSumValue}>
            {formatCurrency(totalChips)} / {formatCurrency(expectedTotal)}
          </Text>
        </View>
      )}

      {anyFilled && (
        <>
          <View style={styles.settlementsSection}>
            <Text style={styles.settlementsTitle}>SALDOS NETOS</Text>
            {nets.map((t) => {
              const color = t.net > 0 ? Colors.green : t.net < 0 ? Colors.red : Colors.textSecondary;
              return (
                <View key={t.id} style={styles.verifyRow}>
                  <Text style={styles.verifyName}>{getName(t.id)}</Text>
                  <Text style={[styles.verifyChips, { color }]}>
                    {t.net > 0 ? '+' : ''}{formatCurrency(t.net)}
                  </Text>
                </View>
              );
            })}
          </View>

          {settlements.length > 0 && (
            <View style={[styles.settlementsSection, { borderTopWidth: 0 }]}>
              <View style={styles.settlementsTitleRow}>
                <Text style={styles.settlementsTitle}>PAGOS A REALIZAR</Text>
                <TouchableOpacity
                  onPress={async () => {
                    const lines = settlements.map((s) => {
                      const f = getName(s.from);
                      const t = getName(s.to);
                      return `• ${f} le paga a ${t}: ${formatCurrency(s.amount)}`;
                    });
                    const msg = `🃏 *Pagos de la partida*\n\n${lines.join('\n')}`;
                    await Clipboard.setStringAsync(msg);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  style={styles.copyBtn}
                >
                  <Text style={styles.copyBtnText}>{copied ? '✓ Copiado' : '📋 Copiar'}</Text>
                </TouchableOpacity>
              </View>
              {settlements.map((s, idx) => (
                <View key={idx} style={styles.settlementRow}>
                  <Text style={styles.settlementFrom}>{getName(s.from)}</Text>
                  <Text style={styles.settlementArrow}> le paga a </Text>
                  <Text style={styles.settlementTo}>{getName(s.to)}</Text>
                  <Text style={styles.settlementAmount}> {formatCurrency(s.amount)}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  chipPlayer: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chipPlayerName: {
    color: Colors.blue,
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  chipDenomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  chipDenomLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    width: 48,
  },
  chipInput: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    color: Colors.text,
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    width: 64,
    textAlign: 'center',
  },
  chipDenomSubtotal: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginLeft: Spacing.sm,
    flex: 1,
    textAlign: 'right',
  },
  chipPlayerTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  chipPlayerTotalLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  chipPlayerTotal: {
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  chipTotalPositive: { color: Colors.green },
  chipTotalNegative: { color: Colors.red },
  chipTotalZero: { color: Colors.textSecondary },
  bancaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#0d1a2b',
  },
  bancaLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  bancaValue: {
    color: Colors.blue,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  verifyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  verifyName: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  verifyChips: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  settlementsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  copyBtn: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  copyBtnText: {
    color: Colors.blue,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  settlementsSection: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  settlementsTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
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
  chipSumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  chipSumOk: {
    backgroundColor: '#0d2b15',
  },
  chipSumWarn: {
    backgroundColor: '#2b1f0d',
  },
  chipSumLabel: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  chipSumValue: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
});
