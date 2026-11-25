import type { Metadata } from "next";
import { AppLoading } from "@/components/app-loading";
import "./globals.css";
import "@/styles/loading-screen.css";
export const metadata: Metadata = { title: "HEXVAULT | Multiplayer mode for AI development", description: "Collaborate, build, and scale AI-powered solutions together in real time." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><AppLoading>{children}</AppLoading></body></html>; }
