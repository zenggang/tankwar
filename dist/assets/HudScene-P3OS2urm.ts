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

    const joystickBase = this.add
      .image(118, 1110, STAGE1_IMAGE_ASSETS.ui.joystickBase.key)
      .setScrollFactor(0)
      .setAlpha(0.84);
    joystickBase.setDisplaySize(170, 170);

    this.joystickKnob = this.add
      .image(118, 1110, STAGE1_IMAGE_ASSETS.ui.joystickKnob.key)
      .setScrollFactor(0)
      .setAlpha(0.9);
    this.joystickKnob.setDisplaySize(92, 92);

    this.fireButton = this.add
      .image(602, 1108, STAGE1_IMAGE_ASSETS.ui.fireButton.key)
      .setScrollFactor(0)
      .setAlpha(0.85);
    this.fireButton.setDisplaySize(168, 168);

    this.playerHpBar = new HealthBar(
      this,
      20,
      28,
      STAGE1_IMAGE_ASSETS.ui.playerHealthBar.key,
      132,
      0x71d373
    );
    this.playerHpBar.setScrollFactor(0);

    this.hpText = this.add
      .text(20, 48, "", {
        color: "#dce7f1",
        fontSize: "16px"
      })
      .setScrollFactor(0);

    this.bossLabel = this.add
      .text(214, 26, "FORTRESS", {
        color: "#f6d58a",
        fontSize: "18px"
      })
      .setScrollFactor(0)
      .setVisible(false);

    this.bossHpBar = new HealthBar(
      this,
      196,
      52,
      STAGE1_IMAGE_ASSETS.ui.bossHealthBar.key,
      210,
      0xe16c5e
    );
    this.bossHpBar.setScrollFactor(0).setVisible(false);

    this.shieldOverlay = this.add
      .image(164, 28, STAGE1_IMAGE_ASSETS.ui.shieldOverlay.key)
      .setScrollFactor(0)
      .setAlpha(0.72)
      .setVisible(false);
    this.shieldOverlay.setDisplaySize(54, 54);

    this.weaponBoostIcon = this.add
      .image(202, 28, STAGE1_IMAGE_ASSETS.ui.weaponBoostIcon.key)
      .setScrollFactor(0)
      .setVisible(false);
    this.weaponBoostIcon.setDisplaySize(54, 54);

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
    this.joystickKnob.setPosition(118 + state.input.moveX * 28, 1110 + state.input.moveY * 28);
    this.fireButton.setAlpha(state.input.firePressed ? 1 : 0.85);
    this.shieldOverlay.setVisible(state.shieldHp > 0);
    this.weaponBoostIcon.setVisible(state.weaponBoostActive);
  }
}
