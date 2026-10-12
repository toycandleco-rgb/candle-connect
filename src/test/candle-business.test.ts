import { describe, expect, it } from "vitest";

import { calculateSale, makeBillMessage, makeWhatsAppUrl, normalizePhone } from "@/lib/candle-business";

describe("candle sale totals", () => {
  it("calculates profit as sales less product cost and recorded expenses", () => {
    expect(
      calculateSale(
        [{ name: "Rose candle", quantity: 2, salePrice: 400, costPrice: 150 }],
        [{ description: "Expo table", amount: 100 }],
      ),
    ).toEqual({ revenue: 800, productCost: 300, expenses: 100, profit: 400 });
  });

  it("keeps the bill text simple and totals products only", () => {
    const message = makeBillMessage(
      "Mira",
      [{ name: "Rose candle", quantity: 2, salePrice: 400, costPrice: 150 }],
      [{ description: "Expo table", amount: 100 }],
    );
    expect(message).toContain("Rose candle × 2");
    expect(message).toContain("Total: ₹800.00");
    expect(message).not.toContain("Expo table");
    expect(message).not.toContain("PDF");
  });

  it("normalizes a valid WhatsApp number and encodes the message", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("919876543210");
    expect(makeWhatsAppUrl("+91 98765-43210", "Hello Mira\nTotal ₹800")).toBe(
      "https://wa.me/919876543210?text=Hello%20Mira%0ATotal%20%E2%82%B9800",
    );
    expect(makeWhatsAppUrl("12", "Hello")).toBeNull();
  });
});