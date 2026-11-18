# Owner-managed website products

Owners manage the public catalog at **Administration → Website products** (`/settings/products`). No sample products are seeded. Other roles cannot view the editor or modify the catalog through the API.

Each product supports a name, headline, short description, full details, image and logo, image description, optional price/currency/billing suffix, up to three highlights, button text and destination, display order, and draft/published visibility. A blank price hides pricing; zero displays a zero price. Without a button destination, the button opens the product details dialog.

The public `/products` page requests only published products from `/api/v1/public/products`, without caching. Saved changes appear on the next page load. Unpublishing removes a product from the public response. Mutations create audit log records.

## Deployment

Run `npm run db:migrate` with `DATABASE_URL` and `DIRECT_URL` configured to apply the `20261118110000_website_products` migration before using the editor. Regenerate the Prisma client with `npm run db:generate` when developing; the normal build already generates it.

Uploads reuse the existing CDN upload and scan flow and require configured object storage and malware scanning. The editor accepts JPEG, PNG, and WebP images up to 10 MB, stores them in the **Website product images** CDN folder, and marks them public only after scanning completes. Owners can also supply an HTTPS image URL or an existing public CDN content path. Product deletion does not delete reusable CDN images; manage those separately under CDN files.

Run validation tests with `npx tsx --test scripts/products.test.ts`.
