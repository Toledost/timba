import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConfigStore } from '../src/store';
import { GameConfigForm } from '../src/components/GameConfigForm';
import { Colors } from '../src/theme';

export default function SettingsScreen() {
  const { config, updateMultiplier, updateDenomination, updateDenominationValue, addDenomination, removeDenomination, resetConfig } = useConfigStore();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <GameConfigForm
          config={config}
          onUpdateMultiplier={updateMultiplier}
          onUpdateDenomination={updateDenomination}
          onUpdateDenominationValue={updateDenominationValue}
          onAddDenomination={addDenomination}
          onRemoveDenomination={removeDenomination}
          onReset={resetConfig}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
