import Phaser from "phaser";
import { GAME_CONFIG, GAME_SCENE_KEYS } from "./config";
import { BootScene } from "./scenes/BootScene";
import { HudScene } from "./scenes/HudScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { Stage1Scene } from "./scenes/Stage1Scene";

// Bootstrap now binds the dedicated scene implementations while preserving the
// same scene key contract established in the earlier shell phase.
export function createGame(): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.WEBGL,
    parent: GAME_CONFIG.parent,
    width: GAME_CONFIG.width,
    height: GAME_CONFIG.height,
    backgroundColor: GAME_CONFIG.backgroundColor,
    physics: {
      default: "arcade",
      arcade: {
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, PreloadScene, Stage1Scene, HudScene]
  });
}
