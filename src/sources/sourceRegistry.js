import { MockMusicSource } from "./mockMusicSource.js";
import { PearYoutubeMusicSource } from "./pearYoutubeMusicSource.js";

export function createMusicSource(config, dependencies) {
  if (config.integration === "mock") {
    return new MockMusicSource();
  }
  if (config.integration === "pear-youtube-music") {
    return new PearYoutubeMusicSource(config, dependencies);
  }
  throw new Error(`Unsupported integration: ${config.integration}`);
}
