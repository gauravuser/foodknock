"use client";

// src/components/admin/products/ProductForm.tsx
// Premium dark product form — FoodKnock

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
    Save, Loader2, Image as ImageIcon, Tag, Package,
    DollarSign, FileText, Hash, Eye, BadgePercent,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────
export type ProductFormData = {
    name:             string;
    slug:             string;
    description:      string;
    shortDescription: string;
    price:            string;
    compareAtPrice:   string;
    category:         string;
    image:            string;
    stock:            string;
    isAvailable:      boolean;
    isFeatured:       boolean;
    tags:             string;
};

type Props = {
    mode:         "create" | "edit";
    productId?:   string;
    initialData?: Partial<ProductFormData>;
};

const CATEGORIES = [
    "Coffee", "Cold Drinks", "Cold Coffee", "Tea", "Juice", "Shake",
    "Burger", "Pizza", "Sandwich", "Snacks", "Combos", "Ice Cream",
    "Momos", "Fries", "Pasta", "Noodles", "Maggi", "Chinese",
    "Pav Bhaji", "Patties", "Desserts", "Other",
];

const EMPTY: ProductFormData = {
    name: "", slug: "", description: "", shortDescription: "",
    price: "", compareAtPrice: "", category: "", image: "", stock: "",
    isAvailable: true, isFeatured: false, tags: "",
};

function parseTags(value: unknown): string[] {
    if (!value || typeof value !== "string") return [];
    return value.split(",").map((t) => t.trim()).filter(Boolean);
}

function toSlug(str: string): string {
    return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─── Sub-components ───────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
    return (
        <span className="mb-1.5 block text-[10.5px] font-black uppercase tracking-[0.18em] text-stone-500">
            {children}
        </span>
    );
}

function Input({
    value, onChange, placeholder, type = "text", required,
}: {
    value: string; onChange: (v: string) => void;
    placeholder?: string; type?: string; required?: boolean;
}) {
    return (
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 text-sm text-stone-200 placeholder:text-stone-700 transition-all duration-200 focus:border-amber-500/40 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-amber-500/15 hover:border-white/10"
        />
    );
}

function Textarea({
    value, onChange, placeholder, rows = 3,
}: {
    value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
    return (
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full resize-none rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 text-sm text-stone-200 placeholder:text-stone-700 transition-all duration-200 focus:border-amber-500/40 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-amber-500/15 hover:border-white/10"
        />
    );
}

function Toggle({
    checked, onChange, label, description,
}: {
    checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.05]"
        >
            <div className="text-left">
                <p className="text-sm font-semibold text-stone-200">{label}</p>
                {description && <p className="mt-0.5 text-[11px] text-stone-600">{description}</p>}
            </div>
            <div className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-stone-700/60"}`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
        </button>
    );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
    return (
        <div className="mb-4 flex items-center gap-2.5 border-b border-white/[0.05] pb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Icon size={13} strokeWidth={2.5} />
            </div>
            <h3 className="text-sm font-black text-stone-300">{title}</h3>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────
export default function ProductForm({ mode, productId, initialData }: Props) {
    const router                          = useRouter();
    const [form,         setForm]         = useState<ProductFormData>({ ...EMPTY, ...initialData });
    const [loading,      setLoading]      = useState(false);
    const [slugTouched,  setSlugTouched]  = useState(mode === "edit" && !!initialData?.slug);

    useEffect(() => {
        if (initialData) {
            setForm({ ...EMPTY, ...initialData });
            if (initialData.slug) setSlugTouched(true);
        }
    }, [initialData]);

    const set = (key: keyof ProductFormData) => (v: string | boolean) =>
        setForm((f) => ({ ...f, [key]: v }));

    const handleNameChange = (v: string) => {
        if (!slugTouched) {
            setForm((f) => ({ ...f, name: v, slug: toSlug(v) }));
        } else {
            set("name")(v);
        }
    };

    const priceParsed          = Number(form.price);
    const compareAtPriceParsed = Number(form.compareAtPrice);
    const savingsPreview =
        form.compareAtPrice.trim() !== "" &&
        !isNaN(priceParsed) &&
        !isNaN(compareAtPriceParsed) &&
        compareAtPriceParsed > priceParsed
            ? Math.round(compareAtPriceParsed - priceParsed)
            : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.name.trim())     return toast.error("Product name is required");
        if (!form.slug.trim())     return toast.error("Slug is required");
        if (!form.price.trim())    return toast.error("Price is required");
        if (!form.category.trim()) return toast.error("Category is required");

        const parsedPrice = Number(form.price);
        const parsedStock = Number(form.stock);

        if (isNaN(parsedPrice) || parsedPrice < 0) return toast.error("Enter a valid price");
        if (isNaN(parsedStock) || parsedStock < 0)  return toast.error("Enter a valid stock value");

        let parsedCompareAtPrice: number | null = null;
        if (form.compareAtPrice.trim() !== "") {
            parsedCompareAtPrice = Number(form.compareAtPrice);
            if (isNaN(parsedCompareAtPrice) || parsedCompareAtPrice < 0) {
                return toast.error("Enter a valid original price");
            }
            if (parsedCompareAtPrice <= parsedPrice) {
                return toast.error("Original price must be greater than the selling price");
            }
        }

        setLoading(true);

        const payload = {
            ...form,
            price:          parsedPrice,
            compareAtPrice: parsedCompareAtPrice,
            stock:          parsedStock,
            tags:           parseTags(form.tags),
        };

        try {
            const res = await fetch(
                mode === "create" ? "/api/products" : `/api/products/${productId}`,
                {
                    method:  mode === "create" ? "POST" : "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify(payload),
                }
            );
            const data = await res.json();
            if (!res.ok) { toast.error(data.message ?? "Something went wrong"); setLoading(false); return; }
            toast.success(mode === "create" ? "Product created!" : "Product updated!");
            router.push("/admin/products");
            router.refresh();
        } catch {
            toast.error("Network error. Please try again.");
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} noValidate>
            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">

                {/* ── Left column ── */}
                <div className="space-y-5">

                    {/* Basic info */}
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f16] p-5">
                        <SectionHeader icon={FileText} title="Basic Information" />
                        <div className="space-y-4">
                            <div>
                                <Label>Product Name *</Label>
                                <Input value={form.name} onChange={handleNameChange} placeholder="e.g. Cold Coffee Blend" required />
                            </div>
                            <div>
                                <Label>Slug *</Label>
                                <div className="flex items-center gap-0">
                                    <div className="flex h-10 items-center rounded-l-xl border border-r-0 border-white/[0.07] bg-white/[0.02] px-3 text-xs text-stone-700 shrink-0">
                                        /products/
                                    </div>
                                    <input
                                        type="text"
                                        value={form.slug}
                                        onChange={(e) => { setSlugTouched(true); set("slug")(toSlug(e.target.value)); }}
                                        placeholder="cold-coffee-blend"
                                        required
                                        className="flex-1 rounded-r-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 text-sm text-stone-200 placeholder:text-stone-700 transition-all focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Short Description</Label>
                                <Input value={form.shortDescription} onChange={set("shortDescription")} placeholder="One-line summary shown on product cards" />
                            </div>
                            <div>
                                <Label>Full Description</Label>
                                <Textarea value={form.description} onChange={set("description")} placeholder="Detailed product description..." rows={4} />
                            </div>
                        </div>
                    </div>

                    {/* Pricing & Inventory */}
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f16] p-5">
                        <SectionHeader icon={DollarSign} title="Pricing & Inventory" />

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Selling Price (₹) *</Label>
                                <Input value={form.price} onChange={set("price")} placeholder="0" type="number" required />
                            </div>
                            <div>
                                <Label>Stock Quantity</Label>
                                <Input value={form.stock} onChange={set("stock")} placeholder="0" type="number" />
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="mb-1.5 flex items-center gap-2">
                                <Label>Original Price (₹)</Label>
                                <span className="mb-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-400">
                                    Optional
                                </span>
                            </div>
                            <Input
                                value={form.compareAtPrice}
                                onChange={set("compareAtPrice")}
                                placeholder="e.g. 249 — leave blank to hide"
                                type="number"
                            />
                            <p className="mt-1.5 text-[11px] leading-relaxed text-stone-600">
                                Shows a strike-through old price on product cards. Must be greater than the selling price.
                            </p>

                            {savingsPreview !== null && (
                                <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3.5 py-2.5">
                                    <BadgePercent size={15} className="shrink-0 text-emerald-400" />
                                    <div>
                                        <p className="text-[12px] font-black text-emerald-400">
                                            Customer saves ₹{savingsPreview}
                                        </p>
                                        <p className="text-[10px] text-emerald-600/80">
                                            Will show as:{" "}
                                            <span className="line-through opacity-60">₹{compareAtPriceParsed}</span>{" "}
                                            <span className="font-bold text-emerald-400">₹{priceParsed}</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f16] p-5">
                        <SectionHeader icon={Tag} title="Tags" />
                        <Label>Tags (comma-separated)</Label>
                        <Input value={form.tags} onChange={set("tags")} placeholder="cold, coffee, bestseller, summer" />
                        {parseTags(form.tags).length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {parseTags(form.tags).map((tag, i) => (
                                    <span key={`${tag}-${i}`} className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right column ── */}
                <div className="space-y-5">

                    {/* Category */}
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f16] p-5">
                        <SectionHeader icon={Hash} title="Category" />
                        <Label>Category *</Label>
                        <select
                            value={form.category}
                            onChange={(e) => set("category")(e.target.value)}
                            required
                            className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 text-sm text-stone-200 transition-all duration-200 focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/15 hover:border-white/10"
                        >
                            <option value="" className="bg-[#0f0f16]">Select a category</option>
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c} className="bg-[#0f0f16]">{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Image */}
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f16] p-5">
                        <SectionHeader icon={ImageIcon} title="Product Image" />
                        <Label>Upload Image</Label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    if (typeof reader.result === "string") {
                                        setForm((prev) => ({ ...prev, image: reader.result as string }));
                                    }
                                };
                                reader.onerror = () => toast.error("Failed to read image file.");
                                reader.readAsDataURL(file);
                            }}
                            className="w-full cursor-pointer rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2 text-sm text-stone-400 transition-colors file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500/15 file:px-3 file:py-1 file:text-xs file:font-bold file:text-amber-400 hover:border-white/10"
                        />
                        <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
                            {form.image ? (
                                <img
                                    src={form.image}
                                    alt="Preview"
                                    className="h-44 w-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                            ) : (
                                <div className="flex h-28 items-center justify-center gap-2 text-stone-700">
                                    <Eye size={15} />
                                    <span className="text-xs">Image preview</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Visibility */}
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f16] p-5">
                        <SectionHeader icon={Package} title="Visibility & Status" />
                        <div className="space-y-2.5">
                            <Toggle
                                checked={form.isAvailable}
                                onChange={(v) => set("isAvailable")(v)}
                                label="Available for Order"
                                description="Customers can add this to cart"
                            />
                            <Toggle
                                checked={form.isFeatured}
                                onChange={(v) => set("isFeatured")(v)}
                                label="Featured Product"
                                description="Shown in featured / popular sections"
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-3.5 text-sm font-black text-stone-950 shadow-lg shadow-amber-500/20 transition-all duration-200 hover:brightness-110 hover:shadow-amber-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <>
                                <Save size={15} strokeWidth={2.5} />
                                {mode === "create" ? "Create Product" : "Save Changes"}
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex w-full items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] py-3 text-sm font-medium text-stone-500 transition-all duration-200 hover:bg-white/[0.06] hover:text-stone-200"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </form>
    );
}