export type SaleLine = {
  name: string;
  quantity: number;
  salePrice: number;
  costPrice: number;
};

export type SaleExpense = { description: string; amount: number };

export function calculateSale(lines: SaleLine[], expenses: SaleExpense[]) {
  const revenue = lines.reduce((total, line) => total + line.salePrice * line.quantity, 0);
  const productCost = lines.reduce((total, line) => total + line.costPrice * line.quantity, 0);
  const expenseTotal = expenses.reduce((total, expense) => total + expense.amount, 0);
  return {
    revenue: roundMoney(revenue),
    productCost: roundMoney(productCost),
    expenses: roundMoney(expenseTotal),
    profit: roundMoney(revenue - productCost - expenseTotal),
  };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function normalizePhone(value: string): string | null {
  const cleaned = value.trim().replace(/[\s()-]/g, "");
  if (!/^\+?\d{8,15}$/.test(cleaned)) return null;
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

export function makeBillMessage(
  customerName: string,
  lines: SaleLine[],
  expenses: SaleExpense[],
): string {
  const totals = calculateSale(lines, expenses);
  const itemLines = lines.map(
    (line) => `${line.name} × ${line.quantity} — ${formatINR(line.salePrice * line.quantity)}`,
  );
  return [
    `Hello ${customerName}, thank you for shopping with us!`,
    "",
    ...itemLines,
    "",
    `Total: ${formatINR(totals.revenue)}`,
    "Thank you for supporting handmade candles.",
  ].join("\n");
}

export function makeOfferMessage(customerName: string, offer: string): string {
  return `Hello ${customerName}, ${offer.trim()}`;
}

export function makeWhatsAppUrl(phone: string, message: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
