"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/session-provider";

function isHomeActive(pathname: string) {
  return pathname === "/";
}

function isLibraryActive(pathname: string) {
  return pathname === "/games" || pathname.startsWith("/games/");
}

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();
  const { session, signOut } = useSession();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isHomeActive(pathname) ? "active" : ""}>
            Inicio
          </Link>
          <Link href="/games" className={isLibraryActive(pathname) ? "active" : ""}>
            Biblioteca
          </Link>
          <Link
            href="/leaderboard"
            className={isRouteActive(pathname, "/leaderboard") ? "active" : ""}
          >
            Salón de la Fama
          </Link>
          <Link href="/about" className={isRouteActive(pathname, "/about") ? "active" : ""}>
            Acerca de
          </Link>
        </div>
        <div className="spacer" />
        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>
        {session ? (
          <button className="btn ghost auth-btn" onClick={signOut}>
            {session.name} ▾
          </button>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          type="button"
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={`av-mobile-backdrop${open ? " open" : ""}`}
        onClick={close}
      />
      <aside className={`av-mobile-panel${open ? " open" : ""}`}>
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENÚ
        </div>
        <Link
          href="/"
          className={isHomeActive(pathname) ? "active" : ""}
          onClick={close}
        >
          Inicio
        </Link>
        <Link
          href="/games"
          className={isLibraryActive(pathname) ? "active" : ""}
          onClick={close}
        >
          Biblioteca
        </Link>
        <Link
          href="/leaderboard"
          className={isRouteActive(pathname, "/leaderboard") ? "active" : ""}
          onClick={close}
        >
          Salón de la Fama
        </Link>
        <Link
          href="/about"
          className={isRouteActive(pathname, "/about") ? "active" : ""}
          onClick={close}
        >
          Acerca de
        </Link>
        <Link
          href="/auth"
          className={isRouteActive(pathname, "/auth") ? "active" : ""}
          onClick={close}
        >
          {session ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }} />
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
