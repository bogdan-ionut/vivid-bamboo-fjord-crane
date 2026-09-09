import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameApp } from "@/components/game-app";
import "@/styles.css";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Missing #app root element");
}

createRoot(root).render(
  <StrictMode>
    <GameApp />
  </StrictMode>,
);
