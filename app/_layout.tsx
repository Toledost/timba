import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useConfigStore, usePlayersStore, useSessionStore } from '../src/store';
import { Colors } from '../src/theme';

export default function RootLayout() {
  const loadConfig = useConfigStore((s) => s.loadConfig);
  const loadPlayers = usePlayersStore((s) => s.loadPlayers);
  const loadSession = useSessionStore((s) => s.loadSession);

  useEffect(() => {
    loadConfig();
    loadPlayers();
    loadSession();
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor={Colors.background} />
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
            tabBarLabel: 'Mesa',
            tabBarIcon: ({ color }) => (
              <TabIcon label="♠" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="players"
          options={{
            title: 'Jugadores',
            tabBarLabel: 'Jugadores',
            tabBarIcon: ({ color }) => (
              <TabIcon label="👤" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Historial',
            tabBarLabel: 'Historial',
            tabBarIcon: ({ color }) => (
              <TabIcon label="📋" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Config',
            tabBarLabel: 'Config',
            tabBarIcon: ({ color }) => (
              <TabIcon label="⚙" color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

function TabIcon({ label, color }: { label: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20, color }}>{label}</Text>;
}
