# Timba ♠

Rastreador de partidas de póker hecho con React Native + Expo. Lleva el balance de fichas entre jugadores, mantiene la suma cero estricta y funciona 100% offline.

## Funcionalidades

- **Seguimiento de partida** — iniciá una mesa, elegí los jugadores y seguí los saldos en $ y en equivalencia de juegos
- **Suma cero estricta** — cada transacción debita un jugador y acredita otro; un indicador en tiempo real muestra si la mesa está cuadrada
- **Botones rápidos** — +1 juego / -1 juego por jugador para actualizar sin fricción
- **Transacciones libres** — ingresá juegos o montos exactos en $ con nota opcional
- **Deshacer** — revertí la última transacción en cualquier momento
- **Gestión de jugadores** — creá, editá y eliminá jugadores guardados con nombre y alias opcional
- **Valor de juego configurable** — modificá la cantidad de fichas y el multiplicador; todos los cálculos se actualizan al instante
- **100% offline** — sin login ni backend; todo guardado localmente con AsyncStorage

## Instalación

### Requisitos
- Node.js 18+
- App **Expo Go** en tu celular, o un emulador Android/iOS

### Instalar dependencias

```bash
cd timba
npm install
```

### Correr la app

```bash
npx expo start
```

Escaneá el QR con Expo Go (Android/iOS) o presioná `a` para emulador Android / `i` para simulador iOS.

## Configuración por defecto del juego

| Denominación | Cantidad | Subtotal |
|-------------|----------|---------|
| $50 | 5 | $250 |
| $25 | 5 | $125 |
| $10 | 5 | $50 |
| $5 | 5 | $25 |
| $1 | 5 | $5 |
| **Total base** | | **$455** |
| **x multiplicador (10)** | | **$4.550 / juego** |

Cambiá el multiplicador o la cantidad de fichas desde la pestaña **Config**.

## Cómo usar

1. **Agregá jugadores** en la pestaña Jugadores
2. **Iniciá una partida** desde la pestaña Mesa — seleccioná 2 o más jugadores
3. **Registrá transacciones** — tocá la tarjeta de un jugador o el botón "+ Transacción"
4. **Botones rápidos +1j / -1j** en cada tarjeta para ajustes de un juego entero
5. **Revisá el historial** y deshacé la última transacción en la pestaña Historial
6. **Terminá la partida** para limpiar los datos de sesión (los perfiles de jugadores se conservan)

## Estructura del proyecto

```
app/            Pantallas (Expo Router)
src/components  Componentes reutilizables
src/store       Estado global (config, jugadores, sesión) con Zustand
src/utils       Helpers puros (formato de moneda, validación de balance)
src/types       Interfaces TypeScript
src/theme.ts    Tokens de diseño
```

## Tecnologías

- React Native 0.74 + Expo 51
- TypeScript
- Expo Router (ruteo basado en archivos)
- Zustand (manejo de estado)
- AsyncStorage (persistencia local)
