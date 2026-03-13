// src/app/(main)/menu/page.tsx
// FoodKnock — Menu page (Server Component)

import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import MenuClient from "@/components/products/MenuClient";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";

export const revalidate = 60;

export const metadata = {
    title:       "Our Menu — Burgers, Pizza, Momos, Shakes & More",
    description: "Browse FoodKnock's full menu. Fresh burgers, pizzas, momos, cold shakes, juices, ice cream & more. Order online for fast delivery in Danta, Sikar.",
    alternates:  { canonical: "https://www.foodknock.com/menu" },
    openGraph: {
        title:       "FoodKnock Menu — Order Fresh Food Online",
        description: "Burgers, pizza, momos, shakes & ice cream — delivered fresh & fast.",
        url:         "https://www.foodknock.com/menu",
    },
};

async function getProducts() {
    try {
        await connectDB();
        const products = await Product.find({ })
            .sort({ isFeatured: -1, createdAt: -1 })
            .lean();
        return JSON.parse(JSON.stringify(products));
    } catch (error) {
        console.error("PRODUCT_FETCH_ERROR:", error);
        return [];
    }
}

export default async function MenuPage() {
    const products = await getProducts();

    return (
        <>
            <Navbar />
            <MenuClient products={products} />
            <Footer />
        </>
    );
}