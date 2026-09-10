// Task: fix 37% of Meta "Lead" events (Pixel + CAPI) missing value/currency
// in Events Manager diagnostics — traced to the Lead tracking calls reading
// a runtime-derived amount (client: createData.total_amount from the
// /api/payment/create response; server: the order's totalAmount, itself
// derived from the PRICE_AMOUNT env var) instead of a fixed literal. Either
// path going momentarily undefined/stale silently drops the whole
// custom_data object in sendMetaCapiEvent (see lib/metaCapi.ts).
//
// KantongKu has exactly one price, paid once, no tiers — so the value a
// "Lead" event should report is a constant, not something to derive at
// request time. Shared by both src/components/Landing.tsx (client Pixel)
// and server.ts (createOrderRecord's CAPI call) so the two can never
// disagree with each other, independent of PRICE_AMOUNT ever being
// misconfigured. Deliberately NOT used for the actual charged amount/order
// total (that stays PRICE_AMOUNT-driven, untouched by this fix) or for the
// "OrderConfirmed" event (which correctly reports what was actually paid).
export const PRODUCT_PRICE_IDR = 49000;
