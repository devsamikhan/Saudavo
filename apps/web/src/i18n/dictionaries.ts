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
  sortNewest: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  minPriceLabel: string;
  maxPriceLabel: string;
  clearFilters: string;
  verifiedStoreBadge: string;
  privacyShieldBadge: string;
  reviewsCountLabel: string;
  loadingText: string;
  emptyListingsTitle: string;
  emptyListingsBody: string;
  codBadge: string;
  remoteBadge: string;
  onSiteBadge: string;
  hybridBadge: string;
  viewDetails: string;
  addToCart: string;
  storeCatalogProducts: string;
  storeCatalogServices: string;
  shareStoreWhatsApp: string;
  downloadQrPoster: string;
  copiedNotice: string;
  reportListingLabel: string;
  submitReportButton: string;
  reportSubmittedNotice: string;
  comparePackages: string;
  revisionsIncluded: string;
  daysDelivery: string;
  notificationsTitle: string;
  notificationsEmpty: string;
  markAllRead: string;
  ordersPageTitle: string;
  ordersEmpty: string;
  sellerStudioTitle: string;
  sellerTabOrders: string;
  sellerTabProducts: string;
  sellerTabServices: string;
  sellerTabGrowth: string;
  confirmOrderBtn: string;
  markReadyBtn: string;
  markDeliveredBtn: string;
  startServiceBtn: string;
  submitDeliveryBtn: string;
  confirmCodCashBtn: string;
  confirmOfflinePayBtn: string;
  archiveBtn: string;
  confirmYesBtn: string;
  cancelBtn: string;
  orderChatBtn: string;
  adminConsoleTitle: string;
  exportCsvLedger: string;
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
    sortNewest: "Newest",
    sortPriceAsc: "Price: Low to High",
    sortPriceDesc: "Price: High to Low",
    minPriceLabel: "Min Rs.",
    maxPriceLabel: "Max Rs.",
    clearFilters: "Clear Filters",
    verifiedStoreBadge: "Verified Local Store",
    privacyShieldBadge: "Privacy-Protected Seller",
    reviewsCountLabel: "reviews",
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
    storeCatalogProducts: "Products",
    storeCatalogServices: "Services",
    shareStoreWhatsApp: "Share Store on WhatsApp",
    downloadQrPoster: "Download Store QR Sticker",
    copiedNotice: "Copied store link!",
    reportListingLabel: "Report Concern",
    submitReportButton: "Submit Report",
    reportSubmittedNotice: "Report submitted for moderator review.",
    comparePackages: "Select Service Package",
    revisionsIncluded: "revisions included",
    daysDelivery: "day(s) delivery",
    notificationsTitle: "Notifications",
    notificationsEmpty: "No notifications yet.",
    markAllRead: "Mark all read",
    ordersPageTitle: "My Orders & Order Messages",
    ordersEmpty: "No orders placed yet.",
    sellerStudioTitle: "Saudavo Seller Studio",
    sellerTabOrders: "Overview & Orders",
    sellerTabProducts: "Products",
    sellerTabServices: "Services",
    sellerTabGrowth: "Store & QR Growth",
    confirmOrderBtn: "Confirm Order",
    markReadyBtn: "Mark Ready",
    markDeliveredBtn: "Mark Delivered",
    startServiceBtn: "Start Service Work",
    submitDeliveryBtn: "Submit Work Delivery",
    confirmCodCashBtn: "Confirm COD Cash Collected",
    confirmOfflinePayBtn: "Confirm Offline Payment",
    archiveBtn: "Archive",
    confirmYesBtn: "Confirm?",
    cancelBtn: "Cancel",
    orderChatBtn: "Order Chat",
    adminConsoleTitle: "Saudavo Trust & Moderation Console",
    exportCsvLedger: "Export Orders Ledger (CSV)",
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
    sortNewest: "تازہ ترین",
    sortPriceAsc: "کم سے زیادہ قیمت",
    sortPriceDesc: "زیادہ سے کم قیمت",
    minPriceLabel: "کم از کم روپے",
    maxPriceLabel: "زیادہ سے زیادہ روپے",
    clearFilters: "فلٹر صاف کریں",
    verifiedStoreBadge: "تصدیق شدہ مقامی اسٹور",
    privacyShieldBadge: "رازداری سے محفوظ سیلر",
    reviewsCountLabel: "تبصرے",
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
    storeCatalogProducts: "مصنوعات",
    storeCatalogServices: "سروسز",
    shareStoreWhatsApp: "واٹس ایپ پر اسٹور شیئر کریں",
    downloadQrPoster: "اسٹور QR اسٹیکر ڈاؤن لوڈ کریں",
    copiedNotice: "اسٹور لنک کاپی ہو گیا!",
    reportListingLabel: "رپورٹ کریں",
    submitReportButton: "رپورٹ جمع کرائیں",
    reportSubmittedNotice: "آپ کی رپورٹ ماڈریٹر کو بھیج دی گئی ہے۔",
    comparePackages: "سروس پیکج منتخب کریں",
    revisionsIncluded: "ترامیم شامل",
    daysDelivery: "دن میں ڈلیوری",
    notificationsTitle: "اطلاعات",
    notificationsEmpty: "ابھی کوئی اطلاع موجود نہیں۔",
    markAllRead: "سب پڑھا ہوا نشان لگائیں",
    ordersPageTitle: "میرے آرڈرز اور پیغامات",
    ordersEmpty: "ابھی تک کوئی آرڈر نہیں دیا گیا۔",
    sellerStudioTitle: "سوداو سیلر اسٹوڈیو",
    sellerTabOrders: "جائزہ اور آرڈرز",
    sellerTabProducts: "مصنوعات",
    sellerTabServices: "سروسز",
    sellerTabGrowth: "اسٹور اور QR شیئر",
    confirmOrderBtn: "آرڈر منظور کریں",
    markReadyBtn: "ترسیل کے لیے تیار",
    markDeliveredBtn: "ڈلیور ہو گیا",
    startServiceBtn: "کام شروع کریں",
    submitDeliveryBtn: "کام مکمل کر کے بھیجیں",
    confirmCodCashBtn: "COD رقم وصولی کی تصدیق",
    confirmOfflinePayBtn: "آف لائن ادائیگی کی تصدیق",
    archiveBtn: "آرکائیو کریں",
    confirmYesBtn: "تصدیق کریں؟",
    cancelBtn: "منسوخ",
    orderChatBtn: "آرڈر چیٹ",
    adminConsoleTitle: "سوداو ٹرسٹ اور ماڈریشن کنسول",
    exportCsvLedger: "آرڈر لیجر ڈاؤن لوڈ کریں (CSV)",
    privacyFooterNote:
      "رازداری اولین ترجیح: دکاندار کا ذاتی پتہ اور نجی فون نمبر عوامی طور پر پوشیدہ رہتے ہیں۔",
    footerBetaNote:
      "میانوالی کلوزڈ بیٹا کے دوران 0% پروموشنل کمیشن فعال ہے۔ پلیٹ فارم والٹ یا ایسکرو موجود نہیں۔"
  }
};

export function getLocaleDirection(locale: LocaleCode): "ltr" | "rtl" {
  return locale === "ur" ? "rtl" : "ltr";
}
