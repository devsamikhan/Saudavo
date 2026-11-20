# Project Charter

> Status: Founder-Approved Phase 2 Baseline (Mianwali District Pilot).

## 1. Vision
Build a trusted local digital-commerce ecosystem that allows home-based makers, freelancers, skilled workers and small shops to reach customers through one platform.

## 2. Problem statement
Many capable local sellers lack:
- A discoverable online storefront.
- A simple way to present products and services.
- A reliable order-management workflow.
- Digital customer communication and trust signals.
- Affordable tools to manage basic business activity.

Customers, in turn, lack one trusted place to discover local products and services.

## 3. Product concept
One account can act as both customer and seller. The platform contains:
- Physical product marketplace.
- Service/gig marketplace.
- Local business storefront directory.
- Shared identity, search, notifications and administration.
- Optional paid seller tools over time.

## 4. Target users
### Primary supply-side users
- Home-based women entrepreneurs and makers.
- Artisans and craftspeople.
- Freelancers and digital service providers.
- Local shops and independent service providers.

### Demand-side users
- Local residents looking for products and services.
- Customers who prefer local sellers, pickup or local delivery.

## 5. Product outcomes
MVP outcomes:
- A seller can register, create a store and submit a listing.
- An admin can review and approve a seller/listing.
- A customer can discover an approved listing and place an order/request.
- A seller can process the order and update its status.
- The platform can calculate a transparent commission ledger.
- Customers can review completed orders.
- Admin can resolve basic reports and disputes.

## 6. Business model hypotheses
These are hypotheses, not approved prices:
- Commission on completed eligible transactions.
- Optional monthly seller subscriptions for advanced tools.
- Clearly labelled sponsored placement.
- Future paid business tools (inventory, reports, custom storefront).

Do not charge a subscription before validating seller willingness to pay. Keep a useful free entry tier.

## 7. Scope boundaries
### MVP (Initial Release — Mianwali District, Punjab, Pakistan)
- **Pilot launch market:** Mianwali District, Punjab, Pakistan (with a multi-district-ready location data model; do not expand initial launch scope to all of Pakistan).
- Responsive web app / PWA-ready (Urdu RTL and English LTR).
- Customer, seller and admin/moderation roles.
- Privacy-first store profiles (approximate/service-area locality by default; no public residential addresses or personal phone numbers).
- Physical products and service listings with admin moderation.
- Search and categories.
- **Single-seller checkout:** one checkout/order contains products or services from one seller only (multi-seller purchases create separate orders).
- Separate physical product order and service order workflows.
- **Cash on Delivery (COD) only** as the active MVP payment method, with explicit distinction between delivery confirmation and cash collection confirmation (and a clean payment-provider abstraction for future online payments).
- Order management and immutable status history.
- Configurable platform commission calculation and immutable commission ledger (accounting records only, not a wallet or escrow).
- Reviews for completed orders.
- Admin moderation, reports and basic dispute resolution.

### Not in MVP
- Expansion beyond Mianwali District at initial launch.
- Multi-seller combined checkout in a single order.
- Active online payment gateway integration (deferred behind provider abstraction).
- Native mobile apps.
- Multi-country support.
- Multi-vendor split settlement.
- Platform-held wallet, escrow, or automated fund transfers.
- Complex AI recommendations.
- Microservices, Kubernetes, or Kafka.
- Real-time chat unless validated as essential.
- Automated subscriptions until billing/legal/provider flow is confirmed.

## 8. Success measures
- Number of verified active sellers.
- Seller activation rate (first approved listing).
- First-sale rate.
- Completed orders.
- Repeat customer rate.
- Order cancellation and dispute rates.
- Seller retention.
- GMV, platform revenue and contribution margin reported separately.
- Women-led seller activation and successful first-sale rate, measured with consent and privacy safeguards.

## 9. Risks
- Insufficient local demand or seller supply.
- Trust, quality and counterfeit/fraud issues.
- COD refusal and delivery failures.
- Payment-provider limitations.
- Seller onboarding friction.
- Privacy and safety risks for home-based sellers.
- Scope expansion before product-market validation.

## 10. Approval gates
Gate A: Market and user validation.
Gate B: PRD and user journeys approved.
Gate C: Architecture and data model approved.
Gate D: UX prototype approved by founder.
Gate E: MVP feature acceptance.
Gate F: Security, operational and legal readiness.
Gate G: Limited beta and launch approval.
