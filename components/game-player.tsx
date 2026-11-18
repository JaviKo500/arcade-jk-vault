"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/data/games";
import { GameCanvas } from "@/components/game-canvas";
import { TouchControls } from "@/components/touch-controls";
import { useSession } from "@/components/session-provider";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { GAME_ENGINES } from "@/lib/games/registry";
import type { GameCallbacks, GameInstance, SkinId } from "@/lib/games/types";
import { insertScore } from "@/lib/data/scores-client";
import { normalizePlayerName } from "@/lib/format";
import {
  DEFAULT_SKIN,
  getSkinPreference,
  setSkinPreference,
} from "@/lib/skin-preference";

type SaveStatus = "idle" | "saving" | "saved" | "error";

const SKIN_LABELS: Record<SkinId, string> = {
  classic: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};

export function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  const { session } = useSession();
  // Dispositivo táctil (`pointer: coarse`); `false` en el servidor
  const isTouch = useCoarsePointer();

  // Si el juego tiene motor real, score, vidas y nivel vienen de él; si no,
  // se usa la simulación de puntuación.
  const engine = GAME_ENGINES[game.id];
  const engineFactory = engine?.factory;
  const hasEngine = engineFactory !== undefined;
  // La simulación y los motores con vidas muestran "Vidas" en el HUD
  const showLives = engine?.hasLives !== false;
  const engineRef = useRef<GameInstance | null>(null);
  // Solo los motores que declaran `skins` muestran el selector
  const skins = engine?.skins;
  // Mando virtual: solo en táctil y si el motor declara su mapeo
  const touchLayout = engine?.touch;
  const touchMode = isTouch && hasEngine && touchLayout !== undefined;
  const [skin, setSkin] = useState<SkinId>(DEFAULT_SKIN);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [engineLevel, setEngineLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  // Synchronous guard: a double click fires twice before state re-renders.
  const savingRef = useRef(false);
  // Bumped on restart so a late insert result can't touch the next game's modal.
  const roundRef = useRef(0);

  const name = nameOverride ?? session?.name ?? "INVITADO";
  const level = hasEngine ? engineLevel : Math.floor(score / 2500) + 1;

  // En táctil horizontal el canvas se ajusta a la altura que deja la nav
  // (sticky y de alto variable): se publica como `--av-nav-h` en el player.
  const playerRef = useRef<HTMLDivElement>(null);
  // Pantalla completa del player (botón solo en táctil)
  const fullscreen = useFullscreen(playerRef);
  useEffect(() => {
    const player = playerRef.current;
    const nav = document.querySelector<HTMLElement>(".av-nav");
    if (!touchMode || !player || !nav) return;
    const observer = new ResizeObserver(() => {
      player.style.setProperty("--av-nav-h", `${nav.offsetHeight}px`);
    });
    observer.observe(nav);
    return () => observer.disconnect();
  }, [touchMode]);

  useEffect(() => {
    if (hasEngine || over || paused) return;
    const timer = setInterval(() => {
      setScore((s) => s + Math.floor(10 + Math.random() * 90));
    }, 220);
    return () => clearInterval(timer);
  }, [hasEngine, over, paused]);

  const engineCallbacks: GameCallbacks = {
    onScore: setScore,
    onLives: setLives,
    onLevel: setEngineLevel,
    // El motor es la fuente de verdad de la pausa (botón, P/Esc o pestaña oculta)
    onPauseChange: setPaused,
    onGameOver: (finalScore) => {
      setScore(finalScore);
      setOver(true);
      engineRef.current?.setInputEnabled(false);
    },
  };

  const togglePause = () => {
    const engine = engineRef.current;
    if (!engine) {
      setPaused((p) => !p);
      return;
    }
    if (paused) engine.resume();
    else engine.pause();
  };

  // Con motor, end() dispara onGameOver, que abre el modal
  const endGame = () => {
    const engine = engineRef.current;
    if (engine) engine.end();
    else setOver(true);
  };

  const restart = () => {
    const engine = engineRef.current;
    if (engine) {
      engine.restart();
      engine.setInputEnabled(true);
    }
    setScore(0);
    setPaused(false);
    setOver(false);
    setSaveStatus("idle");
    savingRef.current = false;
    roundRef.current += 1;
  };

  // Cambiar de skin solo cambia la paleta: ni reinicia ni toca la puntuación
  const changeSkin = (next: SkinId) => {
    setSkin(next);
    engineRef.current?.setSkin?.(next);
    setSkinPreference(game.id, next);
  };

  const saveScore = async () => {
    if (savingRef.current || saveStatus === "saved") return;
    savingRef.current = true;
    const round = roundRef.current;
    setSaveStatus("saving");

    const result = await insertScore({
      gameId: game.id,
      playerName: normalizePlayerName(name),
      score,
    });

    if (round !== roundRef.current) return;
    savingRef.current = false;
    setSaveStatus(result.ok ? "saved" : "error");
  };

  return (
    <div
      ref={playerRef}
      className={`av-player fade-in${touchMode ? " is-touch" : ""}`}
    >
      <div className="player-hud">
        <div className="hud-stats">
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          {showLives && (
            <div className="hud-stat lives">
              <div className="l">Vidas</div>
              <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
            </div>
          )}
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button
            className="btn ghost"
            onClick={() => router.push(`/games/${game.id}`)}
          >
            SALIR
          </button>
          {touchMode && (
            <button className="btn hud-fullscreen" onClick={fullscreen.toggle}>
              {fullscreen.active
                ? "SALIR DE PANTALLA COMPLETA"
                : "PANTALLA COMPLETA"}
            </button>
          )}
        </div>
      </div>

      {hasEngine && skins && skins.length > 0 && (
        <div className="skin-picker" role="radiogroup" aria-label="Skin">
          <span className="skin-picker-label">SKIN</span>
          {skins.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={skin === id}
              className={`skin-option skin-${id}${skin === id ? " active" : ""}`}
              onClick={(event) => {
                changeSkin(id);
                // Sin foco, Espacio sigue disparando en el juego
                event.currentTarget.blur();
              }}
            >
              <span className="skin-swatch" aria-hidden="true" />
              {SKIN_LABELS[id]}
            </button>
          ))}
        </div>
      )}

      {/* En táctil horizontal: cruceta | canvas | A/B */}
      <div className="play-area">
        <div className="crt">
          <div className="crt-screen">
            {engineFactory ? (
              <GameCanvas
                factory={engineFactory}
                callbacks={engineCallbacks}
                touch={touchMode}
                onInstance={(instance) => {
                  engineRef.current = instance;
                  // Al montar el motor se restaura la skin guardada (cliente)
                  if (instance && skins) {
                    const saved = getSkinPreference(game.id, skins);
                    instance.setSkin?.(saved);
                    setSkin(saved);
                  }
                }}
              />
            ) : (
              <div className="game-arena">
                <div className="grid-floor" />
                <div className="enemy e1" />
                <div className="enemy e2" />
                <div className="enemy e3" />
                <div className="player-ship" />
              </div>
            )}
            {paused && (
              <div
                className="crt-content"
                style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
              >
                <div>
                  <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                    EN PAUSA
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--ink-dim)",
                      marginTop: 10,
                      letterSpacing: "0.16em",
                    }}
                  >
                    PULSA REANUDAR PARA CONTINUAR
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="crt-bottom">
            <span className="led">SEÑAL OK</span>
            <span>{game.title} · CRT-83 · 60 HZ</span>
            <span>CARGA · 1MB</span>
          </div>
        </div>

        {touchMode && touchLayout && (
          <TouchControls layout={touchLayout} disabled={over} />
        )}
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            <div className="input-row">
              <input
                value={name}
                disabled={saveStatus === "saving" || saveStatus === "saved"}
                onChange={(event) =>
                  setNameOverride(event.target.value.toUpperCase().slice(0, 10))
                }
                placeholder="TUS INICIALES"
              />
              <button
                className="btn yellow"
                disabled={saveStatus === "saving" || saveStatus === "saved"}
                onClick={saveScore}
              >
                {saveStatus === "saving"
                  ? "GUARDANDO…"
                  : saveStatus === "saved"
                    ? "GUARDADO"
                    : saveStatus === "error"
                      ? "REINTENTAR"
                      : "GUARDAR PUNTUACIÓN"}
              </button>
            </div>
            {saveStatus === "saved" && (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            {saveStatus === "error" && (
              <div className="save-error" role="alert">
                ▸ NO SE PUDO GUARDAR. REVISA TU CONEXIÓN Y PULSA REINTENTAR.
              </div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => router.push("/games")}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
