export const MIN_ORDER_VALUE = 1000;
export const FREE_DELIVERY_ABOVE = 2500;
export const DELIVERY_FEE = 99;

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatINR = (value: number) => inr.format(Math.round(value));

export const formatINRExact = (value: number) => inrPaise.format(value);

export const discountPercent = (price: number, mrp: number) =>
  mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

export function deliverySlots(): { id: string; label: string; note: string }[] {
  const today = new Date();
  const day = (offset: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  };
  return [
    { id: "tomorrow-early", label: `${day(1)}, 6 AM - 9 AM`, note: "Before prep starts" },
    { id: "tomorrow-mid", label: `${day(1)}, 11 AM - 2 PM`, note: "Standard slot" },
    { id: "day-after-early", label: `${day(2)}, 6 AM - 9 AM`, note: "Before prep starts" },
  ];
}
