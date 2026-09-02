export function survivalColor(destroyed: number, amount: number): string {
  if (amount <= 0) {
    return "#64748b";
  }

  const survival = 1 - destroyed / amount;

  if (survival >= 0.8) {
    return "#34d399";
  }
  if (survival >= 0.6) {
    return "#a3e635";
  }
  if (survival >= 0.4) {
    return "#fbbf24";
  }
  if (survival >= 0.2) {
    return "#fb923c";
  }

  return "#fb7185";
}
