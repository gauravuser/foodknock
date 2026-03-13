// src/app/api/payment/verify/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import User from "@/models/User";
import { generateOrderId } from "@/lib/utils";
import { verifyToken } from "@/lib/auth";
import { calculateDeliveryFee, PLATFORM_FEE } from "@/lib/delivery";
import {
    checkFirstFreeDelivery,
    consumeFirstFreeDelivery,
} from "@/lib/firstFreeDelivery";

async function notifyAdminTelegram(params: {
    orderId:                    string;
    customerName:               string;
    phone:                      string;
    items:                      Array<{ name: string; quantity: number; price: number }>;
    totalAmount:                number;
    orderType:                  string;
    paymentMethod:              string;
    isFirstDeliveryFreeApplied: boolean;
}): Promise<void> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.warn("TELEGRAM_NOTIFY: env vars not set — skipping");
        return;
    }

    const itemLines = params.items
        .map((i) => `  • ${i.name} ×${i.quantity} — ₹${i.price * i.quantity}`)
        .join("\n");

    const lines = [
        `🔥 <b>New Order — FoodKnock</b>`,
        ``,
        `🧾 <b>Order ID:</b> <code>${params.orderId}</code>`,
        `👤 <b>Customer:</b> ${params.customerName}`,
        `📞 <b>Phone:</b> ${params.phone}`,
        `🛵 <b>Type:</b> ${params.orderType === "pickup" ? "Self Pickup 🏪" : "Home Delivery 🛵"}`,
        `💳 <b>Payment:</b> ${params.paymentMethod.toUpperCase()}`,
        ...(params.isFirstDeliveryFreeApplied ? [`🎁 <b>First-order free delivery applied!</b>`] : []),
        ``,
        `🛒 <b>Items:</b>`,
        itemLines,
        ``,
        `💰 <b>Total: ₹${params.totalAmount}</b>`,
    ];

    try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id:    chatId,
                text:       lines.join("\n"),
                parse_mode: "HTML",
            }),
            cache: "no-store",
        });
        if (!res.ok) console.error("TELEGRAM_ERROR", await res.text());
    } catch (err) {
        console.error("TELEGRAM_FETCH_ERROR", err);
    }
}

export async function POST(req: Request) {
    try {
        await connectDB();

        const body = await req.json();

        const {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            paymentMethod,
            customerName,
            phone,
            address,
            landmark  = "",
            note      = "",
            orderType,
            items: rawItems,
        } = body;

        const items: Array<{
            _id:      string;
            name:     string;
            price:    number;
            quantity: number;
            image?:   string;
        }> = rawItems ?? [];

        if (!items.length) {
            return NextResponse.json(
                { success: false, message: "Cart is empty" },
                { status: 400 }
            );
        }

        // ── Razorpay signature verification ───────────────────────────────
        if (paymentMethod === "razorpay") {
            if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
                return NextResponse.json(
                    { success: false, message: "Missing payment verification fields" },
                    { status: 400 }
                );
            }
            const secret = process.env.RAZORPAY_KEY_SECRET;
            if (!secret) {
                return NextResponse.json(
                    { success: false, message: "Razorpay secret not configured" },
                    { status: 500 }
                );
            }
            const expectedSig = crypto
                .createHmac("sha256", secret)
                .update(`${razorpayOrderId}|${razorpayPaymentId}`)
                .digest("hex");

            if (expectedSig !== razorpaySignature) {
                return NextResponse.json(
                    { success: false, message: "Payment verification failed — invalid signature" },
                    { status: 400 }
                );
            }
        }

        // ── Auth resolution ───────────────────────────────────────────────
        const cookieHeader = req.headers.get("cookie") ?? "";
        const tokenMatch   = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
        const token        = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
        let linkedUserId: string | null = null;

        if (token) {
            try {
                const decoded = verifyToken(token) as { userId?: string };
                if (decoded?.userId) {
                    const user = await User.findById(decoded.userId)
                        .select("_id isActive")
                        .lean();

                    if (!user) {
                        return NextResponse.json(
                            { success: false, message: "User not found" },
                            { status: 404 }
                        );
                    }
                    if ((user as { isActive?: boolean }).isActive === false) {
                        return NextResponse.json(
                            { success: false, message: "Your account has been blocked. You cannot place orders." },
                            { status: 403 }
                        );
                    }
                    linkedUserId = String((user as { _id: unknown })._id);
                }
            } catch {
                // invalid token — guest flow
            }
        }

        // ── Stock validation ──────────────────────────────────────────────
        const realItems  = items.filter((item) => mongoose.Types.ObjectId.isValid(item._id));
        const productIds = realItems.map((item) => new mongoose.Types.ObjectId(item._id));
        const products   = await Product.find({ _id: { $in: productIds } });
        const productMap = new Map(products.map((p) => [String(p._id), p]));

        for (const item of realItems) {
            const product = productMap.get(item._id);
            if (!product) {
                return NextResponse.json(
                    { success: false, message: `Product "${item.name}" not found` },
                    { status: 404 }
                );
            }
            if (product.isAvailable === false) {
                return NextResponse.json(
                    { success: false, message: `"${product.name}" is currently unavailable` },
                    { status: 400 }
                );
            }
            if (product.stock < item.quantity) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `"${product.name}" only has ${product.stock} item${product.stock !== 1 ? "s" : ""} left`,
                    },
                    { status: 400 }
                );
            }
        }

        // ── Decrement stock ───────────────────────────────────────────────
        for (const item of realItems) {
            const product = productMap.get(item._id)!;
            product.stock -= item.quantity;
            if (product.stock <= 0) {
                product.stock       = 0;
                product.isAvailable = false;
            }
            await product.save();
        }

        // ── Phase 1: Check first-free-delivery eligibility (READ-ONLY) ────
        //
        // This does NOT mutate the user.  If Order.create() fails below, the
        // user keeps their benefit and can retry without losing it.
        const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

        const { eligible: firstDeliveryFree } = await checkFirstFreeDelivery(
            linkedUserId,
            orderType
        );

        const deliveryFee = orderType === "pickup"
            ? 0
            : firstDeliveryFree
                ? 0                               // 🎁 first-order perk
                : calculateDeliveryFee(subtotal); // normal fee

        const platformFee = PLATFORM_FEE;
        const totalAmount = subtotal + deliveryFee + platformFee;

        // ── Normalise order items ─────────────────────────────────────────
        const orderItems = items.map((item) => ({
            productId: mongoose.Types.ObjectId.isValid(item._id)
                ? new mongoose.Types.ObjectId(item._id)
                : null,
            name:     item.name,
            quantity: item.quantity,
            price:    item.price,
            image:    item.image ?? "",
        }));

        // ── Create order ──────────────────────────────────────────────────
        const newOrderId = generateOrderId();

        const order = await Order.create({
            orderId:      newOrderId,
            customerName: customerName?.trim(),
            phone:        phone?.trim(),
            address:      orderType === "delivery" ? address?.trim() : "Pickup",
            landmark:     landmark?.trim(),
            note:         note?.trim(),
            orderType,
            items:        orderItems,
            deliveryFee,
            platformFee,
            totalAmount,
            status:        "received",
            paymentMethod: paymentMethod ?? "cod",
            razorpayOrderId:            razorpayOrderId   ?? null,
            razorpayPaymentId:          razorpayPaymentId ?? null,
            isFirstDeliveryFreeApplied: firstDeliveryFree,
            ...(linkedUserId ? { user: linkedUserId } : {}),
        });

        // ── Phase 2: Consume the benefit AFTER successful order creation ──
        //
        // If this write fails (network blip, etc.) the user simply keeps the
        // flag at false.  On their next delivery order checkFirstFreeDelivery()
        // will check deliveredOrderCount — by then it will be > 0 once this
        // order is delivered, so they won't double-dip.
        // This is intentionally fire-and-forget after the order is saved.
        if (firstDeliveryFree) {
            consumeFirstFreeDelivery(linkedUserId).catch((err) =>
                console.error("[firstFreeDelivery] consumeFirstFreeDelivery failed (non-fatal):", err)
            );
        }

        // ── Telegram notification (fire-and-forget) ───────────────────────
        notifyAdminTelegram({
            orderId:                    newOrderId,
            customerName:               customerName?.trim(),
            phone:                      phone?.trim(),
            items,
            totalAmount,
            orderType,
            paymentMethod:              paymentMethod ?? "cod",
            isFirstDeliveryFreeApplied: firstDeliveryFree,
        }).catch((err) => console.error("TELEGRAM_NOTIFY_UNHANDLED", err));

        return NextResponse.json(
            {
                success:                    true,
                message:                    "Order placed successfully",
                orderId:                    newOrderId,
                order,
                isFirstDeliveryFreeApplied: firstDeliveryFree,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("VERIFY_AND_CREATE_ORDER_ERROR", error);
        return NextResponse.json(
            { success: false, message: "Failed to place order" },
            { status: 500 }
        );
    }
}