"use client";

import type {
  AddressDto,
  CheckoutQuoteDto,
  DistrictDto,
  StoreCartDto
} from "@saudavo/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../../components/locale-provider";
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
  const router = useRouter();
  const { locale, user } = useAppContext();

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
    if (!selectedCartStoreId) return;
    setErrorMsg(null);
    try {
      await createPhysicalOrder({
        storeId: selectedCartStoreId,
        fulfilmentMode,
        ...(fulfilmentMode === "SELLER_DELIVERY" && selectedAddressId
          ? { addressId: selectedAddressId }
          : {}),
        paymentMethod: "COD",
        ...(customerNote.trim() ? { customerNote: customerNote.trim() } : {})
      });
      router.push("/orders");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Checkout failed."
      );
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
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : "Unable to save address."
      );
    }
  };

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-border-subtle bg-surface-card p-8 text-center">
          <p className="text-sm text-ink-secondary">
            Please sign in to view your store-scoped carts and checkout.
          </p>
          <Link
            href="/auth"
            className="mt-4 inline-block rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-ink-primary">
        Store-Scoped Carts & Single-Seller COD Checkout (PQ-16 / D-013)
      </h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Each store maintains an independent cart and places its own Cash on Delivery order.
      </p>

      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-border-subtle bg-surface-card p-8 text-sm text-ink-secondary">
          Loading carts...
        </div>
      ) : carts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border-subtle bg-surface-card p-8 text-center">
          <p className="text-sm text-ink-secondary">Your store carts are empty.</p>
          <Link
            href="/"
            className="mt-3 inline-block text-sm font-semibold text-brand-primary underline"
          >
            Browse Mianwali Stores
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {carts.map((cart) => (
              <section
                key={cart.cartId}
                className={`rounded-2xl border p-5 bg-surface-card ${
                  selectedCartStoreId === cart.storeId
                    ? "border-brand-primary"
                    : "border-border-subtle"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
                  <div>
                    <h2 dir="auto" className="text-lg font-bold text-ink-primary">
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
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold ${
                      selectedCartStoreId === cart.storeId
                        ? "bg-brand-primary text-white"
                        : "bg-surface-muted text-ink-primary"
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
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm"
                    >
                      <div>
                        <p dir="auto" className="font-semibold text-ink-primary">
                          {item.productTitle}
                        </p>
                        {item.variantTitle && (
                          <p className="text-xs text-ink-secondary">
                            Variant: {item.variantTitle}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            void updateCartItem(
                              item.id,
                              Math.max(1, item.quantity - 1)
                            ).then(loadData)
                          }
                          className="rounded border border-border-subtle bg-surface-card px-2 py-0.5 text-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void updateCartItem(item.id, item.quantity + 1).then(
                              loadData
                            )
                          }
                          className="rounded border border-border-subtle bg-surface-card px-2 py-0.5 text-xs"
                        >
                          +
                        </button>
                        <span className="font-bold text-brand-primary">
                          {formatPkrFromPaisa(item.lineTotalPaisa, locale)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void removeCartItem(item.id).then(loadData)}
                          className="text-xs font-medium text-red-600 hover:underline"
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

          <aside className="space-y-4 rounded-2xl border border-border-subtle bg-surface-card p-6 h-fit">
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
              onClick={() => void handlePlaceOrder()}
              className="w-full rounded-xl bg-brand-primary py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover"
            >
              Place COD Order
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}
