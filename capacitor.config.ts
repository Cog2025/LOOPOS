import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.looposmanager.app',
  appName: 'Loop.OS Manager',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: [
      '192.168.18.165',
      '192.168.18.165:8000'
    ]
  }
};

export default config;