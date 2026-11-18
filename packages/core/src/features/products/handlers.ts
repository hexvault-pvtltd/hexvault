import { AuthError, requireRole } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextResponse } from "next/server";
import { z } from "zod";
import { productSchema, serializeProduct } from "./catalog";

function errorResponse(error: unknown) {
  if (error instanceof AuthError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  return fail(error);
}

export async function listProducts() {
  try {
    await requireRole("OWNER");
    const items = await db.websiteProduct.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    return ok({ items: items.map(serializeProduct) });
  } catch (error) { return errorResponse(error); }
}

export async function createProduct(request: Request) {
  try {
    const actor = await requireRole("OWNER");
    const input = productSchema.parse(await request.json());
    const item = await db.$transaction(async tx => {
      const product = await tx.websiteProduct.create({ data: { ...input, createdBy: actor.id, updatedBy: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "website_product.created", resourceType: "website_product", resourceId: product.id, metadata: { name: product.name, published: product.published } } });
      return product;
    });
    return ok({ item: serializeProduct(item) }, 201);
  } catch (error) { return errorResponse(error); }
}

type Context = { params: Promise<{ id: string }> };
export async function updateProduct(request: Request, { params }: Context) {
  try {
    const actor = await requireRole("OWNER");
    const id = z.string().uuid().parse((await params).id);
    const input = productSchema.parse(await request.json());
    const item = await db.$transaction(async tx => {
      const product = await tx.websiteProduct.update({ where: { id }, data: { ...input, updatedBy: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "website_product.updated", resourceType: "website_product", resourceId: id, metadata: { name: product.name, published: product.published, price: product.price?.toString() ?? null, currency: product.currency } } });
      return product;
    });
    return ok({ item: serializeProduct(item) });
  } catch (error) { return errorResponse(error); }
}

export async function deleteProduct(_request: Request, { params }: Context) {
  try {
    const actor = await requireRole("OWNER");
    const id = z.string().uuid().parse((await params).id);
    await db.$transaction(async tx => {
      await tx.websiteProduct.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "website_product.deleted", resourceType: "website_product", resourceId: id } });
    });
    return ok({ deleted: true });
  } catch (error) { return errorResponse(error); }
}

export async function listPublishedProducts() {
  try {
    const items = await db.websiteProduct.findMany({ where: { published: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    return ok({ items: items.map(serializeProduct) });
  } catch (error) { return fail(error); }
}
