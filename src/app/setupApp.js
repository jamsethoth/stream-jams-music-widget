import { loadSetupPreferences, saveSetupPreferences } from "../config/setupConfig.js";
import { PearYoutubeMusicSource } from "../sources/pearYoutubeMusicSource.js";
import { SetupView } from "../ui/setupView.js";

export function startSetupApp(root = document.querySelector("#app")) {
  const preferences = loadSetupPreferences();
  const view = new SetupView(root, preferences, {
    onChange(values) {
      saveSetupPreferences(values);
      view.renderUrl(values);
    },
    async onTest(values) {
      view.renderStatus("Testing Pear Desktop...", "neutral");
      try {
        const source = new PearYoutubeMusicSource({
          integration: "pear-youtube-music",
          host: values.host,
          port: Number(values.port),
          transport: "poll",
        });
        const ok = await source.testConnection();
        view.renderStatus(
          ok ? "Pear Desktop responded. This URL is ready for OBS." : "Pear Desktop did not return a usable response.",
          ok ? "success" : "error",
        );
      } catch (error) {
        view.renderStatus(error.message, "error");
      }
    },
  });
  view.renderUrl(preferences);
  return view;
}

if (typeof document !== "undefined") {
  startSetupApp();
}
