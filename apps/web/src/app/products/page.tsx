import type { Metadata } from "next";
import ProductsPage from "./ProductsPage";
import "@/styles/landing.css";
import "./products.css";

export const metadata: Metadata = {
  title: "Products | HEXVAULT",
  description: "Tools and platforms engineered by HexVault to simplify, automate, and accelerate modern software teams.",
};

export default function Page() {
  return <ProductsPage />;
}
