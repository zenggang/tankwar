import Phaser from "phaser";
import { listStage1ImageAssets } from "../data/stage1/stage1-assets";

/**
 * PreloadScene loads the landed repo assets instead of relying on a generated public mirror.
 * The asset list is centralized so scene code does not drift from the runtime contract.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("preload");
  }

  preload(): void {
    for (const asset of listStage1ImageAssets()) {
      this.load.image(asset.key, asset.url);
    }
  }

  create(): void {
    this.scene.start("stage1");
    this.scene.launch("hud");
  }
}
