"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// Retro error state shown when a Supabase read fails.
// "page" fills a whole screen; "block" fits inside a panel (e.g. a top list).
export function SignalLost({
  variant = "page",
}: {
  variant?: "page" | "block";
}) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();

  return (
    <div className={`signal-lost ${variant}`} role="alert">
      <div className="sl-screen" aria-hidden="true">
        <div className="sl-bars" />
        <div className="sl-static" />
      </div>
      <div className="sl-title pixel" data-text="SEÑAL PERDIDA">
        SEÑAL PERDIDA
      </div>
      <p className="sl-copy">
        No se pudieron cargar los datos del vault. Vuelve a intentarlo en unos
        segundos.
      </p>
      <button
        className="btn magenta"
        disabled={retrying}
        onClick={() => startRetry(() => router.refresh())}
      >
        {retrying ? "SINTONIZANDO…" : "REINTENTAR"}
      </button>
    </div>
  );
}
