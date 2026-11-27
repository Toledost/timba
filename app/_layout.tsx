import React, { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { useConfigStore, usePlayersStore, useSessionStore, useHistoryStore } from '../src/store';
import { Colors, Spacing, FontSize } from '../src/theme';

export default function RootLayout() {
  const loadConfig = useConfigStore((s) => s.loadConfig);
  const loadPlayers = usePlayersStore((s) => s.loadPlayers);
  const loadSession = useSessionStore((s) => s.loadSession);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const session = useSessionStore((s) => s.session);
  const isLoaded = useSessionStore((s) => s.isLoaded);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    Promise.all([loadConfig(), loadPlayers(), loadSession(), loadHistory()]);
  }, []);

  useEffect(() => {
    if (isLoaded && session && !session.isActive) {
      setShowRecoveryModal(true);
    }
  }, [isLoaded]);

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.md,
    },
    sheet: {
      backgroundColor: Colors.surface,
      borderRadius: 14,
      padding: Spacing.md,
      width: '100%',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    title: {
      color: Colors.text,
      fontSize: FontSize.lg,
      fontWeight: '700',
      marginBottom: 6,
    },
    subtitle: {
      color: Colors.textSecondary,
      fontSize: FontSize.sm,
      marginBottom: Spacing.md,
      lineHeight: 20,
    },
    primaryBtn: {
      backgroundColor: Colors.blue,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 8,
    },
    primaryBtnText: {
      color: '#fff',
      fontSize: FontSize.md,
      fontWeight: '700',
    },
    secondaryBtn: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    secondaryBtnText: {
      color: Colors.textSecondary,
      fontSize: FontSize.sm,
    },
  });

  return (
    <>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <Modal visible={showRecoveryModal} transparent animationType="fade" onRequestClose={() => setShowRecoveryModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Partida sin cerrar</Text>
            <Text style={styles.subtitle}>
              Hay una partida activa que no fue guardada. ¿Qué querés hacer?
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => { setShowRecoveryModal(false); router.push('/history?openChips=1'); }}
            >
              <Text style={styles.primaryBtnText}>Ir a cerrar la partida</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setShowRecoveryModal(false)}
            >
              <Text style={styles.secondaryBtnText}>Continuar jugando</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: Colors.blue,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Mesa',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>♠</Text>,
          }}
        />
        <Tabs.Screen
          name="players"
          options={{
            title: 'Jugadores',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Historial',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Config',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙</Text>,
          }}
        />
      </Tabs>
    </>
  );
}
