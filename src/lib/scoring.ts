export function getVerdict(totalPrice: number, risk: string) {
  if (totalPrice <= 80 && risk === "Low") return "BOOK NOW";
  if (totalPrice <= 100) return "Great deal";
  if (totalPrice <= 130) return "Good deal";
  if (totalPrice <= 180) return "Normal price";
  return "Wait";
}

export function getDealScore(totalPrice: number, risk: string) {
  let score = 100;

  score -= totalPrice * 0.4;

  if (risk === "Medium") score -= 15;
  if (risk === "High") score -= 30;

  return Math.max(0, Math.round(score));
}