import type { NextConfig } from "next";

/**
 * Orígenes LAN permitidos en `next dev` (p. ej. para probar en el móvil).
 * `DEV_ALLOWED_ORIGINS` es una lista separada por comas; sin ella, `[]`.
 */
const allowedDevOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
