const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Excluir carpeta android/ del watcher para evitar conflictos con Gradle
config.resolver.blockList = [
  /android\/.*\/build\/.*/,
  /android\/.*/,
];

// Persistir caché de Metro fuera de la carpeta del proyecto
// para que sobreviva al prebuild --clean
config.cacheStores = [
  new (require('metro-cache').FileStore)({
    root: path.join(require('os').tmpdir(), 'metro-cache-timba'),
  }),
];

module.exports = config;
