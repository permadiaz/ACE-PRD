import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACE PRD — dari ide mentah ke mega-prompt",
  description:
    "Brain dump ide, jawab 4 pertanyaan, dapat PRD ringkas + task breakdown + mega-prompt siap tempel ke AI coding agent.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
