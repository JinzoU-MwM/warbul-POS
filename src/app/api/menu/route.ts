export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getMenu, createProduct } from "@/lib/store";
import { getServerSession } from "@/lib/session";
import { CATS } from "@/lib/constants";
import type { Product } from "@/lib/types";

const GLYPHS: Product["g"][] = ["cup", "bowl", "fries"];

export async function GET() {
  try {
    const menu = await getMenu();
    return NextResponse.json({ menu });
  } catch (err) {
    return NextResponse.json(
      { error: String((err as { message?: unknown })?.message ?? err) },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Partial<Product>;

    if (typeof body.name !== "string" || body.name.trim() === "") {
      throw new Error("name is required");
    }
    if (typeof body.price !== "number" || !Number.isFinite(body.price) || body.price < 0) {
      throw new Error("price must be a number >= 0");
    }
    if (typeof body.cat !== "string" || !CATS.includes(body.cat as Product["cat"])) {
      throw new Error("cat must be one of " + CATS.join(", "));
    }
    if (typeof body.g !== "string" || !GLYPHS.includes(body.g as Product["g"])) {
      throw new Error("g must be one of cup, bowl, fries");
    }
    if (
      !Array.isArray(body.grad) ||
      body.grad.length !== 2 ||
      typeof body.grad[0] !== "string" ||
      typeof body.grad[1] !== "string"
    ) {
      throw new Error("grad must be an array of 2 strings");
    }
    if (typeof body.stock !== "number" || !Number.isFinite(body.stock) || body.stock < 0) {
      throw new Error("stock must be a number >= 0");
    }

    const product = await createProduct({
      id: body.id,
      name: body.name,
      price: body.price,
      cat: body.cat as Product["cat"],
      g: body.g as Product["g"],
      grad: body.grad as [string, string],
      tag: body.tag ?? null,
      available: body.available ?? true,
      stock: body.stock,
      desc: body.desc ?? "",
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: String((err as { message?: unknown })?.message ?? err) },
      { status: 400 }
    );
  }
}
