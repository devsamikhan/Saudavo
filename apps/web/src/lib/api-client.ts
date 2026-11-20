import {
  type AddCartItemRequest,
  type AddressDto,
  ApiErrorEnvelopeSchema,
  type ApproveDecisionRequest,
  type ApproveListingRequest,
  type AuthSessionResponse,
  type AuthUser,
  type CancelOrderRequest,
  type CartsResponse,
  type CategoriesResponse,
  type CheckoutQuoteDto,
  type CheckoutQuoteRequest,
  type CodCollectionRequest,
  type CommissionSummaryDto,
  type CreateAddressRequest,
  type CreateOrderMessageRequest,
  type CreatePhysicalOrderRequest,
  type CreateProductRequest,
  type CreateServiceListingRequest,
  type CreateServiceOrderRequest,
  type DistrictsResponse,
  type LoginRequest,
  type ManualPaymentConfirmationRequest,
  type ModerationQueueResponse,
  type OrderCreatedSummary,
  type OrderDetailDto,
  type OrderMessageDto,
  type PrivateStoreDto,
  type ProductDto,
  type PublicProductDetailDto,
  type PublicServiceDetailDto,
  type PublicStoreDto,
  type RegisterRequest,
  type RejectDecisionRequest,
  type RejectListingRequest,
  type ReviewDto,
  type SearchResponse,
  type SellerOnboardingRequest,
  type SellerOnboardingResponse,
  type SellerProfileDto,
  type ServiceListingDto,
  type StoreCartDto,
  type UpdateSellerOrderStatusRequest,
  type UpdateStoreRequest
} from "@saudavo/contracts";

const DEFAULT_API_BASE_URL = "http://localhost:4000/api/v1";

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Array<{ field: string; issue: string }>;
  readonly requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Array<{ field: string; issue: string }>,
    requestId?: string
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

let memoryCsrfToken: string | null = null;
const CSRF_STORAGE_KEY = "saudavo_csrf_token";

export function getStoredCsrfToken(): string | null {
  if (memoryCsrfToken) {
    return memoryCsrfToken;
  }
  if (typeof window !== "undefined") {
    try {
      memoryCsrfToken = window.sessionStorage.getItem(CSRF_STORAGE_KEY);
      return memoryCsrfToken;
    } catch {
      return null;
    }
  }
  return null;
}

export function setStoredCsrfToken(token: string | null): void {
  memoryCsrfToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) {
        window.sessionStorage.setItem(CSRF_STORAGE_KEY, token);
      } else {
        window.sessionStorage.removeItem(CSRF_STORAGE_KEY);
      }
    } catch {
      // Ignore storage access errors in restricted modes
    }
  }
}

export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `idem_${crypto.randomUUID()}`;
  }
  return `idem_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let parsedJson: unknown = null;
  if (text.length > 0) {
    try {
      parsedJson = JSON.parse(text) as unknown;
    } catch {
      parsedJson = null;
    }
  }

  if (!response.ok) {
    const errEnvelope = ApiErrorEnvelopeSchema.safeParse(parsedJson);
    if (errEnvelope.success) {
      throw new ApiClientError(
        response.status,
        errEnvelope.data.error.code,
        errEnvelope.data.error.message,
        errEnvelope.data.error.details,
        errEnvelope.data.error.requestId
      );
    }
    throw new ApiClientError(
      response.status,
      "INTERNAL_SERVER_ERROR",
      `Request failed with status ${String(response.status)}`
    );
  }

  return parsedJson as T;
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    idempotencyKey?: string;
  } = {}
): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (method !== "GET") {
    const csrf = getStoredCsrfToken();
    if (csrf) {
      headers["X-CSRF-Token"] = csrf;
    }
  }
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    credentials: "include",
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {})
  });

  return parseApiResponse<T>(res);
}

// Public Discovery
export function fetchDistricts(): Promise<DistrictsResponse> {
  return apiRequest("/locations/districts");
}

export function fetchCategories(
  applicableTo?: "PRODUCT" | "SERVICE"
): Promise<CategoriesResponse> {
  const q = applicableTo ? `?applicableTo=${applicableTo}` : "";
  return apiRequest(`/categories${q}`);
}

export function searchListings(params: {
  q?: string;
  type?: "ALL" | "PRODUCT" | "SERVICE";
  districtId?: string;
  areaZoneId?: string;
  categoryId?: string;
  limit?: number;
}): Promise<SearchResponse> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.type) sp.set("type", params.type);
  if (params.districtId) sp.set("districtId", params.districtId);
  if (params.areaZoneId) sp.set("areaZoneId", params.areaZoneId);
  if (params.categoryId) sp.set("categoryId", params.categoryId);
  if (params.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return apiRequest(`/search${qs ? `?${qs}` : ""}`);
}

export function fetchPublicStore(
  slug: string
): Promise<{ data: PublicStoreDto }> {
  return apiRequest(`/stores/${encodeURIComponent(slug)}`);
}

export function fetchStoreReviews(
  slug: string
): Promise<{ data: ReviewDto[] }> {
  return apiRequest(`/stores/${encodeURIComponent(slug)}/reviews`);
}

export function fetchPublicProduct(
  slug: string
): Promise<{ data: PublicProductDetailDto }> {
  return apiRequest(`/products/${encodeURIComponent(slug)}`);
}

export function fetchPublicService(
  slug: string
): Promise<{ data: PublicServiceDetailDto }> {
  return apiRequest(`/services/${encodeURIComponent(slug)}`);
}

// Auth
export async function registerAccount(
  body: RegisterRequest
): Promise<AuthSessionResponse> {
  const res = await apiRequest<AuthSessionResponse>("/auth/register", {
    method: "POST",
    body
  });
  setStoredCsrfToken(res.data.csrfToken);
  return res;
}

export async function loginAccount(
  body: LoginRequest
): Promise<AuthSessionResponse> {
  const res = await apiRequest<AuthSessionResponse>("/auth/login", {
    method: "POST",
    body
  });
  setStoredCsrfToken(res.data.csrfToken);
  return res;
}

export async function logoutAccount(): Promise<void> {
  await apiRequest("/auth/logout", { method: "POST" });
  setStoredCsrfToken(null);
}

export function fetchCurrentUser(): Promise<{ data: { user: AuthUser } }> {
  return apiRequest("/auth/me");
}

export function verifyAdminMfa(
  code: string
): Promise<{ data: { mfaVerified: boolean } }> {
  return apiRequest("/auth/admin/mfa/verify", {
    method: "POST",
    body: { code }
  });
}

// Customer Addresses, Cart & Orders
export function fetchAddresses(): Promise<{ data: AddressDto[] }> {
  return apiRequest("/customer/addresses");
}

export function createAddress(
  body: CreateAddressRequest
): Promise<{ data: AddressDto }> {
  return apiRequest("/customer/addresses", { method: "POST", body });
}

export function fetchCarts(): Promise<CartsResponse> {
  return apiRequest("/cart");
}

export function addCartItem(
  body: AddCartItemRequest
): Promise<{ data: StoreCartDto }> {
  return apiRequest("/cart/items", { method: "POST", body });
}

export function updateCartItem(
  id: string,
  quantity: number
): Promise<{ data: StoreCartDto }> {
  return apiRequest(`/cart/items/${id}`, {
    method: "PATCH",
    body: { quantity }
  });
}

export function removeCartItem(id: string): Promise<void> {
  return apiRequest(`/cart/items/${id}`, { method: "DELETE" });
}

export function quoteCheckout(
  body: CheckoutQuoteRequest
): Promise<{ data: CheckoutQuoteDto }> {
  return apiRequest("/checkout/quote", { method: "POST", body });
}

export function createPhysicalOrder(
  body: CreatePhysicalOrderRequest
): Promise<{ data: OrderCreatedSummary }> {
  return apiRequest("/orders", {
    method: "POST",
    body,
    idempotencyKey: createIdempotencyKey()
  });
}

export function createServiceOrder(
  body: CreateServiceOrderRequest
): Promise<{ data: OrderCreatedSummary }> {
  return apiRequest("/orders/services", {
    method: "POST",
    body,
    idempotencyKey: createIdempotencyKey()
  });
}

export function fetchCustomerOrders(): Promise<{ data: OrderDetailDto[] }> {
  return apiRequest("/orders");
}

export function cancelCustomerOrder(
  orderId: string,
  body: CancelOrderRequest
): Promise<{ data: OrderDetailDto }> {
  return apiRequest(`/orders/${orderId}/cancel`, { method: "POST", body });
}

export function acceptServiceDelivery(
  orderId: string
): Promise<{ data: OrderDetailDto }> {
  return apiRequest(`/orders/${orderId}/service/accept-delivery`, {
    method: "POST",
    body: {}
  });
}

export function fetchOrderMessages(
  orderId: string
): Promise<{ data: OrderMessageDto[] }> {
  return apiRequest(`/orders/${orderId}/messages`);
}

export function postOrderMessage(
  orderId: string,
  body: CreateOrderMessageRequest
): Promise<{ data: OrderMessageDto }> {
  return apiRequest(`/orders/${orderId}/messages`, { method: "POST", body });
}

// Seller Studio
export function submitSellerOnboarding(
  body: SellerOnboardingRequest
): Promise<SellerOnboardingResponse> {
  return apiRequest("/seller/onboarding", { method: "POST", body });
}

export function fetchSellerProfile(): Promise<{ data: SellerProfileDto }> {
  return apiRequest("/seller/profile");
}

export function fetchSellerStore(): Promise<{ data: PrivateStoreDto }> {
  return apiRequest("/seller/store");
}

export function updateSellerStore(
  body: UpdateStoreRequest
): Promise<{ data: PrivateStoreDto }> {
  return apiRequest("/seller/store", { method: "PATCH", body });
}

export function fetchSellerProducts(): Promise<{ data: ProductDto[] }> {
  return apiRequest("/seller/products");
}

export function createSellerProduct(
  body: CreateProductRequest
): Promise<{ data: ProductDto }> {
  return apiRequest("/seller/products", { method: "POST", body });
}

export function fetchSellerServices(): Promise<{ data: ServiceListingDto[] }> {
  return apiRequest("/seller/services");
}

export function createSellerService(
  body: CreateServiceListingRequest
): Promise<{ data: ServiceListingDto }> {
  return apiRequest("/seller/services", { method: "POST", body });
}

export function fetchSellerOrders(): Promise<{ data: OrderDetailDto[] }> {
  return apiRequest("/seller/orders");
}

export function confirmSellerOrder(
  orderId: string
): Promise<{ data: OrderDetailDto }> {
  return apiRequest(`/seller/orders/${orderId}/confirm`, {
    method: "POST",
    body: {}
  });
}

export function updateSellerOrderStatus(
  orderId: string,
  body: UpdateSellerOrderStatusRequest
): Promise<{ data: OrderDetailDto }> {
  return apiRequest(`/seller/orders/${orderId}/status`, { method: "POST", body });
}

export function confirmSellerCodCollection(
  orderId: string,
  body: CodCollectionRequest
): Promise<{ data: { orderStatus: string; codCollectionStatus: string } }> {
  return apiRequest(`/seller/orders/${orderId}/cod-collection`, {
    method: "POST",
    body,
    idempotencyKey: createIdempotencyKey()
  });
}

export function confirmSellerManualPayment(
  orderId: string,
  body: ManualPaymentConfirmationRequest
): Promise<{ data: { orderStatus: string; paymentStatus: string } }> {
  return apiRequest(`/seller/orders/${orderId}/manual-payment-confirmation`, {
    method: "POST",
    body,
    idempotencyKey: createIdempotencyKey()
  });
}

export function fetchSellerCommissionSummary(): Promise<{
  data: CommissionSummaryDto;
}> {
  return apiRequest("/seller/commission-summary");
}

// Admin Moderation
export function fetchModerationQueue(): Promise<ModerationQueueResponse> {
  return apiRequest("/admin/review-queue");
}

export function approveSellerModeration(
  sellerProfileId: string,
  body: ApproveDecisionRequest
): Promise<void> {
  return apiRequest(`/admin/sellers/${sellerProfileId}/approve`, {
    method: "POST",
    body
  });
}

export function rejectSellerModeration(
  sellerProfileId: string,
  body: RejectDecisionRequest
): Promise<void> {
  return apiRequest(`/admin/sellers/${sellerProfileId}/reject`, {
    method: "POST",
    body
  });
}

export function approveListingModeration(
  listingId: string,
  body: ApproveListingRequest
): Promise<void> {
  return apiRequest(`/admin/listings/${listingId}/approve`, {
    method: "POST",
    body
  });
}

export function rejectListingModeration(
  listingId: string,
  body: RejectListingRequest
): Promise<void> {
  return apiRequest(`/admin/listings/${listingId}/reject`, {
    method: "POST",
    body
  });
}
