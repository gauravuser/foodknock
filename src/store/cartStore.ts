// src/store/cartStore.ts
// Zustand cart store — FoodKnock.
// Persistent via localStorage. Stock-safe.
//
// NOTE: No "use client" directive here — Zustand stores are plain JS modules,
// not React components. Adding "use client" here causes the webpack error:
// "__webpack_modules__[moduleId] is not a function"

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
    _id:      string;
    name:     string;
    price:    number;
    image:    string;
    quantity: number;
    stock:    number;
    category: string;
};

type CartStore = {
    items:        CartItem[];
    addItem:      (item: CartItem) => void;
    removeItem:   (id: string) => void;
    increaseQty:  (id: string) => void;
    decreaseQty:  (id: string) => void;
    clearCart:    () => void;
    getTotalItems: () => number;
    getTotalPrice: () => number;
};

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (item) => {
                const items    = get().items;
                const existing = items.find((i) => i._id === item._id);

                if (existing) {
                    set({
                        items: items.map((i) =>
                            i._id === item._id
                                ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) }
                                : i
                        ),
                    });
                } else {
                    set({
                        items: [
                            ...items,
                            { ...item, quantity: Math.min(1, item.stock) },
                        ],
                    });
                }
            },

            removeItem: (id) =>
                set({ items: get().items.filter((i) => i._id !== id) }),

            increaseQty: (id) =>
                set({
                    items: get().items.map((i) =>
                        i._id === id
                            ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) }
                            : i
                    ),
                }),

            decreaseQty: (id) => {
                const updated = get()
                    .items.map((i) =>
                        i._id === id ? { ...i, quantity: i.quantity - 1 } : i
                    )
                    .filter((i) => i.quantity > 0);
                set({ items: updated });
            },

            clearCart: () => set({ items: [] }),

            getTotalItems: () =>
                get().items.reduce((sum, i) => sum + i.quantity, 0),

            getTotalPrice: () =>
                get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        }),
        {
            name:    "foodknock-cart-v1",
            version: 2,
            storage: createJSONStorage(() => localStorage),
            migrate: (persisted: unknown, version: number) => {
                if (!persisted || version < 2) return { items: [] };
                return persisted as { items: CartItem[] };
            },
        }
    )
);