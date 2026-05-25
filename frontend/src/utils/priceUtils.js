export const formatCurrency = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v || 0));
export const calcTotal = (price, nights) => Number(price || 0) * Number(nights || 0);
