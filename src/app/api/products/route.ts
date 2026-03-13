// src/app/api/products/route.ts

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const slug     = searchParams.get("slug");
    const search   = searchParams.get("search");
    const featured = searchParams.get("featured");

    const query: Record<string, unknown> = {};

    if (slug) query.slug = slug;
    if (category && category !== "all") {
      query.category = { $regex: new RegExp(`^${category}$`, "i") };
    }
    if (featured === "true") query.isFeatured = true;

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { name: regex },
        { description: regex },
        { category: regex },
        { tags: regex },
      ];
    }

    const products = await Product.find(query)
      .sort({ isFeatured: -1, createdAt: -1 })
      .maxTimeMS(8000)
      .lean();

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("GET_PRODUCTS_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      name,
      description,
      shortDescription,
      price,
      compareAtPrice,
      stock,
      category,
      image,
      tags,
      ingredients,
      isFeatured,
      isAvailable,
    } = body;

    if (!name || !description || price === undefined || !category || !image) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const parsedPrice = Number(price);
    const parsedStock = Number(stock ?? 0);

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { success: false, message: "Invalid price" },
        { status: 400 }
      );
    }

    if (isNaN(parsedStock) || parsedStock < 0) {
      return NextResponse.json(
        { success: false, message: "Invalid stock" },
        { status: 400 }
      );
    }

    // ── compareAtPrice — optional, must be > price if provided ────────
    let parsedCompareAtPrice: number | null = null;
    if (compareAtPrice !== undefined && compareAtPrice !== null && compareAtPrice !== "") {
      parsedCompareAtPrice = Number(compareAtPrice);
      if (isNaN(parsedCompareAtPrice) || parsedCompareAtPrice < 0) {
        return NextResponse.json(
          { success: false, message: "Invalid original price" },
          { status: 400 }
        );
      }
      if (parsedCompareAtPrice <= parsedPrice) {
        return NextResponse.json(
          { success: false, message: "Original price must be greater than the selling price" },
          { status: 400 }
        );
      }
    }

    // ── Slug generation ───────────────────────────────────────────────
    const baseSlug = generateSlug(String(name));
    let slug = baseSlug;
    let suffix = 1;
    while (await Product.findOne({ slug }).lean()) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    const tagArray =
      typeof tags === "string"
        ? tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : Array.isArray(tags) ? tags : [];

    const ingredientArray =
      typeof ingredients === "string"
        ? ingredients.split(",").map((i: string) => i.trim()).filter(Boolean)
        : Array.isArray(ingredients) ? ingredients : [];

    const product = await Product.create({
      name:             String(name).trim(),
      slug,
      description:      String(description).trim(),
      shortDescription: String(shortDescription ?? "").trim(),
      price:            parsedPrice,
      compareAtPrice:   parsedCompareAtPrice,
      stock:            parsedStock,
      category:         String(category).trim(),
      image,
      tags:             tagArray,
      ingredients:      ingredientArray,
      isFeatured:       Boolean(isFeatured),
      isAvailable:      isAvailable === undefined ? parsedStock > 0 : Boolean(isAvailable),
    });

    revalidatePath("/menu");
    revalidatePath("/");
    revalidatePath(`/menu/${product.slug}`);

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error: any) {
    console.error("CREATE_PRODUCT_ERROR", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "A product with that slug already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message ?? "Failed to create product" },
      { status: 500 }
    );
  }
}