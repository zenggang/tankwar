// Centralized scene keys keep the bootstrap shell and future dedicated scene files aligned.
export const GAME_SCENE_KEYS = ["boot", "preload", "stage1", "hud"] as const;

export type GameSceneKey = (typeof GAME_SCENE_KEYS)[number];

// The runtime shell is intentionally mobile-first because Stage 1 is authored for portrait play.
export const GAME_CONFIG = {
  width: 720,
  height: 1280,
  backgroundColor: "#090909",
  parent: "app",
  sceneKeys: GAME_SCENE_KEYS
} as const;
