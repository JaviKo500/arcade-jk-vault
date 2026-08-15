import type { Metadata } from "next";
import { Press_Start_2P, JetBrains_Mono, Courier_Prime } from "next/font/google";
import { SessionProvider } from "@/components/session-provider";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start-2p",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-courier-prime",
});

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
  description: "Arcade Vault — juega online y compite por el puntaje más alto.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${pressStart2P.variable} ${jetbrainsMono.variable} ${courierPrime.variable} h-full`}
    >
      <body className="h-full m-0">
        <div className="av-bg" />
        <div className="av-noise" />
        <div id="root">
          <SessionProvider>{children}</SessionProvider>
        </div>
      </body>
    </html>
  );
}
