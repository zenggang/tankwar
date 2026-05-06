import Phaser from "phaser";

/**
 * BootScene only owns the earliest scene handoff.
 * Keep it intentionally small so startup sequencing stays easy to reason about.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    this.scene.start("preload");
  }
}
