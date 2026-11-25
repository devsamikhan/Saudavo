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
  exploreMarketplaceBtn: string;
  openAuthBtn: string;
  pattern1Title: string;
  pattern1Body: string;
  pattern2Title: string;
  pattern2Body: string;
  pattern3Title: string;
  pattern3Body: string;
  emptyCartTitle: string;
  emptyCartBody: string;
  browseMarketplaceBtn: string;
  emptyInboxTitle: string;
  emptyInboxBody: string;
  notFoundTitle: string;
  notFoundBody: string;
  backToMarketplaceBtn: string;
  privacyFooterNote: string;
  footerBetaNote: string;
  browseByCategoryTitle: string;
  browseByCategorySub: string;
  savedItemsFilter: string;
  saveToWishlistLabel: string;
  wishlistSavedToast: string;
  wishlistRemovedToast: string;
  buddyName: string;
  buddyGreeting: string;
  buddyTipBody: string;
  buddyGotItBtn: string;
  orderConfirmedTitle: string;
  orderConfirmedBody: string;
  trackLiveOrderBtn: string;
  continueShoppingBtn: string;
  liveTrackingBadge: string;
  liveTrackingTitle: string;
  trackStep1Title: string;
  trackStep1Sub: string;
  trackStep2Title: string;
  trackStep2Sub: string;
  trackStep3Title: string;
  trackStep3Sub: string;
  trackStep4Title: string;
  trackStep4Sub: string;
  serviceTrackStep1Title: string;
  serviceTrackStep1Sub: string;
  serviceTrackStep2Title: string;
  serviceTrackStep2Sub: string;
  serviceTrackStep3Title: string;
  serviceTrackStep3Sub: string;
  serviceTrackStep4Title: string;
  serviceTrackStep4Sub: string;
  becomeSellerBtn: string;
  inCartLabel: string;
  sellerHeroBadge: string;
  sellerHeroTitle: string;
  sellerHeroSubtitle: string;
  sellerStepAccountBadge: string;
  sellerStepSetupBadge: string;
  sellerOnboardingHeading: string;
  sellerSignInGateBody: string;
  sellerCreateAccountBtn: string;
  sellerExistingSignInBtn: string;
  sellerViewPublicStoreBtn: string;
  sellerEmptyOrdersTitle: string;
  sellerEmptyOrdersBody: string;
  sellerShareQrCta: string;
  sellerEmptyProductsNote: string;
  sellerEmptyServicesNote: string;
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
    heroTitle: "Local shops, modern digital storefront.",
    heroSubtitle:
      "Shop verified crafts, home kitchens, and trusted local services across Mianwali, Isakhel, and Piplan with Cash on Delivery.",
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
    ordersPageTitle: "Orders & Inbox",
    ordersEmpty: "All caught up! No orders yet.",
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
    exploreMarketplaceBtn: "Explore Marketplace",
    openAuthBtn: "Sign In / Join",
    pattern1Title: "Verified Local Stores",
    pattern1Body: "Every Mianwali shop and craft maker is moderator-approved before going live.",
    pattern2Title: "Products & Local Services",
    pattern2Body: "Order physical goods on COD or book local on-site and remote services in one place.",
    pattern3Title: "Privacy-First Storefronts",
    pattern3Body: "Home-based sellers keep personal phone numbers and home addresses hidden by default.",
    emptyCartTitle: "Your cart is currently empty",
    emptyCartBody: "Nothing added yet. Discover trusted goods and daily essentials from Mianwali sellers.",
    browseMarketplaceBtn: "Browse Marketplace",
    emptyInboxTitle: "All caught up! No messages yet",
    emptyInboxBody: "Order updates, seller confirmations, and delivery chat replies appear here.",
    notFoundTitle: "Page not found",
    notFoundBody: "The page or store link you opened is unavailable or may have moved.",
    backToMarketplaceBtn: "Back to Marketplace",
    privacyFooterNote:
      "Privacy-first marketplace: seller home addresses and opt-out phone numbers stay hidden.",
    footerBetaNote:
      "0% promotional seller commission active during Mianwali closed beta. No platform wallet or escrow.",
    browseByCategoryTitle: "Browse by Category",
    browseByCategorySub: "Soft 3D categories filter trusted Mianwali shops & makers live below.",
    savedItemsFilter: "Saved",
    saveToWishlistLabel: "Save to wishlist",
    wishlistSavedToast: "Saved to wishlist!",
    wishlistRemovedToast: "Removed from wishlist.",
    buddyName: "Sauda Buddy",
    buddyGreeting: "Assalam-o-Alaikum!",
    buddyTipBody:
      "Explore verified Mianwali shops, save favorites to your wishlist, and track Cash on Delivery orders live.",
    buddyGotItBtn: "Got it!",
    orderConfirmedTitle: "Order Confirmed!",
    orderConfirmedBody:
      "Your Cash on Delivery order has been sent to the local shop. Track live delivery progress anytime.",
    trackLiveOrderBtn: "Track Live Order",
    continueShoppingBtn: "Continue Shopping",
    liveTrackingBadge: "Isometric Live Tracking",
    liveTrackingTitle: "Live Order",
    trackStep1Title: "Order Confirmed",
    trackStep1Sub: "Received by local Mianwali seller",
    trackStep2Title: "Packed & Sealed",
    trackStep2Sub: "Checked and prepared for handoff",
    trackStep3Title: "Rider Dispatched",
    trackStep3Sub: "En route for local delivery",
    trackStep4Title: "Delivered Safely",
    trackStep4Sub: "Cash on Delivery settled directly",
    serviceTrackStep1Title: "Booking Requested",
    serviceTrackStep1Sub: "Sent to service provider",
    serviceTrackStep2Title: "Seller Confirmed",
    serviceTrackStep2Sub: "Scope & schedule confirmed",
    serviceTrackStep3Title: "Work In Progress",
    serviceTrackStep3Sub: "Service fulfillment underway",
    serviceTrackStep4Title: "Delivered & Accepted",
    serviceTrackStep4Sub: "Completed & offline payment confirmed",
    becomeSellerBtn: "Become a Local Seller",
    inCartLabel: "In Cart",
    sellerHeroBadge: "MIANWALI SELLER STUDIO • 0% BETA COMMISSION",
    sellerHeroTitle: "Turn your local shop or craft into a digital storefront.",
    sellerHeroSubtitle:
      "Reach buyers across Mianwali, Isakhel, and Piplan on Cash on Delivery — with strict privacy defaults for home-based sellers (PQ-07).",
    sellerStepAccountBadge: "Step 1 of 2 • Seller Account",
    sellerStepSetupBadge: "Step 2 of 2 • Store Setup",
    sellerOnboardingHeading: "Apply for a Local Mianwali Storefront",
    sellerSignInGateBody:
      "Create a free Saudavo account or sign in first — your store name below will be saved automatically for setup.",
    sellerCreateAccountBtn: "Create Seller Account",
    sellerExistingSignInBtn: "Already have an account? Sign In",
    sellerViewPublicStoreBtn: "View Public Store",
    sellerEmptyOrdersTitle: "No store orders yet",
    sellerEmptyOrdersBody:
      "Share your store link or printable QR sticker on WhatsApp so local Mianwali buyers can place their first Cash on Delivery order.",
    sellerShareQrCta: "Open Store & QR Growth",
    sellerEmptyProductsNote:
      "No physical products listed yet. Add your first item below (photos are automatically EXIF-stripped for privacy).",
    sellerEmptyServicesNote:
      "No service listings yet. Create tiered on-site, hybrid, or remote packages below."
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
    heroTitle: "مقامی دکانیں، جدید ڈیجیٹل اسٹور فرنٹ۔",
    heroSubtitle:
      "میانوالی، عیسیٰ خیل اور پپلاں کے تصدیق شدہ مقامی ہنرمندوں اور سروسز سے کیش آن ڈلیوری پر خریداری کریں۔",
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
    ordersPageTitle: "آرڈرز اور انباکس",
    ordersEmpty: "ابھی تک کوئی آرڈر موجود نہیں۔",
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
    exploreMarketplaceBtn: "مارکیٹ دیکھیں",
    openAuthBtn: "لاگ ان / اکاؤنٹ بنائیں",
    pattern1Title: "تصدیق شدہ مقامی اسٹورز",
    pattern1Body: "میانوالی کے ہر دکاندار اور ہنرمند کی منظوری کے بعد لسٹنگ شائع ہوتی ہے۔",
    pattern2Title: "مصنوعات اور مقامی سروسز",
    pattern2Body: "کیش آن ڈلیوری پر اشیاء منگوائیں یا مقامی اور ریموٹ سروسز بک کریں۔",
    pattern3Title: "رازداری سے محفوظ کاروبار",
    pattern3Body: "گھریلو سیلرز کا ذاتی فون نمبر اور گھر کا پتہ عوامی طور پر پوشیدہ رہتا ہے۔",
    emptyCartTitle: "آپ کا کارٹ ابھی خالی ہے",
    emptyCartBody: "ابھی کچھ شامل نہیں کیا گیا۔ مقامی دکانداروں سے معیاری اشیاء تلاش کریں۔",
    browseMarketplaceBtn: "مارکیٹ دیکھیں",
    emptyInboxTitle: "سب مکمل ہے! کوئی پیغام نہیں",
    emptyInboxBody: "آرڈر اپ ڈیٹس اور سیلر کے پیغامات یہاں ظاہر ہوں گے۔",
    notFoundTitle: "صفحہ نہیں ملا",
    notFoundBody: "آپ نے جو لنک کھولا ہے وہ دستیاب نہیں یا تبدیل ہو چکا ہے۔",
    backToMarketplaceBtn: "مارکیٹ پر واپس جائیں",
    privacyFooterNote:
      "رازداری اولین ترجیح: دکاندار کا ذاتی پتہ اور نجی فون نمبر عوامی طور پر پوشیدہ رہتے ہیں۔",
    footerBetaNote:
      "میانوالی کلوزڈ بیٹا کے دوران 0% پروموشنل کمیشن فعال ہے۔ پلیٹ فارم والٹ یا ایسکرو موجود نہیں۔",
    browseByCategoryTitle: "اقسام کے لحاظ سے تلاش کریں",
    browseByCategorySub: "تھری ڈی کیٹیگری کارڈز کے ذریعے میانوالی کی تصدیق شدہ دکانیں فلٹر کریں۔",
    savedItemsFilter: "پسندیدہ",
    saveToWishlistLabel: "پسندیدہ میں شامل کریں",
    wishlistSavedToast: "پسندیدہ فہرست میں محفوظ ہو گیا!",
    wishlistRemovedToast: "پسندیدہ فہرست سے ہٹا دیا گیا۔",
    buddyName: "سودا بڈی",
    buddyGreeting: "السلام علیکم!",
    buddyTipBody:
      "میانوالی کی تصدیق شدہ دکانیں دیکھیں، پسندیدہ اشیاء محفوظ کریں اور اپنا آرڈر لائیو ٹریک کریں۔",
    buddyGotItBtn: "سمجھ آ گیا!",
    orderConfirmedTitle: "آرڈر کنفرم ہو گیا!",
    orderConfirmedBody:
      "آپ کا کیش آن ڈلیوری آرڈر مقامی دکان کو بھیج دیا گیا ہے۔ اب آپ لائیو ٹریکنگ دیکھ سکتے ہیں۔",
    trackLiveOrderBtn: "لائیو آرڈر ٹریک کریں",
    continueShoppingBtn: "مزید خریداری کریں",
    liveTrackingBadge: "لائیو آرڈر ٹریکنگ",
    liveTrackingTitle: "لائیو آرڈر",
    trackStep1Title: "آرڈر کنفرم",
    trackStep1Sub: "مقامی دکاندار کو آرڈر موصول ہو گیا",
    trackStep2Title: "پیک اور سیل",
    trackStep2Sub: "معیار کی جانچ اور ترسیل کی تیاری",
    trackStep3Title: "رائیڈر روانہ",
    trackStep3Sub: "آپ کے پتے کی طرف ترسیل جاری ہے",
    trackStep4Title: "محفوظ ترسیل مکمل",
    trackStep4Sub: "کیش آن ڈلیوری مکمل ہو گئی",
    serviceTrackStep1Title: "بکنگ موصول",
    serviceTrackStep1Sub: "سروس فراہم کنندہ کو درخواست بھیج دی گئی",
    serviceTrackStep2Title: "سیلر کی منظوری",
    serviceTrackStep2Sub: "کام اور وقت طے ہو گیا",
    serviceTrackStep3Title: "کام جاری ہے",
    serviceTrackStep3Sub: "سروس کی تکمیل جاری ہے",
    serviceTrackStep4Title: "سروس مکمل",
    serviceTrackStep4Sub: "کام قبول اور ادائیگی کی تصدیق ہو گئی",
    becomeSellerBtn: "مقامی سیلر بنیں",
    inCartLabel: "کارٹ میں شامل",
    sellerHeroBadge: "میانوالی سیلر اسٹوڈیو • 0% بیٹا کمیشن",
    sellerHeroTitle: "اپنی مقامی دکان یا ہنر کو ڈیجیٹل اسٹور میں بدلیں۔",
    sellerHeroSubtitle:
      "میانوالی، عیسیٰ خیل اور پپلاں کے خریداروں تک کیش آن ڈلیوری رسائی — گھریلو ہنرمندوں کے لیے مکمل رازداری کے ساتھ (PQ-07)۔",
    sellerStepAccountBadge: "مرحلہ 1 از 2 • سیلر اکاؤنٹ",
    sellerStepSetupBadge: "مرحلہ 2 از 2 • اسٹور سیٹ اپ",
    sellerOnboardingHeading: "میانوالی میں اپنا مقامی اسٹور رجسٹر کریں",
    sellerSignInGateBody:
      "پہلے مفت سوداو اکاؤنٹ بنائیں یا لاگ ان کریں — آپ کے اسٹور کا نام خودکار طور پر محفوظ رہے گا۔",
    sellerCreateAccountBtn: "سیلر اکاؤنٹ بنائیں",
    sellerExistingSignInBtn: "پہلے سے اکاؤنٹ موجود ہے؟ لاگ ان کریں",
    sellerViewPublicStoreBtn: "عوامی اسٹور دیکھیں",
    sellerEmptyOrdersTitle: "ابھی کوئی اسٹور آرڈر نہیں آیا",
    sellerEmptyOrdersBody:
      "اپنا اسٹور لنک یا پرنٹیبل QR اسٹیکر واٹس ایپ پر شیئر کریں تاکہ مقامی خریدار پہلا آرڈر دے سکیں۔",
    sellerShareQrCta: "اسٹور اور QR شیئر کھولیں",
    sellerEmptyProductsNote:
      "ابھی کوئی پروڈکٹ شامل نہیں کی گئی۔ نیچے اپنی پہلی پروڈکٹ درج کریں۔",
    sellerEmptyServicesNote:
      "ابھی کوئی سروس لسٹنگ موجود نہیں۔ نیچے اپنا پہلا سروس پیکج بنائیں۔"
  }
};

export function getLocaleDirection(locale: LocaleCode): "ltr" | "rtl" {
  return locale === "ur" ? "rtl" : "ltr";
}
