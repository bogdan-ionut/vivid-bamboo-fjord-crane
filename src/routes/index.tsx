import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameApp } from "@/components/game-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <main className="flex h-dvh items-center justify-center bg-bg text-fg">
        <p className="font-display text-xl">Osea & Lois</p>
      </main>
    );
  }
  return <GameApp />;
}
