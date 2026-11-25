"use client";

import type {
  CategoryDto,
  CommissionSummaryDto,
  DistrictDto,
  MediaAssetDto,
  OrderDetailDto,
  OrderMessageDto,
  PrivateStoreDto,
  ProductDto,
  SellerProfileDto,
  SellerType,
  ServiceListingDto,
  ServiceMode,
  ServicePackageInput
} from "@saudavo/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  EmptyCatalogSpot,
  EmptyInboxSpot,
  SaudaBuddyAvatar,
  SellerStudioIllustration,
  SpotState
} from "../../components/illustrations";
import { useAppContext } from "../../components/locale-provider";
import { StoreShareAndQrCard } from "../../components/qr-poster";
import {
  ConfirmActionButton,
  ListCardSkeleton,
  OrderTimeline,
  StatusBadge,
  TrustPill
} from "../../components/ui-primitives";
import {
  ApiClientError,
  archiveSellerProduct,
  confirmSellerCodCollection,
  confirmSellerManualPayment,
  confirmSellerOrder,
  createSellerProduct,
  createSellerService,
  fetchCategories,
  fetchDistricts,
  fetchOrderMessages,
  fetchSellerCommissionSummary,
  fetchSellerOrders,
  fetchSellerProducts,
  fetchSellerProfile,
  fetchSellerServices,
  fetchSellerStore,
  postOrderMessage,
  submitSellerOnboarding,
  updateSellerOrderStatus,
  updateSellerProduct,
  updateSellerService,
  updateSellerStore
} from "../../lib/api-client";
import { uploadImageAssetToS3 } from "../../lib/media-upload";
import {
  formatPkrFromPaisa,
  paisaToWholeRupees,
  parseWholeRupeesToPaisa
} from "../../lib/money";

type SellerTab = "ORDERS" | "PRODUCTS" | "SERVICES" | "GROWTH";

function slugifyStoreName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function SellerStudioPage() {
  const router = useRouter();
  const { locale, t, user, refreshUser, showToast } = useAppContext();

  const [profile, setProfile] = useState<SellerProfileDto | null>(null);
  const [store, setStore] = useState<PrivateStoreDto | null>(null);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [services, setServices] = useState<ServiceListingDto[]>([]);
  const [orders, setOrders] = useState<OrderDetailDto[]>([]);
  const [summary, setSummary] = useState<CommissionSummaryDto | null>(null);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [serviceCategories, setServiceCategories] = useState<CategoryDto[]>([]);

  // Onboarding form
  const [sellerType, setSellerType] = useState<SellerType>("HOME_MAKER");
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);

  // New Product form (Rupees input converted safely to integer paisa)
  const [prodTitle, setProdTitle] = useState("");
  const [prodCatId, setProdCatId] = useState("");
  const [prodPriceRupees, setProdPriceRupees] = useState(1500);
  const [prodStock, setProdStock] = useState(5);
  const [prodDesc, setProdDesc] = useState("");
  const [uploadedAssets, setUploadedAssets] = useState<MediaAssetDto[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // New Service Listing form (1-3 tiered packages)
  const [svcTitle, setSvcTitle] = useState("");
  const [svcCatId, setSvcCatId] = useState("");
  const [svcMode, setSvcMode] = useState<ServiceMode>("ON_SITE");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcPackages, setSvcPackages] = useState<ServicePackageInput[]>([
    {
      tierName: "Standard",
      description: "Standard package with scope confirmation.",
      pricePaisa: 250_000,
      deliveryEstimateDays: 3,
      maxRevisions: 1,
      isActive: true
    }
  ]);

  // Tab navigation & Store Settings Editor
  const [activeTab, setActiveTab] = useState<SellerTab>("ORDERS");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeliveryFeeRupees, setEditDeliveryFeeRupees] = useState(0);
  const [editShowPublicPhone, setEditShowPublicPhone] = useState(false);
  const [editPublicPhone, setEditPublicPhone] = useState("");
  const [editShowPublicAddress, setEditShowPublicAddress] = useState(false);
  const [editPublicAddress, setEditPublicAddress] = useState("");

  // Order chat drawer state
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<OrderMessageDto[]>([]);
  const [chatText, setChatText] = useState("");

  // Per-order offline payment reference description
  const [manualPaymentDescByOrder, setManualPaymentDescByOrder] = useState<
    Record<string, string>
  >({});

  const [loading, setLoading] = useState(true);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSellerWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const [distRes, catRes, svcCatRes] = await Promise.all([
        fetchDistricts(),
        fetchCategories("PRODUCT"),
        fetchCategories("SERVICE")
      ]);
      setDistricts(distRes.data);
      setCategories(catRes.data);
      setServiceCategories(svcCatRes.data);
      if (catRes.data[0] && !prodCatId) {
        setProdCatId(catRes.data[0].id);
      }
      if (svcCatRes.data[0] && !svcCatId) {
        setSvcCatId(svcCatRes.data[0].id);
      }
      const firstZone = distRes.data[0]?.areaZones[0]?.id;
      if (firstZone && selectedZoneIds.length === 0) {
        setSelectedZoneIds([firstZone]);
      }

      if (user) {
        try {
          const [profRes, storeRes, prodRes, svcRes, ordRes, sumRes] =
            await Promise.all([
              fetchSellerProfile(),
              fetchSellerStore(),
              fetchSellerProducts(),
              fetchSellerServices(),
              fetchSellerOrders(),
              fetchSellerCommissionSummary()
            ]);
          setProfile(profRes.data);
          setStore(storeRes.data);
          setEditDisplayName(storeRes.data.displayName);
          setEditDescription(storeRes.data.description ?? "");
          setEditDeliveryFeeRupees(
            paisaToWholeRupees(storeRes.data.defaultDeliveryFeePaisa)
          );
          setEditShowPublicPhone(storeRes.data.showPublicPhone);
          setEditPublicPhone(storeRes.data.publicContactPhone ?? "");
          setEditShowPublicAddress(storeRes.data.showPublicAddress);
          setEditPublicAddress(storeRes.data.publicBusinessAddress ?? "");
          setProducts(prodRes.data);
          setServices(svcRes.data);
          setOrders(ordRes.data);
          setSummary(sumRes.data);
        } catch {
          setProfile(null);
          setStore(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [prodCatId, selectedZoneIds.length, svcCatId, user]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const prefill = window.sessionStorage.getItem("saudavo_prefill_store_name");
        if (prefill) {
          setStoreName((prev) => prev || prefill);
          setStoreSlug((prev) => prev || slugifyStoreName(prefill));
          window.sessionStorage.removeItem("saudavo_prefill_store_name");
        }
      } catch {
        // Ignore storage unavailable
      }
    }
  }, []);

  useEffect(() => {
    void loadSellerWorkspace();
  }, [loadSellerWorkspace]);

  const navigateToSellerAuth = (mode: "register" | "login") => {
    if (typeof window !== "undefined" && storeName.trim().length > 0) {
      try {
        window.sessionStorage.setItem(
          "saudavo_prefill_store_name",
          storeName.trim()
        );
      } catch {
        // Ignore storage unavailability
      }
    }
    router.push(
      mode === "login" ? "/auth?intent=seller&mode=login" : "/auth?intent=seller"
    );
  };

  const handleOnboard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const districtId = districts[0]?.id;
    if (!districtId || selectedZoneIds.length === 0) return;
    setErrorMsg(null);
    try {
      await submitSellerOnboarding({
        sellerType,
        store: {
          displayName: storeName,
          slug: storeSlug,
          districtId,
          serviceAreaZoneIds: selectedZoneIds,
          defaultDeliveryFeePaisa: 15_000,
          showPublicPhone: false,
          showPublicAddress: false
        }
      });
      showToast(
        locale === "ur"
          ? "آپ کا مقامی اسٹور جائزے کے لیے جمع ہو گیا!"
          : "Store submitted for moderator review!"
      );
      await refreshUser();
      await loadSellerWorkspace();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Onboarding failed."
      );
    }
  };

  const handleProductPhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (uploadedAssets.length >= 6) {
      setErrorMsg("Maximum 6 product images allowed.");
      return;
    }
    setErrorMsg(null);
    setUploadingMedia(true);
    try {
      const asset = await uploadImageAssetToS3(file, "PRODUCT_IMAGE");
      setUploadedAssets((prev) => [...prev, asset]);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError || err instanceof Error
          ? err.message
          : "Photo upload failed."
      );
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await createSellerProduct({
        categoryId: prodCatId,
        title: prodTitle,
        description: prodDesc,
        basePricePaisa: parseWholeRupeesToPaisa(prodPriceRupees),
        stockQuantity: prodStock,
        deliveryEnabled: true,
        pickupEnabled: true,
        initialStatus: "PENDING_REVIEW",
        ...(uploadedAssets.length > 0
          ? { mediaAssetIds: uploadedAssets.map((a) => a.id) }
          : {})
      });
      setProdTitle("");
      setProdDesc("");
      setUploadedAssets([]);
      setStatusNotice(
        locale === "ur"
          ? "پروڈکٹ منظوری کے لیے بھیج دی گئی۔"
          : "Product submitted for review."
      );
      await loadSellerWorkspace();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to create product."
      );
    }
  };

  const handleCreateService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      await createSellerService({
        categoryId: svcCatId,
        title: svcTitle,
        description: svcDesc,
        serviceMode: svcMode,
        initialStatus: "PENDING_REVIEW",
        packages: svcPackages
      });
      setSvcTitle("");
      setSvcDesc("");
      setStatusNotice("Service listing submitted for review.");
      await loadSellerWorkspace();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : "Unable to create service listing."
      );
    }
  };

  const handleSaveStoreSettings = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      await updateSellerStore({
        displayName: editDisplayName.trim(),
        description: editDescription.trim() || null,
        defaultDeliveryFeePaisa: parseWholeRupeesToPaisa(editDeliveryFeeRupees),
        showPublicPhone: editShowPublicPhone,
        publicContactPhone:
          editShowPublicPhone && editPublicPhone.trim()
            ? editPublicPhone.trim()
            : null,
        showPublicAddress: editShowPublicAddress,
        publicBusinessAddress:
          editShowPublicAddress && editPublicAddress.trim()
            ? editPublicAddress.trim()
            : null
      });
      setStatusNotice("Store settings updated.");
      await loadSellerWorkspace();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : "Unable to update store settings."
      );
    }
  };

  const handleExportCsv = () => {
    const header =
      "OrderNumber,OrderType,Status,PaymentMethod,PaymentStatus,TotalPaisa,CommissionPaisa,SellerNetPaisa,CreatedAt";
    const rows = orders.map((o) =>
      [
        o.orderNumber,
        o.orderType,
        o.status,
        o.paymentMethod,
        o.codCollectionStatus,
        String(o.totalPaisa),
        String(o.commissionAmountPaisa),
        String(o.sellerNetEntitlementPaisa),
        o.createdAt
      ]
        .map((cell) => `"${cell.replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${store?.slug ?? "saudavo"}-orders-ledger.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openOrderChat = async (orderId: string) => {
    if (chatOrderId === orderId) {
      setChatOrderId(null);
      return;
    }
    setChatOrderId(orderId);
    try {
      const res = await fetchOrderMessages(orderId);
      setChatMessages(res.data);
    } catch {
      setChatMessages([]);
    }
  };

  const handleSendSellerMessage = async (orderId: string, bodyText: string) => {
    const trimmed = bodyText.trim();
    if (!trimmed) return;
    setErrorMsg(null);
    try {
      await postOrderMessage(orderId, { body: trimmed });
      setChatText("");
      const res = await fetchOrderMessages(orderId);
      setChatMessages(res.data);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to send message."
      );
    }
  };

  const runOrderAction = async (
    action: () => Promise<unknown>,
    fallbackMessage: string
  ) => {
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      await action();
      await loadSellerWorkspace();
    } catch (err: unknown) {
      setErrorMsg(err instanceof ApiClientError ? err.message : fallbackMessage);
    }
  };

  const pendingCodTotalPaisa = orders.reduce((sum, order) => {
    if (
      order.status !== "CANCELLED" &&
      order.codCollectionStatus === "PENDING_COLLECTION"
    ) {
      return sum + order.totalPaisa;
    }
    return sum;
  }, 0);

  return (
    <main className="fade-slide mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 md:pb-8 lg:px-8 space-y-6">
      {loading ? (
        <ListCardSkeleton rows={2} />
      ) : !user || !profile || !store ? (
        <div className="grid min-h-[580px] grid-cols-1 overflow-hidden rounded-3xl border border-border-subtle bg-surface-card shadow-soft lg:grid-cols-12">
          {/* Split-Screen Left Visual Panel (Saudavo Deep Emerald Gradient) */}
          <section className="relative flex flex-col justify-between gap-6 overflow-hidden bg-gradient-to-br from-[#094232] via-[#0F6B52] to-[#073528] p-7 text-white sm:p-10 lg:col-span-6">
            <div className="relative z-10 space-y-3">
              <span className="inline-block rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold tracking-wide text-[#FDE68A]">
                {t.sellerHeroBadge}
              </span>
              <h1 className="text-2xl font-extrabold leading-snug sm:text-3xl">
                {t.sellerHeroTitle}
              </h1>
              <p className="text-sm leading-relaxed text-white/85">
                {t.sellerHeroSubtitle}
              </p>
            </div>

            <div className="glass-promo relative z-10 rounded-3xl p-3">
              <SellerStudioIllustration />
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-3 text-xs">
              <div className="glass-promo rounded-2xl p-3">
                <p className="font-bold text-white">{t.privacyShieldBadge}</p>
                <p className="mt-0.5 text-white/80">
                  {locale === "ur"
                    ? "شناختی کارڈ کے بغیر آغاز (PQ-07)"
                    : "No CNIC required in beta (PQ-07)"}
                </p>
              </div>
              <div className="glass-promo rounded-2xl p-3">
                <p className="font-bold text-white">
                  {locale === "ur" ? "واٹس ایپ اور QR اسٹیکر" : "WhatsApp & QR Ready"}
                </p>
                <p className="mt-0.5 text-white/80">
                  {locale === "ur"
                    ? "کیش آن ڈلیوری آرڈرز"
                    : "Mianwali Zone COD Delivery"}
                </p>
              </div>
            </div>
          </section>

          {/* Split-Screen Right Onboarding Panel */}
          <section className="flex flex-col justify-center p-6 sm:p-10 lg:col-span-6">
            {errorMsg && (
              <div
                role="alert"
                className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
              >
                {errorMsg}
              </div>
            )}

            {statusNotice && (
              <div
                role="status"
                className="mb-4 flex items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"
              >
                <span>{statusNotice}</span>
                <button
                  type="button"
                  onClick={() => setStatusNotice(null)}
                  className="text-xs font-bold text-emerald-900 hover:underline"
                >
                  ×
                </button>
              </div>
            )}

            {!user ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <span className="inline-block rounded-full bg-brand-primary-soft px-3.5 py-1 text-xs font-bold text-brand-primary">
                    {t.sellerStepAccountBadge}
                  </span>
                  <h2 className="text-2xl font-extrabold text-ink-primary">
                    {t.sellerOnboardingHeading}
                  </h2>
                  <p className="text-sm leading-relaxed text-ink-secondary">
                    {t.sellerSignInGateBody}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="seller-prefill-store-name"
                    className="block text-xs font-semibold text-ink-secondary"
                  >
                    {locale === "ur"
                      ? "دکان یا کاروبار کا نام (اختیاری)"
                      : "Shop or Business Name (Optional)"}
                  </label>
                  <input
                    id="seller-prefill-store-name"
                    type="text"
                    maxLength={80}
                    placeholder="e.g. Mianwali Handloom"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="mt-1.5 w-full rounded-2xl border border-border-subtle px-4 py-3 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={() => navigateToSellerAuth("register")}
                    className="w-full rounded-2xl bg-brand-primary py-3.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-primary-hover"
                  >
                    {t.sellerCreateAccountBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToSellerAuth("login")}
                    className="w-full rounded-2xl border border-border-subtle bg-surface-canvas py-3 text-sm font-semibold text-ink-primary transition hover:border-brand-primary"
                  >
                    {t.sellerExistingSignInBtn}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleOnboard} className="space-y-4">
                <div className="space-y-1.5">
                  <span className="inline-block rounded-full bg-brand-primary-soft px-3.5 py-1 text-xs font-bold text-brand-primary">
                    {t.sellerStepSetupBadge}
                  </span>
                  <h2 className="text-xl font-extrabold text-ink-primary">
                    {t.sellerOnboardingHeading}
                  </h2>
                  <p className="text-xs text-ink-secondary">
                    {locale === "ur"
                      ? "رازداری اولین ترجیح: ذاتی شناختی کارڈ یا گھریلو پتہ ظاہر کیے بغیر مقامی کاروبار چلائیں (PQ-07)"
                      : "Privacy-first Mianwali store management (No CNIC collected in closed beta • PQ-07)"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">
                    {locale === "ur" ? "سیلر کی قسم" : "Seller Type"}
                  </label>
                  <select
                    value={sellerType}
                    onChange={(e) => setSellerType(e.target.value as SellerType)}
                    className="mt-1 w-full rounded-2xl border border-border-subtle bg-surface-card px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
                  >
                    <option value="HOME_MAKER">
                      {locale === "ur"
                        ? "گھریلو ہنرمند (مکمل رازداری محفوظ)"
                        : "Home-Based Seller (Privacy Protected)"}
                    </option>
                    <option value="LOCAL_SHOP">
                      {locale === "ur" ? "مقامی میانوالی دکان" : "Local Mianwali Shop"}
                    </option>
                    <option value="INDIVIDUAL_SELLER">
                      {locale === "ur" ? "انفرادی سیلر" : "Individual Seller"}
                    </option>
                    <option value="SERVICE_PROVIDER">
                      {locale === "ur" ? "سروس فراہم کنندہ" : "Service Provider"}
                    </option>
                  </select>
                </div>

                <input
                  type="text"
                  required
                  placeholder={
                    locale === "ur"
                      ? "اسٹور کا نام (مثلاً میانوالی ہینڈ لوم)"
                      : "Store Display Name (e.g. Mianwali Handloom)"
                  }
                  value={storeName}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setStoreSlug((prevSlug) =>
                      !prevSlug || prevSlug === slugifyStoreName(storeName)
                        ? slugifyStoreName(nextName)
                        : prevSlug
                    );
                    setStoreName(nextName);
                  }}
                  className="w-full rounded-2xl border border-border-subtle px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder={
                    locale === "ur"
                      ? "اسٹور لنک سلگ (مثلاً mianwali-handloom)"
                      : "Store URL Slug (e.g. mianwali-handloom)"
                  }
                  value={storeSlug}
                  onChange={(e) => setStoreSlug(e.target.value.toLowerCase())}
                  className="w-full rounded-2xl border border-border-subtle px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
                />

                <div>
                  <p className="text-xs font-semibold text-ink-secondary">
                    {locale === "ur"
                      ? "میانوالی ڈلیوری علاقہ جات (PQ-08):"
                      : "Mianwali Service Area Coverage (PQ-08):"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(districts[0]?.areaZones ?? []).map((zone) => {
                      const active = selectedZoneIds.includes(zone.id);
                      return (
                        <button
                          key={zone.id}
                          type="button"
                          onClick={() =>
                            setSelectedZoneIds((prev) =>
                              active
                                ? prev.filter((id) => id !== zone.id)
                                : [...prev, zone.id]
                            )
                          }
                          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                            active
                              ? "bg-brand-primary text-white shadow-sm"
                              : "border border-border-subtle bg-surface-muted text-ink-primary hover:border-brand-primary"
                          }`}
                        >
                          {locale === "ur" ? zone.nameUr : zone.nameEn}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-brand-primary py-3.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-primary-hover"
                >
                  {locale === "ur"
                    ? "اسٹور منظوری کے لیے جمع کرائیں"
                    : "Submit Store for Review"}
                </button>
              </form>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sleek Deep Emerald Studio Header Strip */}
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-[#094232] via-[#0F6B52] to-[#073528] p-5 text-white shadow-soft sm:p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 shrink-0 rounded-2xl border border-white/25 bg-white/10 p-1">
                <SaudaBuddyAvatar />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#FDE68A]">
                  {t.sellerStudioTitle}
                </p>
                <h1 dir="auto" className="text-xl font-extrabold sm:text-2xl">
                  {store.displayName}
                </h1>
                <p className="mt-0.5 text-xs text-white/80">
                  {locale === "ur"
                    ? "رازداری اولین ترجیح: ذاتی شناختی کارڈ یا گھریلو پتہ ظاہر کیے بغیر مقامی کاروبار چلائیں (PQ-07)"
                    : "Privacy-first Mianwali store management (No CNIC collected in closed beta • PQ-07)"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={profile.verificationStatus} />
              <StatusBadge status={store.status} />
              {store.status === "ACTIVE" && (
                <Link
                  href={`/stores/${store.slug}`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  {t.sellerViewPublicStoreBtn} ↗
                </Link>
              )}
            </div>
          </header>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMsg}
            </div>
          )}

          {statusNotice && (
            <div
              role="status"
              className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            >
              <span>{statusNotice}</span>
              <button
                type="button"
                onClick={() => setStatusNotice(null)}
                className="text-xs font-bold text-emerald-900 hover:underline"
              >
                ×
              </button>
            </div>
          )}

          {/* Seller Workspace Tabs */}
          <div className="flex flex-wrap gap-2.5 border-b border-border-subtle pb-3">
            {(
              [
                {
                  key: "ORDERS",
                  label: `${t.sellerTabOrders} (${orders.length})`
                },
                {
                  key: "PRODUCTS",
                  label: `${t.sellerTabProducts} (${products.length})`
                },
                {
                  key: "SERVICES",
                  label: `${t.sellerTabServices} (${services.length})`
                },
                {
                  key: "GROWTH",
                  label: t.sellerTabGrowth
                }
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-2xl px-4 py-2 text-xs font-semibold transition ${
                  activeTab === tab.key
                    ? "clay-pill-active text-white"
                    : "clay-pill text-ink-secondary hover:text-brand-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "GROWTH" && (
            <div className="space-y-6">
              {store.status === "ACTIVE" && (
                <StoreShareAndQrCard
                  storeSlug={store.slug}
                  storeDisplayName={store.displayName}
                  districtName={store.districtNameEn}
                />
              )}

              <section className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card space-y-4">
                <h2 className="text-lg font-bold text-ink-primary">
                  {locale === "ur"
                    ? "اسٹور پروفائل اور رازداری سیٹنگز"
                    : "Store Profile & Privacy Settings"}
                </h2>
                <form
                  onSubmit={handleSaveStoreSettings}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-secondary">
                      {locale === "ur" ? "اسٹور کا نام" : "Store Display Name"}
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border-subtle px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-secondary">
                      {locale === "ur"
                        ? "ڈیفالٹ ڈلیوری فیس (روپے Rs.)"
                        : "Default Delivery Fee (Rs.)"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editDeliveryFeeRupees}
                      onChange={(e) =>
                        setEditDeliveryFeeRupees(Number(e.target.value))
                      }
                      className="mt-1 w-full rounded-xl border border-border-subtle px-3.5 py-2 text-sm"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Store bio / description..."
                    className="rounded-xl border border-border-subtle px-3.5 py-2 text-sm sm:col-span-2"
                  />
                  <label className="flex items-center gap-2 text-xs text-ink-primary">
                    <input
                      type="checkbox"
                      checked={editShowPublicPhone}
                      onChange={(e) => setEditShowPublicPhone(e.target.checked)}
                    />
                    Show public business phone (off by default for privacy)
                  </label>
                  {editShowPublicPhone && (
                    <input
                      type="text"
                      value={editPublicPhone}
                      onChange={(e) => setEditPublicPhone(e.target.value)}
                      placeholder="03001234567"
                      className="rounded-xl border border-border-subtle px-3.5 py-2 text-sm"
                    />
                  )}
                  <label className="flex items-center gap-2 text-xs text-ink-primary">
                    <input
                      type="checkbox"
                      checked={editShowPublicAddress}
                      onChange={(e) =>
                        setEditShowPublicAddress(e.target.checked)
                      }
                    />
                    Show public shop address (never enable for home-based stores)
                  </label>
                  {editShowPublicAddress && (
                    <input
                      type="text"
                      value={editPublicAddress}
                      onChange={(e) => setEditPublicAddress(e.target.value)}
                      placeholder="Shop #4, Main Bazaar Mianwali"
                      className="rounded-xl border border-border-subtle px-3.5 py-2 text-sm"
                    />
                  )}
                  <button
                    type="submit"
                    className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white sm:w-fit"
                  >
                    {locale === "ur" ? "سیٹنگز محفوظ کریں" : "Save Store Settings"}
                  </button>
                </form>
              </section>
            </div>
          )}

          {/* Accounting Summary + Orders Tab */}
          {activeTab === "ORDERS" && summary && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-accent-soft px-4 py-2 text-xs font-semibold text-brand-accent">
                <span>
                  {summary.accountingDisclaimer} {summary.promotionalBetaNote}
                </span>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="rounded-lg bg-surface-card px-3 py-1 text-xs font-semibold text-ink-primary shadow-sm hover:border-brand-primary"
                >
                  {t.exportCsvLedger}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl border border-border-subtle bg-surface-card p-5 shadow-card">
                  <p className="text-xs text-ink-secondary">
                    {locale === "ur" ? "مکمل فروخت (گراس)" : "Completed Gross Sales"}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-ink-primary">
                    {formatPkrFromPaisa(summary.completedGrossPaisa, locale)}
                  </p>
                </div>
                <div className="rounded-3xl border border-border-subtle bg-surface-card p-5 shadow-card">
                  <p className="text-xs text-ink-secondary">
                    {locale === "ur" ? "واجب الادا COD / آف لائن" : "Pending COD / Offline"}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-brand-accent">
                    {formatPkrFromPaisa(pendingCodTotalPaisa, locale)}
                  </p>
                </div>
                <div className="rounded-3xl border border-border-subtle bg-surface-card p-5 shadow-card">
                  <p className="text-xs text-ink-secondary">
                    {locale === "ur" ? "مجموعی کمیشن" : "Accrued Commission"}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-brand-primary">
                    {formatPkrFromPaisa(summary.accruedCommissionPaisa, locale)}
                  </p>
                </div>
                <div className="rounded-3xl border border-border-subtle bg-surface-card p-5 shadow-card">
                  <p className="text-xs text-ink-secondary">
                    {locale === "ur" ? "بقایا کمیشن" : "Outstanding Commission Owed"}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-ink-secondary">
                    {formatPkrFromPaisa(
                      summary.outstandingCommissionOwedPaisa,
                      locale
                    )}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Seller Orders & Split COD Confirmation */}
          {activeTab === "ORDERS" &&
            (orders.length === 0 ? (
              <SpotState
                illustration={<EmptyInboxSpot />}
                badge={t.sellerStudioTitle}
                title={t.sellerEmptyOrdersTitle}
                description={t.sellerEmptyOrdersBody}
                actions={
                  <button
                    type="button"
                    onClick={() => setActiveTab("GROWTH")}
                    className="rounded-2xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-primary-hover"
                  >
                    {t.sellerShareQrCta}
                  </button>
                }
              />
            ) : (
          <section className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink-primary">
              Store Orders ({orders.length})
            </h2>
            <div className="mt-4 space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="space-y-3 rounded-xl border border-border-subtle p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-ink-primary">
                        #{order.orderNumber} —{" "}
                        {formatPkrFromPaisa(order.totalPaisa, locale)}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-secondary">
                        <span>
                          {order.orderType} • {order.paymentMethod}
                        </span>
                        <StatusBadge status={order.status} />
                        <StatusBadge status={order.codCollectionStatus} />
                        {order.paymentMethod === "COD" && order.buyerCodStats && (
                          <TrustPill
                            variant={
                              order.buyerCodStats.refusedCodCount > 0
                                ? "cod"
                                : order.buyerCodStats.completedCodCount > 0
                                  ? "privacy"
                                  : "verified"
                            }
                            label={
                              order.buyerCodStats.refusedCodCount > 0
                                ? `Caution: ${order.buyerCodStats.refusedCodCount} COD refusal(s)`
                                : order.buyerCodStats.completedCodCount > 0
                                  ? `Trusted Buyer: ${order.buyerCodStats.completedCodCount} COD paid`
                                  : "First-time COD buyer"
                            }
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {order.status === "PENDING_CONFIRMATION" && (
                        <button
                          type="button"
                          onClick={() =>
                            void runOrderAction(
                              () => confirmSellerOrder(order.id),
                              "Unable to confirm order."
                            )
                          }
                          className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          {t.confirmOrderBtn}
                        </button>
                      )}

                      {order.orderType === "PHYSICAL" &&
                        order.status === "CONFIRMED" && (
                          <button
                            type="button"
                            onClick={() =>
                              void runOrderAction(
                                () =>
                                  updateSellerOrderStatus(order.id, {
                                    toStatus: "READY_FOR_DISPATCH"
                                  }),
                                "Unable to mark order ready."
                              )
                            }
                            className="rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-primary"
                          >
                            {t.markReadyBtn}
                          </button>
                        )}

                      {order.orderType === "PHYSICAL" &&
                        order.status === "READY_FOR_DISPATCH" && (
                          <button
                            type="button"
                            onClick={() =>
                              void runOrderAction(
                                () =>
                                  updateSellerOrderStatus(order.id, {
                                    toStatus: "DELIVERED"
                                  }),
                                "Unable to mark order delivered."
                              )
                            }
                            className="rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-primary"
                          >
                            {t.markDeliveredBtn}
                          </button>
                        )}

                      {order.orderType === "SERVICE" &&
                        order.status === "CONFIRMED" && (
                          <button
                            type="button"
                            onClick={() =>
                              void runOrderAction(
                                () =>
                                  updateSellerOrderStatus(order.id, {
                                    toStatus: "IN_PROGRESS"
                                  }),
                                "Unable to start service order."
                              )
                            }
                            className="rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-primary"
                          >
                            {t.startServiceBtn}
                          </button>
                        )}

                      {order.orderType === "SERVICE" &&
                        order.status === "IN_PROGRESS" && (
                          <button
                            type="button"
                            onClick={() =>
                              void runOrderAction(
                                () =>
                                  updateSellerOrderStatus(order.id, {
                                    toStatus: "DELIVERY_SUBMITTED",
                                    deliverySummary:
                                      "Completed work delivered as scoped."
                                  }),
                                "Unable to submit service delivery."
                              )
                            }
                            className="rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-primary"
                          >
                            {t.submitDeliveryBtn}
                          </button>
                        )}

                      {order.paymentMethod === "COD" &&
                        ((order.orderType === "PHYSICAL" &&
                          order.status === "DELIVERED") ||
                          (order.orderType === "SERVICE" &&
                            order.status === "DELIVERY_SUBMITTED")) &&
                        order.codCollectionStatus === "PENDING_COLLECTION" && (
                          <button
                            type="button"
                            onClick={() =>
                              void runOrderAction(
                                () =>
                                  confirmSellerCodCollection(order.id, {
                                    collectionStatus: "COLLECTED",
                                    collectedAmountPaisa: order.totalPaisa
                                  }),
                                "Unable to record COD cash collection."
                              )
                            }
                            className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            {t.confirmCodCashBtn}
                          </button>
                        )}

                      {order.paymentMethod === "MANUAL_OFFLINE" &&
                        order.status !== "CANCELLED" &&
                        order.codCollectionStatus === "PENDING_COLLECTION" && (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={
                                manualPaymentDescByOrder[order.id] ??
                                "JazzCash / EasyPaisa Offline"
                              }
                              onChange={(e) =>
                                setManualPaymentDescByOrder((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value
                                }))
                              }
                              placeholder="Offline method ref"
                              className="rounded-lg border border-border-subtle px-2.5 py-1 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                void runOrderAction(
                                  () =>
                                    confirmSellerManualPayment(order.id, {
                                      collectionStatus: "COLLECTED",
                                      collectedAmountPaisa: order.totalPaisa,
                                      manualPaymentMethodDesc:
                                        (
                                          manualPaymentDescByOrder[order.id] ??
                                          "JazzCash / EasyPaisa Offline"
                                        ).trim() || "Offline Payment"
                                    }),
                                  "Unable to confirm offline payment."
                                )
                              }
                              className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              {t.confirmOfflinePayBtn}
                            </button>
                          </div>
                        )}

                      <button
                        type="button"
                        onClick={() => void openOrderChat(order.id)}
                        className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-ink-primary hover:border-brand-primary"
                      >
                        {t.orderChatBtn}
                      </button>
                    </div>
                  </div>

                  <OrderTimeline
                    orderType={order.orderType}
                    status={order.status}
                    locale={locale}
                  />

                  {chatOrderId === order.id && (
                    <div className="rounded-xl border border-border-subtle bg-surface-muted/40 p-3 space-y-2.5">
                      <div className="max-h-48 space-y-1.5 overflow-y-auto">
                        {chatMessages.length === 0 ? (
                          <p className="text-xs text-ink-secondary">
                            {locale === "ur"
                              ? "ابھی کوئی پیغام موجود نہیں۔"
                              : "No messages on this order yet."}
                          </p>
                        ) : (
                          chatMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className="rounded-lg bg-surface-card p-2 text-xs"
                            >
                              <span className="font-bold text-brand-primary">
                                {msg.senderRole}:
                              </span>{" "}
                              <span dir="auto" className="text-ink-primary">
                                {msg.body}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(locale === "ur"
                          ? [
                              "جی، آپ کا آرڈر تیار کیا جا رہا ہے۔",
                              "برائے کرم ڈلیوری کے لیے قریبی نشان بتا دیں۔",
                              "آپ کا پارسل آج ڈسپیچ ہو رہا ہے۔"
                            ]
                          : [
                              "Order confirmed and preparing now.",
                              "Please share nearest Mianwali landmark.",
                              "Rider/service scheduled for today."
                            ]
                        ).map((quick) => (
                          <button
                            key={quick}
                            type="button"
                            onClick={() =>
                              void handleSendSellerMessage(order.id, quick)
                            }
                            className="rounded-full border border-brand-primary/30 bg-surface-card px-2.5 py-1 text-[11px] font-medium text-brand-primary hover:bg-brand-primary-soft"
                          >
                            + {quick}
                          </button>
                        ))}
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleSendSellerMessage(order.id, chatText);
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={chatText}
                          onChange={(e) => setChatText(e.target.value)}
                          placeholder={
                            locale === "ur"
                              ? "خریدار کو پیغام لکھیں..."
                              : "Reply to buyer..."
                          }
                          className="flex-1 rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          {locale === "ur" ? "بھیجیں" : "Send"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
            ))}

          {/* Seller Products List + Add Product Form */}
          {activeTab === "PRODUCTS" && (
          <section className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card space-y-4">
            <h2 className="text-lg font-bold text-ink-primary">
              Physical Products ({products.length} listed)
            </h2>

            {products.length === 0 ? (
              <div className="rounded-2xl border border-border-subtle bg-surface-muted/40 p-5 text-center">
                <EmptyCatalogSpot />
                <p className="mt-2 text-xs text-ink-secondary">
                  {t.sellerEmptyProductsNote}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {products.map((prod) => (
                  <div
                    key={prod.id}
                    className="rounded-xl border border-border-subtle p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p dir="auto" className="text-sm font-bold text-ink-primary">
                          {prod.title}
                        </p>
                        <p className="text-xs text-ink-secondary">
                          {formatPkrFromPaisa(prod.basePricePaisa, locale)} • Stock:{" "}
                          {prod.stockQuantity}
                        </p>
                      </div>
                      <StatusBadge status={prod.status} />
                    </div>
                    {prod.rejectionReason && (
                      <p className="text-xs text-red-700">
                        Rejection reason: {prod.rejectionReason}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          void runOrderAction(
                            () =>
                              updateSellerProduct(prod.id, {
                                stockQuantity: prod.stockQuantity + 1
                              }),
                            "Unable to update stock."
                          )
                        }
                        className="rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink-primary"
                      >
                        +1 Stock
                      </button>
                      {prod.stockQuantity > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            void runOrderAction(
                              () =>
                                updateSellerProduct(prod.id, {
                                  stockQuantity: prod.stockQuantity - 1
                                }),
                              "Unable to update stock."
                            )
                          }
                          className="rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink-primary"
                        >
                          -1 Stock
                        </button>
                      )}
                      {(prod.status === "REJECTED" || prod.status === "DRAFT") && (
                        <button
                          type="button"
                          onClick={() =>
                            void runOrderAction(
                              () =>
                                updateSellerProduct(prod.id, {
                                  status: "PENDING_REVIEW"
                                }),
                              "Unable to resubmit product."
                            )
                          }
                          className="rounded-lg bg-brand-primary px-2.5 py-1 text-xs font-semibold text-white"
                        >
                          Resubmit for Review
                        </button>
                      )}
                      <ConfirmActionButton
                        label={t.archiveBtn}
                        confirmLabel={t.confirmYesBtn}
                        cancelLabel={t.cancelBtn}
                        onConfirm={() => {
                          void runOrderAction(
                            () => archiveSellerProduct(prod.id),
                            "Unable to archive product."
                          );
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={handleCreateProduct}
              className="mt-4 grid grid-cols-1 gap-3 border-t border-border-subtle pt-4 sm:grid-cols-2"
            >
              <input
                type="text"
                required
                minLength={3}
                placeholder="Product Title"
                value={prodTitle}
                onChange={(e) => setProdTitle(e.target.value)}
                className="rounded-xl border border-border-subtle px-3.5 py-2 text-sm"
              />
              <select
                value={prodCatId}
                onChange={(e) => setProdCatId(e.target.value)}
                className="rounded-xl border border-border-subtle bg-surface-card px-3.5 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === "ur" ? c.nameUr : c.nameEn}
                  </option>
                ))}
              </select>
              <div>
                <label className="block text-[11px] font-semibold text-ink-secondary">
                  {locale === "ur"
                    ? "قیمت (روپے Rs.)"
                    : "Price in Rupees (Rs.)"}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={prodPriceRupees}
                  onChange={(e) => setProdPriceRupees(Number(e.target.value))}
                  placeholder="e.g. 1500"
                  className="mt-1 w-full rounded-xl border border-border-subtle px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-secondary">
                  {locale === "ur" ? "موجودہ اسٹاک" : "Stock Quantity"}
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={prodStock}
                  onChange={(e) => setProdStock(Number(e.target.value))}
                  placeholder="Stock quantity"
                  className="mt-1 w-full rounded-xl border border-border-subtle px-3.5 py-2 text-sm"
                />
              </div>
              <textarea
                required
                minLength={10}
                rows={2}
                placeholder="Description"
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                className="rounded-xl border border-border-subtle px-3.5 py-2 text-sm sm:col-span-2"
              />
              <div className="space-y-2 rounded-xl border border-dashed border-border-subtle bg-surface-muted/50 p-3.5 sm:col-span-2">
                <label
                  htmlFor="seller-product-photo"
                  className="block text-xs font-semibold text-ink-secondary"
                >
                  Product Photos (JPEG/PNG/WebP, max 5 MB — EXIF GPS auto-stripped)
                </label>
                <input
                  id="seller-product-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingMedia || uploadedAssets.length >= 6}
                  onChange={(e) => void handleProductPhotoUpload(e)}
                  className="block w-full text-xs text-ink-secondary"
                />
                {uploadingMedia && (
                  <p className="text-xs font-medium text-brand-primary">
                    Stripping EXIF & uploading privately to S3...
                  </p>
                )}
                {uploadedAssets.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {uploadedAssets.map((asset, idx) => (
                      <span
                        key={asset.id}
                        className="inline-flex items-center gap-2 rounded-full bg-brand-primary-soft px-3 py-1 text-xs font-semibold text-brand-primary"
                      >
                        Photo {idx + 1} ({Math.max(1, Math.round(asset.sizeBytes / 1024))} KB • EXIF Stripped)
                        <button
                          type="button"
                          onClick={() =>
                            setUploadedAssets((prev) =>
                              prev.filter((item) => item.id !== asset.id)
                            )
                          }
                          aria-label={`Remove photo ${idx + 1}`}
                          className="text-red-700 hover:underline"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={uploadingMedia}
                className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-fit"
              >
                Submit Product for Review
              </button>
            </form>
          </section>
          )}

          {/* Service Listings & Add Service Form */}
          {activeTab === "SERVICES" && (
          <section className="rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card space-y-4">
            <h2 className="text-lg font-bold text-ink-primary">
              Service Listings ({services.length} listed)
            </h2>

            {services.length === 0 ? (
              <div className="rounded-2xl border border-border-subtle bg-surface-muted/40 p-5 text-center">
                <EmptyCatalogSpot />
                <p className="mt-2 text-xs text-ink-secondary">
                  {t.sellerEmptyServicesNote}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    className="rounded-xl border border-border-subtle p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p dir="auto" className="text-sm font-bold text-ink-primary">
                          {svc.title}
                        </p>
                        <p className="text-xs text-ink-secondary">
                          {svc.serviceMode} • {svc.packages.length} package(s)
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={svc.status} />
                        {svc.packages[0] && (
                          <span className="text-xs font-bold text-brand-primary">
                            {formatPkrFromPaisa(
                              svc.packages[0].pricePaisa,
                              locale
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    {svc.rejectionReason && (
                      <p className="text-xs text-red-700">
                        Rejection reason: {svc.rejectionReason}
                      </p>
                    )}
                    {(svc.status === "REJECTED" || svc.status === "DRAFT") && (
                      <button
                        type="button"
                        onClick={() =>
                          void runOrderAction(
                            () =>
                              updateSellerService(svc.id, {
                                status: "PENDING_REVIEW"
                              }),
                            "Unable to resubmit service."
                          )
                        }
                        className="rounded-lg bg-brand-primary px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        Resubmit for Review
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={handleCreateService}
              className="grid grid-cols-1 gap-3 border-t border-border-subtle pt-4 sm:grid-cols-2"
            >
              <input
                type="text"
                required
                minLength={3}
                placeholder="Service Title (e.g. AC Repair or Logo Design)"
                value={svcTitle}
                onChange={(e) => setSvcTitle(e.target.value)}
                className="rounded-xl border border-border-subtle px-3.5 py-2 text-sm"
              />
              <select
                value={svcCatId}
                onChange={(e) => setSvcCatId(e.target.value)}
                className="rounded-xl border border-border-subtle bg-surface-card px-3.5 py-2 text-sm"
              >
                {serviceCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn}
                  </option>
                ))}
              </select>
              <select
                value={svcMode}
                onChange={(e) => setSvcMode(e.target.value as ServiceMode)}
                className="rounded-xl border border-border-subtle bg-surface-card px-3.5 py-2 text-sm sm:col-span-2"
              >
                <option value="ON_SITE">ON_SITE (COD allowed)</option>
                <option value="HYBRID">HYBRID (COD allowed)</option>
                <option value="REMOTE">REMOTE (Manual Offline Payment)</option>
              </select>

              <div className="space-y-3 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-secondary">
                    Service Packages ({svcPackages.length}/3)
                  </span>
                  {svcPackages.length < 3 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSvcPackages((prev) => [
                          ...prev,
                          {
                            tierName: prev.length === 1 ? "Premium" : "Plus",
                            description: "Expanded scope & priority turnaround.",
                            pricePaisa: 450_000,
                            deliveryEstimateDays: 2,
                            maxRevisions: 3,
                            isActive: true
                          }
                        ])
                      }
                      className="rounded-lg border border-brand-primary px-2.5 py-1 text-xs font-semibold text-brand-primary hover:bg-brand-primary-soft"
                    >
                      + Add Package Tier
                    </button>
                  )}
                </div>

                {svcPackages.map((pkg, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 gap-2.5 rounded-xl border border-border-subtle bg-surface-muted/40 p-3 sm:grid-cols-4"
                  >
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={pkg.tierName}
                      onChange={(e) =>
                        setSvcPackages((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, tierName: e.target.value } : item
                          )
                        )
                      }
                      placeholder="Tier Name"
                      className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs"
                    />
                    <input
                      type="number"
                      required
                      min={1}
                      value={paisaToWholeRupees(pkg.pricePaisa)}
                      onChange={(e) =>
                        setSvcPackages((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? {
                                  ...item,
                                  pricePaisa: parseWholeRupeesToPaisa(
                                    e.target.value
                                  )
                                }
                              : item
                          )
                        )
                      }
                      placeholder="Price (Rs.)"
                      className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs"
                    />
                    <input
                      type="number"
                      required
                      min={1}
                      max={365}
                      value={pkg.deliveryEstimateDays}
                      onChange={(e) =>
                        setSvcPackages((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? {
                                  ...item,
                                  deliveryEstimateDays: Number(e.target.value)
                                }
                              : item
                          )
                        )
                      }
                      placeholder="Days"
                      className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        required
                        min={0}
                        max={50}
                        value={pkg.maxRevisions}
                        onChange={(e) =>
                          setSvcPackages((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? { ...item, maxRevisions: Number(e.target.value) }
                                : item
                            )
                          )
                        }
                        placeholder="Revisions"
                        className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs"
                      />
                      {svcPackages.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setSvcPackages((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="rounded-lg border border-red-200 px-2 text-xs font-semibold text-red-700"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      minLength={5}
                      value={pkg.description}
                      onChange={(e) =>
                        setSvcPackages((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, description: e.target.value }
                              : item
                          )
                        )
                      }
                      placeholder="Package deliverable summary"
                      className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs sm:col-span-4"
                    />
                  </div>
                ))}
              </div>

              <textarea
                required
                minLength={10}
                rows={2}
                placeholder="Full Service Description"
                value={svcDesc}
                onChange={(e) => setSvcDesc(e.target.value)}
                className="rounded-xl border border-border-subtle px-3.5 py-2 text-sm sm:col-span-2"
              />
              <button
                type="submit"
                className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white sm:w-fit"
              >
                Submit Service for Review
              </button>
            </form>
          </section>
          )}
        </div>
      )}
    </main>
  );
}
