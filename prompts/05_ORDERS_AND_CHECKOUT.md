# Prompt 05 — Cart, Checkout and Orders

Implement product checkout and service-order workflows according to the approved state machines.

Mandatory:
- Server-calculated totals; never trust client price or stock.
- Database transaction for order creation and stock reservation/decrement.
- Idempotency key for order creation.
- Seller-scoped access.
- Immutable order-item and service-package snapshots.
- Status history for every transition.
- Validate allowed transitions on the server.
- Test duplicate requests, race conditions, insufficient stock, cancellation and unauthorized access.
- Clearly distinguish order payment method from confirmed payment collection.
- Do not implement a platform wallet or escrow.

Stop before integrating live payments; use test fixtures until provider approval.
