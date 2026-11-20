# Prompt 06 — Payment Adapter and Commission Ledger Review

Do not enable live payments.

First produce a design review for:
- Provider eligibility and marketplace policy (facts must be supplied/verified by founder).
- Payment intent lifecycle.
- Signed webhook verification.
- Idempotent event processing.
- Refund and chargeback events.
- Commission policy versioning.
- Immutable ledger entries and correction entries.
- Reconciliation report.
- COD collection status.

Implement only a sandbox adapter or mocked provider after explicit approval. Never invent provider endpoints or credentials. Do not store card data. Do not represent ledger balances as withdrawable funds unless a provider-approved payout flow exists.
