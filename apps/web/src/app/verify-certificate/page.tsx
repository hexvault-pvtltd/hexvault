import type { Metadata } from "next";
import { CertificateVerification } from "@/components/certificate-verification";

export const metadata: Metadata = { title: "Verify certificate | HEXVAULT", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function VerifyCertificatePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const query = await searchParams;
  return <CertificateVerification initialCertificateId={typeof query.id === "string" ? query.id.slice(0, 35) : ""} />;
}
