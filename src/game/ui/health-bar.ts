import Phaser from "phaser";

export class HealthBar extends Phaser.GameObjects.Container {
  private readonly frame: Phaser.GameObjects.Image;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly widthPx: number;
  private readonly fillOffsetX: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    frameTextureKey: string,
    widthPx: number,
    fillColor: number
  ) {
    const frame = scene.add.image(0, 0, frameTextureKey).setOrigin(0, 0.5);
    const frameWidth = widthPx + 34;
    const frameHeight = 22;
    const fillOffsetX = 17;
    const fill = scene.add
      .rectangle(fillOffsetX, 0, widthPx, 8, fillColor, 0.95)
      .setOrigin(0, 0.5);
    super(scene, x, y, [frame, fill]);

    frame.setDisplaySize(frameWidth, frameHeight);

    this.frame = frame;
    this.fill = fill;
    this.widthPx = widthPx;
    this.fillOffsetX = fillOffsetX;

    // The frame comes from landed HUD art, while the fill stays procedural so the
    // caller can reuse the same widget for player, enemy, and boss health bars.
    scene.add.existing(this);
  }

  sync(current: number, max: number): void {
    const ratio = Phaser.Math.Clamp(current / Math.max(1, max), 0, 1);
    this.fill.width = this.widthPx * ratio;
    this.fill.x = this.fillOffsetX;
  }
}
