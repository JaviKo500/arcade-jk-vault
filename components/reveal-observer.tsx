"use client";

import { useReveal } from "@/hooks/use-reveal";

// Lets a Server Component page opt into the .reveal scroll animations.
export function RevealObserver() {
  useReveal();
  return null;
}
