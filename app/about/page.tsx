import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="fade-in" style={{ textAlign: "center", padding: "96px 32px" }}>
      <h1 className="pixel neon-cyan" style={{ fontSize: 28, margin: 0 }}>
        PRÓXIMAMENTE
      </h1>
      <p style={{ color: "var(--ink-dim)", marginTop: 18, maxWidth: 480, marginInline: "auto" }}>
        Estamos preparando la historia de Arcade Vault. Vuelve pronto para conocerla.
      </p>
      <Link href="/" className="btn lg" style={{ marginTop: 32, display: "inline-flex" }}>
        VOLVER AL INICIO
      </Link>
    </div>
  );
}
