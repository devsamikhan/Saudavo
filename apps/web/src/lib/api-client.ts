import {
  type AcceptCustomOfferRequest,
  type AddCartItemRequest,
  type AddressDto,
  type AdminMfaEnrollResponse,
  ApiErrorEnvelopeSchema,
  type ApproveDecisionRequest,
  type ApproveListingRequest,
  type AuthMeResponse,
  type AuthSessionResponse,
  type BuyerRequestDto,
  type CancelOrderRequest,
  type CartsResponse,
  type CategoriesResponse,
  type ChatMessageDto,
  type CheckoutQuoteDto,
  type CheckoutQuoteRequest,
  type CodCollectionRequest,
  type CommissionRuleDto,
  type CommissionSummaryDto,
  type ConfirmMediaUploadRequest,
  type ConversationSummaryDto,
  type CreateAddressRequest,
  type CreateBuyerRequest,
  type CreateCommissionRuleRequest,
  type CreateDisputeRequest,
  type CreateOrderMessageRequest,
  type CreatePhysicalOrderRequest,
  type CreateProductRequest,
  type CreatePromoDealRequest,
  type CreateReportRequest,
  type CreateReviewRequest,
  type CreateServiceListingRequest,
  type CreateServiceOrderRequest,
  type CreateSettlementRecordRequest,
  type CustomerProfileDto,
  type DisputeDto,
  type DistrictsResponse,
  type FeatureFlagDto,
  type FeatureFlagKey,
  type FeatureFlagsMap,
  type LoginRequest,
  type ManualPaymentConfirmationRequest,
  type MediaAssetDto,
  type ModerationQueueResponse,
  type NotificationDto,
  type NotificationsResponse,
  type OrderCreatedSummary,
  type OrderDetailDto,
  type OrderMessageDto,
  type PasswordResetConfirm,
  type PasswordResetRequest,
  type PresignedUploadDto,
  type PrivateStoreDto,
  type ProductDto,
  type PromoDealDto,
  type PublicProductDetailDto,
  type PublicServiceDetailDto,
  type PublicStoreDto,
  type RegisterRequest,
  type RejectDecisionRequest,
  type RejectListingRequest,
  type ReportDto,
  type RequestMediaUploadUrlRequest,
  type RequestServiceRevisionRequest,
  type ResolveDisputeRequest,
  type ResolveReportRequest,
  type RespondBuyerRequest,
  type ReviewDto,
  type ReviewSubscriptionRenewalRequest,
  type SearchResponse,
  type SellerOnboardingRequest,
  type SellerOnboardingResponse,
  type SellerProfileDto,
  type SellerSettlementRecordDto,
  type SendChatMessageRequest,
  type SendCustomOfferRequest,
  type ServiceListingDto,
  type StartConversationRequest,
  type StoreCartDto,
  type StoreCatalogResponse,
  type StoreSubscriptionSummaryDto,
  type SubmitSubscriptionRenewalRequest,
  type SubscriptionPlanDto,
  type SubscriptionRenewalRequestDto,
  type TogglePromoDealRequest,
  type UpdateAddressRequest,
  type UpdateCustomerProfileRequest,
  type UpdateFeatureFlagRequest,
  type UpdateProductRequest,
  type UpdateSellerOrderStatusRequest,
  type UpdateServiceListingRequest,
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
      const fromLocal = window.localStorage?.getItem(CSRF_STORAGE_KEY);
      if (fromLocal) {
        memoryCsrfToken = fromLocal;
        return fromLocal;
      }
      const fromSession = window.sessionStorage?.getItem(CSRF_STORAGE_KEY);
      if (fromSession) {
        memoryCsrfToken = fromSession;
        return fromSession;
      }
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
        window.localStorage?.setItem(CSRF_STORAGE_KEY, token);
        window.sessionStorage?.setItem(CSRF_STORAGE_KEY, token);
      } else {
        window.localStorage?.removeItem(CSRF_STORAGE_KEY);
        window.sessionStorage?.removeItem(CSRF_STORAGE_KEY);
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
    headers?: Record<string, string>;
    _retriedCsrf?: boolean;
  } = {}
): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
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

  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      credentials: "include",
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {})
    });
  } catch {
    throw new ApiClientError(
      503,
      "API_UNREACHABLE",
      `Cannot reach Saudavo API server (${getApiBaseUrl()}). Ensure the backend API is running and retry.`
    );
  }

  try {
    return await parseApiResponse<T>(res);
  } catch (err: unknown) {
    if (
      err instanceof ApiClientError &&
      err.status === 403 &&
      err.code === "CSRF_INVALID" &&
      method !== "GET" &&
      !options._retriedCsrf
    ) {
      const synced = await fetchCurrentUser({ syncCsrf: true }).catch(() => null);
      if (synced?.data.csrfToken) {
        return apiRequest<T>(path, { ...options, _retriedCsrf: true });
      }
    }
    throw err;
  }
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
  minPrice?: number;
  maxPrice?: number;
  sort?: "NEWEST" | "PRICE_ASC" | "PRICE_DESC";
  limit?: number;
}): Promise<SearchResponse> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.type) sp.set("type", params.type);
  if (params.districtId) sp.set("districtId", params.districtId);
  if (params.areaZoneId) sp.set("areaZoneId", params.areaZoneId);
  if (params.categoryId) sp.set("categoryId", params.categoryId);
  if (params.minPrice !== undefined) sp.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) sp.set("maxPrice", String(params.maxPrice));
  if (params.sort) sp.set("sort", params.sort);
  if (params.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return apiRequest(`/search${qs ? `?${qs}` : ""}`);
}

export function fetchPublicStore(
  slug: string
): Promise<{ data: PublicStoreDto }> {
  return apiRequest(`/stores/${encodeURIComponent(slug)}`);
}

export function fetchPublicStoreCatalog(
  slug: string
): Promise<StoreCatalogResponse> {
  return apiRequest(`/stores/${encodeURIComponent(slug)}/listings`);
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

export function fetchPublicProductImageSignedUrl(
  slug: string,
  mediaAssetId: string
): Promise<{
  data: { mediaAssetId: string; readUrl: string; expiresInSeconds: number };
}> {
  return apiRequest(
    `/products/${encodeURIComponent(slug)}/images/${encodeURIComponent(mediaAssetId)}/signed-url`
  );
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

export function requestPasswordReset(body: PasswordResetRequest): Promise<{
  data: { accepted: true; message: string };
  meta: { requestId: string };
}> {
  return apiRequest("/auth/password-reset/request", {
    method: "POST",
    body
  });
}

export function confirmPasswordReset(body: PasswordResetConfirm): Promise<{
  data: { reset: true };
  meta: { requestId: string };
}> {
  return apiRequest("/auth/password-reset/confirm", {
    method: "POST",
    body
  });
}

export async function fetchCurrentUser(options?: {
  syncCsrf?: boolean;
}): Promise<AuthMeResponse> {
  const res = await apiRequest<AuthMeResponse>("/auth/me", {
    headers: options?.syncCsrf ? { "X-CSRF-Sync": "1" } : undefined
  });
  if (res.data.csrfToken) {
    setStoredCsrfToken(res.data.csrfToken);
  }
  return res;
}

export function enrollAdminMfa(): Promise<AdminMfaEnrollResponse> {
  return apiRequest("/auth/admin/mfa/enroll", {
    method: "POST",
    body: {}
  });
}

export function verifyAdminMfa(
  code: string
): Promise<{ data: { mfaVerified: boolean } }> {
  return apiRequest("/auth/admin/mfa/verify", {
    method: "POST",
    body: { code }
  });
}

// Customer Profile, Addresses, Cart & Orders
export function fetchCustomerProfile(): Promise<{ data: CustomerProfileDto }> {
  return apiRequest("/customer/profile");
}

export function updateCustomerProfile(
  body: UpdateCustomerProfileRequest
): Promise<{ data: CustomerProfileDto }> {
  return apiRequest("/customer/profile", { method: "PATCH", body });
}

export function fetchAddresses(): Promise<{ data: AddressDto[] }> {
  return apiRequest("/customer/addresses");
}

export function createAddress(
  body: CreateAddressRequest
): Promise<{ data: AddressDto }> {
  return apiRequest("/customer/addresses", { method: "POST", body });
}

export function updateAddress(
  addressId: string,
  body: UpdateAddressRequest
): Promise<{ data: AddressDto }> {
  return apiRequest(`/customer/addresses/${encodeURIComponent(addressId)}`, {
    method: "PATCH",
    body
  });
}

export function deleteAddress(
  addressId: string
): Promise<{ data: { deleted: true; id: string } }> {
  return apiRequest(`/customer/addresses/${encodeURIComponent(addressId)}`, {
    method: "DELETE"
  });
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

export function requestServiceRevision(
  orderId: string,
  body: RequestServiceRevisionRequest
): Promise<{ data: OrderDetailDto }> {
  return apiRequest(`/orders/${orderId}/service/request-revision`, {
    method: "POST",
    body
  });
}

export function createOrderReview(
  orderId: string,
  body: CreateReviewRequest
): Promise<{ data: ReviewDto }> {
  return apiRequest(`/orders/${orderId}/reviews`, {
    method: "POST",
    body
  });
}

export function createOrderDispute(
  orderId: string,
  body: CreateDisputeRequest
): Promise<{ data: DisputeDto }> {
  return apiRequest(`/orders/${orderId}/disputes`, {
    method: "POST",
    body
  });
}

export function createReport(
  body: CreateReportRequest
): Promise<{ data: ReportDto }> {
  return apiRequest("/reports", { method: "POST", body });
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

export function updateSellerProduct(
  productId: string,
  body: UpdateProductRequest
): Promise<{ data: ProductDto }> {
  return apiRequest(`/seller/products/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    body
  });
}

export function archiveSellerProduct(
  productId: string
): Promise<{ data: { archived: true; id: string } }> {
  return apiRequest(`/seller/products/${encodeURIComponent(productId)}`, {
    method: "DELETE"
  });
}

export function requestMediaUploadUrl(
  body: RequestMediaUploadUrlRequest
): Promise<{ data: PresignedUploadDto }> {
  return apiRequest("/media/upload-url", { method: "POST", body });
}

export function confirmMediaUpload(
  assetId: string,
  body: ConfirmMediaUploadRequest
): Promise<{ data: MediaAssetDto }> {
  return apiRequest(`/media/${encodeURIComponent(assetId)}/confirm`, {
    method: "POST",
    body
  });
}

export function fetchSellerServices(): Promise<{ data: ServiceListingDto[] }> {
  return apiRequest("/seller/services");
}

export function createSellerService(
  body: CreateServiceListingRequest
): Promise<{ data: ServiceListingDto }> {
  return apiRequest("/seller/services", { method: "POST", body });
}

export function updateSellerService(
  serviceId: string,
  body: UpdateServiceListingRequest
): Promise<{ data: ServiceListingDto }> {
  return apiRequest(`/seller/services/${encodeURIComponent(serviceId)}`, {
    method: "PATCH",
    body
  });
}

// In-App Notifications
export function fetchNotifications(): Promise<NotificationsResponse> {
  return apiRequest("/notifications");
}

export function markNotificationRead(
  notificationId: string
): Promise<{ data: NotificationDto }> {
  return apiRequest(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "POST",
    body: {}
  });
}

export function markAllNotificationsRead(): Promise<{
  data: { markedCount: number };
}> {
  return apiRequest("/notifications/read-all", { method: "POST", body: {} });
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

// Trust, Disputes & Automated Service Completion (Admin)
export function fetchAdminReports(): Promise<{ data: ReportDto[] }> {
  return apiRequest("/admin/reports");
}

export function resolveAdminReport(
  reportId: string,
  body: ResolveReportRequest
): Promise<{ data: ReportDto }> {
  return apiRequest(`/admin/reports/${reportId}/resolve`, {
    method: "POST",
    body
  });
}

export function fetchAdminDisputes(): Promise<{ data: DisputeDto[] }> {
  return apiRequest("/admin/disputes");
}

export function resolveAdminDispute(
  disputeId: string,
  body: ResolveDisputeRequest
): Promise<{ data: DisputeDto }> {
  return apiRequest(`/admin/disputes/${disputeId}/resolve`, {
    method: "POST",
    body
  });
}

export function triggerServiceAutoCompleteSweep(): Promise<{
  data: { checkedCount: number; completedOrderIds: string[] };
}> {
  return apiRequest("/admin/orders/auto-complete-services", {
    method: "POST",
    body: {}
  });
}

export function fetchAdminCommissionRules(): Promise<{
  data: CommissionRuleDto[];
}> {
  return apiRequest("/admin/commission-rules");
}

export function createAdminCommissionRule(
  body: CreateCommissionRuleRequest
): Promise<{ data: CommissionRuleDto }> {
  return apiRequest("/admin/commission-rules", { method: "POST", body });
}

export function fetchAdminSettlements(): Promise<{
  data: SellerSettlementRecordDto[];
}> {
  return apiRequest("/admin/settlements");
}

export function createAdminSettlement(
  body: CreateSettlementRecordRequest
): Promise<{ data: SellerSettlementRecordDto }> {
  return apiRequest("/admin/settlements", { method: "POST", body });
}

export function fetchAdminStores(): Promise<{
  data: Array<{ id: string; slug: string; displayName: string; status: string }>;
}> {
  return apiRequest("/admin/stores");
}

// Monthly Seller Subscriptions (Zero-Gateway Manual Billing)
export function fetchSubscriptionPlans(): Promise<{
  data: SubscriptionPlanDto[];
}> {
  return apiRequest("/subscriptions/plans");
}

export function fetchSellerSubscription(): Promise<{
  data: StoreSubscriptionSummaryDto;
}> {
  return apiRequest("/seller/subscription");
}

export function submitSubscriptionRenewal(
  body: SubmitSubscriptionRenewalRequest
): Promise<{ data: SubscriptionRenewalRequestDto }> {
  return apiRequest("/seller/subscription/renewals", {
    method: "POST",
    body
  });
}

export function fetchAdminSubscriptionRenewals(): Promise<{
  data: SubscriptionRenewalRequestDto[];
}> {
  return apiRequest("/admin/subscriptions/renewals");
}

export function reviewAdminSubscriptionRenewal(
  renewalId: string,
  body: ReviewSubscriptionRenewalRequest
): Promise<{ data: SubscriptionRenewalRequestDto }> {
  return apiRequest(`/admin/subscriptions/renewals/${encodeURIComponent(renewalId)}/review`, {
    method: "POST",
    body
  });
}

// Saudavo Shopping Messenger
export function startMessengerConversation(
  body: StartConversationRequest
): Promise<{ data: ConversationSummaryDto }> {
  return apiRequest("/messenger/conversations", {
    method: "POST",
    body
  });
}

export function fetchMessengerConversations(): Promise<{
  data: ConversationSummaryDto[];
}> {
  return apiRequest("/messenger/conversations");
}

export function fetchMessengerUnreadCount(): Promise<{
  data: { unreadCount: number };
}> {
  return apiRequest("/messenger/unread-count");
}

export function fetchConversationMessages(
  conversationId: string
): Promise<{ data: ChatMessageDto[] }> {
  return apiRequest(`/messenger/conversations/${encodeURIComponent(conversationId)}/messages`);
}

export function sendChatMessage(
  conversationId: string,
  body: SendChatMessageRequest
): Promise<{ data: ChatMessageDto }> {
  return apiRequest(`/messenger/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    body
  });
}

export function sendChatCustomOffer(
  conversationId: string,
  body: SendCustomOfferRequest
): Promise<{ data: ChatMessageDto }> {
  return apiRequest(`/messenger/conversations/${encodeURIComponent(conversationId)}/offers`, {
    method: "POST",
    body
  });
}

export function acceptChatCustomOffer(
  conversationId: string,
  messageId: string,
  body: AcceptCustomOfferRequest
): Promise<{ data: OrderCreatedSummary }> {
  return apiRequest(
    `/messenger/conversations/${encodeURIComponent(conversationId)}/offers/${encodeURIComponent(messageId)}/accept`,
    {
      method: "POST",
      body,
      idempotencyKey: createIdempotencyKey()
    }
  );
}

export function declineChatCustomOffer(
  conversationId: string,
  messageId: string
): Promise<{ data: ChatMessageDto }> {
  return apiRequest(
    `/messenger/conversations/${encodeURIComponent(conversationId)}/offers/${encodeURIComponent(messageId)}/decline`,
    {
      method: "POST",
      body: {}
    }
  );
}

// ---------- Platform Feature Flags (1-Click Admin Control) ----------

export function fetchPublicFeatureFlags(): Promise<{ data: FeatureFlagsMap }> {
  return apiRequest("/features");
}

export function fetchAdminFeatureFlags(): Promise<{ data: FeatureFlagDto[] }> {
  return apiRequest("/admin/features");
}

export function updateAdminFeatureFlag(
  key: FeatureFlagKey,
  body: UpdateFeatureFlagRequest
): Promise<{ data: FeatureFlagDto }> {
  return apiRequest(`/admin/features/${encodeURIComponent(key)}`, {
    method: "PATCH",
    body
  });
}

// ---------- Mujhy Chahiye Local Demand Board ----------

export function fetchPublicDemands(params?: {
  districtId?: string;
  areaZoneId?: string;
  status?: string;
}): Promise<{ data: BuyerRequestDto[] }> {
  const sp = new URLSearchParams();
  if (params?.districtId) sp.set("districtId", params.districtId);
  if (params?.areaZoneId) sp.set("areaZoneId", params.areaZoneId);
  if (params?.status) sp.set("status", params.status);
  const qs = sp.toString();
  return apiRequest(`/demands${qs ? `?${qs}` : ""}`);
}

export function createBuyerDemand(
  body: CreateBuyerRequest
): Promise<{ data: BuyerRequestDto }> {
  return apiRequest("/demands", {
    method: "POST",
    body
  });
}

export function respondToBuyerDemand(
  demandId: string,
  body: RespondBuyerRequest
): Promise<{ data: { conversation: ConversationSummaryDto; demand: BuyerRequestDto } }> {
  return apiRequest(`/demands/${encodeURIComponent(demandId)}/respond`, {
    method: "POST",
    body
  });
}

export function closeBuyerDemand(
  demandId: string,
  status: "FULFILLED" | "CLOSED" = "FULFILLED"
): Promise<{ data: BuyerRequestDto }> {
  return apiRequest(`/demands/${encodeURIComponent(demandId)}/close`, {
    method: "PATCH",
    body: { status }
  });
}

// ---------- Store Flash Deals & Promo Coupons ----------

export function fetchPublicFlashDeals(
  storeId?: string
): Promise<{ data: PromoDealDto[] }> {
  const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  return apiRequest(`/deals${qs}`);
}

export function fetchSellerDeals(): Promise<{ data: PromoDealDto[] }> {
  return apiRequest("/seller/deals");
}

export function createSellerDeal(
  body: CreatePromoDealRequest
): Promise<{ data: PromoDealDto }> {
  return apiRequest("/seller/deals", {
    method: "POST",
    body
  });
}

export function toggleSellerDeal(
  dealId: string,
  body: TogglePromoDealRequest
): Promise<{ data: PromoDealDto }> {
  return apiRequest(`/seller/deals/${encodeURIComponent(dealId)}/toggle`, {
    method: "PATCH",
    body
  });
}
