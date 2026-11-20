# Product Requirements Document (PRD)

Status: Phase 2 Baseline — Incorporates Founder-Approved Launch Market, Single-Seller Checkout, and COD-Only MVP Decisions (see `docs/10_DECISION_LOG.md`).

## 1. Product surfaces
1. Public marketplace.
2. Customer account area.
3. Seller workspace.
4. Admin console.

## 2. Roles and permissions
- Guest: browse public approved listings.
- Customer: manage own profile, addresses, cart, orders and reviews.
- Seller: customer permissions plus own store, own listings and own orders.
- Moderator: review sellers/listings and handle reports within assigned permissions.
- Support agent: view permitted order/support data; no financial configuration.
- Admin: manage platform operations.
- Super admin: manage privileged settings and staff access.

A user may be both customer and seller. Enforce authorization on the server for every protected operation.

## 3. Core user journeys
### Seller onboarding
Register → verify contact → choose seller type → create store → submit profile → admin review → approved seller → create listing → listing moderation → publish.

### Physical product purchase
Browse → product detail → add to cart (scoped per seller/store) → select one store cart to checkout → address and fulfilment selection → order confirmation (COD) → seller confirms → preparing → ready for dispatch / pickup → out for delivery → delivered → cash collection confirmed → completed → review.

### Service purchase
Browse service → review package/scope → submit requirements → checkout single service order (COD / manual arrangement) → seller confirms → in progress → delivery submitted → customer accepts or requests revision → cash collection confirmed → completed → review.

### Admin moderation
Review queue → inspect submitted information → approve/reject with reason → notify seller → preserve audit record.

## 4. Functional requirements
### Identity
- Registration and login.
- Secure session lifecycle.
- Email/phone verification strategy documented before implementation.
- Account recovery.
- Account status and consent records.

### Stores
- Unique slug.
- Display name, description, logo/banner, categories and service area.
- Public contact options controlled by seller.
- Public address must be approximate/service-area based unless seller explicitly chooses a safe public business address.
- Store status: draft, pending_review, active, suspended, rejected.

### Products
- Title, slug, description, category, price, currency, stock, images, optional variants.
- Listing status: draft, pending_review, active, rejected, archived.
- Seller can only modify own listings.
- Inventory changes must be validated transactionally during checkout.

### Services
- Title, description, category, package tiers, delivery estimate, revisions and requirements.
- Do not promise a service delivery date unless seller sets it.
- Service orders must store an immutable snapshot of the selected package and price.

### Search & Geography
- Initial launch market is **Mianwali District, Punjab, Pakistan**; location records (`District`, `AreaZone`) must support adding new districts/cities later without schema rewrites.
- Search approved and active listings only.
- Filter by category, price range (`PKR`), district (`Mianwali` in MVP) and sub-district service area/zone.
- Search must not reveal private seller information.
- Start with PostgreSQL full-text/trigram capabilities; add a dedicated search engine only after measuring need.

### Cart and checkout
- Validate prices and stock on the server; never trust client totals.
- **Single-seller checkout rule (APPROVED):** One checkout/order must contain products or services from **ONE seller (`Store`) only**. If a customer purchases from multiple sellers, separate orders must be created—each with its own seller, order status, delivery details, and financial records. Do not implement multi-seller combined checkout in MVP.
- Calculate delivery charges transparently.
- Create an order, order items/service details, delivery record, initial payment intent (`COD`), and initial status history in a database transaction.
- Use idempotency protection against duplicate order creation.

### Orders
- Store immutable order status history (`OrderStatusHistory`) with actor, role, reason, and timestamps.
- Physical and service orders have distinct workflows (see `docs/16_ORDER_AND_COD_WORKFLOWS.md`).
- Not every order follows every status (e.g., pickup orders skip courier transit; early cancellations short-circuit to `CANCELLED`).
- Seller can update only permitted statuses on their own orders.
- Customer can cancel only within defined policy windows.
- Admin actions require a reason and audit entry.

### Payments and financial records
- **Cash on Delivery (COD) is the only active payment method in the MVP.**
- Online payment gateways are **not** integrated in MVP; design a clean payment-provider abstraction so online payments can be added later only after provider/legal approval.
- **Delivery vs. payment separation:** Marking an order as `DELIVERED` does **not** mean the COD order has been paid. Cash collection confirmation must be recorded explicitly and separately from delivery confirmation.
- Commission is calculated from eligible transactions according to a configurable, versioned commission rule (never hardcoded) and snapshotted at order time (see `docs/17_COMMISSION_AND_FINANCIAL_MODEL.md`).
- Maintain immutable commission ledger entries (`CommissionLedger`) and compensating adjustment/reversal entries; never silently edit financial history.
- Record offline/manual seller commission settlements separately (`SellerSettlementRecord`).
- Never implement a platform wallet, escrow, or automated fund transfers.

### Reviews
- Only customers with eligible completed orders may review.
- One review per eligible order item/service order.
- Report and moderation flow.

### Notifications
- In-app notifications for core events.
- Email/SMS/WhatsApp are optional integrations, not hard dependencies for MVP.
- Do not expose private customer/seller details in notification previews unnecessarily.

### Admin
- Seller/listing review queues.
- User and store status management.
- Order lookup.
- Reports/disputes.
- Commission policy configuration with version history.
- Audit logs.
- Dashboard metrics with clear definitions.

## 5. Non-functional requirements
- Mobile-first responsive design.
- Urdu RTL and English LTR support.
- Accessibility target: WCAG 2.2 AA where practical.
- Secure-by-default authorization.
- Structured logs and error monitoring.
- Database migrations tracked in version control.
- Backups and restore procedure tested before public launch.
- Core pages should be performant on slower mobile networks.
- SEO metadata for public stores and listings.

## 6. Acceptance criteria
A feature is not complete until:
- Requirements are met.
- Server-side authorization is tested.
- Validation and error states exist.
- Unit/integration tests pass.
- Relevant end-to-end flow is tested.
- Loading, empty and failure states exist.
- Mobile and RTL layout are reviewed where relevant.
- Documentation is updated.
