export type Category = {
  slug: string;
  name: string;
  tagline: string;
  /** Hero / tile photo served from /public/categories. */
  image: string;
  gradient: string;
  subcategories: string[];
};

export type Product = {
  id: string;
  name: string;
  localName?: string;
  category: string;
  subcategory: string;
  /** Catalogue photo served from /public/products. */
  image: string;
  /** Sold-as description, e.g. "1 kg pack" or "Crate of 10 kg". */
  packSize: string;
  /** Unit shown next to the price, e.g. "kg", "pc", "ltr". */
  unit: string;
  price: number;
  mrp: number;
  gstRate: number;
  /** Minimum order quantity and the increment used by the stepper. */
  moq: number;
  step: number;
  origin: string;
  shelfLife: string;
  storage: string;
  description: string;
  tags: string[];
  inStock: boolean;
  /** Slab pricing: buy at least `qty` units and pay `price` per unit. */
  bulkSlabs?: { qty: number; price: number }[];
};

export type CartLine = {
  productId: string;
  qty: number;
};

export type OrderItem = {
  productId: string;
  name: string;
  image: string;
  qty: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  placedAt: string;
  items: OrderItem[];
  subtotal: number;
  gst: number;
  deliveryFee: number;
  total: number;
  slot: string;
  paymentMethod: string;
  outlet: {
    businessName: string;
    contactName: string;
    phone: string;
    gstin: string;
    fssai: string;
    address: string;
    city: string;
    pincode: string;
  };
  status: string;
};
