import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/auth/decorators";

interface OpenApiDocument {
  openapi: "3.1.0";
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string; description: string }>;
  components: {
    securitySchemes: Record<string, unknown>;
  };
  paths: Record<string, Record<string, unknown>>;
}

/**
 * Exposes Saudavo OpenAPI 3.1 specification for implemented REST endpoints.
 */
@Controller("openapi.json")
export class OpenApiController {
  @Public()
  @Get()
  getDocument(): OpenApiDocument {
    return {
      openapi: "3.1.0",
      info: {
        title: "Saudavo Marketplace API",
        version: "0.1.0",
        description:
          "Modular-monolith REST API for Saudavo local marketplace (Mianwali District pilot). All monetary amounts use integer paisa (PKR)."
      },
      servers: [{ url: "/api/v1", description: "Version 1 REST API" }],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "saudavo_sid"
          },
          csrfHeader: {
            type: "apiKey",
            in: "header",
            name: "X-CSRF-Token"
          }
        }
      },
      paths: {
        "/health": {
          get: {
            tags: ["System"],
            summary: "Service liveness check",
            responses: { "200": { description: "Healthy service response" } }
          }
        },
        "/locations/districts": {
          get: {
            tags: ["Locations"],
            summary: "List active districts and area zones (Mianwali pilot)",
            responses: { "200": { description: "Active districts and area zones" } }
          }
        },
        "/auth/register": {
          post: {
            tags: ["Auth"],
            summary: "Register customer account with email OR Pakistani phone + password",
            responses: {
              "201": { description: "Account created with HttpOnly session cookie" },
              "409": { description: "Duplicate email or phone identity" }
            }
          }
        },
        "/auth/login": {
          post: {
            tags: ["Auth"],
            summary: "Authenticate using email OR phone + password",
            responses: { "200": { description: "Session issued" } }
          }
        },
        "/auth/logout": {
          post: {
            tags: ["Auth"],
            summary: "Revoke current authenticated session",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "200": { description: "Session revoked" } }
          }
        },
        "/auth/me": {
          get: {
            tags: ["Auth"],
            summary:
              "Read current authenticated session user and optionally rotate cross-tab CSRF token via X-CSRF-Sync: 1",
            security: [{ cookieAuth: [] }],
            responses: { "200": { description: "Authenticated user summary" } }
          }
        },
        "/auth/password-reset/request": {
          post: {
            tags: ["Auth"],
            summary: "Request password reset token (non-enumerating)",
            responses: { "200": { description: "Accepted" } }
          }
        },
        "/auth/password-reset/confirm": {
          post: {
            tags: ["Auth"],
            summary: "Confirm password reset and revoke prior sessions",
            responses: { "200": { description: "Password reset completed" } }
          }
        },
        "/auth/admin/mfa/enroll": {
          post: {
            tags: ["Auth", "Admin"],
            summary:
              "Generate encrypted TOTP secret & otpauth URI for unenrolled staff MFA setup",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "200": { description: "TOTP secret & otpauth provisioning URI" } }
          }
        },
        "/auth/admin/mfa/verify": {
          post: {
            tags: ["Auth", "Admin"],
            summary: "Verify staff RFC 6238 TOTP MFA code (activates pending enrollment if needed)",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "200": { description: "MFA verified" } }
          }
        },
        "/seller/onboarding": {
          post: {
            tags: ["Seller"],
            summary: "Submit seller profile and privacy-first store onboarding",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "201": { description: "Seller profile and store queued for review" } }
          }
        },
        "/seller/profile": {
          get: {
            tags: ["Seller"],
            summary: "Get own private seller profile",
            security: [{ cookieAuth: [] }],
            responses: { "200": { description: "Private seller profile" } }
          },
          patch: {
            tags: ["Seller"],
            summary: "Update own seller profile",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "200": { description: "Updated seller profile" } }
          }
        },
        "/seller/store": {
          get: {
            tags: ["Seller"],
            summary: "Get own store settings and service areas",
            security: [{ cookieAuth: [] }],
            responses: { "200": { description: "Private store DTO" } }
          },
          patch: {
            tags: ["Seller"],
            summary: "Update own store settings, privacy contact flags, and service areas",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "200": { description: "Updated store DTO" } }
          }
        },
        "/categories": {
          get: {
            tags: ["Catalog"],
            summary: "List active marketplace categories",
            responses: { "200": { description: "Active category list" } }
          }
        },
        "/seller/products": {
          get: {
            tags: ["Seller Catalog"],
            summary: "List own store products across all statuses",
            security: [{ cookieAuth: [] }],
            responses: { "200": { description: "Own products" } }
          },
          post: {
            tags: ["Seller Catalog"],
            summary: "Create product listing with variants (approved seller + active store required)",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "201": { description: "Product created" } }
          }
        },
        "/seller/products/{id}": {
          patch: {
            tags: ["Seller Catalog"],
            summary: "Update own store product or variants",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "200": { description: "Product updated" } }
          },
          delete: {
            tags: ["Seller Catalog"],
            summary: "Archive and soft-delete own product",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "200": { description: "Product archived" } }
          }
        },
        "/seller/services": {
          get: {
            tags: ["Seller Catalog"],
            summary: "List own store service listings",
            security: [{ cookieAuth: [] }],
            responses: { "200": { description: "Own services" } }
          },
          post: {
            tags: ["Seller Catalog"],
            summary: "Create service listing with package tiers (ON_SITE/HYBRID/REMOTE)",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "201": { description: "Service listing created" } }
          }
        },
        "/seller/services/{id}": {
          patch: {
            tags: ["Seller Catalog"],
            summary: "Update own store service listing or packages",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "200": { description: "Service updated" } }
          },
          delete: {
            tags: ["Seller Catalog"],
            summary: "Archive and soft-delete own service listing",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "200": { description: "Service archived" } }
          }
        },
        "/stores/{slug}": {
          get: {
            tags: ["Public Discovery"],
            summary: "Get privacy-safe active public store profile",
            responses: { "200": { description: "Public store DTO" } }
          }
        },
        "/products/{slug}": {
          get: {
            tags: ["Public Discovery"],
            summary: "Get active public product detail",
            responses: { "200": { description: "Public product detail" } }
          }
        },
        "/services/{slug}": {
          get: {
            tags: ["Public Discovery"],
            summary: "Get active public service detail",
            responses: { "200": { description: "Public service detail" } }
          }
        },
        "/search": {
          get: {
            tags: ["Public Discovery"],
            summary: "Search active products and services by query, district, area zone, category, and price",
            responses: { "200": { description: "Paginated public search results" } }
          }
        },
        "/admin/review-queue": {
          get: {
            tags: ["Admin Moderation"],
            summary: "List pending seller profiles, products, and service listings (MFA required)",
            security: [{ cookieAuth: [] }],
            responses: { "200": { description: "Moderation queue" } }
          }
        },
        "/admin/sellers/{id}/approve": {
          post: {
            tags: ["Admin Moderation"],
            summary: "Approve seller profile and activate pending store (MFA + Audit Log)",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "200": { description: "Seller approved" } }
          }
        },
        "/admin/sellers/{id}/reject": {
          post: {
            tags: ["Admin Moderation"],
            summary: "Reject seller profile with mandatory reason (MFA + Audit Log)",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "200": { description: "Seller rejected" } }
          }
        },
        "/admin/listings/{id}/approve": {
          post: {
            tags: ["Admin Moderation"],
            summary: "Approve product or service listing (MFA + Audit Log)",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "200": { description: "Listing approved" } }
          }
        },
        "/admin/listings/{id}/reject": {
          post: {
            tags: ["Admin Moderation"],
            summary: "Reject product or service listing with mandatory reason (MFA + Audit Log)",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "200": { description: "Listing rejected" } }
          }
        },
        "/admin/stores/{id}/suspend": {
          post: {
            tags: ["Admin Moderation"],
            summary: "Suspend an active store with mandatory reason (Admin/SuperAdmin + MFA + Audit Log)",
            security: [{ cookieAuth: [], csrfHeader: [] }],
            responses: { "200": { description: "Store suspended" } }
          }
        },
        "/audit/logs": {
          get: {
            tags: ["Admin"],
            summary: "Read immutable admin audit logs (Admin/SuperAdmin + MFA required)",
            security: [{ cookieAuth: [] }],
            responses: { "200": { description: "Audit log records" } }
          }
        },
        "/customer/profile": {
          get: { tags: ["Customer"], summary: "Get own customer profile", security: [{ cookieAuth: [] }], responses: { "200": { description: "Customer profile" } } },
          patch: { tags: ["Customer"], summary: "Update preferred locale and default location", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "200": { description: "Updated customer profile" } } }
        },
        "/customer/addresses": {
          get: { tags: ["Customer"], summary: "List own delivery addresses", security: [{ cookieAuth: [] }], responses: { "200": { description: "Customer addresses" } } },
          post: { tags: ["Customer"], summary: "Create customer delivery address in active Mianwali zone", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "201": { description: "Address created" } } }
        },
        "/cart": {
          get: { tags: ["Cart"], summary: "List store-scoped carts (PQ-16)", security: [{ cookieAuth: [] }], responses: { "200": { description: "Grouped store carts" } } }
        },
        "/cart/items": {
          post: { tags: ["Cart"], summary: "Add physical product/variant to that store's cart", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "201": { description: "Cart updated" } } }
        },
        "/checkout/quote": {
          post: { tags: ["Checkout"], summary: "Compute single-seller server quote in integer paisa", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "200": { description: "Quote totals" } } }
        },
        "/orders": {
          get: { tags: ["Orders"], summary: "List own customer orders", security: [{ cookieAuth: [] }], responses: { "200": { description: "Customer orders" } } },
          post: { tags: ["Checkout"], summary: "Create idempotent single-seller COD physical order", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "201": { description: "Order created" } } }
        },
        "/orders/services": {
          post: { tags: ["Checkout"], summary: "Create idempotent single-seller service order (ON_SITE/HYBRID COD or REMOTE MANUAL_OFFLINE)", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "201": { description: "Service order created" } } }
        },
        "/orders/{id}/cancel": {
          post: { tags: ["Orders"], summary: "Customer self-cancellation (PENDING_CONFIRMATION only, PQ-10)", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "200": { description: "Order cancelled" } } }
        },
        "/orders/{id}/messages": {
          get: { tags: ["Messaging"], summary: "List text-only REST order messages (PQ-09)", security: [{ cookieAuth: [] }], responses: { "200": { description: "Messages" } } },
          post: { tags: ["Messaging"], summary: "Post text-only REST message (frozen after terminal state)", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "201": { description: "Message posted" } } }
        },
        "/seller/orders": {
          get: { tags: ["Seller Orders"], summary: "List orders for own store", security: [{ cookieAuth: [] }], responses: { "200": { description: "Store orders" } } }
        },
        "/seller/orders/{id}/confirm": {
          post: { tags: ["Seller Orders"], summary: "Seller confirms pending order", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "200": { description: "Order confirmed" } } }
        },
        "/seller/orders/{id}/cod-collection": {
          post: { tags: ["Seller Orders"], summary: "Confirm COD cash collection (separate from DELIVERED; posts CommissionLedger accrual)", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "200": { description: "COD collection confirmed" } } }
        },
        "/seller/orders/{id}/manual-payment-confirmation": {
          post: { tags: ["Seller Orders"], summary: "Seller-reported manual offline payment confirmation for REMOTE service (PQ-14)", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "200": { description: "Manual payment recorded" } } }
        },
        "/seller/commission-summary": {
          get: { tags: ["Finance"], summary: "Seller read-only accounting summary (not a wallet)", security: [{ cookieAuth: [] }], responses: { "200": { description: "Commission accounting summary" } } }
        },
        "/admin/commission-rules": {
          get: { tags: ["Finance Admin"], summary: "List versioned commission rules", security: [{ cookieAuth: [] }], responses: { "200": { description: "Commission rules" } } },
          post: { tags: ["Finance Admin"], summary: "Create new versioned GLOBAL or ORDER_TYPE commission rule (Super Admin + MFA)", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "201": { description: "Commission rule created" } } }
        },
        "/admin/settlements": {
          post: { tags: ["Finance Admin"], summary: "Record verified offline SellerSettlementRecord (Admin/SuperAdmin + MFA)", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "201": { description: "Settlement recorded" } } }
        },
        "/media/upload-url": {
          post: { tags: ["Media"], summary: "Issue private S3 SigV4 presigned PUT upload URL (image/jpeg, image/png, image/webp <= 5MB)", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "201": { description: "Presigned upload URL" } } }
        },
        "/media/{id}/confirm": {
          post: { tags: ["Media"], summary: "Verify magic bytes and EXIF removal before marking asset READY", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "200": { description: "Media asset verified" } } }
        },
        "/media/{id}/signed-url": {
          get: { tags: ["Media"], summary: "Issue short-lived private S3 SigV4 GET read URL", security: [{ cookieAuth: [] }], responses: { "200": { description: "Presigned read URL" } } }
        },
        "/orders/{id}/reviews": {
          post: { tags: ["Trust"], summary: "Post verified review for completed order", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "201": { description: "Review published" } } }
        },
        "/stores/{slug}/reviews": {
          get: { tags: ["Trust"], summary: "Read published store reviews (privacy-safe)", responses: { "200": { description: "Store reviews" } } }
        },
        "/reports": {
          post: { tags: ["Trust"], summary: "Report listing, store, review, or message", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "201": { description: "Report opened" } } }
        },
        "/admin/reports": {
          get: { tags: ["Trust Admin"], summary: "List submitted abuse reports (MFA required)", security: [{ cookieAuth: [] }], responses: { "200": { description: "Reports" } } }
        },
        "/admin/reports/{id}/resolve": {
          post: { tags: ["Trust Admin"], summary: "Resolve report and optionally hide violating review (MFA + Audit Log)", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "200": { description: "Report resolved" } } }
        },
        "/orders/{id}/disputes": {
          post: { tags: ["Trust"], summary: "Customer or Seller opens an order dispute", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "201": { description: "Dispute opened" } } }
        },
        "/admin/disputes": {
          get: { tags: ["Trust Admin"], summary: "List order disputes (MFA required)", security: [{ cookieAuth: [] }], responses: { "200": { description: "Disputes" } } }
        },
        "/admin/disputes/{id}/resolve": {
          post: { tags: ["Trust Admin"], summary: "Resolve dispute, record refund, and post immutable CommissionLedger reversal/adjustment", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "200": { description: "Dispute resolved" } } }
        },
        "/admin/orders/auto-complete-services": {
          post: { tags: ["Orders Admin"], summary: "PQ-10 (D-036): Auto-complete service orders 7 days after DELIVERY_SUBMITTED with COLLECTED payment", security: [{ cookieAuth: [], csrfHeader: [] }], responses: { "200": { description: "Sweep execution summary" } } }
        }
      }
    };
  }
}
