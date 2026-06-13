import type { CapacitorConfig } from "@capacitor/cli";

// Warbul Android wrapper. The app loads the live Next.js site (Vercel) in a
// native WebView; printing uses the native Bluetooth-serial plugin (direct
// ESC/POS to the thermal printer, no RawBT). See src/lib/escpos.ts.
const config: CapacitorConfig = {
  appId: "id.web.warbul",
  appName: "Warbul Kasir",
  webDir: "public", // stub — runtime loads server.url, not local files
  server: {
    url: "https://warkop-warbul.web.id",
    androidScheme: "https",
    allowNavigation: [
      "warkop-warbul.web.id",
      "*.warkop-warbul.web.id",
      "warkop-warbul.vercel.app",
      "app.pakasir.com",
    ],
  },
  backgroundColor: "#1c140c",
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: "#1c140c",
      showSpinner: false,
    },
  },
};

export default config;
