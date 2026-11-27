import { CareersBoard } from "@/components/careers-board";
import "@/styles/landing.css";

type Props = { searchParams: Promise<{ role?: string }> };

export default async function CareersPage({ searchParams }: Props) {
  const { role } = await searchParams;
  return <CareersBoard initialRole={role ?? ""}/>;
}
