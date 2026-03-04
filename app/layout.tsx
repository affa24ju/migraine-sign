import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MigraineSign",
  description: "Gestigenkänning för kommunikation vid migrän",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/*
          Problemet: @teachablemachine/pose buntar ihop TensorFlow.js internt (v1.7.4).
          När Next.js webpack återbuntrar allt bryts TF.js interna modulreferenser,
          vilket ger felet "t is not a function" vid inferens.

          Lösningen: Ladda dessa bibliotek direkt från CDN som globala skript,
          precis som Googles egna Teachable Machine-exempel rekommenderar.
          På så sätt hanteras de ALDRIG av webpack — de läggs till i <head>
          och laddas som vanliga <script>-taggar.

          strategy="beforeInteractive" = skripten laddas och körs INNAN React
          hydratiserar sidan. Det garanterar att window.tmPose alltid finns
          tillgängligt när PoseDetector-komponenten monteras.
        */}
        {/*
          OBS: Använd 1.3.1 — INTE 1.7.4.
          @teachablemachine/pose-buntens interna kod anropar tf.fromPixels() (gamla API).
          I TF.js 1.7.4 togs den funktionen bort och ersattes med tf.browser.fromPixels().
          I TF.js 1.3.1 finns fortfarande tf.fromPixels() kvar, vilket buntens kompilerade
          kod förväntar sig. Googles egna Teachable Machine-exempel använder alltid 1.3.1.
        */}
        <Script
          src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8.6/dist/teachablemachine-pose.min.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
