export function fmt(n) {
  return "Rs. " + Number(n || 0).toLocaleString("en-PK");
}

export function starsHtml(rating) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}
