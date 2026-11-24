"use client";

import type {
  AddressDto,
  CheckoutQuoteDto,
  DistrictDto,
  OrderCreatedSummary,
  StoreCartDto
} from "@saudavo/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyCartSpot, SpotState } from "../../components/illustrations";
import { useAppContext } from "../../components/locale-provider";
import { OrderConfirmedModal } from "../../components/order-confirmed-modal";
import {
  ApiClientError,
  createAddress,
  createPhysicalOrder,
  fetchAddresses,
  fetchCarts,
  fetchDistricts,
  quoteCheckout,
  removeCartItem,
  updateCartItem
} from "../../lib/api-client";
import { formatPkrFromPaisa } from "../../lib/money";

export default function CartPage() {
  const { locale, t, user, refreshCartCount, showToast } = useAppContext();

  const [carts, setCarts] = useState<StoreCartDto[]>([]);
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [selectedCartStoreId, setSelectedCartStoreId] = useState("");
  const [fulfilmentMode, setFulfilmentMode] = useState<
    "SELLER_DELIVERY" | "CUSTOMER_PICKUP"
  >("SELLER_DELIVERY");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [quote, setQuote] = useState<CheckoutQuoteDto | null>(null);
  const [customerNote, setCustomerNote] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState<OrderCreatedSummary | null>(
    null
  );
  const [placingOrder, setPlacingOrder] = useState(false);

  // Quick Address Form
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [areaZoneId, setAreaZoneId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [cartRes, addrRes, distRes] = await Promise.all([
        fetchCarts(),
        fetchAddresses(),
        fetchDistricts()
      ]);
      setCarts(cartRes.data);
      void refreshCartCount();
      setAddresses(addrRes.data);
      setDistricts(distRes.data);
      if (cartRes.data.length > 0 && !selectedCartStoreId) {
        setSelectedCartStoreId(cartRes.data[0]?.storeId ?? "");
      }
      if (addrRes.data.length > 0 && !selectedAddressId) {
        setSelectedAddressId(addrRes.data[0]?.id ?? "");
      }
      const firstZone = distRes.data[0]?.areaZones[0]?.id ?? "";
      if (firstZone && !areaZoneId) {
        setAreaZoneId(firstZone);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to load cart."
      );
    } finally {
      setLoading(false);
    }
  }, [areaZoneId, selectedAddressId, selectedCartStoreId, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user || !selectedCartStoreId || carts.length === 0) {
      setQuote(null);
      return;
    }
    if (fulfilmentMode === "SELLER_DELIVERY" && !selectedAddressId) {
      setQuote(null);
      return;
    }
    let active = true;
    void quoteCheckout({
      storeId: selectedCartStoreId,
      fulfilmentMode,
      ...(fulfilmentMode === "SELLER_DELIVERY" && selectedAddressId
        ? { addressId: selectedAddressId }
        : {})
    })
      .then((res) => {
        if (active) setQuote(res.data);
      })
      .catch(() => {
        if (active) setQuote(null);
      });
    return () => {
      active = false;
    };
  }, [carts, fulfilmentMode, selectedAddressId, selectedCartStoreId, user]);

  const handleQuote = async () => {
    if (!selectedCartStoreId) return;
    setErrorMsg(null);
    try {
      const res = await quoteCheckout({
        storeId: selectedCartStoreId,
        fulfilmentMode,
        ...(fulfilmentMode === "SELLER_DELIVERY" && selectedAddressId
          ? { addressId: selectedAddressId }
          : {})
      });
      setQuote(res.data);
    } catch (err: unknown) {
      setQuote(null);
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to calculate quote."
      );
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedCartStoreId || placingOrder) return;
    setErrorMsg(null);
    setPlacingOrder(true);
    try {
      const res = await createPhysicalOrder({
        storeId: selectedCartStoreId,
        fulfilmentMode,
        ...(fulfilmentMode === "SELLER_DELIVERY" && selectedAddressId
          ? { addressId: selectedAddressId }
          : {}),
        paymentMethod: "COD",
        ...(customerNote.trim() ? { customerNote: customerNote.trim() } : {})
      });
      setConfirmedOrder(res.data);
      await loadData();
      showToast(
        locale === "ur"
          ? "آرڈر کامیابی سے بن گیا۔"
          : "COD order placed successfully.",
        "primary"
      );
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Checkout failed."
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const districtId = districts[0]?.id;
    if (!districtId || !areaZoneId) return;
    setErrorMsg(null);
    try {
      const res = await createAddress({
        label: "Mianwali Delivery",
        districtId,
        areaZoneId,
        recipientName,
        recipientPhone,
        streetAddress,
        isDefault: true
      });
      setAddresses((prev) => [res.data, ...prev]);
      setSelectedAddressId(res.data.id);
      setShowAddrForm(false);
      showToast(
        locale === "ur"
          ? "ڈلیوری پتہ محفوظ ہو گیا۔"
          : "Delivery address saved.",
        "primary"
      );
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to save address."
      );
    }
  };

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <SpotState
          illustration={<EmptyCartSpot />}
          badge={locale === "ur" ? "کارٹ اور چیک آؤٹ" : "Cart & Checkout"}
          title={t.emptyCartTitle}
          description={
            locale === "ur"
              ? "اپنے اسٹور کارٹس دیکھنے اور کیش آن ڈلیوری آرڈر کرنے کے لیے لاگ ان کریں۔"
              : "Sign in to view your store-scoped carts and complete Cash on Delivery checkout."
          }
          actions={
            <>
              <Link
                href="/auth"
                className="rounded-2xl bg-brand-accent px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-accent-hover"
              >
                {t.navSignIn}
              </Link>
              <Link
                href="/"
                className="rounded-2xl border border-border-subtle bg-surface-muted px-6 py-3 text-sm font-bold text-ink-primary transition hover:border-brand-primary"
              >
                {t.browseMarketplaceBtn}
              </Link>
            </>
          }
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-ink-primary">
        {locale === "ur"
          ? "اسٹور کارٹس اور سنگل سیلر کیش آن ڈلیوری چیک آؤٹ"
          : "Store-Scoped Carts & Single-Seller COD Checkout"}
      </h1>
      <p className="mt-1 text-sm text-ink-secondary">
        {locale === "ur"
          ? "ہر مقامی اسٹور کا علیحدہ کارٹ اور علیحدہ کیش آن ڈلیوری آرڈر ہوتا ہے۔"
          : "Each store maintains an independent cart and places its own Cash on Delivery order."}
      </p>

      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-border-subtle bg-surface-card p-8 text-sm text-ink-secondary">
          {t.loadingText}
        </div>
      ) : carts.length === 0 ? (
        <div className="mt-6">
          <SpotState
            illustration={<EmptyCartSpot />}
            badge={locale === "ur" ? "کارٹ خالی ہے" : "Empty Cart"}
            title={t.emptyCartTitle}
            description={t.emptyCartBody}
            actions={
              <Link
                href="/"
                className="inline-flex rounded-2xl bg-brand-primary px-6 py-3 text-sm font-bold text-white shadow-soft transition-all hover:bg-brand-primary-hover"
              >
                {t.browseMarketplaceBtn}
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {carts.map((cart) => (
              <section
                key={cart.cartId}
                className={`rounded-3xl border bg-surface-card p-6 shadow-card transition ${
                  selectedCartStoreId === cart.storeId
                    ? "border-brand-primary ring-2 ring-brand-primary/15"
                    : "border-border-subtle"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
                  <div>
                    <h2 dir="auto" className="text-lg font-extrabold text-ink-primary">
                      {cart.storeDisplayName}
                    </h2>
                    <p className="text-xs text-ink-secondary">
                      Subtotal: {formatPkrFromPaisa(cart.subtotalPaisa, locale)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCartStoreId(cart.storeId);
                      setQuote(null);
                    }}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                      selectedCartStoreId === cart.storeId
                        ? "bg-brand-primary text-white shadow-sm"
                        : "bg-surface-muted text-ink-primary hover:bg-brand-primary-soft"
                    }`}
                  >
                    {selectedCartStoreId === cart.storeId
                      ? "Selected for Checkout"
                      : "Checkout This Store"}
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {cart.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-canvas px-4 py-3 text-sm"
                    >
                      <div>
                        <p dir="auto" className="font-bold text-ink-primary">
                          {item.productTitle}
                        </p>
                        {item.variantTitle && (
                          <p className="text-xs text-ink-secondary">
                            Variant: {item.variantTitle}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          aria-label={`Decrease quantity for ${item.productTitle}`}
                          onClick={() =>
                            void updateCartItem(
                              item.id,
                              Math.max(1, item.quantity - 1)
                            ).then(loadData)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border-subtle bg-surface-card text-sm font-bold text-ink-primary transition hover:border-brand-primary"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-extrabold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase quantity for ${item.productTitle}`}
                          onClick={() =>
                            void updateCartItem(item.id, item.quantity + 1).then(
                              loadData
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border-subtle bg-surface-card text-sm font-bold text-ink-primary transition hover:border-brand-primary"
                        >
                          +
                        </button>
                        <span className="ms-2 font-extrabold text-brand-primary">
                          {formatPkrFromPaisa(item.lineTotalPaisa, locale)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void removeCartItem(item.id).then(loadData)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="h-fit space-y-4 rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink-primary">
              Single-Seller Checkout (COD)
            </h2>

            <div className="flex gap-2">
              {(["SELLER_DELIVERY", "CUSTOMER_PICKUP"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setFulfilmentMode(mode);
                    setQuote(null);
                  }}
                  className={`flex-1 rounded-xl border py-2 text-xs font-semibold ${
                    fulfilmentMode === mode
                      ? "border-brand-primary bg-brand-primary-soft text-brand-primary"
                      : "border-border-subtle text-ink-secondary"
                  }`}
                >
                  {mode === "SELLER_DELIVERY"
                    ? "Seller Delivery"
                    : "Customer Pickup"}
                </button>
              ))}
            </div>

            {fulfilmentMode === "SELLER_DELIVERY" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink-secondary">
                    Mianwali Address
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddrForm((v) => !v)}
                    className="text-xs font-semibold text-brand-primary underline"
                  >
                    + New Address
                  </button>
                </div>

                <select
                  value={selectedAddressId}
                  onChange={(e) => {
                    setSelectedAddressId(e.target.value);
                    setQuote(null);
                  }}
                  className="w-full rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs"
                >
                  <option value="">Select delivery address...</option>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.recipientName} — {a.streetAddress} ({a.areaZoneName})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {showAddrForm && (
              <form
                onSubmit={handleSaveAddress}
                className="space-y-2 rounded-xl bg-surface-muted p-3"
              >
                <select
                  value={areaZoneId}
                  onChange={(e) => setAreaZoneId(e.target.value)}
                  className="w-full rounded-lg border border-border-subtle bg-surface-card px-2.5 py-1.5 text-xs"
                >
                  {(districts[0]?.areaZones ?? []).map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nameEn}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  placeholder="Recipient Name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full rounded-lg border border-border-subtle bg-surface-card px-2.5 py-1.5 text-xs"
                />
                <input
                  type="tel"
                  required
                  placeholder="03001234567"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full rounded-lg border border-border-subtle bg-surface-card px-2.5 py-1.5 text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder="Street & Mohallah in Mianwali"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="w-full rounded-lg border border-border-subtle bg-surface-card px-2.5 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-brand-primary py-1.5 text-xs font-semibold text-white"
                >
                  Save Mianwali Address
                </button>
              </form>
            )}

            <textarea
              rows={2}
              placeholder="Delivery note (optional)"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              className="w-full rounded-xl border border-border-subtle px-3 py-2 text-xs"
            />

            <button
              type="button"
              onClick={() => void handleQuote()}
              className="w-full rounded-xl border border-brand-primary py-2.5 text-xs font-semibold text-brand-primary hover:bg-brand-primary-soft"
            >
              Calculate Server Quote
            </button>

            {quote && (
              <div className="space-y-1.5 rounded-xl bg-surface-muted p-4 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPkrFromPaisa(quote.subtotalPaisa, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Seller Delivery Fee</span>
                  <span>{formatPkrFromPaisa(quote.deliveryFeePaisa, locale)}</span>
                </div>
                <div className="flex justify-between border-t border-border-subtle pt-2 text-sm font-bold text-brand-primary">
                  <span>Total Cash on Delivery</span>
                  <span>{formatPkrFromPaisa(quote.totalPaisa, locale)}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={placingOrder}
              onClick={() => void handlePlaceOrder()}
              className="w-full rounded-2xl bg-brand-accent py-3.5 text-sm font-bold text-white shadow-soft transition hover:bg-brand-accent-hover disabled:opacity-60"
            >
              {placingOrder
                ? "..."
                : locale === "ur"
                  ? "کیش آن ڈلیوری آرڈر دیں"
                  : "Place COD Order"}
            </button>
          </aside>
        </div>
      )}

      {confirmedOrder && (
        <OrderConfirmedModal
          order={confirmedOrder}
          onClose={() => setConfirmedOrder(null)}
        />
      )}
    </main>
  );
}
