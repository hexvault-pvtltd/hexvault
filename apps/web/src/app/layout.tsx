import type { Metadata } from "next";
import { AppLoading } from "@/components/app-loading";
import { companyCopy } from "@/components/landing/shared/companyCopy";
import "./globals.css";
import "@/styles/loading-screen.css";
export const metadata: Metadata = { title: `${companyCopy.name} | Secure • Build • Innovate`, description: companyCopy.introduction };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><AppLoading>{children}</AppLoading></body></html>; }
