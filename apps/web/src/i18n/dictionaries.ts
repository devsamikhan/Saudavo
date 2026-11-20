import type { LocaleCode } from "@saudavo/contracts";

export interface UiDictionary {
  brandName: string;
  pilotBadge: string;
  navStorefront: string;
  navCart: string;
  navOrders: string;
  navSeller: string;
  navAdmin: string;
  navSignIn: string;
  navSignOut: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  searchPlaceholder: string;
  searchButton: string;
  allAreasLabel: string;
  allCategoriesLabel: string;
  productsFilter: string;
  servicesFilter: string;
  loadingText: string;
  emptyListingsTitle: string;
  emptyListingsBody: string;
  codBadge: string;
  remoteBadge: string;
  onSiteBadge: string;
  hybridBadge: string;
  viewDetails: string;
  addToCart: string;
  privacyFooterNote: string;
  footerBetaNote: string;
}

export const DICTIONARIES: Record<LocaleCode, UiDictionary> = {
  en: {
    brandName: "Saudavo",
    pilotBadge: "Mianwali District • Pilot",
    navStorefront: "Storefront",
    navCart: "Cart",
    navOrders: "Orders",
    navSeller: "Seller Studio",
    navAdmin: "Admin",
    navSignIn: "Sign In",
    navSignOut: "Sign Out",
    heroBadge: "MIANWALI CLOSED BETA • 0% SELLER COMMISSION • COD ONLY",
    heroTitle: "Discover Trusted Shops & Local Services Across Mianwali",
    heroSubtitle:
      "Shop verified crafts, home-based kitchens, and services across Mianwali, Isakhel, and Piplan.",
    searchPlaceholder: "Search local shops, crafts, or services in Mianwali...",
    searchButton: "Search",
    allAreasLabel: "All Mianwali Areas",
    allCategoriesLabel: "All Categories",
    productsFilter: "Products",
    servicesFilter: "Services",
    loadingText: "Loading Mianwali marketplace...",
    emptyListingsTitle: "No active listings match your filter yet",
    emptyListingsBody:
      "Try clearing filters or start onboarding your Mianwali store in Seller Studio.",
    codBadge: "Cash on Delivery",
    remoteBadge: "Remote • Manual Offline",
    onSiteBadge: "On-Site • COD",
    hybridBadge: "Hybrid • COD",
    viewDetails: "View Details",
    addToCart: "Add to Store Cart",
    privacyFooterNote:
      "Privacy-first marketplace: seller home addresses and opt-out phone numbers stay hidden.",
    footerBetaNote:
      "0% promotional seller commission active during Mianwali closed beta. No platform wallet or escrow."
  },
  ur: {
    brandName: "سوداو",
    pilotBadge: "ضلع میانوالی • پائلٹ",
    navStorefront: "مارکیٹ",
    navCart: "کارٹ",
    navOrders: "آرڈرز",
    navSeller: "سیلر اسٹوڈیو",
    navAdmin: "ایڈمن",
    navSignIn: "لاگ ان",
    navSignOut: "لاگ آؤٹ",
    heroBadge: "میانوالی کلوزڈ بیٹا • 0% کمیشن • کیش آن ڈلیوری",
    heroTitle: "میانوالی کے مقامی دکانداروں اور سروسز سے خریداری کریں",
    heroSubtitle:
      "میانوالی، عیسیٰ خیل اور پپلاں میں تصدیق شدہ مقامی مصنوعات اور خدمات آسانی سے تلاش کریں۔",
    searchPlaceholder: "میانوالی میں مصنوعات یا سروسز تلاش کریں...",
    searchButton: "تلاش",
    allAreasLabel: "تمام علاقے",
    allCategoriesLabel: "تمام اقسام",
    productsFilter: "مصنوعات",
    servicesFilter: "سروسز",
    loadingText: "میانوالی مارکیٹ لوڈ ہو رہی ہے...",
    emptyListingsTitle: "اس فلٹر کے مطابق کوئی فعال لسٹنگ موجود نہیں",
    emptyListingsBody:
      "فلٹر تبدیل کریں یا سیلر اسٹوڈیو میں اپنا مقامی اسٹور رجسٹر کریں۔",
    codBadge: "کیش آن ڈلیوری",
    remoteBadge: "ریموٹ • مینوئل ادائیگی",
    onSiteBadge: "آن سائٹ • کیش آن ڈلیوری",
    hybridBadge: "ہائبرڈ • کیش آن ڈلیوری",
    viewDetails: "تفصیل دیکھیں",
    addToCart: "اسٹور کارٹ میں شامل کریں",
    privacyFooterNote:
      "رازداری اولین ترجیح: دکاندار کا ذاتی پتہ اور نجی فون نمبر عوامی طور پر پوشیدہ رہتے ہیں۔",
    footerBetaNote:
      "میانوالی کلوزڈ بیٹا کے دوران 0% پروموشنل کمیشن فعال ہے۔ پلیٹ فارم والٹ یا ایسکرو موجود نہیں۔"
  }
};

export function getLocaleDirection(locale: LocaleCode): "ltr" | "rtl" {
  return locale === "ur" ? "rtl" : "ltr";
}
