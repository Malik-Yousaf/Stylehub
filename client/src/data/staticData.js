/* ============================================================
   STATIC REFERENCE DATA
   (The actual product/order/customer catalog is NOT here — it
   lives in data.json on the server and is loaded via fetch() in
   AppContext, so the Admin panel can add/edit/delete for real.)
============================================================ */
export const CATEGORIES = ["Men", "Women", "Footwear", "Accessories"];

export const CATEGORY_IMG = {
  Men: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=500&q=80",
  Women: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&q=80",
  Footwear: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80",
  Accessories: "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=500&q=80"
};

export const REVIEWS_SAMPLE = [
  { who: "Sana R.", stars: 5, text: "Fits true to size and the fabric feels genuinely premium. Delivered to Karachi in 2 days." },
  { who: "Hamza A.", stars: 4, text: "Really happy with the quality for the price. Would've liked one more colour option." },
  { who: "Mahnoor K.", stars: 5, text: "Ordered on COD, no issues at all. Already ordered a second one for my sister." }
];

export const CITY_SHIPPING = { Karachi: 200, Lahore: 250, Islamabad: 250, Other: 350 };

export const PROMO_CODES = { STYLE10: 0.10, WELCOME15: 0.15 };

export const WEEK_SALES = [42, 58, 39, 71, 66, 88, 95]; // thousands PKR
