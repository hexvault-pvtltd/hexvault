import HexvaultLanding from "@/components/landing/hexvault-landing";
import { cookies } from "next/headers";

export default async function Home() {
  const skipIntro = (await cookies()).get("hv_landing_intro")?.value === "seen";
  return <HexvaultLanding skipIntro={skipIntro} />;
}
