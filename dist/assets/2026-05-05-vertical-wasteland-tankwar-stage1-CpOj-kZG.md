# Vertical Wasteland Tankwar Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable first stage of the portrait wasteland tank game by consuming the already-landed Stage 1 art and JSON data, with real touch controls, scripted waves, a locked boss arena, and a full stage-clear flow.

**Architecture:** Start from a Vite + Phaser 3 shell, then adapt the landed `assets/` and `data/` files into typed runtime modules instead of duplicating map truth in new hand-written layout data. Keep pure gameplay logic in small helpers for input, scrolling, damage, stage direction, and boss phase switching so tests verify behavior while Phaser scenes stay focused on orchestration.

**Tech Stack:** TypeScript, Vite, Phaser 3, Vitest, landed PNG assets under `assets/`, landed JSON contracts under `data/`, Node.js validation script.

---

## Scope Guard

This plan intentionally does **not** regenerate, rename, duplicate, or move Stage 1 art.

- Use the existing raster art under `assets/map/stage1`, `assets/units/stage1`, `assets/ui/stage1`, `assets/drops/stage1`, `assets/fx/stage1`, and `assets/props/stage1`.
- Use the existing stage data under `data/stage1-props.json`, `data/stage1-collision.json`, and `data/stage1-zones.json`.
- Keep new TypeScript stage data limited to gameplay-only authoring that does not already exist in the landed JSON contracts, such as spawn waves, drop rules, and boss tuning.

## Coordinate Contract

- Phaser world uses the default top-left origin: `x` grows to the right and `y` grows downward.
- Stage 1 runtime placement must preserve authored segment ids but invert world placement for upward progression:
  - `segment-01` opening sits at the world bottom
  - `segment-04` boss arena sits at the world top
- The player spawns near `STAGE1_RUNTIME_DATA.totalHeight - 240` and advances toward **smaller** `y` values.
- Player primary fire travels upward with negative `velocityY`.
- Enemy fire aimed at the player generally travels downward with positive `velocityY`, because enemies are usually positioned above the player during progression.
- `StageDirector` must treat Stage 1 as **upward progression**:
  - zone order is `opening-lane -> roadblock-lane -> checkpoint-lock -> boss-arena`
  - crossing from higher `y` to lower `y` is what advances the stage
  - each zone may trigger only once, even if the player re-enters it later
- Runtime adapters must expose zone world coordinates and segment world tops in a way that makes the above rules explicit and testable.

## File Structure

### App Shell

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/game/config.ts`
- Create: `src/game/bootstrap.ts`

### Scenes

- Create: `src/game/scenes/BootScene.ts`
- Create: `src/game/scenes/PreloadScene.ts`
- Create: `src/game/scenes/Stage1Scene.ts`
- Create: `src/game/scenes/HudScene.ts`

### Runtime Contracts And Adapters

- Create: `src/game/types/stage.ts`
- Create: `src/game/utils/stage1-adapter.ts`
- Create: `src/game/data/stage1/stage1-runtime.ts`
- Create: `src/game/data/stage1/stage1-assets.ts`
- Create: `src/game/systems/camera/stage-scroll-controller.ts`

### Input, Combat, And Actors

- Create: `src/game/systems/input/touch-controls.ts`
- Create: `src/game/systems/combat/health.ts`
- Create: `src/game/systems/combat/projectiles.ts`
- Create: `src/game/systems/combat/drop-table.ts`
- Create: `src/game/systems/combat/drop-effects.ts`
- Create: `src/game/systems/stage-director.ts`
- Create: `src/game/entities/player/player-tank.ts`
- Create: `src/game/entities/enemies/enemy-presets.ts`
- Create: `src/game/entities/enemies/ground-enemy.ts`
- Create: `src/game/entities/enemies/fixed-turret.ts`
- Create: `src/game/entities/enemies/scout-helicopter.ts`
- Create: `src/game/entities/enemies/enemy-factory.ts`
- Create: `src/game/entities/boss/fortress-boss.ts`

### HUD And Stage Authored Gameplay Data

- Create: `src/game/ui/health-bar.ts`
- Create: `src/game/ui/hud-state.ts`
- Create: `src/game/data/stage1/stage1-spawns.ts`
- Create: `src/game/data/stage1/stage1-drops.ts`
- Create: `src/game/data/stage1/stage1-boss.ts`

### Verification

- Create: `scripts/validate-stage1-contract.mjs`

### Tests

- Create: `tests/game-config.test.ts`
- Create: `tests/stage1-data.test.ts`
- Create: `tests/stage-scroll-controller.test.ts`
- Create: `tests/touch-controls.test.ts`
- Create: `tests/combat-health.test.ts`
- Create: `tests/enemy-fire-player-damage.test.ts`
- Create: `tests/stage-director.test.ts`
- Create: `tests/drop-pickup-effects.test.ts`
- Create: `tests/fortress-boss-phase.test.ts`

## Task 1: Bootstrap The Vite + Phaser Shell

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/game/config.ts`
- Create: `src/game/bootstrap.ts`
- Create: `src/game/scenes/BootScene.ts`
- Create: `src/game/scenes/PreloadScene.ts`
- Create: `src/game/scenes/Stage1Scene.ts`
- Create: `src/game/scenes/HudScene.ts`
- Test: `tests/game-config.test.ts`

- [ ] **Step 1: Create the base toolchain files**

```json
{
  "name": "tankwar",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "validate:stage1": "node scripts/validate-stage1-contract.mjs"
  },
  "dependencies": {
    "phaser": "^3.80.1"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "lib": ["ES2022", "DOM"],
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests", "scripts"]
}
```

```ts
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173
  }
});
```

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"
    />
    <title>Tankwar</title>
    <style>
      html,
      body,
      #app {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #090909;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`  
Expected: install completes and creates `package-lock.json` with no fatal error.

- [ ] **Step 3: Write the failing config smoke test**

```ts
import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../src/game/config";

describe("GAME_CONFIG", () => {
  it("uses a portrait-first mobile canvas", () => {
    expect(GAME_CONFIG.width).toBe(720);
    expect(GAME_CONFIG.height).toBe(1280);
    expect(GAME_CONFIG.backgroundColor).toBe("#090909");
  });

  it("registers the boot, preload, stage, and hud scenes", () => {
    expect(GAME_CONFIG.sceneKeys).toEqual(["boot", "preload", "stage1", "hud"]);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm run test -- tests/game-config.test.ts`  
Expected: FAIL with module resolution errors for `../src/game/config`.

- [ ] **Step 5: Implement the minimal game bootstrap and empty scene shells**

```ts
// src/game/config.ts
export const GAME_CONFIG = {
  width: 720,
  height: 1280,
  backgroundColor: "#090909",
  parent: "app",
  sceneKeys: ["boot", "preload", "stage1", "hud"] as const
};
```

```ts
// src/game/bootstrap.ts
import Phaser from "phaser";
import { GAME_CONFIG } from "./config";
import { BootScene } from "./scenes/BootScene";
import { HudScene } from "./scenes/HudScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { Stage1Scene } from "./scenes/Stage1Scene";

// Keep the boot config small here; later tasks only plug systems into these scenes.
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
```

```ts
// src/main.ts
import { createGame } from "./game/bootstrap";

// The runtime is created exactly once at startup.
createGame();
```

```ts
// src/game/scenes/BootScene.ts
import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    this.scene.start("preload");
  }
}
```

```ts
// src/game/scenes/PreloadScene.ts
import Phaser from "phaser";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("preload");
  }

  create(): void {
    this.scene.start("stage1");
    this.scene.launch("hud");
  }
}
```

```ts
// src/game/scenes/Stage1Scene.ts
import Phaser from "phaser";

export class Stage1Scene extends Phaser.Scene {
  constructor() {
    super("stage1");
  }

  create(): void {
    // This shell intentionally proves only the scene pipeline; world data lands in Task 2 and Task 3.
    this.add.text(36, 36, "Stage 1 shell", {
      color: "#ffffff",
      fontSize: "28px"
    });
  }
}
```

```ts
// src/game/scenes/HudScene.ts
import Phaser from "phaser";

export class HudScene extends Phaser.Scene {
  constructor() {
    super("hud");
  }

  create(): void {
    // This shell confirms the overlay scene starts independently from the world scene.
    this.add.text(24, 24, "HUD shell", {
      color: "#b7c7d9",
      fontSize: "24px"
    }).setScrollFactor(0);
  }
}
```

- [ ] **Step 6: Run tests and the production build**

Run: `npm run test -- tests/game-config.test.ts && npm run build`  
Expected: tests PASS, then Vite build succeeds and emits `dist/`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.ts src/game/config.ts src/game/bootstrap.ts src/game/scenes tests/game-config.test.ts
git commit -m "feat: bootstrap phaser shell for tankwar"
```

## Task 2: Adapt The Landed Stage 1 Assets And JSON Contracts

**Files:**
- Create: `src/game/types/stage.ts`
- Create: `src/game/utils/stage1-adapter.ts`
- Create: `src/game/data/stage1/stage1-runtime.ts`
- Create: `src/game/data/stage1/stage1-assets.ts`
- Test: `tests/stage1-data.test.ts`

- [ ] **Step 1: Write the failing Stage 1 data contract test**

```ts
import { describe, expect, it } from "vitest";
import { STAGE1_IMAGE_ASSETS } from "../src/game/data/stage1/stage1-assets";
import { STAGE1_RUNTIME_DATA } from "../src/game/data/stage1/stage1-runtime";

describe("STAGE1_RUNTIME_DATA", () => {
  it("reads the landed segment and zone contracts in authored play order", () => {
    expect(STAGE1_RUNTIME_DATA.segments.map((segment) => segment.key)).toEqual([
      "segment-01",
      "segment-02",
      "segment-03",
      "segment-04"
    ]);

    expect(STAGE1_RUNTIME_DATA.zones.find((zone) => zone.key === "boss-arena")?.type).toBe("boss");
  });

  it("maps the authored segments into a runtime world that supports upward progression", () => {
    expect(STAGE1_RUNTIME_DATA.segments.map((segment) => segment.worldTopY)).toEqual([
      4000,
      2600,
      1200,
      0
    ]);

    const orderedZones = [...STAGE1_RUNTIME_DATA.zones]
      .sort((left, right) => right.worldStartY - left.worldStartY)
      .map((zone) => zone.key);

    expect(orderedZones).toEqual([
      "opening-lane",
      "roadblock-lane",
      "checkpoint-lock",
      "boss-arena"
    ]);
  });

  it("normalizes the merged prop file and keeps props reachable by segment", () => {
    expect(STAGE1_RUNTIME_DATA.propsBySegment["segment-01"].length).toBeGreaterThan(0);
    expect(
      STAGE1_RUNTIME_DATA.propsBySegment["segment-03"].some((prop) =>
        prop.image.includes("checkpoint-gantry/prop.png")
      )
    ).toBe(true);
  });

  it("registers landed art from the repo assets tree instead of a new public tree", () => {
    expect(STAGE1_IMAGE_ASSETS.map.segment01.url).toContain("/assets/map/stage1/segment-01-base.png");
    expect(STAGE1_IMAGE_ASSETS.ui.fireButton.url).toContain(
      "/assets/ui/stage1/fire-button/fire-button.png"
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/stage1-data.test.ts`  
Expected: FAIL because the runtime adapter and asset registry modules do not exist yet.

- [ ] **Step 3: Define the typed runtime contracts**

```ts
// src/game/types/stage.ts
export type StageSegmentKey = "segment-01" | "segment-02" | "segment-03" | "segment-04";
export type StageZoneType = "spawn" | "lock" | "boss";
export type EnemyType = "light_tank" | "medium_tank" | "fixed_turret" | "scout_helicopter";
export type DropType = "repair_kit" | "weapon_boost" | "shield_battery";

export interface StageSegmentSpec {
  key: StageSegmentKey;
  playOrder: 1 | 2 | 3 | 4;
  pixelHeight: number;
  mapRepoPath: string;
  worldTopY: number;
}

export interface StageZoneRect {
  key: string;
  segmentKey: StageSegmentKey;
  type: StageZoneType;
  x: number;
  y: number;
  w: number;
  h: number;
  worldStartY: number;
  worldEndY: number;
}

export interface StagePropRecord {
  id: string;
  image: string;
  textureKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StageCollisionBlocker {
  id: string;
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Stage1RuntimeData {
  segments: StageSegmentSpec[];
  zones: StageZoneRect[];
  propsBySegment: Record<StageSegmentKey, StagePropRecord[]>;
  collisionBySegment: Record<StageSegmentKey, StageCollisionBlocker[]>;
  totalHeight: number;
}
```

- [ ] **Step 4: Implement the JSON adapter, runtime data, and asset registry**

```ts
// src/game/utils/stage1-adapter.ts
import type {
  StageCollisionBlocker,
  StagePropRecord,
  StageSegmentKey,
  StageSegmentSpec,
  StageZoneRect
} from "../types/stage";

export const STAGE1_SEGMENTS: StageSegmentSpec[] = [
  {
    key: "segment-01",
    playOrder: 1,
    pixelHeight: 1400,
    mapRepoPath: "assets/map/stage1/segment-01-base.png",
    worldTopY: 4000
  },
  {
    key: "segment-02",
    playOrder: 2,
    pixelHeight: 1400,
    mapRepoPath: "assets/map/stage1/segment-02-base.png",
    worldTopY: 2600
  },
  {
    key: "segment-03",
    playOrder: 3,
    pixelHeight: 1400,
    mapRepoPath: "assets/map/stage1/segment-03-base.png",
    worldTopY: 1200
  },
  {
    key: "segment-04",
    playOrder: 4,
    pixelHeight: 1200,
    mapRepoPath: "assets/map/stage1/segment-04-base.png",
    worldTopY: 0
  }
];

export function repoPathToTextureKey(repoPath: string): string {
  return repoPath
    .replace(/^assets\//, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();
}

function segmentOffsetMap(segments: StageSegmentSpec[]): Record<StageSegmentKey, number> {
  const offsets = {} as Record<StageSegmentKey, number>;

  for (const segment of segments) {
    offsets[segment.key] = segment.worldTopY;
  }

  return offsets;
}

export function normalizeStage1Props(
  rawSegments: Record<string, Array<{ id: string; image: string; x: number; y: number; w: number; h: number }>>
): Record<StageSegmentKey, StagePropRecord[]> {
  const normalized = {} as Record<StageSegmentKey, StagePropRecord[]>;

  for (const segment of STAGE1_SEGMENTS) {
    const raw =
      rawSegments[segment.key] ??
      rawSegments[`segment-${segment.key}`] ??
      [];

    normalized[segment.key] = raw.map((prop) => ({
      ...prop,
      textureKey: repoPathToTextureKey(prop.image)
    }));
  }

  return normalized;
}

export function normalizeStage1Collisions(
  rawSegments: Array<{
    key: StageSegmentKey;
    blockers: Array<{ id: string; type: "rect"; x: number; y: number; w: number; h: number }>;
  }>
): Record<StageSegmentKey, StageCollisionBlocker[]> {
  const normalized = {} as Record<StageSegmentKey, StageCollisionBlocker[]>;

  for (const segment of STAGE1_SEGMENTS) {
    normalized[segment.key] =
      rawSegments.find((entry) => entry.key === segment.key)?.blockers.map((blocker) => ({
        ...blocker
      })) ?? [];
  }

  return normalized;
}

export function normalizeStage1Zones(
  rawZones: Array<{
    id: string;
    segment: StageSegmentKey;
    type: "spawn" | "lock" | "boss";
    x: number;
    y: number;
    w: number;
    h: number;
  }>
): StageZoneRect[] {
  const offsets = segmentOffsetMap(STAGE1_SEGMENTS);

  return rawZones.map((zone) => ({
    key: zone.id,
    segmentKey: zone.segment,
    type: zone.type,
    x: zone.x,
    y: zone.y,
    w: zone.w,
    h: zone.h,
    worldStartY: offsets[zone.segment] + zone.y,
    worldEndY: offsets[zone.segment] + zone.y + zone.h
  }));
}
```

```ts
// src/game/data/stage1/stage1-runtime.ts
import collisionJson from "../../../../data/stage1-collision.json";
import propsJson from "../../../../data/stage1-props.json";
import zonesJson from "../../../../data/stage1-zones.json";
import type { Stage1RuntimeData } from "../../types/stage";
import {
  STAGE1_SEGMENTS,
  normalizeStage1Collisions,
  normalizeStage1Props,
  normalizeStage1Zones
} from "../../utils/stage1-adapter";

// This module is the only place that knows how landed JSON becomes typed runtime data.
export const STAGE1_RUNTIME_DATA: Stage1RuntimeData = {
  segments: STAGE1_SEGMENTS,
  propsBySegment: normalizeStage1Props(propsJson.segments),
  collisionBySegment: normalizeStage1Collisions(collisionJson.segments),
  zones: normalizeStage1Zones(zonesJson.zones),
  totalHeight: Math.max(...STAGE1_SEGMENTS.map((segment) => segment.worldTopY + segment.pixelHeight))
};
```

```ts
// src/game/data/stage1/stage1-assets.ts
import { STAGE1_RUNTIME_DATA } from "./stage1-runtime";
import { repoPathToTextureKey } from "../../utils/stage1-adapter";

export interface StageImageAsset {
  key: string;
  repoPath: string;
  url: string;
}

function repoAsset(repoPath: string): StageImageAsset {
  return {
    key: repoPathToTextureKey(repoPath),
    repoPath,
    url: new URL(`../../../../${repoPath}`, import.meta.url).href
  };
}

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
    playerWreck: repoAsset("assets/units/stage1/player-tank/wreck.png"),
    lightTank: repoAsset("assets/units/stage1/light-tank/light-tank.png"),
    mediumTank: repoAsset("assets/units/stage1/medium-tank/medium-tank.png"),
    fixedTurretBase: repoAsset("assets/units/stage1/fixed-turret/base.png"),
    fixedTurretHead: repoAsset("assets/units/stage1/fixed-turret/head.png"),
    scoutHelicopter: repoAsset("assets/units/stage1/scout-helicopter/scout-helicopter.png"),
    scoutHelicopterRotor: repoAsset("assets/units/stage1/scout-helicopter/rotor.png"),
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
    projectileTrail: repoAsset("assets/fx/stage1/projectile-trail/out/sheet-transparent.png"),
    shieldHit: repoAsset("assets/fx/stage1/shield-hit/out/sheet-transparent.png")
  }
} as const;

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
```

- [ ] **Step 5: Run the data-contract test and build**

Run: `npm run test -- tests/stage1-data.test.ts && npm run build`  
Expected: Stage 1 data tests PASS and the build succeeds while importing real JSON and asset paths.

- [ ] **Step 6: Commit**

```bash
git add src/game/types/stage.ts src/game/utils/stage1-adapter.ts src/game/data/stage1/stage1-runtime.ts src/game/data/stage1/stage1-assets.ts tests/stage1-data.test.ts
git commit -m "feat: adapt landed stage1 assets and json contracts"
```

## Task 3: Load The Landed World And Build The Stage Shell

**Files:**
- Modify: `src/game/scenes/PreloadScene.ts`
- Modify: `src/game/scenes/Stage1Scene.ts`
- Create: `src/game/systems/camera/stage-scroll-controller.ts`
- Test: `tests/stage-scroll-controller.test.ts`

- [ ] **Step 1: Write the failing scroll-controller test**

```ts
import { describe, expect, it } from "vitest";
import { createStageScrollController } from "../src/game/systems/camera/stage-scroll-controller";

describe("createStageScrollController", () => {
  it("tracks the player during scrolling segments", () => {
    const controller = createStageScrollController({
      viewportHeight: 1280,
      stageMaxScrollY: 4120,
      bossLockScrollY: 0
    });

    const cameraY = controller.resolveCameraY({
      playerWorldY: 2600,
      bossArenaLocked: false
    });

    expect(cameraY).toBeGreaterThan(0);
    expect(cameraY).toBeLessThanOrEqual(4120);
  });

  it("pins the camera at the boss lock point", () => {
    const controller = createStageScrollController({
      viewportHeight: 1280,
      stageMaxScrollY: 4120,
      bossLockScrollY: 0
    });

    expect(
      controller.resolveCameraY({
        playerWorldY: 920,
        bossArenaLocked: true
      })
    ).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/stage-scroll-controller.test.ts`  
Expected: FAIL because the scroll controller module does not exist yet.

- [ ] **Step 3: Implement the pure scroll controller**

```ts
// src/game/systems/camera/stage-scroll-controller.ts
export interface ScrollControllerConfig {
  viewportHeight: number;
  stageMaxScrollY: number;
  bossLockScrollY: number;
}

export interface ScrollControllerState {
  playerWorldY: number;
  bossArenaLocked: boolean;
}

export function createStageScrollController(config: ScrollControllerConfig) {
  return {
    resolveCameraY(state: ScrollControllerState): number {
      if (state.bossArenaLocked) {
        return config.bossLockScrollY;
      }

      const desired = state.playerWorldY - config.viewportHeight * 0.65;
      return Math.max(0, Math.min(desired, config.stageMaxScrollY));
    }
  };
}
```

- [ ] **Step 4: Load the landed assets and render the real stage shell**

```ts
// src/game/scenes/PreloadScene.ts
import Phaser from "phaser";
import { listStage1ImageAssets } from "../data/stage1/stage1-assets";

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
```

```ts
// src/game/scenes/Stage1Scene.ts
import Phaser from "phaser";
import { STAGE1_RUNTIME_DATA } from "../data/stage1/stage1-runtime";
import { repoPathToTextureKey } from "../utils/stage1-adapter";
import { createStageScrollController } from "../systems/camera/stage-scroll-controller";

export class Stage1Scene extends Phaser.Scene {
  private bossArenaLocked = false;
  private playerMarker!: Phaser.GameObjects.Rectangle;
  private staticWalls!: Phaser.Physics.Arcade.StaticGroup;

  private readonly scrollController = createStageScrollController({
    viewportHeight: 1280,
    stageMaxScrollY: STAGE1_RUNTIME_DATA.totalHeight - 1280,
    bossLockScrollY: 0
  });

  constructor() {
    super("stage1");
  }

  create(): void {
    this.staticWalls = this.physics.add.staticGroup();

    for (const segment of STAGE1_RUNTIME_DATA.segments) {
      this.add
        .image(360, segment.worldTopY + segment.pixelHeight / 2, repoPathToTextureKey(segment.mapRepoPath))
        .setOrigin(0.5, 0.5);

      for (const prop of STAGE1_RUNTIME_DATA.propsBySegment[segment.key]) {
        this.add
          .image(prop.x + prop.w / 2, segment.worldTopY + prop.y + prop.h / 2, prop.textureKey)
          .setDisplaySize(prop.w, prop.h);
      }

      for (const blocker of STAGE1_RUNTIME_DATA.collisionBySegment[segment.key]) {
        const wall = this.add.rectangle(
          blocker.x + blocker.w / 2,
          segment.worldTopY + blocker.y + blocker.h / 2,
          blocker.w,
          blocker.h,
          0x000000,
          0
        );

        this.physics.add.existing(wall, true);
        this.staticWalls.add(wall);
      }
    }

    this.physics.world.setBounds(0, 0, 720, STAGE1_RUNTIME_DATA.totalHeight);
    this.cameras.main.setBounds(0, 0, 720, STAGE1_RUNTIME_DATA.totalHeight);

    // Task 4 replaces this marker with the actual player tank and live controls.
    // The marker starts near the world bottom because Stage 1 progression moves upward toward smaller Y.
    this.playerMarker = this.add.rectangle(360, STAGE1_RUNTIME_DATA.totalHeight - 220, 46, 62, 0x8ba073);
  }

  update(): void {
    const cameraY = this.scrollController.resolveCameraY({
      playerWorldY: this.playerMarker.y,
      bossArenaLocked: this.bossArenaLocked
    });

    this.cameras.main.scrollY = cameraY;
  }
}
```

- [ ] **Step 5: Run tests and build**

Run: `npm run test -- tests/stage-scroll-controller.test.ts && npm run build`  
Expected: scroll-controller tests PASS and the build succeeds while loading the landed map, props, and collision contracts.

- [ ] **Step 6: Commit**

```bash
git add src/game/scenes/PreloadScene.ts src/game/scenes/Stage1Scene.ts src/game/systems/camera/stage-scroll-controller.ts tests/stage-scroll-controller.test.ts
git commit -m "feat: load landed stage shell and scroll controller"
```

## Task 4: Implement Real Touch Controls, The Player Tank, And HUD Art

**Files:**
- Create: `src/game/systems/input/touch-controls.ts`
- Create: `src/game/entities/player/player-tank.ts`
- Create: `src/game/ui/health-bar.ts`
- Create: `src/game/ui/hud-state.ts`
- Modify: `src/game/scenes/Stage1Scene.ts`
- Modify: `src/game/scenes/HudScene.ts`
- Test: `tests/touch-controls.test.ts`

- [ ] **Step 1: Write the failing touch-controls test**

```ts
import { describe, expect, it } from "vitest";
import {
  createTouchControls,
  resolveKeyboardInput
} from "../src/game/systems/input/touch-controls";

describe("createTouchControls", () => {
  it("clamps stick magnitude to 1 and preserves the fire state", () => {
    const controls = createTouchControls(72);
    controls.beginStick({ x: 104, y: 1112 }, { x: 220, y: 1260 });
    controls.setFirePressed(true);

    const snapshot = controls.snapshot();

    expect(snapshot.moveX).toBeLessThanOrEqual(1);
    expect(snapshot.moveY).toBeLessThanOrEqual(1);
    expect(snapshot.firePressed).toBe(true);
  });

  it("maps debug keyboard input to the same player snapshot contract", () => {
    const snapshot = resolveKeyboardInput({
      left: true,
      right: false,
      up: true,
      down: false,
      fire: true
    });

    expect(snapshot.moveX).toBeLessThan(0);
    expect(snapshot.moveY).toBeLessThan(0);
    expect(snapshot.stickIntensity).toBe(1);
    expect(snapshot.firePressed).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/touch-controls.test.ts`  
Expected: FAIL because the touch-controls module does not exist yet.

- [ ] **Step 3: Implement the touch-controls helper, HUD state, and player tank**

```ts
// src/game/systems/input/touch-controls.ts
export interface PointerPosition {
  x: number;
  y: number;
}

export interface PlayerInputSnapshot {
  moveX: number;
  moveY: number;
  stickIntensity: number;
  firePressed: boolean;
}

export interface KeyboardDigitalState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
}

export function resolveKeyboardInput(state: KeyboardDigitalState): PlayerInputSnapshot {
  const rawX = (state.right ? 1 : 0) - (state.left ? 1 : 0);
  const rawY = (state.down ? 1 : 0) - (state.up ? 1 : 0);
  const moving = rawX !== 0 || rawY !== 0;
  const length = moving ? Math.hypot(rawX, rawY) : 1;

  return {
    moveX: moving ? Number((rawX / length).toFixed(4)) : 0,
    moveY: moving ? Number((rawY / length).toFixed(4)) : 0,
    stickIntensity: moving ? 1 : 0,
    firePressed: state.fire
  };
}

export function mergePlayerInput(
  touchInput: PlayerInputSnapshot,
  keyboardInput: PlayerInputSnapshot
): PlayerInputSnapshot {
  const movementSource =
    keyboardInput.stickIntensity > touchInput.stickIntensity ? keyboardInput : touchInput;

  return {
    ...movementSource,
    firePressed: touchInput.firePressed || keyboardInput.firePressed
  };
}

export function createTouchControls(radius: number) {
  let stickCenter: PointerPosition | null = null;
  let stickPointer: PointerPosition | null = null;
  let firePressed = false;

  function resolveStick(): PlayerInputSnapshot {
    if (!stickCenter || !stickPointer) {
      return {
        moveX: 0,
        moveY: 0,
        stickIntensity: 0,
        firePressed
      };
    }

    const dx = stickPointer.x - stickCenter.x;
    const dy = stickPointer.y - stickCenter.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const clamped = Math.min(length, radius);
    const ratio = clamped / radius;

    return {
      moveX: Number(((dx / length) * ratio).toFixed(4)),
      moveY: Number(((dy / length) * ratio).toFixed(4)),
      stickIntensity: Number(ratio.toFixed(4)),
      firePressed
    };
  }

  return {
    beginStick(center: PointerPosition, pointer: PointerPosition): void {
      stickCenter = center;
      stickPointer = pointer;
    },
    moveStick(pointer: PointerPosition): void {
      if (stickCenter) {
        stickPointer = pointer;
      }
    },
    endStick(): void {
      stickCenter = null;
      stickPointer = null;
    },
    setFirePressed(next: boolean): void {
      firePressed = next;
    },
    snapshot(): PlayerInputSnapshot {
      return resolveStick();
    }
  };
}
```

```ts
// src/game/ui/hud-state.ts
import type { PlayerInputSnapshot } from "../systems/input/touch-controls";

export interface HudState {
  playerHp: number;
  playerMaxHp: number;
  shieldHp: number;
  shieldMaxHp: number;
  weaponBoostActive: boolean;
  input: PlayerInputSnapshot;
}

export const EMPTY_INPUT: PlayerInputSnapshot = {
  moveX: 0,
  moveY: 0,
  stickIntensity: 0,
  firePressed: false
};

export const INITIAL_HUD_STATE: HudState = {
  playerHp: 100,
  playerMaxHp: 100,
  shieldHp: 0,
  shieldMaxHp: 50,
  weaponBoostActive: false,
  input: EMPTY_INPUT
};
```

```ts
// src/game/ui/health-bar.ts
import Phaser from "phaser";

export class HealthBar extends Phaser.GameObjects.Container {
  private readonly frame: Phaser.GameObjects.Image;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly widthPx: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    frameTextureKey: string,
    widthPx: number,
    fillColor: number
  ) {
    const frame = scene.add.image(0, 0, frameTextureKey).setOrigin(0, 0.5);
    const fill = scene.add.rectangle(14, 0, widthPx, 12, fillColor, 0.95).setOrigin(0, 0.5);
    super(scene, x, y, [frame, fill]);

    this.frame = frame;
    this.fill = fill;
    this.widthPx = widthPx;

    scene.add.existing(this);
  }

  sync(current: number, max: number): void {
    const ratio = Phaser.Math.Clamp(current / Math.max(1, max), 0, 1);
    this.fill.width = this.widthPx * ratio;
  }
}
```

```ts
// src/game/entities/player/player-tank.ts
import Phaser from "phaser";
import type { HudState } from "../../ui/hud-state";
import type { PlayerInputSnapshot } from "../../systems/input/touch-controls";

export class PlayerTank extends Phaser.GameObjects.Container {
  hp = 100;
  maxHp = 100;
  shieldHp = 0;
  shieldMaxHp = 50;
  weaponBoostActive = false;

  private readonly hull: Phaser.GameObjects.Image;
  private readonly turret: Phaser.GameObjects.Image;
  private readonly speed = 240;
  private readonly fireCooldownMs = 260;
  private lastFireTime = -Infinity;

  constructor(scene: Phaser.Scene, x: number, y: number, textures: {
    hullKey: string;
    turretKey: string;
    shadowKey: string;
  }) {
    const shadow = scene.add.image(0, 8, textures.shadowKey).setAlpha(0.4);
    const hull = scene.add.image(0, 0, textures.hullKey);
    const turret = scene.add.image(0, 0, textures.turretKey);
    super(scene, x, y, [shadow, hull, turret]);

    this.hull = hull;
    this.turret = turret;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(48, 64);
    body.setCollideWorldBounds(true);
  }

  updateFromInput(input: PlayerInputSnapshot, time: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(input.moveX * this.speed, input.moveY * this.speed);

    if (input.moveX !== 0 || input.moveY !== 0) {
      this.turret.rotation = Math.atan2(input.moveY, input.moveX) + Math.PI / 2;
    }

    if (input.firePressed && time - this.lastFireTime >= this.fireCooldownMs) {
      this.lastFireTime = time;
      return true;
    }

    return false;
  }

  toHudState(input: PlayerInputSnapshot): HudState {
    return {
      playerHp: this.hp,
      playerMaxHp: this.maxHp,
      shieldHp: this.shieldHp,
      shieldMaxHp: this.shieldMaxHp,
      weaponBoostActive: this.weaponBoostActive,
      input
    };
  }
}
```

- [ ] **Step 4: Wire real pointer input and landed HUD art into the scenes**

```ts
// src/game/scenes/Stage1Scene.ts
import Phaser from "phaser";
import { STAGE1_IMAGE_ASSETS } from "../data/stage1/stage1-assets";
import { STAGE1_RUNTIME_DATA } from "../data/stage1/stage1-runtime";
import { PlayerTank } from "../entities/player/player-tank";
import {
  createTouchControls,
  mergePlayerInput,
  resolveKeyboardInput
} from "../systems/input/touch-controls";
import { repoPathToTextureKey } from "../utils/stage1-adapter";
import { createStageScrollController } from "../systems/camera/stage-scroll-controller";

export class Stage1Scene extends Phaser.Scene {
  private bossArenaLocked = false;
  private staticWalls!: Phaser.Physics.Arcade.StaticGroup;
  private player!: PlayerTank;
  private debugKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly stickCenter = { x: 104, y: 1112 };
  private readonly fireButtonCenter = new Phaser.Geom.Circle(604, 1112, 72);
  private readonly controls = createTouchControls(72);

  private readonly scrollController = createStageScrollController({
    viewportHeight: 1280,
    stageMaxScrollY: STAGE1_RUNTIME_DATA.totalHeight - 1280,
    bossLockScrollY: 0
  });

  constructor() {
    super("stage1");
  }

  create(): void {
    this.staticWalls = this.physics.add.staticGroup();

    for (const segment of STAGE1_RUNTIME_DATA.segments) {
      this.add
        .image(360, segment.worldTopY + segment.pixelHeight / 2, repoPathToTextureKey(segment.mapRepoPath))
        .setOrigin(0.5, 0.5);

      for (const prop of STAGE1_RUNTIME_DATA.propsBySegment[segment.key]) {
        this.add
          .image(prop.x + prop.w / 2, segment.worldTopY + prop.y + prop.h / 2, prop.textureKey)
          .setDisplaySize(prop.w, prop.h);
      }

      for (const blocker of STAGE1_RUNTIME_DATA.collisionBySegment[segment.key]) {
        const wall = this.add.rectangle(
          blocker.x + blocker.w / 2,
          segment.worldTopY + blocker.y + blocker.h / 2,
          blocker.w,
          blocker.h,
          0x000000,
          0
        );

        this.physics.add.existing(wall, true);
        this.staticWalls.add(wall);
      }
    }

    this.physics.world.setBounds(0, 0, 720, STAGE1_RUNTIME_DATA.totalHeight);
    this.cameras.main.setBounds(0, 0, 720, STAGE1_RUNTIME_DATA.totalHeight);

    this.player = new PlayerTank(this, 360, STAGE1_RUNTIME_DATA.totalHeight - 240, {
      hullKey: STAGE1_IMAGE_ASSETS.units.playerHull.key,
      turretKey: STAGE1_IMAGE_ASSETS.units.playerTurret.key,
      shadowKey: STAGE1_IMAGE_ASSETS.units.playerShadow.key
    });

    this.physics.add.collider(this.player, this.staticWalls);
    this.debugKeys = this.input.keyboard?.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE"
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.addPointer(2);

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.x <= 240) {
        this.controls.beginStick(this.stickCenter, { x: pointer.x, y: pointer.y });
      }

      if (Phaser.Geom.Circle.Contains(this.fireButtonCenter, pointer.x, pointer.y)) {
        this.controls.setFirePressed(true);
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.x <= 240) {
        this.controls.moveStick({ x: pointer.x, y: pointer.y });
      }

      if (pointer.isDown) {
        this.controls.setFirePressed(Phaser.Geom.Circle.Contains(this.fireButtonCenter, pointer.x, pointer.y));
      }
    });

    this.input.on("pointerup", () => {
      this.controls.endStick();
      this.controls.setFirePressed(false);
    });
  }

  update(time: number): void {
    const touchInput = this.controls.snapshot();
    const keyboardInput = resolveKeyboardInput({
      left: this.debugKeys.A.isDown || this.debugKeys.LEFT.isDown,
      right: this.debugKeys.D.isDown || this.debugKeys.RIGHT.isDown,
      up: this.debugKeys.W.isDown || this.debugKeys.UP.isDown,
      down: this.debugKeys.S.isDown || this.debugKeys.DOWN.isDown,
      fire: this.debugKeys.SPACE.isDown
    });
    const input = mergePlayerInput(touchInput, keyboardInput);
    this.player.updateFromInput(input, time);

    const cameraY = this.scrollController.resolveCameraY({
      playerWorldY: this.player.y,
      bossArenaLocked: this.bossArenaLocked
    });

    this.cameras.main.scrollY = cameraY;
    this.events.emit("hud-sync", this.player.toHudState(input));
  }
}
```

```ts
// src/game/scenes/HudScene.ts
import Phaser from "phaser";
import { STAGE1_IMAGE_ASSETS } from "../data/stage1/stage1-assets";
import { HealthBar } from "../ui/health-bar";
import { INITIAL_HUD_STATE, type HudState } from "../ui/hud-state";

export class HudScene extends Phaser.Scene {
  private playerHpBar!: HealthBar;
  private hpText!: Phaser.GameObjects.Text;
  private joystickKnob!: Phaser.GameObjects.Image;
  private fireButton!: Phaser.GameObjects.Image;
  private shieldOverlay!: Phaser.GameObjects.Image;
  private weaponBoostIcon!: Phaser.GameObjects.Image;

  constructor() {
    super("hud");
  }

  create(): void {
    const stageScene = this.scene.get("stage1");

    this.add.image(104, 1112, STAGE1_IMAGE_ASSETS.ui.joystickBase.key).setScrollFactor(0).setAlpha(0.84);
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

    this.hpText = this.add.text(24, 68, "", {
      color: "#dce7f1",
      fontSize: "22px"
    }).setScrollFactor(0);

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

    this.sync(INITIAL_HUD_STATE);
  }

  sync(state: HudState): void {
    this.playerHpBar.sync(state.playerHp, state.playerMaxHp);
    this.hpText.setText(`HP ${state.playerHp}/${state.playerMaxHp}`);
    this.joystickKnob.setPosition(
      104 + state.input.moveX * 30,
      1112 + state.input.moveY * 30
    );
    this.fireButton.setAlpha(state.input.firePressed ? 1 : 0.85);
    this.shieldOverlay.setVisible(state.shieldHp > 0);
    this.weaponBoostIcon.setVisible(state.weaponBoostActive);
  }
}
```

- [ ] **Step 5: Run tests and build**

Run: `npm run test -- tests/touch-controls.test.ts && npm run build`  
Expected: touch-control tests PASS and the build succeeds with real touch input, debug keyboard input (`WASD` / arrow keys + `Space`), a controllable player, and landed HUD art wired into the overlay scene.

- [ ] **Step 6: Commit**

```bash
git add src/game/systems/input/touch-controls.ts src/game/entities/player/player-tank.ts src/game/ui/health-bar.ts src/game/ui/hud-state.ts src/game/scenes/Stage1Scene.ts src/game/scenes/HudScene.ts tests/touch-controls.test.ts
git commit -m "feat: add touch controls player tank and landed hud art"
```

## Task 5: Add Combat Primitives, Player Projectile Hits, Enemy Actors, And Enemy Health Bars

**Files:**
- Create: `src/game/systems/combat/health.ts`
- Create: `src/game/systems/combat/projectiles.ts`
- Create: `src/game/entities/enemies/enemy-presets.ts`
- Create: `src/game/entities/enemies/ground-enemy.ts`
- Create: `src/game/entities/enemies/fixed-turret.ts`
- Create: `src/game/entities/enemies/scout-helicopter.ts`
- Create: `src/game/entities/enemies/enemy-factory.ts`
- Modify: `src/game/scenes/Stage1Scene.ts`
- Test: `tests/combat-health.test.ts`

- [ ] **Step 1: Write the failing combat-health test**

```ts
import { describe, expect, it } from "vitest";
import { applyDamage } from "../src/game/systems/combat/health";

describe("applyDamage", () => {
  it("consumes shield before health", () => {
    const result = applyDamage(
      { hp: 100, shieldHp: 20 },
      { amount: 30 }
    );

    expect(result.shieldHp).toBe(0);
    expect(result.hp).toBe(90);
    expect(result.destroyed).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/combat-health.test.ts`  
Expected: FAIL because the combat-health helper does not exist yet.

- [ ] **Step 3: Implement combat helpers and the enemy roster**

```ts
// src/game/systems/combat/health.ts
export function applyDamage(
  current: { hp: number; shieldHp: number },
  hit: { amount: number }
) {
  const shieldAbsorb = Math.min(current.shieldHp, hit.amount);
  const remaining = hit.amount - shieldAbsorb;
  const nextHp = Math.max(0, current.hp - remaining);

  return {
    hp: nextHp,
    shieldHp: current.shieldHp - shieldAbsorb,
    destroyed: nextHp === 0
  };
}
```

```ts
// src/game/systems/combat/projectiles.ts
import Phaser from "phaser";

export class ProjectileSystem {
  readonly group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene, textureKey: string) {
    this.group = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      defaultKey: textureKey,
      maxSize: 64
    });
  }

  spawn(x: number, y: number, velocityX: number, velocityY: number): void {
    const shot = this.group.get(x, y) as Phaser.Physics.Arcade.Image | null;

    if (!shot) {
      return;
    }

    shot.setActive(true);
    shot.setVisible(true);
    shot.body.enable = true;
    shot.setPosition(x, y);
    shot.setVelocity(velocityX, velocityY);
  }

  recycle(shot: Phaser.Physics.Arcade.Image): void {
    shot.disableBody(true, true);
    shot.setVelocity(0, 0);
  }
}
```

```ts
// src/game/entities/enemies/enemy-presets.ts
export const ENEMY_PRESETS = {
  light_tank: { hp: 30, speed: 150 },
  medium_tank: { hp: 55, speed: 110 },
  fixed_turret: { hp: 40, speed: 0 },
  scout_helicopter: { hp: 35, speed: 200 }
} as const;
```

```ts
// src/game/entities/enemies/ground-enemy.ts
import Phaser from "phaser";
import { ENEMY_PRESETS } from "./enemy-presets";

export class GroundEnemy extends Phaser.Physics.Arcade.Sprite {
  readonly maxHp: number;
  hp: number;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string, presetKey: "light_tank" | "medium_tank") {
    super(scene, x, y, textureKey);
    this.maxHp = ENEMY_PRESETS[presetKey].hp;
    this.hp = this.maxHp;

    scene.add.existing(this);
    scene.physics.add.existing(this);
  }
}
```

```ts
// src/game/entities/enemies/fixed-turret.ts
import Phaser from "phaser";
import { ENEMY_PRESETS } from "./enemy-presets";

export class FixedTurret extends Phaser.GameObjects.Container {
  readonly maxHp = ENEMY_PRESETS.fixed_turret.hp;
  hp = ENEMY_PRESETS.fixed_turret.hp;

  constructor(scene: Phaser.Scene, x: number, y: number, textures: { baseKey: string; headKey: string }) {
    const base = scene.add.image(0, 0, textures.baseKey);
    const head = scene.add.image(0, -8, textures.headKey);
    super(scene, x, y, [base, head]);

    scene.add.existing(this);
    scene.physics.add.existing(this);
  }
}
```

```ts
// src/game/entities/enemies/scout-helicopter.ts
import Phaser from "phaser";
import { ENEMY_PRESETS } from "./enemy-presets";

export class ScoutHelicopter extends Phaser.Physics.Arcade.Sprite {
  readonly maxHp = ENEMY_PRESETS.scout_helicopter.hp;
  hp = ENEMY_PRESETS.scout_helicopter.hp;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setVelocityX(-ENEMY_PRESETS.scout_helicopter.speed);
  }
}
```

```ts
// src/game/entities/enemies/enemy-factory.ts
import Phaser from "phaser";
import type { EnemyType } from "../../types/stage";
import { STAGE1_IMAGE_ASSETS } from "../../data/stage1/stage1-assets";
import { FixedTurret } from "./fixed-turret";
import { GroundEnemy } from "./ground-enemy";
import { ScoutHelicopter } from "./scout-helicopter";

export type EnemyActor = GroundEnemy | FixedTurret | ScoutHelicopter;

export function spawnEnemyActor(
  scene: Phaser.Scene,
  spec: { type: EnemyType; x: number; y: number }
): EnemyActor {
  switch (spec.type) {
    case "light_tank":
      return new GroundEnemy(scene, spec.x, spec.y, STAGE1_IMAGE_ASSETS.units.lightTank.key, "light_tank");
    case "medium_tank":
      return new GroundEnemy(scene, spec.x, spec.y, STAGE1_IMAGE_ASSETS.units.mediumTank.key, "medium_tank");
    case "fixed_turret":
      return new FixedTurret(scene, spec.x, spec.y, {
        baseKey: STAGE1_IMAGE_ASSETS.units.fixedTurretBase.key,
        headKey: STAGE1_IMAGE_ASSETS.units.fixedTurretHead.key
      });
    case "scout_helicopter":
      return new ScoutHelicopter(scene, spec.x, spec.y, STAGE1_IMAGE_ASSETS.units.scoutHelicopter.key);
  }
}
```

- [ ] **Step 4: Wire projectiles, enemy spawning, and enemy health bars into the world scene**

```ts
// src/game/scenes/Stage1Scene.ts
import Phaser from "phaser";
import { STAGE1_IMAGE_ASSETS } from "../data/stage1/stage1-assets";
import { STAGE1_RUNTIME_DATA } from "../data/stage1/stage1-runtime";
import { PlayerTank } from "../entities/player/player-tank";
import { spawnEnemyActor, type EnemyActor } from "../entities/enemies/enemy-factory";
import { applyDamage } from "../systems/combat/health";
import { ProjectileSystem } from "../systems/combat/projectiles";
import {
  createTouchControls,
  mergePlayerInput,
  resolveKeyboardInput
} from "../systems/input/touch-controls";
import { repoPathToTextureKey } from "../utils/stage1-adapter";
import { createStageScrollController } from "../systems/camera/stage-scroll-controller";
import { HealthBar } from "../ui/health-bar";

export class Stage1Scene extends Phaser.Scene {
  private bossArenaLocked = false;
  private staticWalls!: Phaser.Physics.Arcade.StaticGroup;
  private enemyHitTargets!: Phaser.Physics.Arcade.Group;
  private player!: PlayerTank;
  private playerProjectiles!: ProjectileSystem;
  private debugKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly enemies: EnemyActor[] = [];
  private readonly enemyBars: Array<{ actor: EnemyActor; bar: HealthBar }> = [];
  private readonly stickCenter = { x: 104, y: 1112 };
  private readonly fireButtonCenter = new Phaser.Geom.Circle(604, 1112, 72);
  private readonly controls = createTouchControls(72);

  private readonly scrollController = createStageScrollController({
    viewportHeight: 1280,
    stageMaxScrollY: STAGE1_RUNTIME_DATA.totalHeight - 1280,
    bossLockScrollY: 0
  });

  constructor() {
    super("stage1");
  }

  private addEnemyHealthBar(actor: EnemyActor): void {
    const bar = new HealthBar(
      this,
      actor.x - 40,
      actor.y - 42,
      STAGE1_IMAGE_ASSETS.ui.enemyHealthBar.key,
      54,
      0xe06d6d
    );

    this.enemyBars.push({ actor, bar });
  }

  private removeEnemy(actor: EnemyActor): void {
    const barIndex = this.enemyBars.findIndex((entry) => entry.actor === actor);

    if (barIndex >= 0) {
      this.enemyBars[barIndex].bar.destroy();
      this.enemyBars.splice(barIndex, 1);
    }

    const enemyIndex = this.enemies.indexOf(actor);
    if (enemyIndex >= 0) {
      this.enemies.splice(enemyIndex, 1);
    }

    actor.destroy();
  }

  private spawnEnemy(spec: { type: "light_tank" | "medium_tank" | "fixed_turret" | "scout_helicopter"; x: number; y: number }): void {
    const actor = spawnEnemyActor(this, spec);
    this.enemies.push(actor);
    this.enemyHitTargets.add(actor as unknown as Phaser.GameObjects.GameObject);
    this.addEnemyHealthBar(actor);
  }

  create(): void {
    this.staticWalls = this.physics.add.staticGroup();
    this.enemyHitTargets = this.physics.add.group();

    for (const segment of STAGE1_RUNTIME_DATA.segments) {
      this.add
        .image(360, segment.worldTopY + segment.pixelHeight / 2, repoPathToTextureKey(segment.mapRepoPath))
        .setOrigin(0.5, 0.5);

      for (const prop of STAGE1_RUNTIME_DATA.propsBySegment[segment.key]) {
        this.add
          .image(prop.x + prop.w / 2, segment.worldTopY + prop.y + prop.h / 2, prop.textureKey)
          .setDisplaySize(prop.w, prop.h);
      }

      for (const blocker of STAGE1_RUNTIME_DATA.collisionBySegment[segment.key]) {
        const wall = this.add.rectangle(
          blocker.x + blocker.w / 2,
          segment.worldTopY + blocker.y + blocker.h / 2,
          blocker.w,
          blocker.h,
          0x000000,
          0
        );

        this.physics.add.existing(wall, true);
        this.staticWalls.add(wall);
      }
    }

    this.physics.world.setBounds(0, 0, 720, STAGE1_RUNTIME_DATA.totalHeight);
    this.cameras.main.setBounds(0, 0, 720, STAGE1_RUNTIME_DATA.totalHeight);

    this.player = new PlayerTank(this, 360, STAGE1_RUNTIME_DATA.totalHeight - 240, {
      hullKey: STAGE1_IMAGE_ASSETS.units.playerHull.key,
      turretKey: STAGE1_IMAGE_ASSETS.units.playerTurret.key,
      shadowKey: STAGE1_IMAGE_ASSETS.units.playerShadow.key
    });

    this.playerProjectiles = new ProjectileSystem(this, STAGE1_IMAGE_ASSETS.fx.projectileTrail.key);
    this.physics.add.collider(this.player, this.staticWalls);

    this.physics.add.overlap(
      this.playerProjectiles.group,
      this.enemyHitTargets,
      (shotObject, enemyObject) => {
        const shot = shotObject as Phaser.Physics.Arcade.Image;
        const actor = enemyObject as unknown as EnemyActor;
        const result = applyDamage({ hp: actor.hp, shieldHp: 0 }, { amount: 18 });

        actor.hp = result.hp;
        this.add.image(actor.x, actor.y, STAGE1_IMAGE_ASSETS.fx.hitSpark.key).setAlpha(0.92);
        this.playerProjectiles.recycle(shot);

        if (result.destroyed) {
          this.add.image(actor.x, actor.y, STAGE1_IMAGE_ASSETS.fx.explosionMedium.key).setAlpha(0.96);
          this.removeEnemy(actor);
        }
      }
    );

    this.spawnEnemy({ type: "light_tank", x: 320, y: 4700 });

    this.debugKeys = this.input.keyboard?.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE"
    ) as Record<string, Phaser.Input.Keyboard.Key>;

    this.input.addPointer(2);
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.x <= 240) {
        this.controls.beginStick(this.stickCenter, { x: pointer.x, y: pointer.y });
      }

      if (Phaser.Geom.Circle.Contains(this.fireButtonCenter, pointer.x, pointer.y)) {
        this.controls.setFirePressed(true);
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.x <= 240) {
        this.controls.moveStick({ x: pointer.x, y: pointer.y });
      }

      if (pointer.isDown) {
        this.controls.setFirePressed(Phaser.Geom.Circle.Contains(this.fireButtonCenter, pointer.x, pointer.y));
      }
    });

    this.input.on("pointerup", () => {
      this.controls.endStick();
      this.controls.setFirePressed(false);
    });
  }

  update(time: number): void {
    const touchInput = this.controls.snapshot();
    const keyboardInput = resolveKeyboardInput({
      left: this.debugKeys.A.isDown || this.debugKeys.LEFT.isDown,
      right: this.debugKeys.D.isDown || this.debugKeys.RIGHT.isDown,
      up: this.debugKeys.W.isDown || this.debugKeys.UP.isDown,
      down: this.debugKeys.S.isDown || this.debugKeys.DOWN.isDown,
      fire: this.debugKeys.SPACE.isDown
    });
    const input = mergePlayerInput(touchInput, keyboardInput);
    const fireRequested = this.player.updateFromInput(input, time);

    if (fireRequested) {
      this.playerProjectiles.spawn(this.player.x, this.player.y - 40, 0, -420);
    }

    for (const entry of this.enemyBars) {
      entry.bar.setPosition(entry.actor.x - 40, entry.actor.y - 42);
      entry.bar.sync(entry.actor.hp, entry.actor.maxHp);
    }

    const cameraY = this.scrollController.resolveCameraY({
      playerWorldY: this.player.y,
      bossArenaLocked: this.bossArenaLocked
    });

    this.cameras.main.scrollY = cameraY;
    this.events.emit("hud-sync", this.player.toHudState(input));
  }
}
```

- [ ] **Step 5: Run tests and build**

Run: `npm run test -- tests/combat-health.test.ts && npm run build`  
Expected: combat-health tests PASS and the build succeeds with player shots damaging enemies, enemy deaths cleaning up health bars, projectile recycling on hit, and hit/explosion placeholder effects present in the scene.

- [ ] **Step 6: Commit**

```bash
git add src/game/systems/combat/health.ts src/game/systems/combat/projectiles.ts src/game/entities/enemies/enemy-presets.ts src/game/entities/enemies/ground-enemy.ts src/game/entities/enemies/fixed-turret.ts src/game/entities/enemies/scout-helicopter.ts src/game/entities/enemies/enemy-factory.ts src/game/scenes/Stage1Scene.ts tests/combat-health.test.ts
git commit -m "feat: add combat primitives enemies and enemy health bars"
```

## Task 5.5: Add Enemy Fire, Player Damage, And Player Death State

**Files:**
- Modify: `src/game/systems/combat/projectiles.ts`
- Modify: `src/game/scenes/Stage1Scene.ts`
- Modify: `src/game/scenes/HudScene.ts`
- Test: `tests/enemy-fire-player-damage.test.ts`

- [ ] **Step 1: Write the failing enemy-fire and player-damage test**

```ts
import { describe, expect, it } from "vitest";
import { applyDamage } from "../src/game/systems/combat/health";
import { resolveShotVelocity } from "../src/game/systems/combat/projectiles";

describe("enemy fire and player damage", () => {
  it("fires toward the player using a positive Y velocity when the player is below", () => {
    const velocity = resolveShotVelocity(
      { x: 320, y: 1800 },
      { x: 360, y: 2400 },
      280
    );

    expect(velocity.y).toBeGreaterThan(0);
  });

  it("marks the player as destroyed when incoming damage exceeds remaining hp", () => {
    const result = applyDamage({ hp: 20, shieldHp: 0 }, { amount: 30 });
    expect(result.destroyed).toBe(true);
    expect(result.hp).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/enemy-fire-player-damage.test.ts`  
Expected: FAIL because `resolveShotVelocity` does not exist yet.

- [ ] **Step 3: Extend projectile helpers with enemy targeting support**

```ts
// src/game/systems/combat/projectiles.ts
import Phaser from "phaser";

export function resolveShotVelocity(
  from: { x: number; y: number },
  to: { x: number; y: number },
  speed: number
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));

  return {
    x: Number(((dx / length) * speed).toFixed(4)),
    y: Number(((dy / length) * speed).toFixed(4))
  };
}

export class ProjectileSystem {
  readonly group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene, textureKey: string) {
    this.group = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      defaultKey: textureKey,
      maxSize: 64
    });
  }

  spawn(x: number, y: number, velocityX: number, velocityY: number): void {
    const shot = this.group.get(x, y) as Phaser.Physics.Arcade.Image | null;

    if (!shot) {
      return;
    }

    shot.setActive(true);
    shot.setVisible(true);
    shot.body.enable = true;
    shot.setPosition(x, y);
    shot.setVelocity(velocityX, velocityY);
  }

  recycle(shot: Phaser.Physics.Arcade.Image): void {
    shot.disableBody(true, true);
    shot.setVelocity(0, 0);
  }
}
```

- [ ] **Step 4: Add enemy fire timers, player hit handling, and a death state**

```ts
// src/game/scenes/Stage1Scene.ts
import Phaser from "phaser";
import { STAGE1_IMAGE_ASSETS } from "../data/stage1/stage1-assets";
import { STAGE1_RUNTIME_DATA } from "../data/stage1/stage1-runtime";
import { PlayerTank } from "../entities/player/player-tank";
import { spawnEnemyActor, type EnemyActor } from "../entities/enemies/enemy-factory";
import { applyDamage } from "../systems/combat/health";
import { ProjectileSystem, resolveShotVelocity } from "../systems/combat/projectiles";
import {
  createTouchControls,
  mergePlayerInput,
  resolveKeyboardInput
} from "../systems/input/touch-controls";
import { repoPathToTextureKey } from "../utils/stage1-adapter";
import { createStageScrollController } from "../systems/camera/stage-scroll-controller";
import { HealthBar } from "../ui/health-bar";

export class Stage1Scene extends Phaser.Scene {
  private bossArenaLocked = false;
  private playerDead = false;
  private staticWalls!: Phaser.Physics.Arcade.StaticGroup;
  private enemyHitTargets!: Phaser.Physics.Arcade.Group;
  private player!: PlayerTank;
  private playerProjectiles!: ProjectileSystem;
  private enemyProjectiles!: ProjectileSystem;
  private debugKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly enemies: EnemyActor[] = [];
  private readonly enemyBars: Array<{ actor: EnemyActor; bar: HealthBar }> = [];
  private readonly stickCenter = { x: 104, y: 1112 };
  private readonly fireButtonCenter = new Phaser.Geom.Circle(604, 1112, 72);
  private readonly controls = createTouchControls(72);

  private readonly scrollController = createStageScrollController({
    viewportHeight: 1280,
    stageMaxScrollY: STAGE1_RUNTIME_DATA.totalHeight - 1280,
    bossLockScrollY: 0
  });

  constructor() {
    super("stage1");
  }

  private addEnemyHealthBar(actor: EnemyActor): void {
    const bar = new HealthBar(
      this,
      actor.x - 40,
      actor.y - 42,
      STAGE1_IMAGE_ASSETS.ui.enemyHealthBar.key,
      54,
      0xe06d6d
    );

    this.enemyBars.push({ actor, bar });
  }

  private removeEnemy(actor: EnemyActor): void {
    const barIndex = this.enemyBars.findIndex((entry) => entry.actor === actor);

    if (barIndex >= 0) {
      this.enemyBars[barIndex].bar.destroy();
      this.enemyBars.splice(barIndex, 1);
    }

    const enemyIndex = this.enemies.indexOf(actor);
    if (enemyIndex >= 0) {
      this.enemies.splice(enemyIndex, 1);
    }

    actor.destroy();
  }

  private spawnEnemy(spec: { type: "light_tank" | "medium_tank" | "fixed_turret" | "scout_helicopter"; x: number; y: number }): void {
    const actor = spawnEnemyActor(this, spec);
    this.enemies.push(actor);
    this.enemyHitTargets.add(actor as unknown as Phaser.GameObjects.GameObject);
    this.addEnemyHealthBar(actor);
  }

  create(): void {
    this.staticWalls = this.physics.add.staticGroup();
    this.enemyHitTargets = this.physics.add.group();

    for (const segment of STAGE1_RUNTIME_DATA.segments) {
      this.add
        .image(360, segment.worldTopY + segment.pixelHeight / 2, repoPathToTextureKey(segment.mapRepoPath))
        .setOrigin(0.5, 0.5);

      for (const prop of STAGE1_RUNTIME_DATA.propsBySegment[segment.key]) {
        this.add
          .image(prop.x + prop.w / 2, segment.worldTopY + prop.y + prop.h / 2, prop.textureKey)
          .setDisplaySize(prop.w, prop.h);
      }

      for (const blocker of STAGE1_RUNTIME_DATA.collisionBySegment[segment.key]) {
        const wall = this.add.rectangle(
          blocker.x + blocker.w / 2,
          segment.worldTopY + blocker.y + blocker.h / 2,
          blocker.w,
          blocker.h,
          0x000000,
          0
        );

        this.physics.add.existing(wall, true);
        this.staticWalls.add(wall);
      }
    }

    this.physics.world.setBounds(0, 0, 720, STAGE1_RUNTIME_DATA.totalHeight);
    this.cameras.main.setBounds(0, 0, 720, STAGE1_RUNTIME_DATA.totalHeight);

    this.player = new PlayerTank(this, 360, STAGE1_RUNTIME_DATA.totalHeight - 240, {
      hullKey: STAGE1_IMAGE_ASSETS.units.playerHull.key,
      turretKey: STAGE1_IMAGE_ASSETS.units.playerTurret.key,
      shadowKey: STAGE1_IMAGE_ASSETS.units.playerShadow.key
    });

    this.playerProjectiles = new ProjectileSystem(this, STAGE1_IMAGE_ASSETS.fx.projectileTrail.key);
    this.enemyProjectiles = new ProjectileSystem(this, STAGE1_IMAGE_ASSETS.fx.projectileTrail.key);
    this.physics.add.collider(this.player, this.staticWalls);

    this.physics.add.overlap(
      this.playerProjectiles.group,
      this.enemyHitTargets,
      (shotObject, enemyObject) => {
        const shot = shotObject as Phaser.Physics.Arcade.Image;
        const actor = enemyObject as unknown as EnemyActor;
        const result = applyDamage({ hp: actor.hp, shieldHp: 0 }, { amount: 18 });

        actor.hp = result.hp;
        this.add.image(actor.x, actor.y, STAGE1_IMAGE_ASSETS.fx.hitSpark.key).setAlpha(0.92);
        this.playerProjectiles.recycle(shot);

        if (result.destroyed) {
          this.add.image(actor.x, actor.y, STAGE1_IMAGE_ASSETS.fx.explosionMedium.key).setAlpha(0.96);
          this.removeEnemy(actor);
        }
      }
    );

    this.physics.add.overlap(
      this.enemyProjectiles.group,
      this.player,
      (shotObject) => {
        const shot = shotObject as Phaser.Physics.Arcade.Image;
        const result = applyDamage(
          { hp: this.player.hp, shieldHp: this.player.shieldHp },
          { amount: 12 }
        );

        this.player.hp = result.hp;
        this.player.shieldHp = result.shieldHp;
        this.enemyProjectiles.recycle(shot);
        this.add.image(this.player.x, this.player.y, STAGE1_IMAGE_ASSETS.fx.shieldHit.key).setAlpha(0.92);

        if (result.destroyed && !this.playerDead) {
          this.playerDead = true;
          this.player.setVisible(false);
          this.add.image(this.player.x, this.player.y, STAGE1_IMAGE_ASSETS.units.playerWreck.key);
          this.events.emit("player-dead");
        }
      }
    );

    this.spawnEnemy({ type: "fixed_turret", x: 140, y: 4580 });
    this.spawnEnemy({ type: "medium_tank", x: 360, y: 3320 });

    this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => {
        if (this.playerDead) {
          return;
        }

        for (const enemy of this.enemies) {
          const velocity = resolveShotVelocity(
            { x: enemy.x, y: enemy.y },
            { x: this.player.x, y: this.player.y },
            280
          );

          this.enemyProjectiles.spawn(enemy.x, enemy.y + 12, velocity.x, velocity.y);
        }
      }
    });

    this.debugKeys = this.input.keyboard?.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE"
    ) as Record<string, Phaser.Input.Keyboard.Key>;

    this.input.addPointer(2);
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.x <= 240) {
        this.controls.beginStick(this.stickCenter, { x: pointer.x, y: pointer.y });
      }

      if (Phaser.Geom.Circle.Contains(this.fireButtonCenter, pointer.x, pointer.y)) {
        this.controls.setFirePressed(true);
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.x <= 240) {
        this.controls.moveStick({ x: pointer.x, y: pointer.y });
      }

      if (pointer.isDown) {
        this.controls.setFirePressed(Phaser.Geom.Circle.Contains(this.fireButtonCenter, pointer.x, pointer.y));
      }
    });

    this.input.on("pointerup", () => {
      this.controls.endStick();
      this.controls.setFirePressed(false);
    });
  }

  update(time: number): void {
    if (this.playerDead) {
      return;
    }

    const touchInput = this.controls.snapshot();
    const keyboardInput = resolveKeyboardInput({
      left: this.debugKeys.A.isDown || this.debugKeys.LEFT.isDown,
      right: this.debugKeys.D.isDown || this.debugKeys.RIGHT.isDown,
      up: this.debugKeys.W.isDown || this.debugKeys.UP.isDown,
      down: this.debugKeys.S.isDown || this.debugKeys.DOWN.isDown,
      fire: this.debugKeys.SPACE.isDown
    });
    const input = mergePlayerInput(touchInput, keyboardInput);
    const fireRequested = this.player.updateFromInput(input, time);

    if (fireRequested) {
      this.playerProjectiles.spawn(this.player.x, this.player.y - 40, 0, -420);
    }

    for (const entry of this.enemyBars) {
      entry.bar.setPosition(entry.actor.x - 40, entry.actor.y - 42);
      entry.bar.sync(entry.actor.hp, entry.actor.maxHp);
    }

    const cameraY = this.scrollController.resolveCameraY({
      playerWorldY: this.player.y,
      bossArenaLocked: this.bossArenaLocked
    });

    this.cameras.main.scrollY = cameraY;
    this.events.emit("hud-sync", this.player.toHudState(input));
  }
}
```

```ts
// src/game/scenes/HudScene.ts
import Phaser from "phaser";
import { STAGE1_IMAGE_ASSETS } from "../data/stage1/stage1-assets";
import { HealthBar } from "../ui/health-bar";
import { INITIAL_HUD_STATE, type HudState } from "../ui/hud-state";

export class HudScene extends Phaser.Scene {
  private playerHpBar!: HealthBar;
  private hpText!: Phaser.GameObjects.Text;
  private joystickKnob!: Phaser.GameObjects.Image;
  private fireButton!: Phaser.GameObjects.Image;
  private shieldOverlay!: Phaser.GameObjects.Image;
  private weaponBoostIcon!: Phaser.GameObjects.Image;

  constructor() {
    super("hud");
  }

  create(): void {
    const stageScene = this.scene.get("stage1");

    this.add.image(104, 1112, STAGE1_IMAGE_ASSETS.ui.joystickBase.key).setScrollFactor(0).setAlpha(0.84);
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

    this.hpText = this.add.text(24, 68, "", {
      color: "#dce7f1",
      fontSize: "22px"
    }).setScrollFactor(0);

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

    stageScene.events.on("player-dead", () => {
      this.add.text(136, 410, "MISSION FAILED", {
        color: "#ffb08c",
        fontSize: "50px"
      }).setScrollFactor(0);
    });

    this.sync(INITIAL_HUD_STATE);
  }

  sync(state: HudState): void {
    this.playerHpBar.sync(state.playerHp, state.playerMaxHp);
    this.hpText.setText(`HP ${state.playerHp}/${state.playerMaxHp}`);
    this.joystickKnob.setPosition(
      104 + state.input.moveX * 30,
      1112 + state.input.moveY * 30
    );
    this.fireButton.setAlpha(state.input.firePressed ? 1 : 0.85);
    this.shieldOverlay.setVisible(state.shieldHp > 0);
    this.weaponBoostIcon.setVisible(state.weaponBoostActive);
  }
}
```

- [ ] **Step 5: Run tests and build**

Run: `npm run test -- tests/enemy-fire-player-damage.test.ts && npm run build`  
Expected: enemy-fire tests PASS and the build succeeds with fixed-turret and medium-tank shots damaging the player, the HUD updating on hits, and a visible player-death state.

- [ ] **Step 6: Commit**

```bash
git add src/game/systems/combat/projectiles.ts src/game/scenes/Stage1Scene.ts src/game/scenes/HudScene.ts tests/enemy-fire-player-damage.test.ts
git commit -m "feat: add enemy fire player damage and death state"
```

## Task 6: Implement The Scripted Stage Director, Boss Arena, Drops, And Clear Flow

**Files:**
- Create: `src/game/data/stage1/stage1-spawns.ts`
- Create: `src/game/data/stage1/stage1-drops.ts`
- Create: `src/game/data/stage1/stage1-boss.ts`
- Create: `src/game/systems/combat/drop-table.ts`
- Create: `src/game/systems/stage-director.ts`
- Create: `src/game/entities/boss/fortress-boss.ts`
- Modify: `src/game/scenes/Stage1Scene.ts`
- Modify: `src/game/scenes/HudScene.ts`
- Test: `tests/stage-director.test.ts`
- Test: `tests/fortress-boss-phase.test.ts`

- [ ] **Step 1: Write the failing director and boss-phase tests**

```ts
import { describe, expect, it } from "vitest";
import { STAGE1_RUNTIME_DATA } from "../src/game/data/stage1/stage1-runtime";
import { STAGE1_SPAWN_PLAN } from "../src/game/data/stage1/stage1-spawns";
import { createStageDirector } from "../src/game/systems/stage-director";

describe("createStageDirector", () => {
  it("triggers zones in opening -> roadblock -> checkpoint -> boss order during upward progression", () => {
    const director = createStageDirector({
      zones: STAGE1_RUNTIME_DATA.zones,
      spawnPlan: STAGE1_SPAWN_PLAN
    });

    const triggered = [
      5200,
      4800,
      3500,
      2100,
      900
    ].flatMap((playerWorldY) =>
      director.update({
        playerWorldY,
        randomValue: 0.2
      })
    );

    const uniqueZoneKeys = triggered
      .map((command) => command.zoneKey)
      .filter((zoneKey, index, all) => all.indexOf(zoneKey) === index);

    expect(uniqueZoneKeys).toEqual([
      "opening-lane",
      "roadblock-lane",
      "checkpoint-lock",
      "boss-arena"
    ]);
  });

  it("emits concrete commands only once per zone even if the player re-enters it later", () => {
    const director = createStageDirector({
      zones: STAGE1_RUNTIME_DATA.zones,
      spawnPlan: STAGE1_SPAWN_PLAN
    });

    director.update({
      playerWorldY: 4800,
      randomValue: 0.2
    });

    expect(
      director.update({
        playerWorldY: 4700,
        randomValue: 0.2
      })
    ).toEqual([]);
  });
});
```

```ts
import { describe, expect, it } from "vitest";
import { resolveBossPhase } from "../src/game/entities/boss/fortress-boss";

describe("resolveBossPhase", () => {
  it("keeps phase one while the fortress is still healthy and armed", () => {
    expect(resolveBossPhase({ hpRatio: 0.8, sideCannonsDestroyed: 0 })).toBe("phase_one");
  });

  it("switches to phase two after enough damage or cannon losses", () => {
    expect(resolveBossPhase({ hpRatio: 0.45, sideCannonsDestroyed: 0 })).toBe("phase_two");
    expect(resolveBossPhase({ hpRatio: 0.8, sideCannonsDestroyed: 2 })).toBe("phase_two");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- tests/stage-director.test.ts tests/fortress-boss-phase.test.ts`  
Expected: FAIL because the director, boss, and authored gameplay data modules do not exist yet.

- [ ] **Step 3: Implement gameplay-authored data, drop rules, director logic, and boss phase logic**

```ts
// src/game/data/stage1/stage1-spawns.ts
import type { EnemyType } from "../../types/stage";

export interface Stage1SpawnEntry {
  zoneKey: string;
  type: EnemyType;
  x: number;
  y: number;
  delayMs: number;
}

// These authored waves are keyed to the landed zone ids from data/stage1-zones.json.
export const STAGE1_SPAWN_PLAN: Stage1SpawnEntry[] = [
  { zoneKey: "opening-lane", type: "light_tank", x: 360, y: 4680, delayMs: 0 },
  { zoneKey: "opening-lane", type: "fixed_turret", x: 132, y: 4460, delayMs: 900 },
  { zoneKey: "roadblock-lane", type: "medium_tank", x: 360, y: 3320, delayMs: 0 },
  { zoneKey: "roadblock-lane", type: "scout_helicopter", x: 600, y: 3140, delayMs: 1200 },
  { zoneKey: "checkpoint-lock", type: "light_tank", x: 292, y: 2040, delayMs: 0 },
  { zoneKey: "checkpoint-lock", type: "medium_tank", x: 426, y: 1860, delayMs: 800 },
  { zoneKey: "checkpoint-lock", type: "fixed_turret", x: 126, y: 1680, delayMs: 1200 }
];
```

```ts
// src/game/data/stage1/stage1-drops.ts
export const STAGE1_DROP_RULES = {
  checkpointReward: ["repair_kit", "weapon_boost"] as const,
  roadblockBonusChance: 0.25,
  roadblockBonus: "shield_battery" as const
};
```

```ts
// src/game/data/stage1/stage1-boss.ts
export const STAGE1_BOSS_TUNING = {
  maxHp: 320,
  phaseTwoHealthRatio: 0.5,
  sideCannonsRequired: 2,
  arenaLockScrollY: 0
};
```

```ts
// src/game/systems/combat/drop-table.ts
import type { DropType } from "../../types/stage";
import { STAGE1_DROP_RULES } from "../../data/stage1/stage1-drops";

export function resolveStage1Drop(params: { zoneKey: string; randomValue: number }): DropType | null {
  if (params.zoneKey === "checkpoint-lock") {
    return params.randomValue < 0.5
      ? STAGE1_DROP_RULES.checkpointReward[0]
      : STAGE1_DROP_RULES.checkpointReward[1];
  }

  if (
    params.zoneKey === "roadblock-lane" &&
    params.randomValue <= STAGE1_DROP_RULES.roadblockBonusChance
  ) {
    return STAGE1_DROP_RULES.roadblockBonus;
  }

  return null;
}
```

```ts
// src/game/systems/stage-director.ts
import type { StageZoneRect } from "../types/stage";
import type { Stage1SpawnEntry } from "../data/stage1/stage1-spawns";
import { resolveStage1Drop } from "./combat/drop-table";

export type StageDirectorCommand =
  | { kind: "spawn-wave"; zoneKey: string; spawns: Stage1SpawnEntry[] }
  | { kind: "spawn-drop"; zoneKey: string; dropType: "repair_kit" | "weapon_boost" | "shield_battery" }
  | { kind: "lock-boss-arena"; zoneKey: string };

export function createStageDirector(config: {
  zones: StageZoneRect[];
  spawnPlan: Stage1SpawnEntry[];
}) {
  const orderedZones = [...config.zones].sort((left, right) => right.worldStartY - left.worldStartY);
  const triggeredZones = new Set<string>();
  let lastPlayerWorldY = Number.POSITIVE_INFINITY;

  return {
    update(params: { playerWorldY: number; randomValue: number }): StageDirectorCommand[] {
      const activeZone = orderedZones.find((zone) => {
        if (triggeredZones.has(zone.key)) {
          return false;
        }

        const currentlyInside =
          params.playerWorldY >= zone.worldStartY &&
          params.playerWorldY <= zone.worldEndY;
        const crossedIntoZoneFromBelow =
          lastPlayerWorldY > zone.worldEndY &&
          params.playerWorldY <= zone.worldEndY;

        return currentlyInside || crossedIntoZoneFromBelow;
      });

      lastPlayerWorldY = params.playerWorldY;

      if (!activeZone || triggeredZones.has(activeZone.key)) {
        return [];
      }

      triggeredZones.add(activeZone.key);

      const commands: StageDirectorCommand[] = [];
      const spawns = config.spawnPlan.filter((entry) => entry.zoneKey === activeZone.key);

      if (spawns.length > 0) {
        commands.push({
          kind: "spawn-wave",
          zoneKey: activeZone.key,
          spawns
        });
      }

      const dropType = resolveStage1Drop({
        zoneKey: activeZone.key,
        randomValue: params.randomValue
      });

      if (dropType) {
        commands.push({
          kind: "spawn-drop",
          zoneKey: activeZone.key,
          dropType
        });
      }

      if (activeZone.type === "boss") {
        commands.push({
          kind: "lock-boss-arena",
          zoneKey: activeZone.key
        });
      }

      return commands;
    }
  };
}
```

```ts
// src/game/entities/boss/fortress-boss.ts
import Phaser from "phaser";
import { STAGE1_BOSS_TUNING } from "../../data/stage1/stage1-boss";
import { STAGE1_IMAGE_ASSETS } from "../../data/stage1/stage1-assets";

export function resolveBossPhase(params: { hpRatio: number; sideCannonsDestroyed: number }) {
  if (
    params.hpRatio <= STAGE1_BOSS_TUNING.phaseTwoHealthRatio ||
    params.sideCannonsDestroyed >= STAGE1_BOSS_TUNING.sideCannonsRequired
  ) {
    return "phase_two";
  }

  return "phase_one";
}

export class FortressBoss extends Phaser.GameObjects.Container {
  hp = STAGE1_BOSS_TUNING.maxHp;
  maxHp = STAGE1_BOSS_TUNING.maxHp;
  sideCannonsDestroyed = 0;
  private readonly bodySprite: Phaser.GameObjects.Image;
  private readonly weakpoint: Phaser.GameObjects.Image;
  private readonly damageOverlay: Phaser.GameObjects.Image;
  private readonly wreck: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const body = scene.add.image(0, 0, STAGE1_IMAGE_ASSETS.units.bossBody.key);
    const mainCannon = scene.add.image(0, -24, STAGE1_IMAGE_ASSETS.units.bossMainCannon.key);
    const leftCannon = scene.add.image(-74, 8, STAGE1_IMAGE_ASSETS.units.bossSideCannonLeft.key);
    const rightCannon = scene.add.image(74, 8, STAGE1_IMAGE_ASSETS.units.bossSideCannonRight.key);
    const weakpoint = scene.add
      .image(0, 22, STAGE1_IMAGE_ASSETS.units.bossWeakpoint.key)
      .setVisible(false);
    const damageOverlay = scene.add
      .image(0, 0, STAGE1_IMAGE_ASSETS.units.bossDamageOverlay.key)
      .setVisible(false);
    const wreck = scene.add
      .image(0, 0, STAGE1_IMAGE_ASSETS.units.bossWreck.key)
      .setVisible(false);

    super(scene, x, y, [body, mainCannon, leftCannon, rightCannon, weakpoint, damageOverlay, wreck]);
    this.bodySprite = body;
    this.weakpoint = weakpoint;
    this.damageOverlay = damageOverlay;
    this.wreck = wreck;
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  applyHit(amount: number): boolean {
    this.hp = Math.max(0, this.hp - amount);
    this.syncPresentation();
    return this.hp === 0;
  }

  syncPresentation(): void {
    const inPhaseTwo = this.phase === "phase_two" && this.hp > 0;
    this.weakpoint.setVisible(inPhaseTwo);
    this.damageOverlay.setVisible(inPhaseTwo);
  }

  playDeathPresentation(): void {
    this.bodySprite.setVisible(false);
    this.damageOverlay.setVisible(false);
    this.weakpoint.setVisible(false);
    this.wreck.setVisible(true);
  }

  get phase() {
    return resolveBossPhase({
      hpRatio: this.hp / this.maxHp,
      sideCannonsDestroyed: this.sideCannonsDestroyed
    });
  }
}
```

- [ ] **Step 4: Execute director commands, spawn drops and the boss, and expose the full clear flow**

```ts
// src/game/scenes/Stage1Scene.ts
import Phaser from "phaser";
import { STAGE1_IMAGE_ASSETS } from "../data/stage1/stage1-assets";
import { STAGE1_BOSS_TUNING } from "../data/stage1/stage1-boss";
import { STAGE1_RUNTIME_DATA } from "../data/stage1/stage1-runtime";
import { STAGE1_SPAWN_PLAN } from "../data/stage1/stage1-spawns";
import { FortressBoss } from "../entities/boss/fortress-boss";
import { PlayerTank } from "../entities/player/player-tank";
import { spawnEnemyActor, type EnemyActor } from "../entities/enemies/enemy-factory";
import { applyDamage } from "../systems/combat/health";
import { ProjectileSystem, resolveShotVelocity } from "../systems/combat/projectiles";
import { createStageDirector } from "../systems/stage-director";
import {
  createTouchControls,
  mergePlayerInput,
  resolveKeyboardInput
} from "../systems/input/touch-controls";
import { repoPathToTextureKey } from "../utils/stage1-adapter";
import { createStageScrollController } from "../systems/camera/stage-scroll-controller";
import { HealthBar } from "../ui/health-bar";

type SpawnedDrop = Phaser.Physics.Arcade.Image & {
  dropType: "repair_kit" | "weapon_boost" | "shield_battery";
};

export class Stage1Scene extends Phaser.Scene {
  private bossArenaLocked = false;
  private stageCleared = false;
  private playerDead = false;
  private staticWalls!: Phaser.Physics.Arcade.StaticGroup;
  private enemyHitTargets!: Phaser.Physics.Arcade.Group;
  private dropGroup!: Phaser.Physics.Arcade.Group;
  private player!: PlayerTank;
  private boss?: FortressBoss;
  private playerProjectiles!: ProjectileSystem;
  private enemyProjectiles!: ProjectileSystem;
  private debugKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly enemies: EnemyActor[] = [];
  private readonly enemyBars: Array<{ actor: EnemyActor; bar: HealthBar }> = [];
  private readonly stickCenter = { x: 104, y: 1112 };
  private readonly fireButtonCenter = new Phaser.Geom.Circle(604, 1112, 72);
  private readonly controls = createTouchControls(72);
  private readonly director = createStageDirector({
    zones: STAGE1_RUNTIME_DATA.zones,
    spawnPlan: STAGE1_SPAWN_PLAN
  });

  private readonly scrollController = createStageScrollController({
    viewportHeight: 1280,
    stageMaxScrollY: STAGE1_RUNTIME_DATA.totalHeight - 1280,
    bossLockScrollY: STAGE1_BOSS_TUNING.arenaLockScrollY
  });

  constructor() {
    super("stage1");
  }

  private addEnemyHealthBar(actor: EnemyActor): void {
    const bar = new HealthBar(
      this,
      actor.x - 40,
      actor.y - 42,
      STAGE1_IMAGE_ASSETS.ui.enemyHealthBar.key,
      54,
      0xe06d6d
    );

    this.enemyBars.push({ actor, bar });
  }

  private removeEnemy(actor: EnemyActor): void {
    const barIndex = this.enemyBars.findIndex((entry) => entry.actor === actor);

    if (barIndex >= 0) {
      this.enemyBars[barIndex].bar.destroy();
      this.enemyBars.splice(barIndex, 1);
    }

    const enemyIndex = this.enemies.indexOf(actor);
    if (enemyIndex >= 0) {
      this.enemies.splice(enemyIndex, 1);
    }

    actor.destroy();
  }

  private spawnEnemy(spec: { type: "light_tank" | "medium_tank" | "fixed_turret" | "scout_helicopter"; x: number; y: number }): void {
    const actor = spawnEnemyActor(this, spec);
    this.enemies.push(actor);
    this.enemyHitTargets.add(actor as unknown as Phaser.GameObjects.GameObject);
    this.addEnemyHealthBar(actor);
  }

  private spawnDrop(dropType: "repair_kit" | "weapon_boost" | "shield_battery", zoneKey: string): void {
    const zone = STAGE1_RUNTIME_DATA.zones.find((entry) => entry.key === zoneKey);

    if (!zone) {
      return;
    }

    const textureKey =
      dropType === "repair_kit"
        ? STAGE1_IMAGE_ASSETS.drops.repairKit.key
        : dropType === "weapon_boost"
          ? STAGE1_IMAGE_ASSETS.drops.weaponBoost.key
          : STAGE1_IMAGE_ASSETS.drops.shieldBattery.key;

    const drop = this.dropGroup.create(
      zone.x + zone.w / 2,
      zone.worldStartY + zone.h / 2,
      textureKey
    ) as SpawnedDrop;

    drop.dropType = dropType;
    drop.setAlpha(0.96);
  }

  private spawnBoss(): void {
    if (this.boss) {
      return;
    }

    this.bossArenaLocked = true;
    this.boss = new FortressBoss(this, 360, 600);
    this.events.emit("boss-start", {
      hp: this.boss.hp,
      maxHp: this.boss.maxHp,
      phase: this.boss.phase
    });

    this.physics.add.existing(this.boss);
    this.physics.add.overlap(this.playerProjectiles.group, this.boss, (shotObject) => {
      const shot = shotObject as Phaser.Physics.Arcade.Image;

      if (!this.boss) {
        return;
      }

      const destroyed = this.boss.applyHit(14);
      this.playerProjectiles.recycle(shot);
      this.add.image(this.boss.x, this.boss.y - 18, STAGE1_IMAGE_ASSETS.fx.hitSpark.key).setAlpha(0.92);
      this.events.emit("boss-health-sync", {
        hp: this.boss.hp,
        maxHp: this.boss.maxHp,
        phase: this.boss.phase
      });

      if (destroyed && !this.stageCleared) {
        this.stageCleared = true;
        this.bossArenaLocked = false;
        this.boss.playDeathPresentation();
        this.add.image(this.boss.x, this.boss.y, STAGE1_IMAGE_ASSETS.fx.explosionBoss.key).setAlpha(0.98);
        this.time.delayedCall(500, () => {
          this.events.emit("stage-clear");
        });
      }
    });
  }

  create(): void {
    this.staticWalls = this.physics.add.staticGroup();
    this.enemyHitTargets = this.physics.add.group();
    this.dropGroup = this.physics.add.group();

    for (const segment of STAGE1_RUNTIME_DATA.segments) {
      this.add
        .image(360, segment.worldTopY + segment.pixelHeight / 2, repoPathToTextureKey(segment.mapRepoPath))
        .setOrigin(0.5, 0.5);

      for (const prop of STAGE1_RUNTIME_DATA.propsBySegment[segment.key]) {
        this.add
          .image(prop.x + prop.w / 2, segment.worldTopY + prop.y + prop.h / 2, prop.textureKey)
          .setDisplaySize(prop.w, prop.h);
      }

      for (const blocker of STAGE1_RUNTIME_DATA.collisionBySegment[segment.key]) {
        const wall = this.add.rectangle(
          blocker.x + blocker.w / 2,
          segment.worldTopY + blocker.y + blocker.h / 2,
          blocker.w,
          blocker.h,
          0x000000,
          0
        );

        this.physics.add.existing(wall, true);
        this.staticWalls.add(wall);
      }
    }

    this.physics.world.setBounds(0, 0, 720, STAGE1_RUNTIME_DATA.totalHeight);
    this.cameras.main.setBounds(0, 0, 720, STAGE1_RUNTIME_DATA.totalHeight);

    this.player = new PlayerTank(this, 360, STAGE1_RUNTIME_DATA.totalHeight - 240, {
      hullKey: STAGE1_IMAGE_ASSETS.units.playerHull.key,
      turretKey: STAGE1_IMAGE_ASSETS.units.playerTurret.key,
      shadowKey: STAGE1_IMAGE_ASSETS.units.playerShadow.key
    });

    this.playerProjectiles = new ProjectileSystem(this, STAGE1_IMAGE_ASSETS.fx.projectileTrail.key);
    this.enemyProjectiles = new ProjectileSystem(this, STAGE1_IMAGE_ASSETS.fx.projectileTrail.key);
    this.physics.add.collider(this.player, this.staticWalls);

    this.physics.add.overlap(this.playerProjectiles.group, this.enemyHitTargets, (shotObject, enemyObject) => {
      const shot = shotObject as Phaser.Physics.Arcade.Image;
      const actor = enemyObject as unknown as EnemyActor;
      const result = applyDamage({ hp: actor.hp, shieldHp: 0 }, { amount: 18 });

      actor.hp = result.hp;
      this.add.image(actor.x, actor.y, STAGE1_IMAGE_ASSETS.fx.hitSpark.key).setAlpha(0.92);
      this.playerProjectiles.recycle(shot);

      if (result.destroyed) {
        this.add.image(actor.x, actor.y, STAGE1_IMAGE_ASSETS.fx.explosionMedium.key).setAlpha(0.96);
        this.removeEnemy(actor);
      }
    });

    this.physics.add.overlap(this.enemyProjectiles.group, this.player, (shotObject) => {
      const shot = shotObject as Phaser.Physics.Arcade.Image;
      const result = applyDamage(
        { hp: this.player.hp, shieldHp: this.player.shieldHp },
        { amount: 12 }
      );

      this.player.hp = result.hp;
      this.player.shieldHp = result.shieldHp;
      this.enemyProjectiles.recycle(shot);
      this.add.image(this.player.x, this.player.y, STAGE1_IMAGE_ASSETS.fx.shieldHit.key).setAlpha(0.92);

      if (result.destroyed && !this.playerDead) {
        this.playerDead = true;
        this.player.setVisible(false);
        this.add.image(this.player.x, this.player.y, STAGE1_IMAGE_ASSETS.units.playerWreck.key);
        this.events.emit("player-dead");
      }
    });

    this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => {
        if (this.playerDead || this.stageCleared) {
          return;
        }

        for (const enemy of this.enemies) {
          const velocity = resolveShotVelocity(
            { x: enemy.x, y: enemy.y },
            { x: this.player.x, y: this.player.y },
            280
          );

          this.enemyProjectiles.spawn(enemy.x, enemy.y + 12, velocity.x, velocity.y);
        }
      }
    });

    this.debugKeys = this.input.keyboard?.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE"
    ) as Record<string, Phaser.Input.Keyboard.Key>;

    this.input.addPointer(2);
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.x <= 240) {
        this.controls.beginStick(this.stickCenter, { x: pointer.x, y: pointer.y });
      }

      if (Phaser.Geom.Circle.Contains(this.fireButtonCenter, pointer.x, pointer.y)) {
        this.controls.setFirePressed(true);
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.x <= 240) {
        this.controls.moveStick({ x: pointer.x, y: pointer.y });
      }

      if (pointer.isDown) {
        this.controls.setFirePressed(Phaser.Geom.Circle.Contains(this.fireButtonCenter, pointer.x, pointer.y));
      }
    });

    this.input.on("pointerup", () => {
      this.controls.endStick();
      this.controls.setFirePressed(false);
    });
  }

  update(time: number): void {
    if (this.stageCleared || this.playerDead) {
      return;
    }

    const touchInput = this.controls.snapshot();
    const keyboardInput = resolveKeyboardInput({
      left: this.debugKeys.A.isDown || this.debugKeys.LEFT.isDown,
      right: this.debugKeys.D.isDown || this.debugKeys.RIGHT.isDown,
      up: this.debugKeys.W.isDown || this.debugKeys.UP.isDown,
      down: this.debugKeys.S.isDown || this.debugKeys.DOWN.isDown,
      fire: this.debugKeys.SPACE.isDown
    });
    const input = mergePlayerInput(touchInput, keyboardInput);
    const fireRequested = this.player.updateFromInput(input, time);

    if (fireRequested) {
      this.playerProjectiles.spawn(this.player.x, this.player.y - 40, 0, -420);
    }

    for (const command of this.director.update({
      playerWorldY: this.player.y,
      randomValue: Math.random()
    })) {
      switch (command.kind) {
        case "spawn-wave":
          for (const spawn of command.spawns) {
            this.time.delayedCall(spawn.delayMs, () => {
              this.spawnEnemy(spawn);
            });
          }
          break;
        case "spawn-drop":
          this.spawnDrop(command.dropType, command.zoneKey);
          break;
        case "lock-boss-arena":
          this.spawnBoss();
          break;
      }
    }

    for (const entry of this.enemyBars) {
      entry.bar.setPosition(entry.actor.x - 40, entry.actor.y - 42);
      entry.bar.sync(entry.actor.hp, entry.actor.maxHp);
    }

    const cameraY = this.scrollController.resolveCameraY({
      playerWorldY: this.player.y,
      bossArenaLocked: this.bossArenaLocked
    });

    this.cameras.main.scrollY = cameraY;
    this.events.emit("hud-sync", this.player.toHudState(input));
  }
}
```

```ts
// src/game/scenes/HudScene.ts
import Phaser from "phaser";
import { STAGE1_IMAGE_ASSETS } from "../data/stage1/stage1-assets";
import { HealthBar } from "../ui/health-bar";
import { INITIAL_HUD_STATE, type HudState } from "../ui/hud-state";

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

    this.add.image(104, 1112, STAGE1_IMAGE_ASSETS.ui.joystickBase.key).setScrollFactor(0).setAlpha(0.84);
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

    this.hpText = this.add.text(24, 68, "", {
      color: "#dce7f1",
      fontSize: "22px"
    }).setScrollFactor(0);

    this.bossLabel = this.add.text(110, 118, "FORTRESS", {
      color: "#f6d58a",
      fontSize: "22px"
    }).setScrollFactor(0).setVisible(false);

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

    stageScene.events.on("boss-start", (payload: { hp: number; maxHp: number }) => {
      this.bossLabel.setVisible(true);
      this.bossHpBar.setVisible(true);
      this.bossHpBar.sync(payload.hp, payload.maxHp);
      this.bossLabel.setText("FORTRESS");
    });

    stageScene.events.on("boss-health-sync", (payload: { hp: number; maxHp: number; phase: string }) => {
      this.bossHpBar.sync(payload.hp, payload.maxHp);
      this.bossLabel.setText(payload.phase === "phase_two" ? "FORTRESS // PHASE 2" : "FORTRESS");
    });

    stageScene.events.on("stage-clear", () => {
      this.add.text(146, 410, "STAGE CLEAR", {
        color: "#ffd47a",
        fontSize: "54px"
      }).setScrollFactor(0);
    });

    this.sync(INITIAL_HUD_STATE);
  }

  sync(state: HudState): void {
    this.playerHpBar.sync(state.playerHp, state.playerMaxHp);
    this.hpText.setText(`HP ${state.playerHp}/${state.playerMaxHp}`);
    this.joystickKnob.setPosition(104 + state.input.moveX * 30, 1112 + state.input.moveY * 30);
    this.fireButton.setAlpha(state.input.firePressed ? 1 : 0.85);
    this.shieldOverlay.setVisible(state.shieldHp > 0);
    this.weaponBoostIcon.setVisible(state.weaponBoostActive);
  }
}
```

- [ ] **Step 5: Run tests and build**

Run: `npm run test -- tests/stage-director.test.ts tests/fortress-boss-phase.test.ts && npm run build`  
Expected: director and boss-phase tests PASS, and the build succeeds with correct upward zone ordering, concrete wave commands, boss HP syncing from player hits, a visible phase-two presentation, boss death wreck/explosion feedback, and a visible clear flow.

- [ ] **Step 6: Commit**

```bash
git add src/game/data/stage1/stage1-spawns.ts src/game/data/stage1/stage1-drops.ts src/game/data/stage1/stage1-boss.ts src/game/systems/combat/drop-table.ts src/game/systems/stage-director.ts src/game/entities/boss/fortress-boss.ts src/game/scenes/Stage1Scene.ts src/game/scenes/HudScene.ts tests/stage-director.test.ts tests/fortress-boss-phase.test.ts
git commit -m "feat: add stage director boss arena and clear flow"
```

## Task 6.5: Add Drop Pickup Effects And HUD Synchronization

**Files:**
- Create: `src/game/systems/combat/drop-effects.ts`
- Modify: `src/game/data/stage1/stage1-assets.ts`
- Modify: `src/game/entities/player/player-tank.ts`
- Modify: `src/game/ui/hud-state.ts`
- Modify: `src/game/scenes/Stage1Scene.ts`
- Test: `tests/drop-pickup-effects.test.ts`

- [ ] **Step 1: Write the failing drop-pickup effects test**

```ts
import { describe, expect, it } from "vitest";
import { applyDropPickup } from "../src/game/systems/combat/drop-effects";

describe("applyDropPickup", () => {
  it("heals the player without exceeding max hp", () => {
    const result = applyDropPickup(
      {
        hp: 70,
        maxHp: 100,
        shieldHp: 0,
        shieldMaxHp: 50,
        weaponBoostActive: false,
        weaponBoostUntilMs: 0
      },
      "repair_kit",
      5000
    );

    expect(result.hp).toBe(100);
  });

  it("activates timed weapon boost and adds shield when appropriate", () => {
    const weaponBoost = applyDropPickup(
      {
        hp: 100,
        maxHp: 100,
        shieldHp: 0,
        shieldMaxHp: 50,
        weaponBoostActive: false,
        weaponBoostUntilMs: 0
      },
      "weapon_boost",
      5000
    );

    const shield = applyDropPickup(
      {
        hp: 100,
        maxHp: 100,
        shieldHp: 10,
        shieldMaxHp: 50,
        weaponBoostActive: false,
        weaponBoostUntilMs: 0
      },
      "shield_battery",
      5000
    );

    expect(weaponBoost.weaponBoostActive).toBe(true);
    expect(weaponBoost.weaponBoostUntilMs).toBe(13000);
    expect(shield.shieldHp).toBe(50);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/drop-pickup-effects.test.ts`  
Expected: FAIL because `drop-effects.ts` does not exist yet.

- [ ] **Step 3: Implement pure drop effects and extend player/HUD state**

```ts
// src/game/systems/combat/drop-effects.ts
import type { DropType } from "../../types/stage";

export interface DropAffectableState {
  hp: number;
  maxHp: number;
  shieldHp: number;
  shieldMaxHp: number;
  weaponBoostActive: boolean;
  weaponBoostUntilMs: number;
}

export function applyDropPickup(
  state: DropAffectableState,
  dropType: DropType,
  nowMs: number
): DropAffectableState {
  if (dropType === "repair_kit") {
    return {
      ...state,
      hp: Math.min(state.maxHp, state.hp + 35)
    };
  }

  if (dropType === "weapon_boost") {
    return {
      ...state,
      weaponBoostActive: true,
      weaponBoostUntilMs: nowMs + 8000
    };
  }

  return {
    ...state,
    shieldHp: state.shieldMaxHp
  };
}
```

```ts
// src/game/ui/hud-state.ts
import type { PlayerInputSnapshot } from "../systems/input/touch-controls";

export interface HudState {
  playerHp: number;
  playerMaxHp: number;
  shieldHp: number;
  shieldMaxHp: number;
  weaponBoostActive: boolean;
  weaponBoostUntilMs: number;
  input: PlayerInputSnapshot;
}

export const EMPTY_INPUT: PlayerInputSnapshot = {
  moveX: 0,
  moveY: 0,
  stickIntensity: 0,
  firePressed: false
};

export const INITIAL_HUD_STATE: HudState = {
  playerHp: 100,
  playerMaxHp: 100,
  shieldHp: 0,
  shieldMaxHp: 50,
  weaponBoostActive: false,
  weaponBoostUntilMs: 0,
  input: EMPTY_INPUT
};
```

```ts
// src/game/entities/player/player-tank.ts
import Phaser from "phaser";
import type { HudState } from "../../ui/hud-state";
import type { PlayerInputSnapshot } from "../../systems/input/touch-controls";
import type { DropAffectableState } from "../../systems/combat/drop-effects";

export class PlayerTank extends Phaser.GameObjects.Container {
  hp = 100;
  maxHp = 100;
  shieldHp = 0;
  shieldMaxHp = 50;
  weaponBoostActive = false;
  weaponBoostUntilMs = 0;

  private readonly hull: Phaser.GameObjects.Image;
  private readonly turret: Phaser.GameObjects.Image;
  private readonly speed = 240;
  private readonly fireCooldownMs = 260;
  private lastFireTime = -Infinity;

  constructor(scene: Phaser.Scene, x: number, y: number, textures: {
    hullKey: string;
    turretKey: string;
    shadowKey: string;
  }) {
    const shadow = scene.add.image(0, 8, textures.shadowKey).setAlpha(0.4);
    const hull = scene.add.image(0, 0, textures.hullKey);
    const turret = scene.add.image(0, 0, textures.turretKey);
    super(scene, x, y, [shadow, hull, turret]);

    this.hull = hull;
    this.turret = turret;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(48, 64);
    body.setCollideWorldBounds(true);
  }

  updateFromInput(input: PlayerInputSnapshot, time: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(input.moveX * this.speed, input.moveY * this.speed);

    if (input.moveX !== 0 || input.moveY !== 0) {
      this.turret.rotation = Math.atan2(input.moveY, input.moveX) + Math.PI / 2;
    }

    const effectiveCooldown = this.weaponBoostActive ? 140 : this.fireCooldownMs;

    if (input.firePressed && time - this.lastFireTime >= effectiveCooldown) {
      this.lastFireTime = time;
      return true;
    }

    return false;
  }

  applyDropState(nextState: DropAffectableState): void {
    this.hp = nextState.hp;
    this.shieldHp = nextState.shieldHp;
    this.weaponBoostActive = nextState.weaponBoostActive;
    this.weaponBoostUntilMs = nextState.weaponBoostUntilMs;
  }

  toHudState(input: PlayerInputSnapshot): HudState {
    return {
      playerHp: this.hp,
      playerMaxHp: this.maxHp,
      shieldHp: this.shieldHp,
      shieldMaxHp: this.shieldMaxHp,
      weaponBoostActive: this.weaponBoostActive,
      weaponBoostUntilMs: this.weaponBoostUntilMs,
      input
    };
  }
}
```

- [ ] **Step 4: Add drop overlap handling, pickup effects, and timed boost expiration**

```ts
// src/game/scenes/Stage1Scene.ts
import Phaser from "phaser";
import { STAGE1_IMAGE_ASSETS } from "../data/stage1/stage1-assets";
import { STAGE1_BOSS_TUNING } from "../data/stage1/stage1-boss";
import { STAGE1_RUNTIME_DATA } from "../data/stage1/stage1-runtime";
import { STAGE1_SPAWN_PLAN } from "../data/stage1/stage1-spawns";
import { FortressBoss } from "../entities/boss/fortress-boss";
import { PlayerTank } from "../entities/player/player-tank";
import { spawnEnemyActor, type EnemyActor } from "../entities/enemies/enemy-factory";
import { applyDropPickup } from "../systems/combat/drop-effects";
import { applyDamage } from "../systems/combat/health";
import { ProjectileSystem, resolveShotVelocity } from "../systems/combat/projectiles";
import { createStageDirector } from "../systems/stage-director";
import {
  createTouchControls,
  mergePlayerInput,
  resolveKeyboardInput
} from "../systems/input/touch-controls";
import { repoPathToTextureKey } from "../utils/stage1-adapter";
import { createStageScrollController } from "../systems/camera/stage-scroll-controller";
import { HealthBar } from "../ui/health-bar";

type SpawnedDrop = Phaser.Physics.Arcade.Image & {
  dropType: "repair_kit" | "weapon_boost" | "shield_battery";
};

export class Stage1Scene extends Phaser.Scene {
  private bossArenaLocked = false;
  private stageCleared = false;
  private playerDead = false;
  private staticWalls!: Phaser.Physics.Arcade.StaticGroup;
  private enemyHitTargets!: Phaser.Physics.Arcade.Group;
  private dropGroup!: Phaser.Physics.Arcade.Group;
  private player!: PlayerTank;
  private boss?: FortressBoss;
  private playerProjectiles!: ProjectileSystem;
  private enemyProjectiles!: ProjectileSystem;
  private debugKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly enemies: EnemyActor[] = [];
  private readonly enemyBars: Array<{ actor: EnemyActor; bar: HealthBar }> = [];
  private readonly stickCenter = { x: 104, y: 1112 };
  private readonly fireButtonCenter = new Phaser.Geom.Circle(604, 1112, 72);
  private readonly controls = createTouchControls(72);
  private readonly director = createStageDirector({
    zones: STAGE1_RUNTIME_DATA.zones,
    spawnPlan: STAGE1_SPAWN_PLAN
  });

  private readonly scrollController = createStageScrollController({
    viewportHeight: 1280,
    stageMaxScrollY: STAGE1_RUNTIME_DATA.totalHeight - 1280,
    bossLockScrollY: STAGE1_BOSS_TUNING.arenaLockScrollY
  });

  constructor() {
    super("stage1");
  }

  private addEnemyHealthBar(actor: EnemyActor): void {
    const bar = new HealthBar(
      this,
      actor.x - 40,
      actor.y - 42,
      STAGE1_IMAGE_ASSETS.ui.enemyHealthBar.key,
      54,
      0xe06d6d
    );

    this.enemyBars.push({ actor, bar });
  }

  private removeEnemy(actor: EnemyActor): void {
    const barIndex = this.enemyBars.findIndex((entry) => entry.actor === actor);

    if (barIndex >= 0) {
      this.enemyBars[barIndex].bar.destroy();
      this.enemyBars.splice(barIndex, 1);
    }

    const enemyIndex = this.enemies.indexOf(actor);
    if (enemyIndex >= 0) {
      this.enemies.splice(enemyIndex, 1);
    }

    actor.destroy();
  }

  private spawnEnemy(spec: { type: "light_tank" | "medium_tank" | "fixed_turret" | "scout_helicopter"; x: number; y: number }): void {
    const actor = spawnEnemyActor(this, spec);
    this.enemies.push(actor);
    this.enemyHitTargets.add(actor as unknown as Phaser.GameObjects.GameObject);
    this.addEnemyHealthBar(actor);
  }

  private spawnDrop(dropType: "repair_kit" | "weapon_boost" | "shield_battery", zoneKey: string): void {
    const zone = STAGE1_RUNTIME_DATA.zones.find((entry) => entry.key === zoneKey);

    if (!zone) {
      return;
    }

    const textureKey =
      dropType === "repair_kit"
        ? STAGE1_IMAGE_ASSETS.drops.repairKit.key
        : dropType === "weapon_boost"
          ? STAGE1_IMAGE_ASSETS.drops.weaponBoost.key
          : STAGE1_IMAGE_ASSETS.drops.shieldBattery.key;

    const drop = this.dropGroup.create(
      zone.x + zone.w / 2,
      zone.worldStartY + zone.h / 2,
      textureKey
    ) as SpawnedDrop;

    drop.dropType = dropType;
    drop.setAlpha(0.96);
  }

  private spawnBoss(): void {
    if (this.boss) {
      return;
    }

    this.bossArenaLocked = true;
    this.boss = new FortressBoss(this, 360, 600);
    this.events.emit("boss-start", {
      hp: this.boss.hp,
      maxHp: this.boss.maxHp,
      phase: this.boss.phase
    });

    this.physics.add.existing(this.boss);
    this.physics.add.overlap(this.playerProjectiles.group, this.boss, (shotObject) => {
      const shot = shotObject as Phaser.Physics.Arcade.Image;

      if (!this.boss) {
        return;
      }

      const destroyed = this.boss.applyHit(14);
      this.playerProjectiles.recycle(shot);
      this.add.image(this.boss.x, this.boss.y - 18, STAGE1_IMAGE_ASSETS.fx.hitSpark.key).setAlpha(0.92);
      this.events.emit("boss-health-sync", {
        hp: this.boss.hp,
        maxHp: this.boss.maxHp,
        phase: this.boss.phase
      });

      if (destroyed && !this.stageCleared) {
        this.stageCleared = true;
        this.bossArenaLocked = false;
        this.boss.playDeathPresentation();
        this.add.image(this.boss.x, this.boss.y, STAGE1_IMAGE_ASSETS.fx.explosionBoss.key).setAlpha(0.98);
        this.time.delayedCall(500, () => {
          this.events.emit("stage-clear");
        });
      }
    });
  }

  create(): void {
    this.staticWalls = this.physics.add.staticGroup();
    this.enemyHitTargets = this.physics.add.group();
    this.dropGroup = this.physics.add.group();

    for (const segment of STAGE1_RUNTIME_DATA.segments) {
      this.add
        .image(360, segment.worldTopY + segment.pixelHeight / 2, repoPathToTextureKey(segment.mapRepoPath))
        .setOrigin(0.5, 0.5);

      for (const prop of STAGE1_RUNTIME_DATA.propsBySegment[segment.key]) {
        this.add
          .image(prop.x + prop.w / 2, segment.worldTopY + prop.y + prop.h / 2, prop.textureKey)
          .setDisplaySize(prop.w, prop.h);
      }

      for (const blocker of STAGE1_RUNTIME_DATA.collisionBySegment[segment.key]) {
        const wall = this.add.rectangle(
          blocker.x + blocker.w / 2,
          segment.worldTopY + blocker.y + blocker.h / 2,
          blocker.w,
          blocker.h,
          0x000000,
          0
        );

        this.physics.add.existing(wall, true);
        this.staticWalls.add(wall);
      }
    }

    this.physics.world.setBounds(0, 0, 720, STAGE1_RUNTIME_DATA.totalHeight);
    this.cameras.main.setBounds(0, 0, 720, STAGE1_RUNTIME_DATA.totalHeight);

    this.player = new PlayerTank(this, 360, STAGE1_RUNTIME_DATA.totalHeight - 240, {
      hullKey: STAGE1_IMAGE_ASSETS.units.playerHull.key,
      turretKey: STAGE1_IMAGE_ASSETS.units.playerTurret.key,
      shadowKey: STAGE1_IMAGE_ASSETS.units.playerShadow.key
    });

    this.playerProjectiles = new ProjectileSystem(this, STAGE1_IMAGE_ASSETS.fx.projectileTrail.key);
    this.enemyProjectiles = new ProjectileSystem(this, STAGE1_IMAGE_ASSETS.fx.projectileTrail.key);
    this.physics.add.collider(this.player, this.staticWalls);

    this.physics.add.overlap(this.playerProjectiles.group, this.enemyHitTargets, (shotObject, enemyObject) => {
      const shot = shotObject as Phaser.Physics.Arcade.Image;
      const actor = enemyObject as unknown as EnemyActor;
      const result = applyDamage({ hp: actor.hp, shieldHp: 0 }, { amount: 18 });

      actor.hp = result.hp;
      this.add.image(actor.x, actor.y, STAGE1_IMAGE_ASSETS.fx.hitSpark.key).setAlpha(0.92);
      this.playerProjectiles.recycle(shot);

      if (result.destroyed) {
        this.add.image(actor.x, actor.y, STAGE1_IMAGE_ASSETS.fx.explosionMedium.key).setAlpha(0.96);
        this.removeEnemy(actor);
      }
    });

    this.physics.add.overlap(this.enemyProjectiles.group, this.player, (shotObject) => {
      const shot = shotObject as Phaser.Physics.Arcade.Image;
      const result = applyDamage(
        { hp: this.player.hp, shieldHp: this.player.shieldHp },
        { amount: 12 }
      );

      this.player.hp = result.hp;
      this.player.shieldHp = result.shieldHp;
      this.enemyProjectiles.recycle(shot);
      this.add.image(this.player.x, this.player.y, STAGE1_IMAGE_ASSETS.fx.shieldHit.key).setAlpha(0.92);

      if (result.destroyed && !this.playerDead) {
        this.playerDead = true;
        this.player.setVisible(false);
        this.add.image(this.player.x, this.player.y, STAGE1_IMAGE_ASSETS.units.playerWreck.key);
        this.events.emit("player-dead");
      }
    });

    this.physics.add.overlap(this.player, this.dropGroup, (_, dropObject) => {
      const drop = dropObject as SpawnedDrop;
      const nextState = applyDropPickup(
        {
          hp: this.player.hp,
          maxHp: this.player.maxHp,
          shieldHp: this.player.shieldHp,
          shieldMaxHp: this.player.shieldMaxHp,
          weaponBoostActive: this.player.weaponBoostActive,
          weaponBoostUntilMs: this.player.weaponBoostUntilMs
        },
        drop.dropType,
        this.time.now
      );

      this.player.applyDropState(nextState);

      const pickupTextureKey =
        drop.dropType === "repair_kit"
          ? STAGE1_IMAGE_ASSETS.drops.repairKitPickupFx.key
          : drop.dropType === "weapon_boost"
            ? STAGE1_IMAGE_ASSETS.drops.weaponBoostPickupFx.key
            : STAGE1_IMAGE_ASSETS.drops.shieldBatteryPickupFx.key;

      this.add.image(drop.x, drop.y, pickupTextureKey).setAlpha(0.96);
      drop.destroy();
      this.events.emit(
        "hud-sync",
        this.player.toHudState(
          mergePlayerInput(
            this.controls.snapshot(),
            resolveKeyboardInput({
              left: this.debugKeys.A.isDown || this.debugKeys.LEFT.isDown,
              right: this.debugKeys.D.isDown || this.debugKeys.RIGHT.isDown,
              up: this.debugKeys.W.isDown || this.debugKeys.UP.isDown,
              down: this.debugKeys.S.isDown || this.debugKeys.DOWN.isDown,
              fire: this.debugKeys.SPACE.isDown
            })
          )
        )
      );
    });

    this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => {
        if (this.playerDead || this.stageCleared) {
          return;
        }

        for (const enemy of this.enemies) {
          const velocity = resolveShotVelocity(
            { x: enemy.x, y: enemy.y },
            { x: this.player.x, y: this.player.y },
            280
          );

          this.enemyProjectiles.spawn(enemy.x, enemy.y + 12, velocity.x, velocity.y);
        }
      }
    });

    this.debugKeys = this.input.keyboard?.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE"
    ) as Record<string, Phaser.Input.Keyboard.Key>;

    this.input.addPointer(2);
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.x <= 240) {
        this.controls.beginStick(this.stickCenter, { x: pointer.x, y: pointer.y });
      }

      if (Phaser.Geom.Circle.Contains(this.fireButtonCenter, pointer.x, pointer.y)) {
        this.controls.setFirePressed(true);
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.x <= 240) {
        this.controls.moveStick({ x: pointer.x, y: pointer.y });
      }

      if (pointer.isDown) {
        this.controls.setFirePressed(Phaser.Geom.Circle.Contains(this.fireButtonCenter, pointer.x, pointer.y));
      }
    });

    this.input.on("pointerup", () => {
      this.controls.endStick();
      this.controls.setFirePressed(false);
    });
  }

  update(time: number): void {
    if (this.stageCleared || this.playerDead) {
      return;
    }

    if (this.player.weaponBoostActive && time >= this.player.weaponBoostUntilMs) {
      this.player.weaponBoostActive = false;
      this.player.weaponBoostUntilMs = 0;
    }

    const touchInput = this.controls.snapshot();
    const keyboardInput = resolveKeyboardInput({
      left: this.debugKeys.A.isDown || this.debugKeys.LEFT.isDown,
      right: this.debugKeys.D.isDown || this.debugKeys.RIGHT.isDown,
      up: this.debugKeys.W.isDown || this.debugKeys.UP.isDown,
      down: this.debugKeys.S.isDown || this.debugKeys.DOWN.isDown,
      fire: this.debugKeys.SPACE.isDown
    });
    const input = mergePlayerInput(touchInput, keyboardInput);
    const fireRequested = this.player.updateFromInput(input, time);

    if (fireRequested) {
      this.playerProjectiles.spawn(this.player.x, this.player.y - 40, 0, -420);
    }

    for (const command of this.director.update({
      playerWorldY: this.player.y,
      randomValue: Math.random()
    })) {
      switch (command.kind) {
        case "spawn-wave":
          for (const spawn of command.spawns) {
            this.time.delayedCall(spawn.delayMs, () => {
              this.spawnEnemy(spawn);
            });
          }
          break;
        case "spawn-drop":
          this.spawnDrop(command.dropType, command.zoneKey);
          break;
        case "lock-boss-arena":
          this.spawnBoss();
          break;
      }
    }

    for (const entry of this.enemyBars) {
      entry.bar.setPosition(entry.actor.x - 40, entry.actor.y - 42);
      entry.bar.sync(entry.actor.hp, entry.actor.maxHp);
    }

    const cameraY = this.scrollController.resolveCameraY({
      playerWorldY: this.player.y,
      bossArenaLocked: this.bossArenaLocked
    });

    this.cameras.main.scrollY = cameraY;
    this.events.emit("hud-sync", this.player.toHudState(input));
  }
}
```

- [ ] **Step 5: Run tests and build**

Run: `npm run test -- tests/drop-pickup-effects.test.ts && npm run build`  
Expected: drop-pickup tests PASS and the build succeeds with `repair_kit` healing, `weapon_boost` applying a timed faster fire rate, `shield_battery` filling shield HP, pickup effects spawning, drop objects being destroyed, and the HUD reflecting the new state immediately.

- [ ] **Step 6: Commit**

```bash
git add src/game/systems/combat/drop-effects.ts src/game/data/stage1/stage1-assets.ts src/game/entities/player/player-tank.ts src/game/ui/hud-state.ts src/game/scenes/Stage1Scene.ts tests/drop-pickup-effects.test.ts
git commit -m "feat: add drop pickup effects and hud sync"
```

## Task 7: Validate The Landed Contract And Run End-To-End Verification

**Files:**
- Create: `scripts/validate-stage1-contract.mjs`

- [ ] **Step 1: Implement the Stage 1 contract validator**

```js
// scripts/validate-stage1-contract.mjs
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

const propsJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "data/stage1-props.json"), "utf8")
);
const collisionJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "data/stage1-collision.json"), "utf8")
);
const zonesJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "data/stage1-zones.json"), "utf8")
);

const expectedSegments = new Set(["segment-01", "segment-02", "segment-03", "segment-04"]);

const requiredStaticFiles = [
  "assets/map/stage1/segment-01-base.png",
  "assets/map/stage1/segment-02-base.png",
  "assets/map/stage1/segment-03-base.png",
  "assets/map/stage1/segment-04-base.png",
  "assets/units/stage1/player-tank/hull.png",
  "assets/units/stage1/player-tank/turret.png",
  "assets/units/stage1/player-tank/shadow.png",
  "assets/units/stage1/player-tank/wreck.png",
  "assets/units/stage1/light-tank/light-tank.png",
  "assets/units/stage1/medium-tank/medium-tank.png",
  "assets/units/stage1/fixed-turret/base.png",
  "assets/units/stage1/fixed-turret/head.png",
  "assets/units/stage1/scout-helicopter/scout-helicopter.png",
  "assets/units/stage1/fortress-boss/body.png",
  "assets/units/stage1/fortress-boss/main-cannon.png",
  "assets/units/stage1/fortress-boss/side-cannon-left.png",
  "assets/units/stage1/fortress-boss/side-cannon-right.png",
  "assets/units/stage1/fortress-boss/weakpoint-core.png",
  "assets/units/stage1/fortress-boss/damage-overlay.png",
  "assets/units/stage1/fortress-boss/wreck-large.png",
  "assets/ui/stage1/player-health-bar.png",
  "assets/ui/stage1/enemy-health-bar.png",
  "assets/ui/stage1/boss-health-bar.png",
  "assets/ui/stage1/fire-button/fire-button.png",
  "assets/ui/stage1/joystick-base/joystick-base.png",
  "assets/ui/stage1/joystick-knob/joystick-knob.png",
  "assets/ui/stage1/shield-overlay.png",
  "assets/ui/stage1/weapon-boost-icon.png",
  "assets/drops/stage1/repair-kit/repair-kit.png",
  "assets/drops/stage1/repair-kit/pickup-fx.png",
  "assets/drops/stage1/weapon-boost/weapon-boost.png",
  "assets/drops/stage1/weapon-boost/pickup-fx.png",
  "assets/drops/stage1/shield-battery/shield-battery.png",
  "assets/drops/stage1/shield-battery/pickup-fx.png",
  "assets/fx/stage1/projectile-trail/out/sheet-transparent.png",
  "assets/fx/stage1/hit-spark/out/sheet-transparent.png",
  "assets/fx/stage1/shield-hit/out/sheet-transparent.png",
  "assets/fx/stage1/explosion-medium/out/sheet-transparent.png",
  "assets/fx/stage1/explosion-boss/out/sheet-transparent.png"
];

const dynamicPropFiles = Object.values(propsJson.segments)
  .flat()
  .map((prop) => prop.image);

const missingFiles = [...requiredStaticFiles, ...dynamicPropFiles].filter((repoPath) => {
  return !fs.existsSync(path.join(repoRoot, repoPath));
});

const invalidCollisionSegments = collisionJson.segments
  .map((segment) => segment.key)
  .filter((key) => !expectedSegments.has(key));

const invalidZoneSegments = zonesJson.zones
  .map((zone) => zone.segment)
  .filter((key) => !expectedSegments.has(key));

if (missingFiles.length > 0 || invalidCollisionSegments.length > 0 || invalidZoneSegments.length > 0) {
  if (missingFiles.length > 0) {
    console.error("Missing Stage 1 asset files:");
    for (const file of missingFiles) {
      console.error(`- ${file}`);
    }
  }

  if (invalidCollisionSegments.length > 0) {
    console.error("Collision contract references unknown segments:");
    for (const segment of invalidCollisionSegments) {
      console.error(`- ${segment}`);
    }
  }

  if (invalidZoneSegments.length > 0) {
    console.error("Zone contract references unknown segments:");
    for (const segment of invalidZoneSegments) {
      console.error(`- ${segment}`);
    }
  }

  process.exit(1);
}

console.log("Stage 1 landed contract validation passed.");
```

- [ ] **Step 2: Run the contract validator**

Run: `npm run validate:stage1`  
Expected: PASS with `Stage 1 landed contract validation passed.`

- [ ] **Step 3: Run the full verification sequence**

Run: `npm run validate:stage1 && npm run test && npm run build`  
Expected: contract validator PASS, all tests PASS, and the production build succeeds.

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-stage1-contract.mjs
git commit -m "chore: add landed stage1 contract validation"
```

## Final Playable Stage Acceptance Pass

- [ ] **Step 1: Run the automated baseline**

Run: `npm run validate:stage1 && npm run test && npm run build`  
Expected: all three commands PASS before any manual play session starts.

- [ ] **Step 2: Start the local game build for manual verification**

Run: `npm run dev -- --host 127.0.0.1 --port 4173`  
Expected: Vite serves the game locally and prints `http://127.0.0.1:4173`.

- [ ] **Step 3: Verify the complete playable loop from start to clear**

Open: `http://127.0.0.1:4173`  
Expected:
- Spawn begins near the bottom of the map, with the camera showing the opening segment first.
- Touch input works on mobile-like controls.
- Debug keyboard input works: `WASD` or arrow keys move, `Space` fires.
- Progression advances upward through `opening-lane -> roadblock-lane -> checkpoint-lock -> boss-arena`.
- Player shots damage enemies, enemies can shoot back, and the player can die.
- At least one `repair_kit`, one `weapon_boost`, and one `shield_battery` can be picked up and visibly change player state/HUD.
- Boss arena locks the camera at the top encounter.
- Boss HP drops from player shots, boss bar updates, and phase two becomes visually obvious.
- Boss death shows wreck/explosion feedback and then `STAGE CLEAR`.

- [ ] **Step 4: Record acceptance failures before merge**

If any expected behavior above fails, capture:
1. The exact reproduction input path.
2. Whether it fails on touch, keyboard, or both.
3. Whether the failure is logic, collision, HUD, asset binding, or camera progression.

Expected: no merge or handoff is considered complete until the stage can be played from spawn to `STAGE CLEAR` in one clean run.

## Spec Coverage Check

- Stage 1 only, no multi-stage scope creep: preserved across Tasks 2 through 7 and the final acceptance pass.
- Landed `assets/` and `data/` contracts as runtime truth: covered directly by Task 2, Task 3, and Task 7.
- Explicit upward-progression coordinate semantics: covered by the `Coordinate Contract`, Task 2 runtime adaptation, and Task 6 director tests.
- Portrait mobile WebGL shell: covered by Task 1.
- Mixed progression with scrolling segments and a locked boss arena: covered by Task 3 and Task 6.
- Typed gameplay authoring for waves, drops, boss tuning, and one-shot zone triggering without duplicating layout truth: covered by Task 6.
- Real touch controls, debug keyboard controls, and a controllable player loop: covered by Task 4.
- Player projectile combat, enemy return fire, player death state, boss health updates, shield state, and weapon-boost state: covered by Task 5, Task 5.5, Task 6, and Task 6.5.
- Drop pickup effects and HUD synchronization: covered by Task 6.5.
- Stage-clear flow and end-to-end playable validation: covered by Task 6 and the final acceptance pass.

## Review Alignment Check

- `public/assets/stage1` has been removed from the plan. All runtime asset references now point to the landed repo paths under `assets/`.
- `data/stage1-props.json`, `data/stage1-collision.json`, and `data/stage1-zones.json` are now first-class runtime inputs through `stage1-runtime.ts`.
- The coordinate system is now explicit: upward progression means moving toward smaller `y`, and the runtime segment world tops are adapted accordingly.
- The fake fixed input loop has been replaced with real pointer-driven touch control wiring plus debug keyboard controls in Task 4.
- The stage-director task now verifies upward zone ordering and single-trigger behavior, not just one-zone happy-path activation.
- Player projectile overlap with enemies, enemy fire against the player, drop pickup effects, and boss hit/clear behavior are all spelled out as concrete scene work rather than implied follow-up tasks.
- HUD work now explicitly includes player HP, enemy HP bars, boss HP bar, shield feedback, weapon-boost status, landed joystick/fire-button art, player death messaging, and boss phase labeling.
- Verification no longer stops at `test/build`; the plan now requires a full spawn-to-`STAGE CLEAR` playable acceptance run.

## Placeholder Scan

- No `TODO`
- No `TBD`
- No “similar to previous task” references
- No placeholder comments in the execution tasks
- Every run command includes an expected result

## Type Consistency Check

- Stage segment ids stay consistent across `stage.ts`, `stage1-adapter.ts`, `stage1-runtime.ts`, and the landed JSON contracts.
- Enemy type names stay consistent across `stage.ts`, `stage1-spawns.ts`, `enemy-presets.ts`, `enemy-factory.ts`, and stage-director commands.
- Boss phase naming stays consistent across `stage1-boss.ts`, `fortress-boss.ts`, and `fortress-boss-phase.test.ts`.
- HUD payload shape stays consistent across `touch-controls.ts`, `hud-state.ts`, `player-tank.ts`, `Stage1Scene.ts`, and `HudScene.ts`.
