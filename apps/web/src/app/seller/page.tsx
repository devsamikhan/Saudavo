"use client";

import type {
  CategoryDto,
  CommissionSummaryDto,
  DistrictDto,
  OrderDetailDto,
  PrivateStoreDto,
  ProductDto,
  SellerProfileDto,
  SellerType
} from "@saudavo/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../../components/locale-provider";
import {
  ApiClientError,
  confirmSellerCodCollection,
  confirmSellerOrder,
  createSellerProduct,
  fetchCategories,
  fetchDistricts,
  fetchSellerCommissionSummary,
  fetchSellerOrders,
  fetchSellerProducts,
  fetchSellerProfile,
  fetchSellerStore,
  submitSellerOnboarding,
  updateSellerOrderStatus
} from "../../lib/api-client";
import { formatPkrFromPaisa } from "../../lib/money";

export default function SellerStudioPage() {
  const { locale, user, refreshUser } = useAppContext();

  const [profile, setProfile] = useState<SellerProfileDto | null>(null);
  const [store, setStore] = useState<PrivateStoreDto | null>(null);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [orders, setOrders] = useState<OrderDetailDto[]>([]);
  const [summary, setSummary] = useState<CommissionSummaryDto | null>(null);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);

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

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSellerWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const [distRes, catRes] = await Promise.all([
        fetchDistricts(),
        fetchCategories("PRODUCT")
      ]);
      setDistricts(distRes.data);
      setCategories(catRes.data);
      if (catRes.data[0] && !prodCatId) {
        setProdCatId(catRes.data[0].id);
      }
      const firstZone = distRes.data[0]?.areaZones[0]?.id;
      if (firstZone && selectedZoneIds.length === 0) {
        setSelectedZoneIds([firstZone]);
      }

      if (user) {
        try {
          const [profRes, storeRes, prodRes, ordRes, sumRes] = await Promise.all([
            fetchSellerProfile(),
            fetchSellerStore(),
            fetchSellerProducts(),
            fetchSellerOrders(),
            fetchSellerCommissionSummary()
          ]);
          setProfile(profRes.data);
          setStore(storeRes.data);
          setProducts(prodRes.data);
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
  }, [prodCatId, selectedZoneIds.length, user]);

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
        initialStatus: "PENDING_REVIEW"
      });
      setProdTitle("");
      setProdDesc("");
      await loadSellerWorkspace();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to create product."
      );
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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">
            Saudavo Seller Studio
          </h1>
          <p className="text-xs text-ink-secondary">
            Privacy-first Mianwali store management (No CNIC collected in closed beta • PQ-07)
          </p>
        </div>
        {profile && store && (
          <span className="rounded-full bg-brand-primary-soft px-3.5 py-1 text-xs font-semibold text-brand-primary">
            Seller: {profile.verificationStatus} • Store: {store.status}
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
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
          {/* Accounting Summary matching Figma 8:98 */}
          {summary && (
            <section className="space-y-3">
              <div className="rounded-xl bg-brand-accent-soft px-4 py-2 text-xs font-semibold text-brand-accent">
                {summary.accountingDisclaimer} {summary.promotionalBetaNote}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                  <div>
                    <p className="text-sm font-bold text-ink-primary">
                      #{order.orderNumber} —{" "}
                      {formatPkrFromPaisa(order.totalPaisa, locale)}
                    </p>
                    <p className="text-xs text-ink-secondary">
                      Order: {order.status} • Cash: {order.codCollectionStatus}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.status === "PENDING_CONFIRMATION" && (
                      <button
                        type="button"
                        onClick={() =>
                          void confirmSellerOrder(order.id).then(
                            loadSellerWorkspace
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
                            void updateSellerOrderStatus(order.id, {
                              toStatus: "READY_FOR_DISPATCH"
                            }).then(loadSellerWorkspace)
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
                            void updateSellerOrderStatus(order.id, {
                              toStatus: "DELIVERED"
                            }).then(loadSellerWorkspace)
                          }
                          className="rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-primary"
                        >
                          Mark Delivered
                        </button>
                      )}

                    {order.paymentMethod === "COD" &&
                      order.status === "DELIVERED" &&
                      order.codCollectionStatus === "PENDING_COLLECTION" && (
                        <button
                          type="button"
                          onClick={() =>
                            void confirmSellerCodCollection(order.id, {
                              collectionStatus: "COLLECTED",
                              collectedAmountPaisa: order.totalPaisa
                            }).then(loadSellerWorkspace)
                          }
                          className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Confirm COD Cash Collected
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Add Product Form */}
          <section className="rounded-2xl border border-border-subtle bg-surface-card p-6">
            <h2 className="text-lg font-bold text-ink-primary">
              Add Physical Product ({products.length} listed)
            </h2>
            <form
              onSubmit={handleCreateProduct}
              className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
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
              <button
                type="submit"
                className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white sm:w-fit"
              >
                Submit Product for Review
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
