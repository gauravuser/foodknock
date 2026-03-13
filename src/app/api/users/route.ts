import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Order from "@/models/Order";

function normalizePhone(phone: string) {
  return String(phone || "").replace(/\D/g, "").slice(-10);
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();

    const query: Record<string, any> = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password")
      .lean();

    if (users.length === 0) {
      return NextResponse.json({ success: true, users: [] });
    }

    // Fetch all order phones and count them after normalizing
    const orders = await Order.find(
      { phone: { $exists: true, $ne: null } },
      "phone"
    ).lean();

    const countMap: Record<string, number> = {};

    orders.forEach((order: any) => {
      const normalized = normalizePhone(order.phone);
      if (!normalized) return;
      countMap[normalized] = (countMap[normalized] || 0) + 1;
    });

    const shaped = users.map((u: any) => {
      const normalizedUserPhone = normalizePhone(u.phone);

      return {
        _id: String(u._id),
        name: u.name ?? "",
        email: u.email ?? "",
        phone: u.phone ?? "",
        role: u.role ?? "user",
        isActive: u.isActive ?? true,
        ordersCount: countMap[normalizedUserPhone] ?? 0,
        createdAt: u.createdAt
          ? new Date(u.createdAt).toISOString()
          : new Date().toISOString(),
      };
    });

    return NextResponse.json({ success: true, users: shaped });
  } catch (error) {
    console.error("GET_USERS_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}