# Vertical Wasteland Tankwar Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable first stage of a portrait mobile WebGL tank shooter with mixed scrolling, scripted waves, a fixed boss arena, readable arcade-wasteland visuals, and a complete clear flow.

**Architecture:** Use a Phaser 3 + TypeScript app bootstrapped with Vite. Keep gameplay data-driven: stage segments, zones, spawns, drops, and boss thresholds live in typed stage data modules, while Phaser scenes and entity classes only consume validated data. Separate the game into four layers: scene shell, combat entities, stage director, and HUD, so generated map/sprite assets can be swapped in without rewriting gameplay logic.

**Tech Stack:** TypeScript, Vite, Phaser 3 (WebGL-first 2D runtime), Vitest, Node.js asset validation script, generated raster art from `generate2dmap` and `generate2dsprite`.

---

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

### Stage Data And Validation

- Create: `src/game/types/stage.ts`
- Create: `src/game/utils/stage-validator.ts`
- Create: `src/game/data/stage1/stage1-layout.ts`
- Create: `src/game/data/stage1/stage1-spawns.ts`
- Create: `src/game/data/stage1/stage1-drops.ts`
- Create: `src/game/data/stage1/stage1-boss.ts`
- Create: `src/game/data/stage1/stage1-assets.ts`

### Player, Enemies, Boss, Combat

- Create: `src/game/systems/input/virtual-controls.ts`
- Create: `src/game/systems/camera/stage-scroll-controller.ts`
- Create: `src/game/systems/combat/health.ts`
- Create: `src/game/systems/combat/projectiles.ts`
- Create: `src/game/systems/combat/drop-table.ts`
- Create: `src/game/entities/player/player-tank.ts`
- Create: `src/game/entities/enemies/enemy-presets.ts`
- Create: `src/game/entities/enemies/ground-enemy.ts`
- Create: `src/game/entities/enemies/fixed-turret.ts`
- Create: `src/game/entities/enemies/scout-helicopter.ts`
- Create: `src/game/entities/boss/fortress-boss.ts`

### HUD And UI

- Create: `src/game/ui/health-bar.ts`
- Create: `src/game/ui/hud-state.ts`

### Asset Prompts And Validation

- Create: `docs/asset-prompts/stage1/map-prompts.md`
- Create: `docs/asset-prompts/stage1/unit-prompts.md`
- Create: `public/assets/stage1/manifest.json`
- Create: `scripts/validate-stage-assets.mjs`

### Tests

- Create: `tests/game-config.test.ts`
- Create: `tests/stage-validator.test.ts`
- Create: `tests/stage-scroll-controller.test.ts`
- Create: `tests/virtual-controls.test.ts`
- Create: `tests/combat-health.test.ts`
- Create: `tests/drop-table.test.ts`
- Create: `tests/fortress-boss-phase.test.ts`

## Task 1: Bootstrap The Phaser + Vite Shell

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/game/config.ts`
- Create: `src/game/bootstrap.ts`
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
    "validate:assets": "node scripts/validate-stage-assets.mjs"
  },
  "dependencies": {
    "phaser": "^3.70.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
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
        background: #090909;
        overflow: hidden;
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
  it("uses a portrait-friendly mobile canvas", () => {
    expect(GAME_CONFIG.width).toBe(720);
    expect(GAME_CONFIG.height).toBe(1280);
    expect(GAME_CONFIG.backgroundColor).toBe("#090909");
  });

  it("registers the boot -> preload -> stage -> hud flow", () => {
    expect(GAME_CONFIG.sceneKeys).toEqual([
      "boot",
      "preload",
      "stage1",
      "hud"
    ]);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm run test -- tests/game-config.test.ts`  
Expected: FAIL with module resolution errors for `../src/game/config`.

- [ ] **Step 5: Implement the minimal game bootstrap**

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

// The game is created once at startup; later tasks only plug more systems into it.
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
    this.add.text(40, 40, "Stage 1 shell", {
      color: "#ffffff",
      fontSize: "32px"
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
    this.add.text(32, 24, "HUD shell", {
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
git commit -m "feat: bootstrap phaser stage shell"
```

## Task 2: Define Typed Stage Data And Validation

**Files:**
- Create: `src/game/types/stage.ts`
- Create: `src/game/utils/stage-validator.ts`
- Create: `src/game/data/stage1/stage1-layout.ts`
- Create: `src/game/data/stage1/stage1-spawns.ts`
- Create: `src/game/data/stage1/stage1-drops.ts`
- Create: `src/game/data/stage1/stage1-boss.ts`
- Test: `tests/stage-validator.test.ts`

- [ ] **Step 1: Write the failing stage validation test**

```ts
import { describe, expect, it } from "vitest";
import { STAGE1_LAYOUT } from "../src/game/data/stage1/stage1-layout";
import { validateStageLayout } from "../src/game/utils/stage-validator";

describe("validateStageLayout", () => {
  it("keeps the stage split into four scrolling segments plus one boss arena", () => {
    const result = validateStageLayout(STAGE1_LAYOUT);

    expect(result.ok).toBe(true);
    expect(STAGE1_LAYOUT.segments.map((segment) => segment.key)).toEqual([
      "segment-01",
      "segment-02",
      "segment-03",
      "segment-04"
    ]);
    expect(STAGE1_LAYOUT.bossArena.locksCamera).toBe(true);
  });

  it("only uses approved first-stage enemy types", () => {
    const enemyTypes = STAGE1_LAYOUT.zones.flatMap((zone) => zone.allowedEnemyTypes);
    expect(new Set(enemyTypes)).toEqual(
      new Set(["light_tank", "medium_tank", "fixed_turret", "scout_helicopter", "fortress_boss"])
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/stage-validator.test.ts`  
Expected: FAIL because `stage1-layout` and `stage-validator` do not exist yet.

- [ ] **Step 3: Implement the shared stage types**

```ts
// src/game/types/stage.ts
export type EnemyType =
  | "light_tank"
  | "medium_tank"
  | "fixed_turret"
  | "scout_helicopter"
  | "fortress_boss";

export type DropType = "repair_kit" | "weapon_boost" | "shield_battery";

export interface StageSegment {
  key: string;
  baseTextureKey: string;
  height: number;
}

export interface StageZone {
  key: string;
  segmentKey: string;
  startY: number;
  endY: number;
  allowedEnemyTypes: EnemyType[];
  clearsBeforeAdvance: boolean;
}

export interface BossArena {
  startY: number;
  endY: number;
  locksCamera: boolean;
  unlocksOnBossDefeat: boolean;
}

export interface StageLayout {
  segments: StageSegment[];
  zones: StageZone[];
  bossArena: BossArena;
}
```

- [ ] **Step 4: Implement the stage data and validator**

```ts
// src/game/data/stage1/stage1-layout.ts
import type { StageLayout } from "../../types/stage";

export const STAGE1_LAYOUT: StageLayout = {
  segments: [
    { key: "segment-01", baseTextureKey: "stage1-segment-01", height: 1400 },
    { key: "segment-02", baseTextureKey: "stage1-segment-02", height: 1400 },
    { key: "segment-03", baseTextureKey: "stage1-segment-03", height: 1400 },
    { key: "segment-04", baseTextureKey: "stage1-segment-04", height: 1200 }
  ],
  zones: [
    {
      key: "opening-lane",
      segmentKey: "segment-01",
      startY: 0,
      endY: 960,
      allowedEnemyTypes: ["light_tank", "fixed_turret"],
      clearsBeforeAdvance: false
    },
    {
      key: "roadblock-lane",
      segmentKey: "segment-02",
      startY: 1400,
      endY: 2520,
      allowedEnemyTypes: ["light_tank", "medium_tank", "fixed_turret", "scout_helicopter"],
      clearsBeforeAdvance: false
    },
    {
      key: "checkpoint-lock",
      segmentKey: "segment-03",
      startY: 2800,
      endY: 3920,
      allowedEnemyTypes: ["light_tank", "medium_tank", "fixed_turret", "scout_helicopter"],
      clearsBeforeAdvance: true
    },
    {
      key: "boss-approach",
      segmentKey: "segment-04",
      startY: 4200,
      endY: 5000,
      allowedEnemyTypes: ["medium_tank", "fixed_turret", "scout_helicopter", "fortress_boss"],
      clearsBeforeAdvance: true
    }
  ],
  bossArena: {
    startY: 5000,
    endY: 6200,
    locksCamera: true,
    unlocksOnBossDefeat: true
  }
};
```

```ts
// src/game/utils/stage-validator.ts
import type { StageLayout } from "../types/stage";

export function validateStageLayout(layout: StageLayout): { ok: true } {
  if (layout.segments.length !== 4) {
    throw new Error(`Stage 1 must have exactly 4 scrolling segments, got ${layout.segments.length}.`);
  }

  if (!layout.bossArena.locksCamera) {
    throw new Error("Boss arena must lock the camera for the fixed encounter.");
  }

  for (const zone of layout.zones) {
    if (zone.endY <= zone.startY) {
      throw new Error(`Zone ${zone.key} must have endY > startY.`);
    }
  }

  return { ok: true };
}
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
export const STAGE1_BOSS_PHASES = {
  phaseTwoHealthRatio: 0.5,
  sideCannonsRequired: 2
};
```

```ts
// src/game/data/stage1/stage1-spawns.ts
export const STAGE1_SPAWN_PLAN = [
  { zoneKey: "opening-lane", type: "light_tank", x: 360, y: 220, delayMs: 0 },
  { zoneKey: "opening-lane", type: "fixed_turret", x: 140, y: 120, delayMs: 1800 },
  { zoneKey: "roadblock-lane", type: "medium_tank", x: 360, y: 160, delayMs: 500 },
  { zoneKey: "roadblock-lane", type: "scout_helicopter", x: 580, y: 80, delayMs: 2300 }
] as const;
```

- [ ] **Step 5: Run validation tests and build**

Run: `npm run test -- tests/stage-validator.test.ts && npm run build`  
Expected: stage validation tests PASS and build still succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/game/types/stage.ts src/game/utils/stage-validator.ts src/game/data/stage1 tests/stage-validator.test.ts
git commit -m "feat: add typed stage 1 data contracts"
```

## Task 3: Implement The Scene Shell And Mixed Scroll Controller

**Files:**
- Modify: `src/game/scenes/BootScene.ts`
- Modify: `src/game/scenes/PreloadScene.ts`
- Modify: `src/game/scenes/Stage1Scene.ts`
- Create: `src/game/data/stage1/stage1-assets.ts`
- Create: `src/game/systems/camera/stage-scroll-controller.ts`
- Test: `tests/stage-scroll-controller.test.ts`

- [ ] **Step 1: Write the failing scroll-controller test**

```ts
import { describe, expect, it } from "vitest";
import { createStageScrollController } from "../src/game/systems/camera/stage-scroll-controller";

describe("createStageScrollController", () => {
  it("follows the player during scrolling segments", () => {
    const controller = createStageScrollController({ viewportHeight: 1280, bossArenaStartY: 5000 });
    const cameraY = controller.resolveCameraY({ playerWorldY: 3200, bossArenaLocked: false });

    expect(cameraY).toBeGreaterThan(0);
    expect(cameraY).toBeLessThan(5000);
  });

  it("pins the camera when the boss arena is locked", () => {
    const controller = createStageScrollController({ viewportHeight: 1280, bossArenaStartY: 5000 });
    const cameraY = controller.resolveCameraY({ playerWorldY: 5400, bossArenaLocked: true });

    expect(cameraY).toBe(5000);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/stage-scroll-controller.test.ts`  
Expected: FAIL because the scroll controller module is missing.

- [ ] **Step 3: Implement the pure camera controller**

```ts
// src/game/systems/camera/stage-scroll-controller.ts
export interface ScrollControllerConfig {
  viewportHeight: number;
  bossArenaStartY: number;
}

export interface ScrollControllerState {
  playerWorldY: number;
  bossArenaLocked: boolean;
}

export function createStageScrollController(config: ScrollControllerConfig) {
  return {
    resolveCameraY(state: ScrollControllerState): number {
      if (state.bossArenaLocked) {
        return config.bossArenaStartY;
      }

      const desired = state.playerWorldY - config.viewportHeight * 0.65;
      return Math.max(0, Math.min(desired, config.bossArenaStartY));
    }
  };
}
```

- [ ] **Step 4: Add asset keys and a real stage scene shell**

```ts
// src/game/data/stage1/stage1-assets.ts
export const STAGE1_ASSET_KEYS = {
  segment01: "stage1-segment-01",
  segment02: "stage1-segment-02",
  segment03: "stage1-segment-03",
  segment04: "stage1-segment-04",
  playerHull: "player-hull",
  playerTurret: "player-turret",
  uiFireButton: "ui-fire-button"
} as const;
```

```ts
// src/game/scenes/PreloadScene.ts
import Phaser from "phaser";
import { STAGE1_ASSET_KEYS } from "../data/stage1/stage1-assets";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("preload");
  }

  preload(): void {
    // Use generated assets when they exist; until then, load placeholder keys from public/assets.
    this.load.image(STAGE1_ASSET_KEYS.segment01, "assets/stage1/map/segment-01-base.png");
    this.load.image(STAGE1_ASSET_KEYS.segment02, "assets/stage1/map/segment-02-base.png");
    this.load.image(STAGE1_ASSET_KEYS.segment03, "assets/stage1/map/segment-03-base.png");
    this.load.image(STAGE1_ASSET_KEYS.segment04, "assets/stage1/map/segment-04-base.png");
    this.load.image(STAGE1_ASSET_KEYS.playerHull, "assets/stage1/units/player-hull.png");
    this.load.image(STAGE1_ASSET_KEYS.playerTurret, "assets/stage1/units/player-turret.png");
    this.load.image(STAGE1_ASSET_KEYS.uiFireButton, "assets/stage1/ui/fire-button.png");
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
import { STAGE1_ASSET_KEYS } from "../data/stage1/stage1-assets";
import { STAGE1_LAYOUT } from "../data/stage1/stage1-layout";
import { createStageScrollController } from "../systems/camera/stage-scroll-controller";

export class Stage1Scene extends Phaser.Scene {
  private scrollController = createStageScrollController({
    viewportHeight: 1280,
    bossArenaStartY: STAGE1_LAYOUT.bossArena.startY
  });

  private bossArenaLocked = false;
  private playerMarker!: Phaser.GameObjects.Rectangle;

  constructor() {
    super("stage1");
  }

  create(): void {
    let yOffset = 0;

    for (const segment of STAGE1_LAYOUT.segments) {
      this.add.image(360, yOffset + segment.height / 2, segment.baseTextureKey);
      yOffset += segment.height;
    }

    this.physics.world.setBounds(0, 0, 720, STAGE1_LAYOUT.bossArena.endY + 1280);
    this.cameras.main.setBounds(0, 0, 720, STAGE1_LAYOUT.bossArena.endY + 1280);

    // Temporary marker until the player tank class lands in Task 4.
    this.playerMarker = this.add.rectangle(360, 1120, 48, 64, 0x6e8b74);
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
Expected: scroll controller tests PASS and the stage scene builds with typed asset keys.

- [ ] **Step 6: Commit**

```bash
git add src/game/scenes/PreloadScene.ts src/game/scenes/Stage1Scene.ts src/game/data/stage1/stage1-assets.ts src/game/systems/camera/stage-scroll-controller.ts tests/stage-scroll-controller.test.ts
git commit -m "feat: add stage scroll controller and stage scene shell"
```

## Task 4: Implement Virtual Controls, Player Tank, And HUD State

**Files:**
- Create: `src/game/systems/input/virtual-controls.ts`
- Create: `src/game/entities/player/player-tank.ts`
- Create: `src/game/ui/health-bar.ts`
- Create: `src/game/ui/hud-state.ts`
- Modify: `src/game/scenes/Stage1Scene.ts`
- Modify: `src/game/scenes/HudScene.ts`
- Test: `tests/virtual-controls.test.ts`

- [ ] **Step 1: Write the failing virtual-control test**

```ts
import { describe, expect, it } from "vitest";
import { resolveVirtualInput } from "../src/game/systems/input/virtual-controls";

describe("resolveVirtualInput", () => {
  it("caps movement magnitude at 1 for the left stick", () => {
    const input = resolveVirtualInput({
      stickCenter: { x: 100, y: 100 },
      stickPointer: { x: 220, y: 220 },
      firePressed: true
    });

    expect(input.moveX).toBeLessThanOrEqual(1);
    expect(input.moveY).toBeLessThanOrEqual(1);
    expect(input.firePressed).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/virtual-controls.test.ts`  
Expected: FAIL because `virtual-controls.ts` does not exist.

- [ ] **Step 3: Implement the reusable virtual input helper**

```ts
// src/game/systems/input/virtual-controls.ts
export interface PointerPosition {
  x: number;
  y: number;
}

export interface VirtualInputSnapshot {
  moveX: number;
  moveY: number;
  firePressed: boolean;
}

export function resolveVirtualInput(params: {
  stickCenter: PointerPosition;
  stickPointer: PointerPosition;
  firePressed: boolean;
}): VirtualInputSnapshot {
  const dx = params.stickPointer.x - params.stickCenter.x;
  const dy = params.stickPointer.y - params.stickCenter.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const clamped = Math.min(length, 72);

  return {
    moveX: Number(((dx / length) * (clamped / 72)).toFixed(4)),
    moveY: Number(((dy / length) * (clamped / 72)).toFixed(4)),
    firePressed: params.firePressed
  };
}
```

- [ ] **Step 4: Implement the player tank and HUD state**

```ts
// src/game/ui/hud-state.ts
export interface HudState {
  playerHp: number;
  playerMaxHp: number;
  shieldHp: number;
  shieldMaxHp: number;
  weaponBoostActive: boolean;
}

export const INITIAL_HUD_STATE: HudState = {
  playerHp: 100,
  playerMaxHp: 100,
  shieldHp: 0,
  shieldMaxHp: 50,
  weaponBoostActive: false
};
```

```ts
// src/game/ui/health-bar.ts
import Phaser from "phaser";

export class HealthBar extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly widthPx: number;

  constructor(scene: Phaser.Scene, x: number, y: number, widthPx: number, color: number) {
    const bg = scene.add.rectangle(0, 0, widthPx, 10, 0x18202a, 0.85).setOrigin(0, 0.5);
    const fill = scene.add.rectangle(0, 0, widthPx, 10, color, 0.95).setOrigin(0, 0.5);
    super(scene, x, y, [bg, fill]);

    this.bg = bg;
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

export class PlayerTank extends Phaser.GameObjects.Container {
  private readonly hull: Phaser.GameObjects.Sprite;
  private readonly turret: Phaser.GameObjects.Sprite;
  private readonly speed = 240;
  private readonly fireCooldownMs = 260;
  private lastFireTime = -Infinity;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const hull = scene.add.sprite(0, 0, "player-hull");
    const turret = scene.add.sprite(0, 0, "player-turret");
    super(scene, x, y, [hull, turret]);

    this.hull = hull;
    this.turret = turret;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(48, 64);
    body.setCollideWorldBounds(true);
  }

  updateFromInput(input: { moveX: number; moveY: number; firePressed: boolean }, time: number): boolean {
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
}
```

```ts
// src/game/scenes/HudScene.ts
import Phaser from "phaser";
import { HealthBar } from "../ui/health-bar";
import { INITIAL_HUD_STATE } from "../ui/hud-state";

export class HudScene extends Phaser.Scene {
  private hpText!: Phaser.GameObjects.Text;
  private hpBar!: HealthBar;

  constructor() {
    super("hud");
  }

  create(): void {
    this.add.circle(104, 1112, 78, 0x9fb8cf, 0.16).setScrollFactor(0);
    this.add.circle(604, 1112, 72, 0xd2ae84, 0.2).setScrollFactor(0);

    this.hpText = this.add.text(32, 24, "", {
      color: "#dbe7f2",
      fontSize: "24px"
    }).setScrollFactor(0);

    this.hpBar = new HealthBar(this, 32, 66, 220, 0x79d279);
    this.hpBar.setScrollFactor(0);

    this.sync(INITIAL_HUD_STATE);
  }

  sync(state = INITIAL_HUD_STATE): void {
    this.hpText.setText(`HP ${state.playerHp}/${state.playerMaxHp}`);
    this.hpBar.sync(state.playerHp, state.playerMaxHp);
  }
}
```

- [ ] **Step 5: Wire the player into the stage scene**

```ts
// Stage1Scene create/update delta
import { PlayerTank } from "../entities/player/player-tank";
import { resolveVirtualInput } from "../systems/input/virtual-controls";

private player!: PlayerTank;

create(): void {
  // ...segment setup...
  this.player = new PlayerTank(this, 360, 1120);
}

update(time: number): void {
  const input = resolveVirtualInput({
    stickCenter: { x: 104, y: 1112 },
    stickPointer: { x: 104, y: 1112 },
    firePressed: false
  });

  this.player.updateFromInput(input, time);

  const cameraY = this.scrollController.resolveCameraY({
    playerWorldY: this.player.y,
    bossArenaLocked: this.bossArenaLocked
  });

  this.cameras.main.scrollY = cameraY;
}
```

- [ ] **Step 6: Run tests and build**

Run: `npm run test -- tests/virtual-controls.test.ts && npm run build`  
Expected: virtual control tests PASS and build succeeds with player/HUD classes wired.

- [ ] **Step 7: Commit**

```bash
git add src/game/systems/input/virtual-controls.ts src/game/entities/player/player-tank.ts src/game/ui/health-bar.ts src/game/ui/hud-state.ts src/game/scenes/Stage1Scene.ts src/game/scenes/HudScene.ts tests/virtual-controls.test.ts
git commit -m "feat: add player tank controls and hud shell"
```

## Task 5: Add Combat Primitives And Standard Enemies

**Files:**
- Create: `src/game/systems/combat/health.ts`
- Create: `src/game/systems/combat/projectiles.ts`
- Create: `src/game/entities/enemies/enemy-presets.ts`
- Create: `src/game/entities/enemies/ground-enemy.ts`
- Create: `src/game/entities/enemies/fixed-turret.ts`
- Create: `src/game/entities/enemies/scout-helicopter.ts`
- Modify: `src/game/scenes/Stage1Scene.ts`
- Test: `tests/combat-health.test.ts`

- [ ] **Step 1: Write the failing combat-health test**

```ts
import { describe, expect, it } from "vitest";
import { applyDamage } from "../src/game/systems/combat/health";

describe("applyDamage", () => {
  it("reduces shield first, then health", () => {
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
Expected: FAIL because the combat helper does not exist.

- [ ] **Step 3: Implement combat helpers and enemy presets**

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
// src/game/entities/enemies/enemy-presets.ts
export const ENEMY_PRESETS = {
  light_tank: { hp: 30, speed: 170, fireCooldownMs: 900 },
  medium_tank: { hp: 55, speed: 120, fireCooldownMs: 1100 },
  fixed_turret: { hp: 40, speed: 0, fireCooldownMs: 1000 },
  scout_helicopter: { hp: 35, speed: 210, fireCooldownMs: 1300 }
} as const;
```

```ts
// src/game/systems/combat/projectiles.ts
import Phaser from "phaser";

export class ProjectileSystem {
  readonly group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group();
  }

  spawn(x: number, y: number, velocityX: number, velocityY: number): void {
    const shot = this.group.create(x, y, "__DEFAULT") as Phaser.Physics.Arcade.Image;
    shot.setVelocity(velocityX, velocityY);
    shot.setSize(10, 20);
  }
}
```

- [ ] **Step 4: Implement the standard enemy classes and wire them into the stage scene**

```ts
// src/game/entities/enemies/ground-enemy.ts
import Phaser from "phaser";
import { ENEMY_PRESETS } from "./enemy-presets";

export class GroundEnemy extends Phaser.Physics.Arcade.Sprite {
  readonly enemyType: "light_tank" | "medium_tank";
  hp: number;

  constructor(scene: Phaser.Scene, x: number, y: number, enemyType: "light_tank" | "medium_tank") {
    super(scene, x, y, enemyType);
    this.enemyType = enemyType;
    this.hp = ENEMY_PRESETS[enemyType].hp;
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
  hp = ENEMY_PRESETS.fixed_turret.hp;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const base = scene.add.sprite(0, 0, "fixed-turret-base");
    const turret = scene.add.sprite(0, -8, "fixed-turret-head");
    super(scene, x, y, [base, turret]);
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
  hp = ENEMY_PRESETS.scout_helicopter.hp;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "scout-helicopter");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setVelocityX(-ENEMY_PRESETS.scout_helicopter.speed);
  }
}
```

```ts
// Stage1Scene enemy wiring delta
private enemies!: Phaser.GameObjects.Group;
private projectiles!: ProjectileSystem;

create(): void {
  // ...
  this.enemies = this.add.group();
  this.projectiles = new ProjectileSystem(this);
  this.enemies.add(new GroundEnemy(this, 360, 900, "light_tank"));
}
```

- [ ] **Step 5: Run tests and build**

Run: `npm run test -- tests/combat-health.test.ts && npm run build`  
Expected: damage test PASS and the project still builds with core enemy classes present.

- [ ] **Step 6: Commit**

```bash
git add src/game/systems/combat/health.ts src/game/systems/combat/projectiles.ts src/game/entities/enemies src/game/scenes/Stage1Scene.ts tests/combat-health.test.ts
git commit -m "feat: add core combat helpers and standard enemies"
```

## Task 6: Implement The Scripted Stage Director And Drops

**Files:**
- Create: `src/game/systems/combat/drop-table.ts`
- Modify: `src/game/data/stage1/stage1-spawns.ts`
- Modify: `src/game/data/stage1/stage1-drops.ts`
- Modify: `src/game/scenes/Stage1Scene.ts`
- Test: `tests/drop-table.test.ts`

- [ ] **Step 1: Write the failing drop-table test**

```ts
import { describe, expect, it } from "vitest";
import { resolveStage1Drop } from "../src/game/systems/combat/drop-table";

describe("resolveStage1Drop", () => {
  it("guarantees a checkpoint recovery or weapon reward", () => {
    const drop = resolveStage1Drop({ zoneKey: "checkpoint-lock", randomValue: 0.1 });
    expect(["repair_kit", "weapon_boost"]).toContain(drop);
  });

  it("only gives the optional shield battery on the roadblock bonus roll", () => {
    const noDrop = resolveStage1Drop({ zoneKey: "roadblock-lane", randomValue: 0.8 });
    const yesDrop = resolveStage1Drop({ zoneKey: "roadblock-lane", randomValue: 0.2 });
    expect(noDrop).toBeNull();
    expect(yesDrop).toBe("shield_battery");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/drop-table.test.ts`  
Expected: FAIL because `drop-table.ts` does not exist.

- [ ] **Step 3: Implement the drop resolver**

```ts
// src/game/systems/combat/drop-table.ts
import { STAGE1_DROP_RULES } from "../../data/stage1/stage1-drops";

export function resolveStage1Drop(params: { zoneKey: string; randomValue: number }) {
  if (params.zoneKey === "checkpoint-lock") {
    return params.randomValue < 0.5 ? "repair_kit" : "weapon_boost";
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

- [ ] **Step 4: Expand the stage scene into a zone-driven director**

```ts
// Stage1Scene staged wave delta
import { STAGE1_SPAWN_PLAN } from "../data/stage1/stage1-spawns";
import { resolveStage1Drop } from "../systems/combat/drop-table";

private spawnedZones = new Set<string>();

update(time: number): void {
  // ...player and camera update...
  const activeZone = STAGE1_LAYOUT.zones.find(
    (zone) => this.player.y >= zone.startY && this.player.y <= zone.endY
  );

  if (activeZone && !this.spawnedZones.has(activeZone.key)) {
    this.spawnedZones.add(activeZone.key);

    for (const spawn of STAGE1_SPAWN_PLAN.filter((entry) => entry.zoneKey === activeZone.key)) {
      this.time.delayedCall(spawn.delayMs, () => {
        // Spawn actual enemy instances based on the typed plan.
      });
    }

    const drop = resolveStage1Drop({
      zoneKey: activeZone.key,
      randomValue: Math.random()
    });

    if (drop) {
      // Drop entity spawning lands here in the same zone-driven hook.
    }
  }
}
```

- [ ] **Step 5: Run tests and build**

Run: `npm run test -- tests/drop-table.test.ts && npm run build`  
Expected: drop tests PASS and stage update loop compiles with scripted zone hooks.

- [ ] **Step 6: Commit**

```bash
git add src/game/systems/combat/drop-table.ts src/game/data/stage1/stage1-spawns.ts src/game/data/stage1/stage1-drops.ts src/game/scenes/Stage1Scene.ts tests/drop-table.test.ts
git commit -m "feat: add stage director drop and spawn scripting"
```

## Task 7: Build The Fortress Boss Arena And Victory Flow

**Files:**
- Create: `src/game/entities/boss/fortress-boss.ts`
- Modify: `src/game/data/stage1/stage1-boss.ts`
- Modify: `src/game/scenes/Stage1Scene.ts`
- Modify: `src/game/scenes/HudScene.ts`
- Test: `tests/fortress-boss-phase.test.ts`

- [ ] **Step 1: Write the failing boss-phase test**

```ts
import { describe, expect, it } from "vitest";
import { resolveBossPhase } from "../src/game/entities/boss/fortress-boss";

describe("resolveBossPhase", () => {
  it("stays in phase one while both side cannons are alive and health is above the threshold", () => {
    expect(resolveBossPhase({ hpRatio: 0.8, sideCannonsDestroyed: 0 })).toBe("phase_one");
  });

  it("switches to phase two after enough damage or side-cannon destruction", () => {
    expect(resolveBossPhase({ hpRatio: 0.4, sideCannonsDestroyed: 0 })).toBe("phase_two");
    expect(resolveBossPhase({ hpRatio: 0.8, sideCannonsDestroyed: 2 })).toBe("phase_two");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/fortress-boss-phase.test.ts`  
Expected: FAIL because the boss class does not exist yet.

- [ ] **Step 3: Implement the boss phase resolver and fortress shell**

```ts
// src/game/entities/boss/fortress-boss.ts
import { STAGE1_BOSS_PHASES } from "../../data/stage1/stage1-boss";

export function resolveBossPhase(params: { hpRatio: number; sideCannonsDestroyed: number }) {
  if (
    params.hpRatio <= STAGE1_BOSS_PHASES.phaseTwoHealthRatio ||
    params.sideCannonsDestroyed >= STAGE1_BOSS_PHASES.sideCannonsRequired
  ) {
    return "phase_two";
  }

  return "phase_one";
}
```

```ts
// src/game/entities/boss/fortress-boss.ts
import Phaser from "phaser";

export class FortressBoss extends Phaser.GameObjects.Container {
  hp = 300;
  maxHp = 300;
  sideCannonsDestroyed = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const body = scene.add.sprite(0, 0, "boss-body");
    const mainCannon = scene.add.sprite(0, -26, "boss-main-cannon");
    const leftCannon = scene.add.sprite(-72, 10, "boss-side-cannon-left");
    const rightCannon = scene.add.sprite(72, 10, "boss-side-cannon-right");
    super(scene, x, y, [body, mainCannon, leftCannon, rightCannon]);
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  get phase() {
    return resolveBossPhase({
      hpRatio: this.hp / this.maxHp,
      sideCannonsDestroyed: this.sideCannonsDestroyed
    });
  }
}
```

- [ ] **Step 4: Lock the arena, spawn the boss, and publish victory**

```ts
// Stage1Scene boss delta
private boss?: FortressBoss;
private stageCleared = false;

update(): void {
  // ...
  if (!this.boss && this.player.y >= STAGE1_LAYOUT.bossArena.startY) {
    this.bossArenaLocked = true;
    this.player.y = Math.min(this.player.y, STAGE1_LAYOUT.bossArena.endY - 240);
    this.boss = new FortressBoss(this, 360, STAGE1_LAYOUT.bossArena.startY + 180);
    this.events.emit("boss-start");
  }

  if (this.boss && this.boss.hp <= 0 && !this.stageCleared) {
    this.stageCleared = true;
    this.bossArenaLocked = false;
    this.events.emit("stage-clear");
  }
}
```

```ts
// HudScene boss/victory delta
create(): void {
  const stageScene = this.scene.get("stage1");
  stageScene.events.on("boss-start", () => {
    // Show boss bar when the lock arena starts.
  });
  stageScene.events.on("stage-clear", () => {
    this.add.text(160, 420, "STAGE CLEAR", {
      color: "#ffd47a",
      fontSize: "52px"
    }).setScrollFactor(0);
  });
}
```

- [ ] **Step 5: Run tests and build**

Run: `npm run test -- tests/fortress-boss-phase.test.ts && npm run build`  
Expected: boss phase tests PASS and the game builds with boss-lock and stage-clear hooks.

- [ ] **Step 6: Commit**

```bash
git add src/game/entities/boss/fortress-boss.ts src/game/data/stage1/stage1-boss.ts src/game/scenes/Stage1Scene.ts src/game/scenes/HudScene.ts tests/fortress-boss-phase.test.ts
git commit -m "feat: add fortress boss arena flow"
```

## Task 8: Generate And Integrate Stage 1 Art Assets

**Files:**
- Create: `docs/asset-prompts/stage1/map-prompts.md`
- Create: `docs/asset-prompts/stage1/unit-prompts.md`
- Create: `public/assets/stage1/manifest.json`
- Create: `scripts/validate-stage-assets.mjs`
- Modify: `src/game/data/stage1/stage1-assets.ts`

- [ ] **Step 1: Write the manifest-first asset contract**

```json
{
  "stage": "stage1",
  "requiredFiles": [
    "public/assets/stage1/map/segment-01-base.png",
    "public/assets/stage1/map/segment-02-base.png",
    "public/assets/stage1/map/segment-03-base.png",
    "public/assets/stage1/map/segment-04-base.png",
    "public/assets/stage1/units/player-hull.png",
    "public/assets/stage1/units/player-turret.png",
    "public/assets/stage1/units/light-tank.png",
    "public/assets/stage1/units/medium-tank.png",
    "public/assets/stage1/units/fixed-turret-base.png",
    "public/assets/stage1/units/fixed-turret-head.png",
    "public/assets/stage1/units/scout-helicopter.png",
    "public/assets/stage1/units/boss-body.png",
    "public/assets/stage1/units/boss-main-cannon.png",
    "public/assets/stage1/units/boss-side-cannon-left.png",
    "public/assets/stage1/units/boss-side-cannon-right.png",
    "public/assets/stage1/ui/fire-button.png",
    "public/assets/stage1/ui/joystick-base.png",
    "public/assets/stage1/ui/joystick-knob.png",
    "public/assets/stage1/drops/repair-kit.png",
    "public/assets/stage1/drops/weapon-boost.png",
    "public/assets/stage1/drops/shield-battery.png"
  ]
}
```

```ts
// src/game/data/stage1/stage1-assets.ts
export const STAGE1_ASSET_KEYS = {
  segment01: "stage1-segment-01",
  segment02: "stage1-segment-02",
  segment03: "stage1-segment-03",
  segment04: "stage1-segment-04",
  playerHull: "player-hull",
  playerTurret: "player-turret",
  lightTank: "light_tank",
  mediumTank: "medium_tank",
  fixedTurretBase: "fixed-turret-base",
  fixedTurretHead: "fixed-turret-head",
  scoutHelicopter: "scout-helicopter",
  bossBody: "boss-body",
  bossMainCannon: "boss-main-cannon",
  bossSideCannonLeft: "boss-side-cannon-left",
  bossSideCannonRight: "boss-side-cannon-right",
  uiFireButton: "ui-fire-button",
  uiJoystickBase: "ui-joystick-base",
  uiJoystickKnob: "ui-joystick-knob",
  repairKit: "repair-kit",
  weaponBoost: "weapon-boost",
  shieldBattery: "shield-battery"
} as const;
```

```js
// scripts/validate-stage-assets.mjs
import fs from "node:fs";

const manifest = JSON.parse(
  fs.readFileSync(new URL("../public/assets/stage1/manifest.json", import.meta.url), "utf8")
);

const missing = manifest.requiredFiles.filter((file) => !fs.existsSync(new URL(`../${file}`, import.meta.url)));

if (missing.length > 0) {
  console.error("Missing stage 1 assets:");
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log(`Stage 1 asset validation passed (${manifest.requiredFiles.length} files).`);
```

- [ ] **Step 2: Run asset validation to verify it fails before generation**

Run: `npm run validate:assets`  
Expected: FAIL and list missing stage 1 asset files.

- [ ] **Step 3: Write the exact map prompts**

```md
# docs/asset-prompts/stage1/map-prompts.md

## Segment 01

Portrait mobile shooter stage background, clean arcade wasteland, light 3/4 top-down road perspective, centered cracked asphalt highway running upward, sand shoulders, a few rusted barrels and wreck cars pushed to the sides, strong silhouette readability, low texture noise, no characters, no UI, no text, no pixel art, 720x1400 composition.

## Segment 02

Portrait mobile shooter stage background, arcade wasteland roadblock section, light 3/4 top-down road perspective, central highway with broken barricades, sandbags, damaged trucks at the edges, stronger pressure than segment 01, clean readable composition, no characters, no text, no pixel art, 720x1400 composition.

## Segment 03

Portrait mobile shooter stage background, arcade wasteland checkpoint lockdown, light 3/4 top-down road perspective, checkpoint gantry, wire fence, armored debris, clear central combat lane, readable side cover, no characters, no UI, no text, no pixel art, 720x1400 composition.

## Segment 04

Portrait mobile shooter boss arena background, arcade wasteland final road fortress yard, wider end zone feel, heavy truck wrecks and concrete cover at the sides, clear center lane for boss movement, fixed arena composition, no characters, no UI, no text, no pixel art, 720x1200 composition.
```

- [ ] **Step 4: Write the exact unit prompts**

```md
# docs/asset-prompts/stage1/unit-prompts.md

## Player Tank

2D game sprite, clean arcade wasteland medium tank, light 3/4 top-down view, readable military silhouette, muted green armor with rust accents, separate hull render and separate turret render, no background, no text, no pixel art.

## Light Tank

2D game sprite, fast enemy light tank, clean arcade wasteland style, light 3/4 top-down view, smaller silhouette than player tank, brown-gray armor, no background, no text, no pixel art.

## Medium Tank

2D game sprite, enemy medium tank, clean arcade wasteland style, heavier front armor and thicker cannon than light tank, light 3/4 top-down view, no background, no text, no pixel art.

## Fixed Turret

2D game sprite, arcade wasteland fixed turret with separate base and rotating gun head, light 3/4 top-down view, readable silhouette, no background, no text, no pixel art.

## Scout Helicopter

2D game sprite, small enemy scout helicopter, arcade wasteland style, readable top-down/3-quarter silhouette, compact body, no background, no text, no pixel art.

## Fortress Boss

2D game boss sprite set, mobile fortress tank boss, clean arcade wasteland style, light 3/4 top-down view, huge body with main cannon, side cannons, weak core module, readable boss silhouette, no background, no text, no pixel art.
```

- [ ] **Step 5: Generate and place the assets**

Run these content tasks in order:

1. Use `generate2dmap` to create `segment-01-base.png` through `segment-04-base.png`.
2. Use `generate2dsprite` to create:
   - player hull/turret
   - light tank
   - medium tank
   - fixed turret base/head
   - scout helicopter
   - boss body/main cannon/side cannons
   - fire-button / joystick-base / joystick-knob
   - repair-kit / weapon-boost / shield-battery
3. Save outputs to the exact manifest paths under `public/assets/stage1/...`.
4. Expand `PreloadScene` so every runtime texture key above is loaded before `Stage1Scene` starts.

Expected: every path in `public/assets/stage1/manifest.json` exists after generation.

- [ ] **Step 6: Run asset validation, tests, and build**

Run: `npm run validate:assets && npm run test && npm run build`  
Expected: asset validation PASS, all tests PASS, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add docs/asset-prompts/stage1 public/assets/stage1 scripts/validate-stage-assets.mjs src/game/data/stage1/stage1-assets.ts
git commit -m "feat: add generated stage 1 art assets"
```

## Spec Coverage Check

- Stage 1 only: covered by Tasks 2, 3, 6, 7, and 8.
- Portrait mobile WebGL tank shooter shell: covered by Tasks 1, 3, and 4.
- Mixed progression with fixed boss arena: covered by Tasks 3 and 7.
- Typed map / zone / spawn / drop contract: covered by Tasks 2 and 6.
- Readable arcade-wasteland art integration: covered by Task 8.
- Player, enemies, boss, drops, and HUD: covered by Tasks 4, 5, 6, 7, and 8.

## Placeholder Scan

- No `TODO`
- No `TBD`
- No “similar to previous task” references
- Every command includes an expected result

## Type Consistency Check

- Enemy type names are consistent across `stage.ts`, `stage1-layout.ts`, `enemy-presets.ts`, and tests.
- Boss phase naming is consistent between `stage1-boss.ts`, `fortress-boss.ts`, and `fortress-boss-phase.test.ts`.
- Stage asset keys and public file paths are consistent between `stage1-assets.ts`, the preload scene, and `manifest.json`.
