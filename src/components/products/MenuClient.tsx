"use client";

// src/components/products/MenuClient.tsx
// FoodKnock — Full interactive menu experience
// Ember orange system · Playfair Display · mobile-first · combo-first layout

import { useState, useMemo, useCallback, useRef } from "react";
import ProductGrid from "./ProductGrid";
import ComboSection from "./ComboSection";
import {
    Search, X, ChevronDown, Flame, Zap, Leaf, Star,
    IceCream, Coffee, Pizza, Sandwich, UtensilsCrossed, Gift, SlidersHorizontal,
} from "lucide-react";

type Product = {
    _id:              string;
    name:             string;
    description:      string;
    shortDescription?: string;
    price:            number;
    compareAtPrice?:  number | null;
    category:         string;
    image:            string;
    stock:            number;
    isAvailable:      boolean;
    isFeatured?:      boolean;
    tags?:            string[];
    slug:             string;
};

// ─── Category icon map ─────────────────────────────────────────────────────
const ICONS: Record<string, React.ReactNode> = {
    all:         <UtensilsCrossed size={13} strokeWidth={2.5} />,
    combos:      <Gift            size={13} strokeWidth={2.5} />,
    pizza:       <Pizza           size={13} strokeWidth={2.5} />,
    burger:      "🍔",
    sandwich:    <Sandwich        size={13} strokeWidth={2.5} />,
    coffee:      <Coffee          size={13} strokeWidth={2.5} />,
    juice:       "🧃",
    shake:       "🥤",
    "ice cream": <IceCream        size={13} strokeWidth={2.5} />,
    momos:       "🥟",
    fries:       "🍟",
    pasta:       "🍝",
    noodles:     "🍜",
    maggi:       "🍜",
    tea:         "☕",
    snacks:      <Flame           size={13} strokeWidth={2.5} />,
    chinese:     "🥡",
    pavbhaji:    "🍛",
    patties:     "🥙",
};
const getIcon = (cat: string) => ICONS[cat.toLowerCase()] ?? "🍽️";

const SORT_OPTIONS = [
    { value: "featured",   label: "⭐ Featured"          },
    { value: "price_asc",  label: "Price: Low → High"    },
    { value: "price_desc", label: "Price: High → Low"    },
    { value: "name_asc",   label: "Name: A → Z"          },
    { value: "name_desc",  label: "Name: Z → A"          },
    { value: "available",  label: "Available First"       },
];

const TRUST_CHIPS = [
    { icon: <Flame size={11} />, label: "Made Fresh",          cls: "bg-orange-50  text-orange-600 border-orange-200" },
    { icon: <Zap   size={11} />, label: "Fast Delivery",       cls: "bg-amber-50   text-amber-700  border-amber-200"  },
    { icon: <Leaf  size={11} />, label: "Fresh Ingredients",   cls: "bg-green-50   text-green-700  border-green-200"  },
    { icon: <Star  size={11} />, label: "4.9★ Rated",          cls: "bg-yellow-50  text-yellow-700 border-yellow-200" },
];

const normalize = (cat: string) => cat.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

function sortCats(cats: string[]): string[] {
    const noAll   = cats.filter(c => c !== "All");
    const combos  = noAll.filter(c => c.toLowerCase() === "combos");
    const rest    = noAll.filter(c => c.toLowerCase() !== "combos").sort();
    return ["All", ...combos, ...rest];
}

// ──────────────────────────────────────────────────────────────────────────
export default function MenuClient({ products }: { products: Product[] }) {
    const [search,   setSearch]   = useState("");
    const [category, setCategory] = useState("All");
    const [sort,     setSort]     = useState("featured");
    const [sortOpen, setSortOpen] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);

    // ── Derived data ──
    const combos = useMemo(
        () => products.filter(p => normalize(p.category) === "Combos"),
        [products]
    );

    const categories = useMemo(() => {
        const unique = Array.from(new Set(products.map(p => normalize(p.category))));
        return sortCats(unique);
    }, [products]);

    const filtered = useMemo(() => {
        let list = [...products];
        if (category !== "All") list = list.filter(p => normalize(p.category) === category);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                (p.description || "").toLowerCase().includes(q)
            );
        }
        switch (sort) {
            case "price_asc":  list.sort((a,b) => a.price - b.price); break;
            case "price_desc": list.sort((a,b) => b.price - a.price); break;
            case "name_asc":   list.sort((a,b) => a.name.localeCompare(b.name)); break;
            case "name_desc":  list.sort((a,b) => b.name.localeCompare(a.name)); break;
            case "available":
                list.sort((a,b) => {
                    const aOk = a.isAvailable && a.stock > 0 ? 0 : 1;
                    const bOk = b.isAvailable && b.stock > 0 ? 0 : 1;
                    return aOk - bOk;
                });
                break;
            default:
                list.sort((a,b) => {
                    const aOk = a.isAvailable && a.stock > 0 ? 0 : 1;
                    const bOk = b.isAvailable && b.stock > 0 ? 0 : 1;
                    return aOk - bOk || a.name.localeCompare(b.name);
                });
        }
        return list;
    }, [products, category, search, sort]);

    const gridProducts = useMemo(() =>
        category === "All" && !search.trim()
            ? filtered.filter(p => normalize(p.category) !== "Combos")
            : filtered,
        [filtered, category, search]
    );

    const showCombos    = category === "All" && !search.trim() && combos.length > 0;
    const hasFilter     = search.trim() !== "" || category !== "All";
    const sortLabel     = SORT_OPTIONS.find(o => o.value === sort)?.label ?? "Sort";

    const gotoCategory = useCallback((cat: string) => {
        setCategory(cat);
        setSearch("");
        setTimeout(() => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }, []);

    const resetAll = useCallback(() => { setSearch(""); setCategory("All"); setSort("featured"); }, []);

    return (
        <main className="min-h-screen bg-[#FFFBF5]">

            {/* ════════════════════════════
                HERO
            ════════════════════════════ */}
            <section className="relative overflow-hidden">
                {/* Layered bg */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#fffbf5] via-[#fff7ed] to-[#fff3e0]" />
                <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full opacity-25 blur-3xl"
                     style={{ background:"radial-gradient(circle,#FF8C42,transparent 70%)" }} />
                <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full opacity-15 blur-3xl"
                     style={{ background:"radial-gradient(circle,#FF5C1A,transparent 70%)" }} />
                <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
                     style={{ backgroundImage:"radial-gradient(circle,#78350f 1px,transparent 1px)", backgroundSize:"28px 28px" }} />

                <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-10 md:px-8 md:pb-10 md:pt-14">
                    {/* Eyebrow */}
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-1.5 shadow-sm">
                        <span className="flex h-2 w-2 rounded-full"
                              style={{ background:"#FF5C1A", boxShadow:"0 0 8px rgba(255,92,26,0.7)" }} />
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">
                            FoodKnock Menu
                        </span>
                    </div>

                    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                        <div className="max-w-xl">
                            <h1 className="text-3xl font-black leading-[1.08] tracking-tight text-stone-900 md:text-4xl lg:text-5xl"
                                style={{ fontFamily:"'Playfair Display',Georgia,serif" }}>
                                <span className="bg-clip-text text-transparent"
                                      style={{ backgroundImage:"linear-gradient(135deg,#FF5C1A 0%,#e67e22 55%,#c0392b 100%)" }}>
                                    Hot &amp; Fresh,
                                </span>
                                <br />
                                <span className="text-stone-900">Made for Every Craving</span>
                            </h1>
                            <p className="mt-3 text-[13.5px] leading-relaxed text-stone-500 md:text-base">
                                From cheesy burgers &amp; crispy fries to chilled shakes &amp; fresh juices —
                                freshly prepared the moment you order. 🔥
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {TRUST_CHIPS.map(c => (
                                    <span key={c.label}
                                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${c.cls}`}>
                                        {c.icon} {c.label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Floating food emojis — desktop only */}
                        <div className="hidden shrink-0 select-none md:block">
                            <div className="relative h-32 w-40">
                                {(["🍕","🍔","🧃","🍦","🥟","☕"] as const).map((em,i) => {
                                    const pos  = ["top-0 left-4","top-0 right-0","top-10 left-0","top-12 left-16","bottom-0 left-6","bottom-2 right-2"];
                                    const size = ["text-4xl","text-3xl","text-2xl","text-3xl","text-3xl","text-2xl"];
                                    return (
                                        <span key={i}
                                              className={`absolute ${pos[i]} ${size[i]} drop-shadow-sm`}
                                              style={{ animation:`fkFloat${i%3} ${3+i*0.4}s ease-in-out infinite` }}>
                                            {em}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════════════════════
                STICKY CONTROLS
            ════════════════════════════ */}
            <div ref={gridRef}
                 className="sticky top-0 z-30 border-b border-stone-100 bg-[#FFFBF5]/96 shadow-[0_2px_18px_rgba(0,0,0,0.06)] backdrop-blur-xl">
                <div className="mx-auto max-w-7xl px-4 py-3 md:px-8">

                    {/* Row 1 — search · sort · count */}
                    <div className="flex items-center gap-2.5">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search size={15}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                                    strokeWidth={2.5} />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search burgers, pizza, juice, combos…"
                                className="w-full rounded-2xl border border-stone-200 bg-white py-2.5 pl-9 pr-9 text-[13px] text-stone-700 placeholder:text-stone-400 transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                            />
                            {search && (
                                <button onClick={() => setSearch("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-stone-400 transition-colors hover:text-orange-500">
                                    <X size={14} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>

                        {/* Sort */}
                        <div className="relative shrink-0">
                            <button onClick={() => setSortOpen(o => !o)}
                                    className="flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-[12px] font-semibold text-stone-600 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-200">
                                <SlidersHorizontal size={13} strokeWidth={2.5} />
                                <span className="hidden max-w-[76px] truncate sm:inline">{sortLabel}</span>
                                <span className="sm:hidden">Sort</span>
                                <ChevronDown size={11} strokeWidth={2.5}
                                             className={`transition-transform duration-200 ${sortOpen ? "rotate-180" : ""}`} />
                            </button>
                            {sortOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                                    <div className="absolute right-0 top-full z-20 mt-1.5 w-52 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-xl shadow-stone-200/60">
                                        {SORT_OPTIONS.map(opt => (
                                            <button key={opt.value}
                                                    onClick={() => { setSort(opt.value); setSortOpen(false); }}
                                                    className={`w-full px-4 py-2.5 text-left text-[13px] font-medium transition-colors ${
                                                        sort === opt.value
                                                            ? "bg-orange-50 font-bold text-orange-600"
                                                            : "text-stone-600 hover:bg-stone-50 hover:text-stone-800"
                                                    }`}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Count badge */}
                        <div className="hidden shrink-0 items-center gap-1 rounded-2xl border border-stone-100 bg-white px-3 py-2.5 shadow-sm sm:flex">
                            <span className="text-sm font-black" style={{ color:"#FF5C1A" }}>{filtered.length}</span>
                            <span className="text-xs font-medium text-stone-400">items</span>
                        </div>
                    </div>

                    {/* Row 2 — category pills */}
                    <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
                        {categories.map(cat => {
                            const active  = cat === category;
                            const isCombo = cat.toLowerCase() === "combos";
                            return (
                                <button key={cat}
                                        onClick={() => gotoCategory(cat)}
                                        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                                            active
                                                ? "border-transparent text-white shadow-md"
                                                : isCombo
                                                    ? "border-rose-200 bg-rose-50 font-black text-rose-600 hover:border-rose-300 hover:bg-rose-100"
                                                    : "border-stone-200 bg-white text-stone-500 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                                        }`}
                                        style={ active ? {
                                            background: isCombo
                                                ? "linear-gradient(135deg,#e11d48,#FF5C1A)"
                                                : "linear-gradient(135deg,#FF5C1A,#FF8C42)",
                                            boxShadow: isCombo
                                                ? "0 4px 12px rgba(225,29,72,0.3)"
                                                : "0 4px 12px rgba(255,92,26,0.3)",
                                        } : {} }>
                                    <span className="text-[13px] leading-none">{getIcon(cat)}</span>
                                    {cat}
                                    {isCombo && !active && (
                                        <span className="ml-0.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-black leading-none text-white">
                                            HOT
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ════════════════════════════
                COMBO SECTION
            ════════════════════════════ */}
            {showCombos && (
                <ComboSection combos={combos} onViewAll={() => gotoCategory("Combos")} />
            )}

            {/* ════════════════════════════
                PRODUCT GRID
            ════════════════════════════ */}
            <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
                {category === "All" && !search.trim() && gridProducts.length > 0 && (
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">Full Menu</p>
                            <h2 className="text-xl font-black text-stone-900 md:text-2xl"
                                style={{ fontFamily:"'Playfair Display',Georgia,serif" }}>
                                All Items
                            </h2>
                        </div>
                        <div className="flex items-center gap-1 rounded-2xl border border-stone-100 bg-white px-3 py-2 shadow-sm">
                            <span className="text-sm font-black" style={{ color:"#FF5C1A" }}>{gridProducts.length}</span>
                            <span className="text-xs font-medium text-stone-400">items</span>
                        </div>
                    </div>
                )}

                <ProductGrid products={gridProducts} onReset={resetAll} hasFilters={hasFilter} />
            </section>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display:none }
                .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none }
                @keyframes fkFloat0 { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-7px) rotate(3deg)} }
                @keyframes fkFloat1 { 0%,100%{transform:translateY(0) rotate(2deg)}  50%{transform:translateY(-9px) rotate(-2deg)} }
                @keyframes fkFloat2 { 0%,100%{transform:translateY(0)}               50%{transform:translateY(-5px)} }
            `}</style>
        </main>
    );
}