import { z } from "zod";

// Local paths and HTTPS URLs only; these values are used directly in public links.
export function isProductUrl(value: string) {
  if (/[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}
const optionalText = (max: number) => z.string().trim().max(max).nullable().transform(value => value || null);
const optionalUrl = z.string().trim().max(2048).nullable().transform(value => value || null).refine(value => value === null || isProductUrl(value), "Use an HTTPS URL or a local path starting with /.");
export const productSchema = z.object({
  name: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().min(1).max(500),
  detail: z.string().trim().max(5000),
  imageUrl: optionalUrl,
  imageAlt: optionalText(180),
  logoUrl: optionalUrl,
  price: z.string().trim().nullable().transform(value => value || null).refine(value => value === null || /^\d{1,10}(\.\d{1,2})?$/.test(value), "Enter a nonnegative price with up to two decimal places."),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).refine(value => Intl.supportedValuesOf("currency").includes(value), "Choose a valid currency code."),
  priceSuffix: optionalText(40),
  features: z.array(z.object({ value: z.string().trim().min(1).max(24), label: z.string().trim().min(1).max(40) }).strict()).max(3),
  ctaLabel: z.string().trim().min(1).max(40),
  ctaUrl: optionalUrl,
  published: z.boolean(),
  sortOrder: z.number().int().min(0).max(10000),
}).strict();

export type ProductInput = z.input<typeof productSchema>;
export type CatalogProduct = z.output<typeof productSchema> & { id: string };

export function serializeProduct(product: { id: string; name: string; title: string; description: string; detail: string; imageUrl: string | null; imageAlt: string | null; logoUrl: string | null; price: { toString(): string } | null; currency: string; priceSuffix: string | null; features: unknown; ctaLabel: string; ctaUrl: string | null; published: boolean; sortOrder: number }): CatalogProduct {
  return {
    id: product.id, name: product.name, title: product.title, description: product.description, detail: product.detail,
    imageUrl: product.imageUrl, imageAlt: product.imageAlt, logoUrl: product.logoUrl,
    price: product.price?.toString() ?? null, currency: product.currency, priceSuffix: product.priceSuffix,
    features: z.array(z.object({ value: z.string(), label: z.string() })).max(3).parse(product.features),
    ctaLabel: product.ctaLabel, ctaUrl: product.ctaUrl, published: product.published, sortOrder: product.sortOrder,
  };
}

export function formatProductPrice(product: Pick<CatalogProduct, "price" | "currency" | "priceSuffix">) {
  if (product.price === null) return null;
  const amount = new Intl.NumberFormat("en-IN", { style: "currency", currency: product.currency, maximumFractionDigits: 2 }).format(Number(product.price));
  return `${amount}${product.priceSuffix ? ` ${product.priceSuffix}` : ""}`;
}
