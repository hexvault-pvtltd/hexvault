import assert from "node:assert/strict";
import test from "node:test";
import { formatProductPrice, isProductUrl, productSchema } from "../packages/core/src/features/products/catalog";

const product = {
  name: "Owner product", title: "A useful product", description: "Set by the owner", detail: "",
  imageUrl: null, imageAlt: null, logoUrl: null, price: "1499.50", currency: "INR", priceSuffix: "/ month",
  features: [], ctaLabel: "Learn more", ctaUrl: null, published: false, sortOrder: 0,
};

test("prices retain decimal precision and allow free or hidden pricing", () => {
  assert.equal(productSchema.parse(product).price, "1499.50");
  assert.equal(productSchema.parse({ ...product, price: "0" }).price, "0");
  assert.equal(productSchema.parse({ ...product, price: "" }).price, null);
  for (const price of ["-1", "1.999", "1e3", "NaN", "10000000000"]) assert.equal(productSchema.safeParse({ ...product, price }).success, false, price);
});

test("public links and images reject executable URLs and network paths", () => {
  for (const value of ["javascript:alert(1)", "data:image/svg+xml,test", "//example.com", "/\\example.com", "https://user:password@example.com", "http://example.com", "/\nexample.com"]) assert.equal(isProductUrl(value), false, value);
  for (const value of ["/contact", "/api/v1/cdn/assets/abc/content", "https://example.com/product"]) assert.equal(isProductUrl(value), true);
  assert.equal(productSchema.safeParse({ ...product, ctaUrl: "javascript:alert(1)" }).success, false);
});

test("only complete highlights and supported currencies can be saved", () => {
  assert.equal(productSchema.safeParse({ ...product, features: [{ value: "40%", label: "" }] }).success, false);
  assert.equal(productSchema.safeParse({ ...product, currency: "XYZ" }).success, false);
  assert.equal(productSchema.parse({ ...product, currency: "usd" }).currency, "USD");
  assert.equal(productSchema.safeParse({ ...product, updatedBy: "another-user" }).success, false);
});

test("price display includes the owner's currency and suffix, and hides unset prices", () => {
  assert.equal(formatProductPrice({ price: "1499.50", currency: "INR", priceSuffix: "/ month" }), "₹1,499.50 / month");
  assert.equal(formatProductPrice({ price: "0", currency: "USD", priceSuffix: null }), "$0.00");
  assert.equal(formatProductPrice({ price: null, currency: "INR", priceSuffix: "/ month" }), null);
});
