export const formatCurrency = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(v || 0));
export const calcTotal = (price, nights) => Number(price || 0) * Number(nights || 0);
