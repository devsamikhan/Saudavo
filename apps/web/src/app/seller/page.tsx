"use client";

import type {
  CategoryDto,
  CommissionSummaryDto,
  DistrictDto,
  MediaAssetDto,
  OrderDetailDto,
  PrivateStoreDto,
  ProductDto,
  SellerProfileDto,
  SellerType,
  ServiceListingDto,
  ServiceMode,
  ServicePackageInput
} from "@saudavo/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../../components/locale-provider";
import { StoreShareAndQrCard } from "../../components/qr-poster";
import { StatusBadge, TrustPill } from "../../components/ui-primitives";
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
  fetchSellerCommissionSummary,
  fetchSellerOrders,
  fetchSellerProducts,
  fetchSellerProfile,
  fetchSellerServices,
  fetchSellerStore,
  submitSellerOnboarding,
  updateSellerOrderStatus,
  updateSellerProduct,
  updateSellerService,
  updateSellerStore
} from "../../lib/api-client";
import { uploadImageAssetToS3 } from "../../lib/media-upload";
import { formatPkrFromPaisa } from "../../lib/money";

export default function SellerStudioPage() {
  const { locale, t, user, refreshUser } = useAppContext();

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

  // New Product form
  const [prodTitle, setProdTitle] = useState("");
  const [prodCatId, setProdCatId] = useState("");
  const [prodPricePaisa, setProdPricePaisa] = useState(150_000);
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

  // Store Settings Editor
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeliveryFeePaisa, setEditDeliveryFeePaisa] = useState(0);
  const [editShowPublicPhone, setEditShowPublicPhone] = useState(false);
  const [editPublicPhone, setEditPublicPhone] = useState("");
  const [editShowPublicAddress, setEditShowPublicAddress] = useState(false);
  const [editPublicAddress, setEditPublicAddress] = useState("");

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
          setEditDeliveryFeePaisa(storeRes.data.defaultDeliveryFeePaisa);
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
    void loadSellerWorkspace();
  }, [loadSellerWorkspace]);

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
        basePricePaisa: prodPricePaisa,
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
        defaultDeliveryFeePaisa: editDeliveryFeePaisa,
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
      setSettingsOpen(false);
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

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-center">
        <Link
          href="/auth"
          className="inline-block rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign In for Seller Studio
        </Link>
      </main>
    );
  }

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
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">
            {t.sellerStudioTitle}
          </h1>
          <p className="text-xs text-ink-secondary">
            {locale === "ur"
              ? "رازداری اولین ترجیح: ذاتی شناختی کارڈ یا گھریلو پتہ ظاہر کیے بغیر مقامی کاروبار چلائیں (PQ-07)"
              : "Privacy-first Mianwali store management (No CNIC collected in closed beta • PQ-07)"}
          </p>
        </div>
        {profile && store && (
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={profile.verificationStatus} />
            <StatusBadge status={store.status} />
            <button
              type="button"
              onClick={() => setSettingsOpen((prev) => !prev)}
              className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-semibold text-ink-primary hover:border-brand-primary"
            >
              {locale === "ur" ? "اسٹور سیٹنگز" : "Store Settings & Privacy"}
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {statusNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {statusNotice}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-secondary">Loading Seller Studio...</p>
      ) : !profile || !store ? (
        <form
          onSubmit={handleOnboard}
          className="max-w-xl space-y-4 rounded-2xl border border-border-subtle bg-surface-card p-6"
        >
          <h2 className="text-lg font-bold text-ink-primary">
            Apply for a Local Mianwali Storefront
          </h2>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary">
              Seller Type
            </label>
            <select
              value={sellerType}
              onChange={(e) => setSellerType(e.target.value as SellerType)}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-sm"
            >
              <option value="HOME_MAKER">Home-Based Seller (Privacy Protected)</option>
              <option value="LOCAL_SHOP">Local Mianwali Shop</option>
              <option value="INDIVIDUAL_SELLER">Individual Seller</option>
              <option value="SERVICE_PROVIDER">Service Provider</option>
            </select>
          </div>

          <input
            type="text"
            required
            placeholder="Store Display Name (e.g. Mianwali Handloom)"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full rounded-xl border border-border-subtle px-3.5 py-2.5 text-sm"
          />
          <input
            type="text"
            required
            placeholder="Store URL Slug (e.g. mianwali-handloom)"
            value={storeSlug}
            onChange={(e) => setStoreSlug(e.target.value.toLowerCase())}
            className="w-full rounded-xl border border-border-subtle px-3.5 py-2.5 text-sm"
          />

          <div>
            <p className="text-xs font-semibold text-ink-secondary">
              Mianwali Service Area Coverage (PQ-08):
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
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      active
                        ? "bg-brand-primary text-white"
                        : "border border-border-subtle bg-surface-muted text-ink-primary"
                    }`}
                  >
                    {zone.nameEn}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-brand-primary py-3 text-sm font-semibold text-white"
          >
            Submit Store for Review
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Store QR & Share Card */}
          {store.status === "ACTIVE" && (
            <StoreShareAndQrCard
              storeSlug={store.slug}
              storeDisplayName={store.displayName}
              districtName={store.districtNameEn}
            />
          )}

          {/* Store Settings & Privacy Editor */}
          {settingsOpen && (
            <section className="rounded-2xl border border-border-subtle bg-surface-card p-6 space-y-4">
              <h2 className="text-lg font-bold text-ink-primary">
                {locale === "ur"
                  ? "اسٹور پروفائل اور رازداری سیٹنگز"
                  : "Store Profile & Privacy Settings"}
              </h2>
              <form
                onSubmit={handleSaveStoreSettings}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                <input
                  type="text"
                  required
                  minLength={2}
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Store Display Name"
                  className="rounded-xl border border-border-subtle px-3.5 py-2 text-sm"
                />
                <input
                  type="number"
                  min={0}
                  value={editDeliveryFeePaisa}
                  onChange={(e) =>
                    setEditDeliveryFeePaisa(Number(e.target.value))
                  }
                  placeholder="Default Delivery Fee (paisa)"
                  className="rounded-xl border border-border-subtle px-3.5 py-2 text-sm"
                />
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
                    onChange={(e) => setEditShowPublicAddress(e.target.checked)}
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
                  Save Store Settings
                </button>
              </form>
            </section>
          )}

          {/* Accounting Summary matching Figma 8:98 */}
          {summary && (
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
                <div className="rounded-2xl border border-border-subtle bg-surface-card p-5">
                  <p className="text-xs text-ink-secondary">
                    Completed Gross Sales
                  </p>
                  <p className="mt-1 text-2xl font-bold text-ink-primary">
                    {formatPkrFromPaisa(summary.completedGrossPaisa, locale)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-surface-card p-5">
                  <p className="text-xs text-ink-secondary">
                    Pending COD / Offline
                  </p>
                  <p className="mt-1 text-2xl font-bold text-brand-accent">
                    {formatPkrFromPaisa(pendingCodTotalPaisa, locale)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-surface-card p-5">
                  <p className="text-xs text-ink-secondary">
                    Accrued Commission
                  </p>
                  <p className="mt-1 text-2xl font-bold text-brand-primary">
                    {formatPkrFromPaisa(summary.accruedCommissionPaisa, locale)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-surface-card p-5">
                  <p className="text-xs text-ink-secondary">
                    Outstanding Commission Owed
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
          <section className="rounded-2xl border border-border-subtle bg-surface-card p-6">
            <h2 className="text-lg font-bold text-ink-primary">
              Store Orders ({orders.length})
            </h2>
            <div className="mt-4 space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle p-4"
                >
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
                        Confirm Order
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
                          Mark Ready
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
                          Mark Delivered
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
                          Start Service Work
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
                          Submit Work Delivery
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
                          Confirm COD Cash Collected
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
                            Confirm Offline Payment
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Seller Products List + Add Product Form */}
          <section className="rounded-2xl border border-border-subtle bg-surface-card p-6 space-y-4">
            <h2 className="text-lg font-bold text-ink-primary">
              Physical Products ({products.length} listed)
            </h2>

            {products.length > 0 && (
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
                      <button
                        type="button"
                        onClick={() =>
                          void runOrderAction(
                            () => archiveSellerProduct(prod.id),
                            "Unable to archive product."
                          )
                        }
                        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700"
                      >
                        Archive
                      </button>
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
                    {c.nameEn}
                  </option>
                ))}
              </select>
              <input
                type="number"
                required
                min={100}
                value={prodPricePaisa}
                onChange={(e) => setProdPricePaisa(Number(e.target.value))}
                placeholder="Price in integer paisa (100 paisa = 1 PKR)"
                className="rounded-xl border border-border-subtle px-3.5 py-2 text-sm"
              />
              <input
                type="number"
                required
                min={0}
                value={prodStock}
                onChange={(e) => setProdStock(Number(e.target.value))}
                placeholder="Stock quantity"
                className="rounded-xl border border-border-subtle px-3.5 py-2 text-sm"
              />
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

          {/* Service Listings & Add Service Form */}
          <section className="rounded-2xl border border-border-subtle bg-surface-card p-6 space-y-4">
            <h2 className="text-lg font-bold text-ink-primary">
              Service Listings ({services.length} listed)
            </h2>

            {services.length > 0 && (
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
                      min={100}
                      value={pkg.pricePaisa}
                      onChange={(e) =>
                        setSvcPackages((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, pricePaisa: Number(e.target.value) }
                              : item
                          )
                        )
                      }
                      placeholder="Price (paisa)"
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
        </div>
      )}
    </main>
  );
}
