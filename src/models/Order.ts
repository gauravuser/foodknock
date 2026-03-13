// src/models/Order.ts

import { Schema, model, models } from "mongoose";

const OrderItemSchema = new Schema(
    {
        productId: {
            type:     Schema.Types.ObjectId,
            ref:      "Product",
            required: false,
            default:  null,
        },
        name:     { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 1 },
        price:    { type: Number, required: true, min: 0 },
        image:    { type: String, default: "" },
    },
    { _id: false }
);

const OrderSchema = new Schema(
    {
        orderId: { type: String, required: true, unique: true, index: true },

        user: {
            type:     Schema.Types.ObjectId,
            ref:      "User",
            required: false,
            default:  null,
        },

        customerName: { type: String, required: true, trim: true },
        phone:        { type: String, required: true, trim: true },
        address:      { type: String, required: true, trim: true },
        landmark:     { type: String, default: "", trim: true },

        orderType: {
            type:    String,
            enum:    ["delivery", "pickup"],
            default: "delivery",
        },

        items: { type: [OrderItemSchema], required: true },

        totalAmount: { type: Number, required: true, min: 0 },
        deliveryFee: { type: Number, default: 0, min: 0 },
        platformFee: { type: Number, default: 0, min: 0 },

        note: { type: String, default: "", trim: true },

        status: {
            type:    String,
            enum:    ["received", "preparing", "out_for_delivery", "delivered"],
            default: "received",
        },

        paymentMethod: {
            type:    String,
            enum:    ["cod", "razorpay"],
            default: "cod",
        },
        razorpayOrderId:   { type: String, default: null },
        razorpayPaymentId: { type: String, default: null },

        whatsappSent: { type: Boolean, default: false },

        // ── First-order free delivery flag ────────────────────────────────────
        //
        // Written by the backend AFTER Order.create() succeeds.
        // Stored on the order for:
        //   • Audit trail — finance/admin can see which orders used the promo
        //   • Decoupled from User doc — reports don't need a join
        //   • Persistence — stays true even if User.firstDeliveryFreeUsed is
        //     later toggled for any reason
        //
        // false by default so all existing orders are unaffected.
        isFirstDeliveryFreeApplied: {
            type:    Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const Order = models.Order || model("Order", OrderSchema);

export default Order;