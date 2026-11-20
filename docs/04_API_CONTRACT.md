# API Contract Specification (Proposed — Design Only)

> Status: Phase 2 Proposed Contract. Base path: `/api/v1`.
> Do not implement endpoints until the founder approves the Phase 2 architecture and data model.

All endpoints use JSON over HTTPS, share Zod contracts from `packages/contracts`, enforce server-side authentication/RBAC (`docs/18_AUTHORIZATION_AND_ROLE_MATRIX.md`), and never expose private residential addresses, private phone numbers, or internal moderation notes publicly.

---

## 1. Standard Response & Error Envelope

### Success Envelope (Single / List)
```json
{
  "data": { "...": "..." },
  "meta": {
    "requestId": "req_01J...",
    "pagination": {
      "cursor": "eyJpZCI6IjAxOS4uLiJ9",
      "hasMore": true,
      "limit": 20
    }
  }
}
```

### Error Envelope
```json
{
  "error": {
    "code": "ORDER_SINGLE_SELLER_VIOLATION",
    "message": "Checkout supports items from one seller store per order.",
    "details": [
      { "field": "storeId", "issue": "Cart contains items from multiple stores." }
    ],
    "requestId": "req_01J..."
  }
}
```

---

## 2. Authentication

| Method | Path | Access | Notes |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register with **Email OR Phone + Password** (`PQ-05`; normalized to prevent duplicate accounts; `CUSTOMER` role assigned by default) |
| `POST` | `/auth/login` | Public | Verify Email or Phone + Password (`PQ-05`); set `HttpOnly`, `Secure`, `SameSite=Lax` session cookie (`PQ-06`) |
| `POST` | `/auth/logout` | Authenticated | Revoke current `UserSession` and clear cookie |
| `POST` | `/auth/password-reset/request` | Public | Rate-limited account recovery initiation (`AuthToken` email reset for email-verified users; phone-only accounts require Support/Admin-assisted recovery while SMS OTP is inactive per `PQ-05`) |
| `POST` | `/auth/password-reset/confirm` | Public | Complete reset with single-use hashed token |
| `POST` | `/auth/admin/mfa/verify` | Admin Roles | Verify TOTP challenge for privileged sessions |
| `GET` | `/auth/me` | Authenticated | Current user identity, active roles, and profile summary |

### Example: `POST /api/v1/auth/login`
Request:
```json
{
  "identifier": "ayesha@example.com",
  "password": "StrongPassword!123"
}
```
Response (`200 OK`):
```json
{
  "data": {
    "user": {
      "id": "0193a8b2-1111-7000-8000-000000000001",
      "displayName": "Ayesha Khan",
      "preferredLocale": "ur",
      "roles": ["CUSTOMER", "SELLER"]
    },
    "csrfToken": "csrf_9f8a7b..."
  },
  "meta": { "requestId": "req_01J..." }
}
```

---

## 3. Customer Profile & Addresses

| Method | Path | Access | Notes |
|---|---|---|---|
| `GET` | `/customer/profile` | Customer | Get own `CustomerProfile` |
| `PATCH` | `/customer/profile` | Customer | Update locale (`en`/`ur`), default district/zone |
| `GET` | `/customer/addresses` | Customer | List own private delivery addresses |
| `POST` | `/customer/addresses` | Customer | Create address within active pilot district (`Mianwali`) |
| `PATCH` | `/customer/addresses/:id` | Customer (Owner) | Update own address |
| `DELETE` | `/customer/addresses/:id` | Customer (Owner) | Soft-delete own address |

### Example: `POST /api/v1/customer/addresses`
Request:
```json
{
  "label": "Home",
  "districtId": "0193a8b2-2000-7000-8000-000000000001",
  "areaZoneId": "0193a8b2-2001-7000-8000-000000000010",
  "recipientName": "Ayesha Khan",
  "recipientPhone": "+923001234567",
  "streetAddress": "Street 4, Mohallah Muslimabad",
  "landmark": "Near Govt High School",
  "isDefault": true
}
```
Response (`201 Created`):
```json
{
  "data": {
    "id": "0193a8b2-3000-7000-8000-000000000001",
    "label": "Home",
    "districtName": "Mianwali District",
    "areaZoneName": "Mianwali City",
    "isDefault": true
  },
  "meta": { "requestId": "req_01J..." }
}
```

---

## 4. Seller Onboarding & Store Management

| Method | Path | Access | Notes |
|---|---|---|---|
| `POST` | `/seller/onboarding` | Authenticated | Submit `SellerProfile` + initial `Store` draft/review |
| `GET` | `/seller/profile` | Seller (Owner) | Own private `SellerProfile` & verification status |
| `PATCH` | `/seller/profile` | Seller (Owner) | Update private seller details |
| `POST` | `/seller/store` | Seller (Owner) | Create store (MVP limit: 1 store per seller) |
| `GET` | `/seller/store` | Seller (Owner) | Read own store configuration + private settings |
| `PATCH` | `/seller/store` | Seller (Owner) | Update store info, service area zones, privacy contact flags |
| `POST` | `/media/upload-url` | Authenticated (Seller) | Issue short-lived private S3 presigned upload URL |

### Example: `POST /api/v1/seller/onboarding`
Request:
```json
{
  "sellerType": "HOME_MAKER",
  "store": {
    "displayName": "Mianwali Handloom & Embroidery",
    "slug": "mianwali-handloom",
    "description": "Traditional hand-embroidered shawls and home linens.",
    "districtId": "0193a8b2-2000-7000-8000-000000000001",
    "serviceAreaZoneIds": [
      "0193a8b2-2001-7000-8000-000000000010",
      "0193a8b2-2001-7000-8000-000000000011"
    ],
    "showPublicPhone": false,
    "showPublicAddress": false
  }
}
```
Response (`201 Created`):
```json
{
  "data": {
    "sellerProfileId": "0193a8b2-4000-7000-8000-000000000001",
    "verificationStatus": "PENDING_REVIEW",
    "store": {
      "id": "0193a8b2-4100-7000-8000-000000000001",
      "slug": "mianwali-handloom",
      "status": "PENDING_REVIEW"
    }
  },
  "meta": { "requestId": "req_01J..." }
}
```

---

## 5. Product & Service Catalog (Seller & Public)

### Seller Catalog Management
| Method | Path | Access | Notes |
|---|---|---|---|
| `GET` | `/seller/products` | Seller (Owner) | List own products (all statuses) |
| `POST` | `/seller/products` | Approved Seller | Create product (`DRAFT` or `PENDING_REVIEW`) |
| `PATCH` | `/seller/products/:id` | Seller (Owner) | Update own product / variants / stock |
| `DELETE` | `/seller/products/:id` | Seller (Owner) | Archive / soft-delete own product |
| `GET` | `/seller/services` | Seller (Owner) | List own services |
| `POST` | `/seller/services` | Approved Seller | Create service listing + packages |
| `PATCH` | `/seller/services/:id` | Seller (Owner) | Update own service / packages |
| `DELETE` | `/seller/services/:id` | Seller (Owner) | Archive / soft-delete own service |

### Public Discovery & Search (Active + Approved Only)
| Method | Path | Access | Notes |
|---|---|---|---|
| `GET` | `/locations/districts` | Public | Active launch districts (`Mianwali District` in MVP) & zones |
| `GET` | `/categories` | Public | Active category tree (`PRODUCT` / `SERVICE`) |
| `GET` | `/search` | Public | FTS/trigram search (`q`, `type`, `categoryId`, `districtId`, `areaZoneId`, `minPrice`, `maxPrice`, `cursor`) |
| `GET` | `/stores/:slug` | Public | Active store public profile (never returns home address or opt-out phone) |
| `GET` | `/products/:slug` | Public | Active product detail + variants + public store summary |
| `GET` | `/services/:slug` | Public | Active service detail + packages + public store summary |

### Example: `GET /api/v1/search?q=embroidery&type=PRODUCT&districtId=0193a8b2-2000-7000-8000-000000000001`
Response (`200 OK`):
```json
{
  "data": [
    {
      "id": "0193a8b2-5000-7000-8000-000000000001",
      "type": "PRODUCT",
      "slug": "handmade-phulkari-shawl",
      "title": "Handmade Phulkari Shawl",
      "pricePaisa": 350000,
      "currency": "PKR",
      "store": {
        "id": "0193a8b2-4100-7000-8000-000000000001",
        "slug": "mianwali-handloom",
        "displayName": "Mianwali Handloom & Embroidery",
        "districtName": "Mianwali District",
        "serviceAreas": ["Mianwali City", "Kamar Mushani"]
      }
    }
  ],
  "meta": {
    "requestId": "req_01J...",
    "pagination": { "cursor": null, "hasMore": false, "limit": 20 }
  }
}
```

---

## 6. Cart & Single-Seller Checkout

| Method | Path | Access | Notes |
|---|---|---|---|
| `GET` | `/cart` | Customer | List customer's store-scoped carts (grouped by `storeId`) |
| `POST` | `/cart/items` | Customer | Add physical product/variant to that store's cart |
| `PATCH` | `/cart/items/:id` | Customer (Owner) | Update item quantity |
| `DELETE` | `/cart/items/:id` | Customer (Owner) | Remove cart item |
| `POST` | `/checkout/quote` | Customer | Server-calculated totals for **one `storeId`** + fulfilment selection |
| `POST` | `/orders` | Customer | Create single-seller physical order (requires `Idempotency-Key` header) |
| `POST` | `/orders/services` | Customer | Create single-seller service order with package snapshot, requirements & optional `addressId` for `ON_SITE`/`HYBRID` (`Idempotency-Key` required) |

### Example: `POST /api/v1/orders` (Single-Seller Physical Order, COD)
Headers: `Idempotency-Key: idem_8c91a2...`  
Request:
```json
{
  "storeId": "0193a8b2-4100-7000-8000-000000000001",
  "fulfilmentMode": "SELLER_DELIVERY",
  "addressId": "0193a8b2-3000-7000-8000-000000000001",
  "paymentMethod": "COD",
  "customerNote": "Deliver after 4 PM."
}
```
Response (`201 Created`):
```json
{
  "data": {
    "orderId": "0193a8b2-7000-7000-8000-000000000001",
    "orderNumber": "MWL-20261117-00042",
    "orderType": "PHYSICAL",
    "storeId": "0193a8b2-4100-7000-8000-000000000001",
    "status": "PENDING_CONFIRMATION",
    "paymentMethod": "COD",
    "codCollectionStatus": "PENDING_COLLECTION",
    "currency": "PKR",
    "subtotalPaisa": 350000,
    "deliveryFeePaisa": 15000,
    "totalPaisa": 365000
  },
  "meta": { "requestId": "req_01J..." }
}
```

---

## 7. Orders & COD Updates

### Customer Order Endpoints
| Method | Path | Access | Notes |
|---|---|---|---|
| `GET` | `/orders` | Customer | List own orders (filter by `orderType`, `status`) |
| `GET` | `/orders/:id` | Customer (Owner) | Order detail, status history, delivery & COD collection status |
| `POST` | `/orders/:id/cancel` | Customer (Owner) | Cancel within policy window (`Idempotency-Key` recommended) |
| `POST` | `/orders/:id/service/accept-delivery` | Customer (Owner) | Accept submitted service delivery |
| `POST` | `/orders/:id/service/request-revision` | Customer (Owner) | Request revision within package limit |
| `POST` | `/orders/:id/reviews` | Customer (Owner) | Review eligible completed order item/service |
| `POST` | `/orders/:id/disputes` | Customer / Seller (Party) | Open order dispute |
| `GET` | `/orders/:id/messages` | Customer / Seller (Party) / Staff (Audited) | List text-only REST `order_messages` (`PQ-09`) |
| `POST` | `/orders/:id/messages` | Customer / Seller (Party) / Support | Post text-only REST message (blocked after terminal closure except Support/Dispute exception) |

### Seller Order & COD Endpoints
| Method | Path | Access | Notes |
|---|---|---|---|
| `GET` | `/seller/orders` | Seller (Owner) | List orders belonging strictly to seller's own store |
| `GET` | `/seller/orders/:id` | Seller (Owner) | Order detail + fulfilment info (restricted to parties) |
| `POST` | `/seller/orders/:id/confirm` | Seller (Owner) | Transition `PENDING_CONFIRMATION` → `CONFIRMED` |
| `POST` | `/seller/orders/:id/reject` | Seller (Owner) | Reject unconfirmed order with reason; restores stock |
| `POST` | `/seller/orders/:id/status` | Seller (Owner) | Advance permitted workflow status (`PREPARING`, `READY_FOR_DISPATCH`, `OUT_FOR_DELIVERY`, `DELIVERED`, `IN_PROGRESS`, `DELIVERY_SUBMITTED`, `DELIVERY_FAILED`) |
| `POST` | `/seller/orders/:id/cod-collection` | Seller (Owner) / Admin | Explicitly confirm physical/`ON_SITE`/`HYBRID` COD cash collected or record COD refusal (`Idempotency-Key` required; separate from `DELIVERED`) |
| `POST` | `/seller/orders/:id/manual-payment-confirmation` | Seller (Owner) / Admin | Explicitly record seller-reported `MANUAL_OFFLINE` payment confirmation for `REMOTE` services (`Idempotency-Key` required; separate from delivery/acceptance; logged as `SELLER_REPORTED`) |

### Example: `POST /api/v1/seller/orders/:id/cod-collection`
Headers: `Idempotency-Key: idem_cod_771...`  
Request:
```json
{
  "collectionStatus": "COLLECTED",
  "collectedAmountPaisa": 365000,
  "collectedAt": "2026-11-18T11:30:00Z",
  "note": "Full cash received on doorstep delivery."
}
```
Response (`200 OK`):
```json
{
  "data": {
    "orderId": "0193a8b2-7000-7000-8000-000000000001",
    "orderStatus": "COMPLETED",
    "deliveryStatus": "DELIVERED",
    "codCollectionStatus": "COLLECTED",
    "paymentStatus": "COLLECTED",
    "verificationSource": "SELLER_REPORTED"
  },
  "meta": { "requestId": "req_01J..." }
}
```

### Example: `POST /api/v1/seller/orders/:id/manual-payment-confirmation` (`REMOTE` Service)
Headers: `Idempotency-Key: idem_man_902...`  
Request:
```json
{
  "collectionStatus": "COLLECTED",
  "collectedAmountPaisa": 250000,
  "collectedAt": "2026-11-18T14:15:00Z",
  "manualPaymentMethodDesc": "Direct bank transfer arranged with customer",
  "note": "Confirmed receipt before starting design delivery."
}
```
Response (`200 OK`):
```json
{
  "data": {
    "orderId": "0193a8b2-7000-7000-8000-000000000009",
    "orderStatus": "IN_PROGRESS",
    "codCollectionStatus": "COLLECTED",
    "paymentMethod": "MANUAL_OFFLINE",
    "paymentStatus": "COLLECTED",
    "verificationSource": "SELLER_REPORTED"
  },
  "meta": { "requestId": "req_01J..." }
}
```

---

## 8. Commission Reporting & Seller Settlements

| Method | Path | Access | Notes |
|---|---|---|---|
| `GET` | `/seller/commission-summary` | Seller (Owner) | Read-only accounting summary (completed gross sales, accrued commission, settled commission, outstanding commission owed; clearly labelled **not a wallet**) |
| `GET` | `/seller/commission-ledger` | Seller (Owner) | Paginated immutable `CommissionLedger` entries for own store |
| `GET` | `/seller/settlements` | Seller (Owner) | Offline/manual `SellerSettlementRecord` history |
| `GET` | `/admin/commission-rules` | Admin / Super Admin | List versioned `CommissionRule` policies |
| `POST` | `/admin/commission-rules` | Super Admin | Create new versioned `CommissionRule` (audited) |
| `POST` | `/admin/settlements` | Admin / Super Admin | Record verified manual/bank seller commission settlement (audited) |

### Example: `GET /api/v1/seller/commission-summary`
Response (`200 OK`):
```json
{
  "data": {
    "storeId": "0193a8b2-4100-7000-8000-000000000001",
    "currency": "PKR",
    "accountingDisclaimer": "Accounting ledger only; not a withdrawable wallet or escrow balance.",
    "completedGrossPaisa": 1000000,
    "accruedCommissionPaisa": 0,
    "settledCommissionPaisa": 0,
    "outstandingCommissionOwedPaisa": 0,
    "promotionalBetaNote": "0% promotional commission active during Mianwali District closed beta."
  },
  "meta": { "requestId": "req_01J..." }
}
```

---

## 9. Admin Moderation, Disputes & Audit

| Method | Path | Access | Notes |
|---|---|---|---|
| `GET` | `/admin/review-queue` | Moderator / Admin | Pending seller profiles, stores, and listings |
| `POST` | `/admin/sellers/:id/approve` | Moderator / Admin | Approve seller/store (requires audit log) |
| `POST` | `/admin/sellers/:id/reject` | Moderator / Admin | Reject with mandatory reason (audited) |
| `POST` | `/admin/listings/:id/approve` | Moderator / Admin | Approve product/service listing (audited) |
| `POST` | `/admin/listings/:id/reject` | Moderator / Admin | Reject listing with mandatory reason (audited) |
| `GET` | `/admin/orders` | Support / Admin | Order lookup (scoped; masked PII for Support where applicable) |
| `GET` | `/admin/reports` | Moderator / Admin | Abuse/content reports queue |
| `POST` | `/admin/reports/:id/resolve` | Moderator / Admin | Resolve report with action & reason (audited) |
| `GET` | `/admin/disputes` | Support / Moderator / Admin | Order/COD disputes queue |
| `POST` | `/admin/disputes/:id/resolve` | Moderator / Admin | Resolve dispute + trigger compensating ledger entry if applicable (audited) |
| `GET` | `/admin/audit-logs` | Admin / Super Admin | Read-only immutable `AdminAuditLog` query |

---

## 10. API Rules
- Validate every input on the server using shared Zod schemas (`packages/contracts`).
- Enforce CSRF protection on all state-changing cookie-authenticated endpoints.
- Require `Idempotency-Key` headers on order creation, COD collection confirmation, and refund/settlement actions.
- Verify resource ownership (`customerId` / `storeId`) on every non-admin endpoint.
- Never return private residential addresses, private phone numbers, or internal moderation notes in public responses.
- Generate OpenAPI 3.1 documentation and contract tests from NestJS + `packages/contracts`.
