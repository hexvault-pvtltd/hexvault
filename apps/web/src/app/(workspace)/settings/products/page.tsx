import { notFound } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { ProductManager } from "@/components/product-manager";

export default async function ProductsSettingsPage() {
  const user = await currentUser();
  if (!user?.roles.includes("OWNER")) notFound();
  return <ProductManager />;
}
