import type { Metadata } from "next";
import ProductsPage from "./ProductsPage";
import "@/styles/landing.css";
import "./products.css";

export const metadata: Metadata = {
  title: "Products | HEXVAULT",
  description: "Explore HEXVAULT Restaurant ERP, Workforce OS, and proposed software products. Confirm current availability and development status.",
};

export default function Page() {
  return <ProductsPage />;
}
