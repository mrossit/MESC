import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.saojudastadeu.mesc",
  appName: "MESC",
  webDir: "dist/public",
  loggingBehavior: "debug",
  server: {
    hostname: "localhost",
    iosScheme: "capacitor",
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
