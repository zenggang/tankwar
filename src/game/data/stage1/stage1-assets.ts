import { STAGE1_RUNTIME_DATA } from "./stage1-runtime";
import { repoPathToTextureKey } from "../../utils/stage1-adapter";

export interface StageImageAsset {
  key: string;
  repoPath: string;
  url: string;
}

// Every registered asset keeps both its repo path and a concrete browser URL so validation and loading share one source.
function repoAsset(repoPath: string): StageImageAsset {
  return {
    key: repoPathToTextureKey(repoPath),
    repoPath,
    url: new URL(`../../../../${repoPath}`, import.meta.url).href
  };
}

// Static Stage 1 art is declared explicitly so later preload work can stay deterministic and easy to audit.
export const STAGE1_IMAGE_ASSETS = {
  map: {
    segment01: repoAsset("assets/map/stage1/segment-01-base.png"),
    segment02: repoAsset("assets/map/stage1/segment-02-base.png"),
    segment03: repoAsset("assets/map/stage1/segment-03-base.png"),
    segment04: repoAsset("assets/map/stage1/segment-04-base.png")
  },
  units: {
    playerHull: repoAsset("assets/units/stage1/player-tank/hull.png"),
    playerTurret: repoAsset("assets/units/stage1/player-tank/turret.png"),
    playerShadow: repoAsset("assets/units/stage1/player-tank/shadow.png"),
    playerHitFlash: repoAsset("assets/units/stage1/player-tank/hit-flash.png"),
    playerWreck: repoAsset("assets/units/stage1/player-tank/wreck.png"),
    lightTank: repoAsset("assets/units/stage1/light-tank/light-tank.png"),
    lightTankWreck: repoAsset("assets/units/stage1/light-tank/wreck.png"),
    mediumTank: repoAsset("assets/units/stage1/medium-tank/medium-tank.png"),
    mediumTankWreck: repoAsset("assets/units/stage1/medium-tank/wreck.png"),
    fixedTurretBase: repoAsset("assets/units/stage1/fixed-turret/base.png"),
    fixedTurretHead: repoAsset("assets/units/stage1/fixed-turret/head.png"),
    fixedTurretWreck: repoAsset("assets/units/stage1/fixed-turret/wreck.png"),
    scoutHelicopter: repoAsset("assets/units/stage1/scout-helicopter/scout-helicopter.png"),
    scoutHelicopterRotor: repoAsset("assets/units/stage1/scout-helicopter/rotor.png"),
    scoutHelicopterCrash: repoAsset("assets/units/stage1/scout-helicopter/crash.png"),
    bossBody: repoAsset("assets/units/stage1/fortress-boss/body.png"),
    bossMainCannon: repoAsset("assets/units/stage1/fortress-boss/main-cannon.png"),
    bossSideCannonLeft: repoAsset("assets/units/stage1/fortress-boss/side-cannon-left.png"),
    bossSideCannonRight: repoAsset("assets/units/stage1/fortress-boss/side-cannon-right.png"),
    bossWeakpoint: repoAsset("assets/units/stage1/fortress-boss/weakpoint-core.png"),
    bossDamageOverlay: repoAsset("assets/units/stage1/fortress-boss/damage-overlay.png"),
    bossWreck: repoAsset("assets/units/stage1/fortress-boss/wreck-large.png")
  },
  ui: {
    playerHealthBar: repoAsset("assets/ui/stage1/player-health-bar.png"),
    enemyHealthBar: repoAsset("assets/ui/stage1/enemy-health-bar.png"),
    bossHealthBar: repoAsset("assets/ui/stage1/boss-health-bar.png"),
    shieldOverlay: repoAsset("assets/ui/stage1/shield-overlay.png"),
    weaponBoostIcon: repoAsset("assets/ui/stage1/weapon-boost-icon.png"),
    fireButton: repoAsset("assets/ui/stage1/fire-button/fire-button.png"),
    joystickBase: repoAsset("assets/ui/stage1/joystick-base/joystick-base.png"),
    joystickKnob: repoAsset("assets/ui/stage1/joystick-knob/joystick-knob.png")
  },
  drops: {
    repairKit: repoAsset("assets/drops/stage1/repair-kit/repair-kit.png"),
    repairKitGlow: repoAsset("assets/drops/stage1/repair-kit/glow.png"),
    repairKitPickupFx: repoAsset("assets/drops/stage1/repair-kit/pickup-fx.png"),
    weaponBoost: repoAsset("assets/drops/stage1/weapon-boost/weapon-boost.png"),
    weaponBoostGlow: repoAsset("assets/drops/stage1/weapon-boost/glow.png"),
    weaponBoostPickupFx: repoAsset("assets/drops/stage1/weapon-boost/pickup-fx.png"),
    shieldBattery: repoAsset("assets/drops/stage1/shield-battery/shield-battery.png"),
    shieldBatteryGlow: repoAsset("assets/drops/stage1/shield-battery/glow.png"),
    shieldBatteryPickupFx: repoAsset("assets/drops/stage1/shield-battery/pickup-fx.png")
  },
  fx: {
    explosionSmall: repoAsset("assets/fx/stage1/explosion-small/out/sheet-transparent.png"),
    explosionMedium: repoAsset("assets/fx/stage1/explosion-medium/out/sheet-transparent.png"),
    explosionBoss: repoAsset("assets/fx/stage1/explosion-boss/out/sheet-transparent.png"),
    hitSpark: repoAsset("assets/fx/stage1/hit-spark/out/sheet-transparent.png"),
    projectileTrail: repoAsset("assets/fx/stage1/projectile-trail/out/projectile-1.png"),
    shieldHit: repoAsset("assets/fx/stage1/shield-hit/out/sheet-transparent.png")
  }
} as const;

// Preload code should consume this flat list so prop assets and static assets stay deduplicated and complete.
export function listStage1ImageAssets(): StageImageAsset[] {
  const staticAssets = [
    ...Object.values(STAGE1_IMAGE_ASSETS.map),
    ...Object.values(STAGE1_IMAGE_ASSETS.units),
    ...Object.values(STAGE1_IMAGE_ASSETS.ui),
    ...Object.values(STAGE1_IMAGE_ASSETS.drops),
    ...Object.values(STAGE1_IMAGE_ASSETS.fx)
  ];

  const propAssets = Object.values(STAGE1_RUNTIME_DATA.propsBySegment)
    .flat()
    .map((prop) => repoAsset(prop.image));

  const deduped = new Map<string, StageImageAsset>();

  for (const asset of [...staticAssets, ...propAssets]) {
    deduped.set(asset.repoPath, asset);
  }

  return [...deduped.values()];
}
