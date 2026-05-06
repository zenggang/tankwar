import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

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
  "assets/units/stage1/player-tank/hit-flash.png",
  "assets/units/stage1/player-tank/wreck.png",
  "assets/units/stage1/light-tank/light-tank.png",
  "assets/units/stage1/light-tank/wreck.png",
  "assets/units/stage1/medium-tank/medium-tank.png",
  "assets/units/stage1/medium-tank/wreck.png",
  "assets/units/stage1/fixed-turret/base.png",
  "assets/units/stage1/fixed-turret/head.png",
  "assets/units/stage1/fixed-turret/wreck.png",
  "assets/units/stage1/scout-helicopter/scout-helicopter.png",
  "assets/units/stage1/scout-helicopter/crash.png",
  "assets/units/stage1/scout-helicopter/rotor.png",
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
  "assets/drops/stage1/repair-kit/glow.png",
  "assets/drops/stage1/repair-kit/pickup-fx.png",
  "assets/drops/stage1/weapon-boost/weapon-boost.png",
  "assets/drops/stage1/weapon-boost/glow.png",
  "assets/drops/stage1/weapon-boost/pickup-fx.png",
  "assets/drops/stage1/shield-battery/shield-battery.png",
  "assets/drops/stage1/shield-battery/glow.png",
  "assets/drops/stage1/shield-battery/pickup-fx.png",
  "assets/fx/stage1/explosion-small/out/sheet-transparent.png",
  "assets/fx/stage1/explosion-medium/out/sheet-transparent.png",
  "assets/fx/stage1/explosion-boss/out/sheet-transparent.png",
  "assets/fx/stage1/hit-spark/out/sheet-transparent.png",
  "assets/fx/stage1/projectile-trail/out/projectile-1.png",
  "assets/fx/stage1/shield-hit/out/sheet-transparent.png"
];

function normalizePropSegmentKey(segmentKey) {
  return segmentKey.replace(/^segment-/, "");
}

const propSegmentKeys = Object.keys(propsJson.segments).map(normalizePropSegmentKey);
const dynamicPropFiles = Object.values(propsJson.segments)
  .flat()
  .map((prop) => prop.image);

const missingFiles = [...requiredStaticFiles, ...dynamicPropFiles].filter((repoPath) => {
  return !fs.existsSync(path.join(repoRoot, repoPath));
});

const missingPropSegments = [...expectedSegments].filter((segmentKey) => {
  return !propSegmentKeys.includes(segmentKey);
});

const invalidCollisionSegments = collisionJson.segments
  .map((segment) => segment.key)
  .filter((segmentKey) => !expectedSegments.has(segmentKey));

const invalidZoneSegments = zonesJson.zones
  .map((zone) => zone.segment)
  .filter((segmentKey) => !expectedSegments.has(segmentKey));

if (
  missingFiles.length > 0 ||
  missingPropSegments.length > 0 ||
  invalidCollisionSegments.length > 0 ||
  invalidZoneSegments.length > 0
) {
  if (missingFiles.length > 0) {
    console.error("Missing Stage 1 asset files:");
    for (const file of missingFiles) {
      console.error(`- ${file}`);
    }
  }

  if (missingPropSegments.length > 0) {
    console.error("Merged prop contract is missing expected segments:");
    for (const segmentKey of missingPropSegments) {
      console.error(`- ${segmentKey}`);
    }
  }

  if (invalidCollisionSegments.length > 0) {
    console.error("Collision contract references unknown segments:");
    for (const segmentKey of invalidCollisionSegments) {
      console.error(`- ${segmentKey}`);
    }
  }

  if (invalidZoneSegments.length > 0) {
    console.error("Zone contract references unknown segments:");
    for (const segmentKey of invalidZoneSegments) {
      console.error(`- ${segmentKey}`);
    }
  }

  process.exit(1);
}

console.log("Stage 1 landed contract validation passed.");
