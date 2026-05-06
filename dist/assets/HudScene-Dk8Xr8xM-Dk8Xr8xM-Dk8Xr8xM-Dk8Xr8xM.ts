import Phaser from "phaser";
import { STAGE1_IMAGE_ASSETS } from "../data/stage1/stage1-assets";
import { HealthBar } from "../ui/health-bar";
import { INITIAL_HUD_STATE, type HudState } from "../ui/hud-state";

interface BossHudPayload {
  hp: number;
  maxHp: number;
  phase: string;
}

/**
 * HudScene is a dedicated overlay scene.
 * It listens to events from Stage1Scene and never reaches into world objects directly,
 * which keeps the gameplay scene simpler and avoids accidental cross-scene coupling.
 */
export class HudScene extends Phaser.Scene {
  private playerHpBar!: HealthBar;
  private bossHpBar!: HealthBar;
  private hpText!: Phaser.GameObjects.Text;
  private bossLabel!: Phaser.GameObjects.Text;
  private joystickKnob!: Phaser.GameObjects.Image;
  private fireButton!: Phaser.GameObjects.Image;
  private shieldOverlay!: Phaser.GameObjects.Image;
  private weaponBoostIcon!: Phaser.GameObjects.Image;

  constructor() {
    super("hud");
  }

  create(): void {
    const stageScene = this.scene.get("stage1");

    this.add
      .image(104, 1112, STAGE1_IMAGE_ASSETS.ui.joystickBase.key)
      .setScrollFactor(0)
      .setAlpha(0.84);
    this.joystickKnob = this.add
      .image(104, 1112, STAGE1_IMAGE_ASSETS.ui.joystickKnob.key)
      .setScrollFactor(0)
      .setAlpha(0.9);

    this.fireButton = this.add
      .image(604, 1112, STAGE1_IMAGE_ASSETS.ui.fireButton.key)
      .setScrollFactor(0)
      .setAlpha(0.85);

    this.playerHpBar = new HealthBar(
      this,
      24,
      36,
      STAGE1_IMAGE_ASSETS.ui.playerHealthBar.key,
      188,
      0x71d373
    );
    this.playerHpBar.setScrollFactor(0);

    this.hpText = this.add
      .text(24, 68, "", {
        color: "#dce7f1",
        fontSize: "22px"
      })
      .setScrollFactor(0);

    this.bossLabel = this.add
      .text(110, 118, "FORTRESS", {
        color: "#f6d58a",
        fontSize: "22px"
      })
      .setScrollFactor(0)
      .setVisible(false);

    this.bossHpBar = new HealthBar(
      this,
      24,
      150,
      STAGE1_IMAGE_ASSETS.ui.bossHealthBar.key,
      248,
      0xe16c5e
    );
    this.bossHpBar.setScrollFactor(0).setVisible(false);

    this.shieldOverlay = this.add
      .image(360, 1086, STAGE1_IMAGE_ASSETS.ui.shieldOverlay.key)
      .setScrollFactor(0)
      .setAlpha(0.72)
      .setVisible(false);

    this.weaponBoostIcon = this.add
      .image(254, 34, STAGE1_IMAGE_ASSETS.ui.weaponBoostIcon.key)
      .setScrollFactor(0)
      .setVisible(false);

    stageScene.events.on("hud-sync", (payload: HudState) => {
      this.sync(payload);
    });

    stageScene.events.on("boss-start", (payload: BossHudPayload) => {
      this.bossLabel.setVisible(true);
      this.bossHpBar.setVisible(true);
      this.bossHpBar.sync(payload.hp, payload.maxHp);
      this.bossLabel.setText(payload.phase === "phase_two" ? "FORTRESS // PHASE 2" : "FORTRESS");
    });

    stageScene.events.on("boss-health-sync", (payload: BossHudPayload) => {
      this.bossHpBar.sync(payload.hp, payload.maxHp);
      this.bossLabel.setText(payload.phase === "phase_two" ? "FORTRESS // PHASE 2" : "FORTRESS");
    });

    stageScene.events.on("player-dead", () => {
      this.add
        .text(136, 410, "MISSION FAILED", {
          color: "#ffb08c",
          fontSize: "50px"
        })
        .setScrollFactor(0);
    });

    stageScene.events.on("stage-clear", () => {
      this.add
        .text(146, 410, "STAGE CLEAR", {
          color: "#ffd47a",
          fontSize: "54px"
        })
        .setScrollFactor(0);
    });

    this.sync(INITIAL_HUD_STATE);
  }

  /**
   * All player-facing HUD state is pushed from the gameplay scene.
   * That keeps rendering deterministic and avoids HUD-specific gameplay reads.
   */
  sync(state: HudState): void {
    this.playerHpBar.sync(state.playerHp, state.playerMaxHp);
    this.hpText.setText(`HP ${state.playerHp}/${state.playerMaxHp}`);
    this.joystickKnob.setPosition(104 + state.input.moveX * 30, 1112 + state.input.moveY * 30);
    this.fireButton.setAlpha(state.input.firePressed ? 1 : 0.85);
    this.shieldOverlay.setVisible(state.shieldHp > 0);
    this.weaponBoostIcon.setVisible(state.weaponBoostActive);
  }
}
