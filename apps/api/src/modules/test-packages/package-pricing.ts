/** Pricing helpers shared by the service (server totals) and tests. Amounts are TRY, 2 decimals. */
export interface PricedItem {
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Sum of item list prices (net) and the VAT-inclusive equivalent using each test's own rate. */
export function itemTotals(items: readonly PricedItem[]): { net: number; gross: number } {
  const net = round2(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));
  const gross = round2(
    items.reduce((sum, i) => sum + i.unitPrice * i.quantity * (1 + i.vatRate / 100), 0),
  );
  return { net, gross };
}

/**
 * Effective package price: an explicit package price (with the package VAT rate) wins over the
 * item sum. Returns the net and gross amounts plus the discount versus the item sum.
 */
export function packageTotals(
  items: readonly PricedItem[],
  price: number | null,
  vatRate: number,
): { net: number; gross: number; itemsNet: number; discount: number } {
  const totals = itemTotals(items);
  if (price === null)
    return { net: totals.net, gross: totals.gross, itemsNet: totals.net, discount: 0 };
  return {
    net: round2(price),
    gross: round2(price * (1 + vatRate / 100)),
    itemsNet: totals.net,
    discount: round2(totals.net - price),
  };
}
