const fs = require('fs');
const path = require('path');

const content = [
  'sdk.dir=C\\:\\\\Users\\\\Galileo\\\\AppData\\\\Local\\\\Android\\\\Sdk',
  'org.gradle.java.home=C\\:\\\\Program Files\\\\Android\\\\Android Studio\\\\jbr',
].join('\n');

const dest = path.join(__dirname, '..', 'android', 'local.properties');
fs.writeFileSync(dest, content);
console.log('✓ android/local.properties created');
