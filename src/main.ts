import { createGame } from "./game/bootstrap";

// The application shell owns a single Phaser runtime rooted at #app.
const appRoot = document.getElementById("app");

if (!appRoot) {
  throw new Error("Tankwar bootstrap requires an #app root element.");
}

createGame();
