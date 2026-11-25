import { expect, test } from "@playwright/test";

test.describe("Saudavo Storefront EN LTR / UR RTL & Auth E2E", () => {
  test("renders Mianwali storefront listings, switches cleanly to Urdu RTL, and loads /auth", async ({
    page
  }) => {
    await page.route("**/api/v1/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/auth/me")) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "UNAUTHORIZED",
              message: "Not signed in",
              requestId: "req_e2e_1"
            }
          })
        });
        return;
      }

      if (url.includes("/locations/districts")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: "0193a8b2-2000-7000-8000-000000000001",
                code: "MIANWALI",
                nameEn: "Mianwali",
                nameUr: "میانوالی",
                slug: "mianwali",
                province: "Punjab",
                countryCode: "PK",
                areaZones: [
                  {
                    id: "0193a8b2-2001-7000-8000-000000000010",
                    nameEn: "Mianwali",
                    nameUr: "میانوالی",
                    slug: "mianwali-tehsil",
                    zoneType: "TEHSIL"
                  },
                  {
                    id: "0193a8b2-2001-7000-8000-000000000011",
                    nameEn: "Isakhel",
                    nameUr: "عیسیٰ خیل",
                    slug: "isakhel-tehsil",
                    zoneType: "TEHSIL"
                  }
                ]
              }
            ],
            meta: { requestId: "req_e2e_2" }
          })
        });
        return;
      }

      if (url.includes("/categories")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: "0193a8b2-3000-7000-8000-000000000001",
                parentId: null,
                applicableTo: "PRODUCT",
                slug: "handicrafts-embroidery",
                nameEn: "Handicrafts & Embroidery",
                nameUr: "دستکاری اور کڑھائی",
                sortOrder: 10
              }
            ],
            meta: { requestId: "req_e2e_3" }
          })
        });
        return;
      }

      if (url.includes("/stores/mianwali-handloom/listings")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              store: {
                id: "0193a8b2-4100-7000-8000-000000000001",
                slug: "mianwali-handloom",
                displayName: "Mianwali Handloom",
                description: "Traditional handmade textiles in Mianwali.",
                districtId: "0193a8b2-1100-7000-8000-000000000001",
                districtNameEn: "Mianwali",
                districtNameUr: "میانوالی",
                defaultDeliveryFeePaisa: 15000,
                currency: "PKR",
                publicContactPhone: null,
                publicBusinessAddress: null,
                serviceAreas: [
                  {
                    id: "0193a8b2-2100-7000-8000-000000000001",
                    areaZoneId: "0193a8b2-2000-7000-8000-000000000001",
                    areaZoneNameEn: "Mianwali",
                    areaZoneNameUr: "میانوالی",
                    areaZoneSlug: "mianwali",
                    deliveryFeeOverridePaisa: null,
                    pickupSupported: true,
                    deliverySupported: true
                  }
                ]
              },
              ratingAvg: 5,
              reviewCount: 2,
              products: [
                {
                  id: "0193a8b2-5000-7000-8000-000000000001",
                  type: "PRODUCT",
                  slug: "handmade-phulkari-shawl",
                  title: "Handmade Phulkari Shawl",
                  pricePaisa: 350000,
                  currency: "PKR",
                  serviceMode: null,
                  thumbnailUrl: null,
                  ratingAvg: 5,
                  reviewCount: 2,
                  store: {
                    id: "0193a8b2-4100-7000-8000-000000000001",
                    slug: "mianwali-handloom",
                    displayName: "Mianwali Handloom",
                    districtName: "Mianwali",
                    serviceAreas: ["Mianwali", "Isakhel"],
                    privacyProtected: true
                  }
                }
              ],
              services: []
            },
            meta: { requestId: "req_e2e_store_1" }
          })
        });
        return;
      }

      if (url.includes("/stores/mianwali-handloom/reviews")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [],
            meta: { requestId: "req_e2e_store_2" }
          })
        });
        return;
      }

      if (url.includes("/search")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: "0193a8b2-5000-7000-8000-000000000001",
                type: "PRODUCT",
                slug: "handmade-phulkari-shawl",
                title: "Handmade Phulkari Shawl",
                pricePaisa: 350000,
                currency: "PKR",
                serviceMode: null,
                store: {
                  id: "0193a8b2-4100-7000-8000-000000000001",
                  slug: "mianwali-handloom",
                  displayName: "Mianwali Handloom",
                  districtName: "Mianwali",
                  serviceAreas: ["Mianwali", "Isakhel"]
                }
              },
              {
                id: "0193a8b2-5000-7000-8000-000000000002",
                type: "SERVICE",
                slug: "shop-logo-design",
                title: "Shop Poster Design",
                pricePaisa: 250000,
                currency: "PKR",
                serviceMode: "REMOTE",
                store: {
                  id: "0193a8b2-4100-7000-8000-000000000002",
                  slug: "isakhel-digital",
                  displayName: "Isakhel Digital",
                  districtName: "Mianwali",
                  serviceAreas: ["Mianwali"]
                }
              }
            ],
            meta: {
              requestId: "req_e2e_4",
              pagination: { cursor: null, hasMore: false, limit: 24 }
            }
          })
        });
        return;
      }

      await route.continue();
    });

    await page.goto("/");

    await expect(
      page.getByText("MIANWALI CLOSED BETA • 0% SELLER COMMISSION • COD ONLY")
    ).toBeVisible();
    await expect(page.getByText("Browse by Category")).toBeVisible();
    await expect(page.getByText("Handmade Phulkari Shawl")).toBeVisible();
    await expect(page.getByText("Rs. 3,500")).toBeVisible();
    await expect(page.getByText("Shop Poster Design")).toBeVisible();
    await expect(page.getByText("Remote • Manual Offline")).toBeVisible();

    // Wishlist Heart toggle & toast notification
    await page.getByRole("button", { name: "Save to wishlist" }).first().click();
    await expect(page.getByText(/Saved to wishlist!/)).toBeVisible();

    // Floating Sauda Buddy mascot opens & closes helper card
    await page.getByRole("button", { name: /Sauda Buddy/i }).click();
    await expect(page.getByText("Assalam-o-Alaikum!")).toBeVisible();
    await page.getByRole("button", { name: "Got it!" }).click();
    await expect(page.getByText("Assalam-o-Alaikum!")).not.toBeVisible();

    // Verify sort & price controls exist and navigate to Storefront Store Page
    await expect(page.getByLabel("Sort listings")).toBeVisible();

    await page.getByRole("link", { name: /Mianwali Handloom/i }).first().click();
    await expect(page).toHaveURL(/\/stores\/mianwali-handloom$/);
    await expect(page.getByRole("heading", { name: "Handmade Phulkari Shawl" })).toBeVisible();
    await expect(page.getByText("Share Store on WhatsApp")).toBeVisible();
    await expect(page.getByText("Download Store QR Sticker")).toBeVisible();

    // Switch back to storefront and test Urdu RTL
    await page.goto("/");
    await page
      .getByRole("button", { name: "Switch language between English and Urdu" })
      .click();

    await expect(page.locator("html")).toHaveAttribute("lang", "ur");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByText("سوداو").first()).toBeVisible();
    await expect(page.getByText("3,500 روپے")).toBeVisible();

    // Accessibility check: Skip to main content link works
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toHaveAttribute("href", "#main-content");

    // Navigate to Auth page
    await page.getByRole("link", { name: "لاگ ان", exact: true }).click();
    await expect(page).toHaveURL(/\/auth$/);
    await expect(
      page.getByLabel("ای میل یا موبائل نمبر (مثلاً 03001234567)")
    ).toBeVisible();

    // Verify 404 Spot Illustration page and inline working search redirect (/?q=...)
    await page.goto("/nonexistent-404-page");
    await expect(page.getByText("404", { exact: true })).toBeVisible();
    await page.locator('input[type="search"]').fill("Shawl");
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/\?q=Shawl$/);
    await expect(page.getByRole("heading", { name: "Handmade Phulkari Shawl" })).toBeVisible();
  });

  test("places a COD order, shows animated Order Confirmed modal, and opens Isometric live tracking", async ({
    page
  }) => {
    let orderPlaced = false;
    const orderId = "0193a8b2-9000-7000-8000-000000000804";
    const storeId = "0193a8b2-4100-7000-8000-000000000001";
    const districtId = "0193a8b2-2000-7000-8000-000000000001";
    const areaZoneId = "0193a8b2-2001-7000-8000-000000000010";
    const addressId = "0193a8b2-6000-7000-8000-000000000001";
    const userId = "0193a8b2-0000-7000-8000-000000000099";

    await page.route("**/api/v1/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes("/auth/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              user: {
                id: userId,
                email: "buyer@saudavo.pk",
                phone: null,
                displayName: "Ayesha",
                preferredLocale: "en",
                roles: ["USER"],
                mfaRequired: false,
                mfaVerified: false
              },
              csrfToken: "csrf_e2e_tok"
            },
            meta: { requestId: "req_auth_1" }
          })
        });
        return;
      }

      if (url.includes("/notifications")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [],
            meta: { unreadCount: 0, requestId: "req_notif_1" }
          })
        });
        return;
      }

      if (url.includes("/locations/districts")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: districtId,
                code: "MIANWALI",
                nameEn: "Mianwali",
                nameUr: "میانوالی",
                slug: "mianwali",
                province: "Punjab",
                countryCode: "PK",
                areaZones: [
                  {
                    id: areaZoneId,
                    nameEn: "Mianwali",
                    nameUr: "میانوالی",
                    slug: "mianwali-tehsil",
                    zoneType: "TEHSIL"
                  }
                ]
              }
            ],
            meta: { requestId: "req_loc_1" }
          })
        });
        return;
      }

      if (url.includes("/customer/addresses")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: addressId,
                label: "Home",
                districtId,
                districtName: "Mianwali",
                areaZoneId,
                areaZoneName: "Mianwali",
                recipientName: "Ayesha Khan",
                recipientPhone: "+923001234567",
                streetAddress: "Street 4, Muslim Bazaar",
                landmark: null,
                isDefault: true,
                createdAt: "2026-11-24T10:00:00.000Z",
                updatedAt: "2026-11-24T10:00:00.000Z"
              }
            ],
            meta: { requestId: "req_addr_1" }
          })
        });
        return;
      }

      if (url.includes("/cart")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: orderPlaced
              ? []
              : [
                  {
                    cartId: "0193a8b2-7100-7000-8000-000000000001",
                    storeId,
                    storeSlug: "mianwali-handloom",
                    storeDisplayName: "Mianwali Handloom",
                    currency: "PKR",
                    subtotalPaisa: 350000,
                    items: [
                      {
                        id: "0193a8b2-7200-7000-8000-000000000001",
                        productId: "0193a8b2-5000-7000-8000-000000000001",
                        productVariantId: null,
                        productTitle: "Handmade Phulkari Shawl",
                        productSlug: "handmade-phulkari-shawl",
                        variantTitle: null,
                        unitPricePaisa: 350000,
                        lineTotalPaisa: 350000,
                        quantity: 1,
                        availableStock: 10
                      }
                    ]
                  }
                ],
            meta: { requestId: "req_cart_1" }
          })
        });
        return;
      }

      if (url.includes("/checkout/quote")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              storeId,
              currency: "PKR",
              fulfilmentMode: "SELLER_DELIVERY",
              subtotalPaisa: 350000,
              deliveryFeePaisa: 15000,
              discountPaisa: 0,
              totalPaisa: 365000,
              itemCount: 1
            },
            meta: { requestId: "req_quote_1" }
          })
        });
        return;
      }

      if (url.endsWith("/orders") && method === "POST") {
        orderPlaced = true;
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              orderId,
              orderNumber: "SVD-8042",
              orderType: "PHYSICAL",
              storeId,
              status: "PENDING_CONFIRMATION",
              paymentMethod: "COD",
              codCollectionStatus: "PENDING_COLLECTION",
              currency: "PKR",
              subtotalPaisa: 350000,
              deliveryFeePaisa: 15000,
              totalPaisa: 365000
            },
            meta: { requestId: "req_order_post_1" }
          })
        });
        return;
      }

      if (url.includes("/messages")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [],
            meta: { requestId: "req_msg_1" }
          })
        });
        return;
      }

      if (url.includes("/orders")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: orderId,
                orderNumber: "SVD-8042",
                customerId: userId,
                storeId,
                districtId,
                orderType: "PHYSICAL",
                status: "READY_FOR_DISPATCH",
                paymentMethod: "COD",
                codCollectionStatus: "PENDING_COLLECTION",
                currency: "PKR",
                subtotalPaisa: 350000,
                deliveryFeePaisa: 15000,
                discountPaisa: 0,
                totalPaisa: 365000,
                commissionRateBps: 0,
                commissionAmountPaisa: 0,
                sellerNetEntitlementPaisa: 365000,
                customerNote: null,
                cancelledReason: null,
                completedAt: null,
                createdAt: "2026-11-24T12:00:00.000Z",
                updatedAt: "2026-11-24T12:05:00.000Z",
                items: [
                  {
                    id: "0193a8b2-8000-7000-8000-000000000001",
                    productId: "0193a8b2-5000-7000-8000-000000000001",
                    productVariantId: null,
                    titleSnapshot: "Handmade Phulkari Shawl",
                    variantTitleSnapshot: null,
                    skuSnapshot: null,
                    unitPricePaisa: 350000,
                    quantity: 1,
                    lineTotalPaisa: 350000,
                    currency: "PKR"
                  }
                ],
                serviceOrderDetails: null,
                delivery: null,
                statusHistory: []
              }
            ],
            meta: { requestId: "req_orders_list_1" }
          })
        });
        return;
      }

      await route.continue();
    });

    await page.goto("/cart");
    await expect(page.getByText("Handmade Phulkari Shawl")).toBeVisible();
    await expect(page.getByText("Rs. 3,650").first()).toBeVisible();

    await page.getByRole("button", { name: "Place COD Order" }).click();

    // Animated Lottie-style Order Confirmed Modal opens
    await expect(
      page.getByRole("dialog").getByText("Order Confirmed!")
    ).toBeVisible();
    await expect(page.getByText("#SVD-8042")).toBeVisible();

    // Jump straight into Isometric Live Order Tracking
    await page.getByRole("link", { name: "Track Live Order" }).click();
    await expect(page).toHaveURL(new RegExp(`/orders\\?order=${orderId}$`));
    await expect(page.getByText("Isometric Live Tracking")).toBeVisible();
    await expect(page.getByText("Live Order #SVD-8042")).toBeVisible();
    await expect(page.getByText("Rider Dispatched")).toBeVisible();

    // Mobile (375px) zero horizontal overflow verification
    await page.setViewportSize({ width: 375, height: 812 });
    const fitsMobileWidth = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(fitsMobileWidth).toBe(true);
  });

  test("renders Split-Screen Seller Studio onboarding for guests and SpotState for active seller with zero orders", async ({
    page
  }) => {
    let signedInSeller = false;
    const districtId = "0193a8b2-2000-7000-8000-000000000001";
    const areaZoneId = "0193a8b2-2001-7000-8000-000000000010";
    const userId = "0193a8b2-0000-7000-8000-000000000111";
    const profileId = "0193a8b2-4000-7000-8000-000000000111";
    const storeId = "0193a8b2-4100-7000-8000-000000000111";
    const nowIso = "2026-11-24T10:00:00.000Z";

    await page.route("**/api/v1/**", async (route) => {
      const url = route.request().url();

      if (url.includes("/auth/me")) {
        if (!signedInSeller) {
          await route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({
              error: {
                code: "UNAUTHORIZED",
                message: "Not signed in",
                requestId: "req_seller_unauth"
              }
            })
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              user: {
                id: userId,
                email: "seller@saudavo.pk",
                phone: null,
                displayName: "Sami",
                preferredLocale: "en",
                roles: ["USER", "SELLER"],
                mfaRequired: false,
                mfaVerified: false
              },
              csrfToken: "csrf_seller_e2e"
            },
            meta: { requestId: "req_seller_auth" }
          })
        });
        return;
      }

      if (url.includes("/notifications")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [],
            meta: { unreadCount: 0, requestId: "req_seller_notif" }
          })
        });
        return;
      }

      if (url.includes("/locations/districts")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: districtId,
                code: "MIANWALI",
                nameEn: "Mianwali",
                nameUr: "میانوالی",
                slug: "mianwali",
                province: "Punjab",
                countryCode: "PK",
                areaZones: [
                  {
                    id: areaZoneId,
                    nameEn: "Mianwali",
                    nameUr: "میانوالی",
                    slug: "mianwali-tehsil",
                    zoneType: "TEHSIL"
                  }
                ]
              }
            ],
            meta: { requestId: "req_seller_dist" }
          })
        });
        return;
      }

      if (url.includes("/categories")) {
        const isService = url.includes("SERVICE");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: isService
                  ? "0193a8b2-3000-7000-8000-000000000002"
                  : "0193a8b2-3000-7000-8000-000000000001",
                parentId: null,
                applicableTo: isService ? "SERVICE" : "PRODUCT",
                slug: isService ? "local-repairs" : "handicrafts",
                nameEn: isService ? "Local Repairs" : "Handicrafts",
                nameUr: isService ? "مقامی مرمت" : "دستکاری",
                sortOrder: 10
              }
            ],
            meta: { requestId: "req_seller_cat" }
          })
        });
        return;
      }

      if (url.includes("/seller/profile")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              id: profileId,
              userId,
              sellerType: "LOCAL_SHOP",
              verificationStatus: "APPROVED",
              rejectionReason: null,
              verifiedAt: nowIso,
              createdAt: nowIso,
              updatedAt: nowIso
            },
            meta: { requestId: "req_seller_prof" }
          })
        });
        return;
      }

      if (url.includes("/seller/store")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              id: storeId,
              sellerProfileId: profileId,
              districtId,
              districtNameEn: "Mianwali",
              slug: "sami-crafts",
              displayName: "Sami Crafts",
              description: null,
              showPublicPhone: false,
              publicContactPhone: null,
              showPublicAddress: false,
              publicBusinessAddress: null,
              defaultDeliveryFeePaisa: 15000,
              currency: "PKR",
              status: "ACTIVE",
              serviceAreas: [],
              createdAt: nowIso,
              updatedAt: nowIso
            },
            meta: { requestId: "req_seller_store" }
          })
        });
        return;
      }

      if (
        url.includes("/seller/products") ||
        url.includes("/seller/services") ||
        url.includes("/seller/orders")
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [],
            meta: { requestId: "req_seller_empty" }
          })
        });
        return;
      }

      if (url.includes("/seller/commission-summary")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              storeId,
              currency: "PKR",
              accountingDisclaimer: "Commission ledger is for tracking only.",
              completedGrossPaisa: 0,
              accruedCommissionPaisa: 0,
              settledCommissionPaisa: 0,
              outstandingCommissionOwedPaisa: 0,
              promotionalBetaNote: "0% closed beta rate active."
            },
            meta: { requestId: "req_seller_sum" }
          })
        });
        return;
      }

      await route.continue();
    });

    // 1. Guest visitor sees Split-Screen Seller Studio onboarding & illustration
    await page.goto("/seller");
    await expect(
      page.getByText("MIANWALI SELLER STUDIO • 0% BETA COMMISSION")
    ).toBeVisible();
    await expect(
      page.locator('img[alt="Saudavo Mianwali local seller studio illustration"]')
    ).toBeVisible();

    await page.locator("#seller-prefill-store-name").fill("Sami Crafts");
    await page.getByRole("button", { name: "Create Seller Account" }).click();
    await expect(page).toHaveURL(/\/auth\?intent=seller$/);
    await expect(page.locator("#auth-reg-shop-name")).toHaveValue("Sami Crafts");

    // 2. Signed-in active seller sees sleek header strip, Empty Orders SpotState & QR Growth CTA
    signedInSeller = true;
    await page.goto("/seller");
    await expect(page.getByRole("heading", { name: "Sami Crafts" })).toBeVisible();
    await expect(page.getByRole("link", { name: /View Public Store/i })).toBeVisible();
    await expect(page.getByText("No store orders yet")).toBeVisible();

    await page.getByRole("button", { name: "Open Store & QR Growth" }).click();
    await expect(page.getByText("Share Store on WhatsApp")).toBeVisible();

    // Mobile (375px) zero horizontal overflow verification
    await page.setViewportSize({ width: 375, height: 812 });
    const fitsMobileWidth = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(fitsMobileWidth).toBe(true);
  });
});
