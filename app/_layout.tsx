import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { useConfigStore, usePlayersStore, useSessionStore, useHistoryStore } from '../src/store';
import { Colors } from '../src/theme';

export default function RootLayout() {
  const loadConfig = useConfigStore((s) => s.loadConfig);
  const loadPlayers = usePlayersStore((s) => s.loadPlayers);
  const loadSession = useSessionStore((s) => s.loadSession);
  const loadHistory = useHistoryStore((s) => s.loadHistory);

  useEffect(() => {
    loadConfig();
    loadPlayers();
    loadSession();
    loadHistory();
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
