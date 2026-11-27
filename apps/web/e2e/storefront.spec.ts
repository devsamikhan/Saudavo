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

    // Sauda Buddy floating widget is disabled per product decision
    await expect(page.getByRole("button", { name: /Sauda Buddy/i })).toHaveCount(0);

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
    await expect(
      page.getByRole("heading", { name: "Handmade Phulkari Shawl" })
    ).toBeVisible();

    // Verify mobile viewports (320px, 375px, 412px) fit cleanly on storefront catalog
    for (const vp of [
      { width: 320, height: 568 },
      { width: 375, height: 812 },
      { width: 412, height: 915 }
    ]) {
      await page.setViewportSize(vp);
      const fitsStorefrontMobile = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      );
      expect(fitsStorefrontMobile).toBe(true);
    }
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

    // Mobile viewports (320px compact Android, 375px standard, 412px large Android) zero horizontal overflow verification
    for (const vp of [
      { width: 320, height: 568 },
      { width: 375, height: 812 },
      { width: 412, height: 915 }
    ]) {
      await page.setViewportSize(vp);
      const fitsMobileWidth = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      );
      expect(fitsMobileWidth).toBe(true);
    }
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

    // Mobile viewports (320px, 375px, 412px) zero horizontal overflow verification
    for (const vp of [
      { width: 320, height: 568 },
      { width: 375, height: 812 },
      { width: 412, height: 915 }
    ]) {
      await page.setViewportSize(vp);
      const fitsMobileWidth = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      );
      expect(fitsMobileWidth).toBe(true);
    }
  });

  test("allows recovering a forgotten password from /auth and via ?mode=reset&token= deep link", async ({
    page
  }) => {
    let resetRequestedFor = "";
    let confirmedToken = "";

    await page.route("**/api/v1/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes("/auth/me")) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "UNAUTHORIZED",
              message: "Not signed in",
              requestId: "req_pw_unauth"
            }
          })
        });
        return;
      }

      if (url.includes("/auth/password-reset/request") && method === "POST") {
        const body = route.request().postDataJSON() as { identifier: string };
        resetRequestedFor = body.identifier;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              accepted: true,
              message:
                "If a matching active account exists, recovery steps have been queued."
            },
            meta: { requestId: "req_pw_req" }
          })
        });
        return;
      }

      if (url.includes("/auth/password-reset/confirm") && method === "POST") {
        const body = route.request().postDataJSON() as {
          token: string;
          newPassword: string;
        };
        confirmedToken = body.token;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { reset: true },
            meta: { requestId: "req_pw_conf" }
          })
        });
        return;
      }

      await route.continue();
    });

    await page.goto("/auth");
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await expect(page.getByText("Recover Password")).toBeVisible();

    await page.locator("#auth-reset-identifier").fill("samikhanniazi285@gmail.com");
    await page.getByRole("button", { name: "Send Recovery Link" }).click();

    await expect.poll(() => resetRequestedFor).toBe("samikhanniazi285@gmail.com");
    await expect(page.locator("#auth-reset-token")).toBeVisible();

    // Verify mismatch validation works inline without browser alerts
    await page.locator("#auth-reset-token").fill("tok_recovery_1234567890");
    await page.locator("#auth-reset-new-password").fill("StrongPass!99");
    await page.locator("#auth-reset-confirm-password").fill("MismatchPass!99");
    await page.getByRole("button", { name: "Save New Password" }).click();
    await expect(page.getByText("New passwords do not match.")).toBeVisible();

    // Submit matching password and verify clean transition back to Sign In
    await page.locator("#auth-reset-confirm-password").fill("StrongPass!99");
    await page.getByRole("button", { name: "Save New Password" }).click();
    await expect.poll(() => confirmedToken).toBe("tok_recovery_1234567890");
    await expect(
      page.getByRole("status").getByText("Password updated! Please sign in with your new password.")
    ).toBeVisible();
    await expect(page.locator("#auth-login-identifier")).toHaveValue(
      "samikhanniazi285@gmail.com"
    );

    // Verify deep link pre-fills recovery token directly on Step 2 and fits 320px/375px phones
    await page.goto("/auth?mode=reset&token=deep_link_token_987654321");
    await expect(page.locator("#auth-reset-token")).toHaveValue(
      "deep_link_token_987654321"
    );

    for (const vp of [
      { width: 320, height: 568 },
      { width: 375, height: 812 }
    ]) {
      await page.setViewportSize(vp);
      const fitsAuthMobile = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      );
      expect(fitsAuthMobile).toBe(true);
    }
  });

  test("serves /terms, /privacy, /robots.txt, and /account address book cleanly", async ({
    page
  }) => {
    const robotsRes = await page.request.get("/robots.txt");
    expect(robotsRes.status()).toBe(200);
    const robotsBody = await robotsRes.text();
    expect(robotsBody).toContain("Sitemap:");

    await page.goto("/terms");
    await expect(page.getByText("Saudavo Marketplace Terms of Use")).toBeVisible();

    await page.goto("/privacy");
    await expect(page.getByText("Saudavo Privacy & Safety Policy")).toBeVisible();

    await page.route("**/api/v1/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/auth/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              user: {
                id: "11111111-1111-4111-8111-111111111111",
                email: "buyer@saudavo.pk",
                phoneE164: "+923001234567",
                displayName: "Ayesha Buyer",
                preferredLocale: "en",
                roles: ["CUSTOMER"],
                mfaRequired: false,
                mfaVerified: false
              },
              csrfToken: "csrf_acc_1"
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
                id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                code: "MIANWALI",
                nameEn: "Mianwali District",
                nameUr: "ضلع میانوالی",
                slug: "mianwali",
                province: "Punjab",
                countryCode: "PK",
                areaZones: [
                  {
                    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    districtId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                    nameEn: "Mianwali City",
                    nameUr: "میانوالی شہر",
                    slug: "mianwali-city",
                    zoneType: "CITY"
                  }
                ]
              }
            ]
          })
        });
        return;
      }
      if (url.includes("/customer/profile")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              userId: "11111111-1111-4111-8111-111111111111",
              preferredLocale: "en",
              defaultDistrictId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
              defaultAreaZoneId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
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
                id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                label: "Home",
                districtId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                districtName: "Mianwali District",
                areaZoneId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                areaZoneName: "Mianwali City",
                recipientName: "Ayesha Buyer",
                recipientPhone: "+923001234567",
                streetAddress: "Street 4, Muslim Bazaar",
                landmark: "Near Clock Tower",
                isDefault: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ]
          })
        });
        return;
      }
      await route.continue();
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/account");
    await expect(page.getByText("My Account & Saved Addresses")).toBeVisible();
    await expect(page.getByText("Street 4, Muslim Bazaar (Near Clock Tower)")).toBeVisible();
    const fitsMobile = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(fitsMobile).toBe(true);
  });

  test("renders Saudavo Shopping Messenger custom offer flow and Seller Monthly Plan tab cleanly", async ({
    page
  }) => {
    const storeId = "22222222-2222-4222-8222-222222222222";
    const convId = "33333333-3333-4333-8333-333333333333";
    const msgId = "44444444-4444-4444-8444-444444444444";
    const addrId = "55555555-5555-4555-8555-555555555555";
    let offerAccepted = false;

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
                id: "11111111-1111-4111-8111-111111111111",
                displayName: "Hamza Buyer",
                preferredLocale: "en",
                roles: ["CUSTOMER", "SELLER"],
                emailVerified: true,
                phoneVerified: false,
                mfaRequired: false,
                mfaEnrolled: false,
                mfaVerified: false
              },
              csrfToken: "csrf_msg_e2e"
            }
          })
        });
        return;
      }

      if (url.includes("/messenger/unread-count")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { unreadCount: 1 } })
        });
        return;
      }

      if (url.includes("/notifications")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [], meta: { requestId: "req_n", unreadCount: 0 } })
        });
        return;
      }

      if (url.includes("/cart")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [] })
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
                id: addrId,
                label: "Home",
                districtId: "66666666-6666-4666-8666-666666666666",
                districtName: "Mianwali",
                areaZoneId: "77777777-7777-4777-8777-777777777777",
                areaZoneName: "Mianwali",
                recipientName: "Hamza Buyer",
                recipientPhone: "+923001112233",
                streetAddress: "Street 2, Mianwali",
                landmark: null,
                isDefault: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ]
          })
        });
        return;
      }

      if (url.includes("/seller/products")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [] })
        });
        return;
      }

      if (url.includes("/locations/districts")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [] })
        });
        return;
      }

      if (url.includes("/categories")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [] })
        });
        return;
      }

      if (url.includes("/seller/profile")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              id: "12121212-1212-4121-8121-121212121212",
              userId: "11111111-1111-4111-8111-111111111111",
              sellerType: "HOME_MAKER",
              verificationStatus: "APPROVED",
              rejectionReason: null,
              verifiedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
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
              sellerProfileId: "12121212-1212-4121-8121-121212121212",
              districtId: "66666666-6666-4666-8666-666666666666",
              districtNameEn: "Mianwali",
              slug: "zainab-embroidery",
              displayName: "Zainab Embroidery",
              description: "Mianwali crafts",
              showPublicPhone: false,
              publicContactPhone: null,
              showPublicAddress: false,
              publicBusinessAddress: null,
              defaultDeliveryFeePaisa: 15000,
              currency: "PKR",
              status: "ACTIVE",
              serviceAreas: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          })
        });
        return;
      }

      if (url.includes("/seller/services") || url.includes("/seller/orders")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [] })
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
              accountingDisclaimer: "Accounting statement only.",
              completedGrossPaisa: 0,
              accruedCommissionPaisa: 0,
              settledCommissionPaisa: 0,
              outstandingCommissionOwedPaisa: 0,
              promotionalBetaNote: "0% commission."
            }
          })
        });
        return;
      }

      if (url.endsWith("/api/v1/features")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              shopping_messenger_enabled: true,
              seller_subscriptions_enabled: true,
              buyer_requests_board_enabled: false,
              messenger_voice_notes_enabled: false,
              handover_pin_enabled: false,
              flash_deals_coupons_enabled: false,
              cod_refusal_shield_enabled: false
            }
          })
        });
        return;
      }

      if (url.includes("/subscriptions/plans")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: "90909090-9090-4090-8090-909090909090",
                code: "FREE_STARTER",
                nameEn: "Free Starter Store",
                nameUr: "مفت اسٹارٹر اسٹور",
                descriptionEn: "Up to 5 products",
                descriptionUr: "5 مصنوعات تک",
                pricePaisa: 0,
                currency: "PKR",
                durationDays: 30,
                maxActiveProducts: 5,
                maxActiveServices: 2,
                hasVerifiedBadge: false,
                hasPriorityPlacement: false,
                hasCustomOffers: true,
                isActive: true,
                sortOrder: 10
              },
              {
                id: "91919191-9191-4191-8191-919191919191",
                code: "PRO_MONTHLY",
                nameEn: "Saudavo Pro Monthly",
                nameUr: "سوداو پرو ماہانہ",
                descriptionEn: "Up to 100 products",
                descriptionUr: "100 مصنوعات تک",
                pricePaisa: 50000,
                currency: "PKR",
                durationDays: 30,
                maxActiveProducts: 100,
                maxActiveServices: 25,
                hasVerifiedBadge: true,
                hasPriorityPlacement: false,
                hasCustomOffers: true,
                isActive: true,
                sortOrder: 20
              }
            ]
          })
        });
        return;
      }

      if (url.includes("/seller/subscription")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              storeId,
              status: "ACTIVE",
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: null,
              graceEndsAt: null,
              plan: {
                id: "90909090-9090-4090-8090-909090909090",
                code: "FREE_STARTER",
                nameEn: "Free Starter Store",
                nameUr: "مفت اسٹارٹر اسٹور",
                descriptionEn: "Up to 5 products",
                descriptionUr: "5 مصنوعات تک",
                pricePaisa: 0,
                currency: "PKR",
                durationDays: 30,
                maxActiveProducts: 5,
                maxActiveServices: 2,
                hasVerifiedBadge: false,
                hasPriorityPlacement: false,
                hasCustomOffers: true,
                isActive: true,
                sortOrder: 10
              },
              activeProductCount: 0,
              activeServiceCount: 0,
              billingInstructions: {
                accountTitle: "Saudavo Marketplace",
                raastId: "RAAST-SAUDAVO-DEMO",
                walletNumber: "03000000000",
                note: "Zero-gateway manual billing"
              },
              renewals: []
            }
          })
        });
        return;
      }

      if (url.includes("/messenger/conversations") && url.endsWith("/messages")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: msgId,
                conversationId: convId,
                senderId: "99999999-9999-4999-8999-999999999999",
                senderRole: "SELLER",
                messageType: "CUSTOM_OFFER",
                body: "Special Mianwali bundle offer",
                productSummary: null,
                serviceSummary: null,
                mediaAssetId: null,
                imageReadUrl: null,
                offerTitle: "Embroidered Shawl",
                offerQuantity: 1,
                offerUnitPricePaisa: 180000,
                offerDeliveryFeePaisa: 10000,
                offerTotalPaisa: 190000,
                offerFulfilmentMode: "SELLER_DELIVERY",
                offerStatus: offerAccepted ? "ACCEPTED" : "PENDING",
                offerOrderId: offerAccepted ? "88888888-8888-4888-8888-888888888888" : null,
                offerExpiresAt: new Date(Date.now() + 86400000).toISOString(),
                createdAt: new Date().toISOString()
              }
            ]
          })
        });
        return;
      }

      if (url.includes("/offers/") && url.endsWith("/accept") && method === "POST") {
        offerAccepted = true;
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              orderId: "88888888-8888-4888-8888-888888888888",
              orderNumber: "MWL-20261126-CHAT1",
              orderType: "PHYSICAL",
              storeId,
              status: "CONFIRMED",
              paymentMethod: "COD",
              codCollectionStatus: "PENDING_COLLECTION",
              currency: "PKR",
              subtotalPaisa: 180000,
              deliveryFeePaisa: 10000,
              totalPaisa: 190000
            }
          })
        });
        return;
      }

      if (url.endsWith("/messenger/conversations")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: convId,
                roleView: "BUYER",
                buyerId: "11111111-1111-4111-8111-111111111111",
                buyerDisplayName: "Hamza Buyer",
                buyerCodStats: null,
                storeId,
                storeSlug: "zainab-embroidery",
                storeDisplayName: "Zainab Embroidery",
                storeDistrictNameEn: "Mianwali",
                storeVerifiedPro: true,
                status: "OPEN",
                unreadCount: 1,
                lastMessagePreview: "Offer: Embroidered Shawl",
                lastMessageAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
              }
            ]
          })
        });
        return;
      }

      await route.continue();
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/messages");
    await expect(page.getByText("Saudavo Shopping Messenger")).toBeVisible();
    await expect(page.getByText("Embroidered Shawl × 1")).toBeVisible();
    await page.getByRole("button", { name: "Accept & Place COD Order" }).click();
    await expect(page.getByText("MWL-20261126-CHAT1")).toBeVisible();

    const fitsMobile = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(fitsMobile).toBe(true);

    await page.goto("/seller");
    await page.getByRole("button", { name: "Monthly Plan" }).click();
    await expect(page.getByText("Free Starter Store").first()).toBeVisible();
    await expect(page.getByText("Saudavo Pro Monthly").first()).toBeVisible();
  });

  test("hides Monthly Plan when Subscriptions OFF by default and unlocks Demand Board + Subscriptions via Admin 1-Click Feature Control", async ({
    page
  }) => {
    const flagsState = {
      shopping_messenger_enabled: true,
      seller_subscriptions_enabled: false,
      buyer_requests_board_enabled: false,
      messenger_voice_notes_enabled: false,
      handover_pin_enabled: false,
      flash_deals_coupons_enabled: false,
      cod_refusal_shield_enabled: false
    };
    const storeId = "0193a8b2-4100-7000-8000-000000000001";
    const districtId = "0193a8b2-2000-7000-8000-000000000001";
    const zoneId = "0193a8b2-2001-7000-8000-000000000010";

    await page.route("**/api/v1/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.endsWith("/api/v1/features")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: flagsState })
        });
        return;
      }

      if (url.includes("/auth/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              user: {
                id: "11111111-1111-4111-8111-111111111111",
                email: "admin@saudavo.pk",
                phone: null,
                displayName: "Admin Founder",
                preferredLocale: "en",
                roles: ["ADMIN", "SELLER"],
                mfaRequired: true,
                mfaVerified: true,
                mfaEnrolled: true
              },
              csrfToken: "csrf_tok"
            }
          })
        });
        return;
      }

      if (url.endsWith("/admin/features")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                key: "seller_subscriptions_enabled",
                nameEn: "Monthly Seller Subscriptions",
                nameUr: "ماہانہ سیلر سبسکرپشن پلانز",
                descriptionEn: "Off by default for free beta launch.",
                descriptionUr: "مفت لانچ کے لیے آف۔",
                category: "MONETIZATION",
                isEnabled: flagsState.seller_subscriptions_enabled,
                sortOrder: 20,
                updatedAt: new Date().toISOString()
              },
              {
                key: "buyer_requests_board_enabled",
                nameEn: "Mujhy Chahiye Demand Board",
                nameUr: "مجھے چاہیے ڈیمانڈ بورڈ",
                descriptionEn: "Mianwali local demand board.",
                descriptionUr: "مقامی ڈیمانڈ بورڈ۔",
                category: "GROWTH",
                isEnabled: flagsState.buyer_requests_board_enabled,
                sortOrder: 30,
                updatedAt: new Date().toISOString()
              }
            ]
          })
        });
        return;
      }

      if (url.includes("/admin/features/") && method === "PATCH") {
        const key = url.split("/admin/features/")[1] as keyof typeof flagsState;
        const body = route.request().postDataJSON() as { isEnabled: boolean };
        flagsState[key] = body.isEnabled;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              key,
              nameEn:
                key === "seller_subscriptions_enabled"
                  ? "Monthly Seller Subscriptions"
                  : "Mujhy Chahiye Demand Board",
              nameUr: key,
              descriptionEn: "Updated via Admin",
              descriptionUr: "Updated",
              category: key === "seller_subscriptions_enabled" ? "MONETIZATION" : "GROWTH",
              isEnabled: flagsState[key],
              sortOrder: 20,
              updatedAt: new Date().toISOString()
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
                id: districtId,
                code: "MIANWALI",
                nameEn: "Mianwali",
                nameUr: "میانوالی",
                slug: "mianwali",
                province: "Punjab",
                countryCode: "PK",
                areaZones: [
                  {
                    id: zoneId,
                    nameEn: "Mianwali",
                    nameUr: "میانوالی",
                    slug: "mianwali-tehsil",
                    zoneType: "TEHSIL"
                  }
                ]
              }
            ]
          })
        });
        return;
      }

      if (url.includes("/categories")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [] })
        });
        return;
      }

      if (url.endsWith("/seller/profile")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              id: "44444444-4444-4444-8444-444444444444",
              userId: "11111111-1111-4111-8111-111111111111",
              sellerType: "LOCAL_SHOP",
              verificationStatus: "APPROVED",
              rejectionReason: null,
              verifiedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          })
        });
        return;
      }

      if (url.endsWith("/seller/store")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              id: storeId,
              sellerProfileId: "44444444-4444-4444-8444-444444444444",
              districtId,
              districtNameEn: "Mianwali",
              slug: "mianwali-shop",
              displayName: "Mianwali Shop",
              description: null,
              showPublicPhone: false,
              publicContactPhone: null,
              showPublicAddress: false,
              publicBusinessAddress: null,
              defaultDeliveryFeePaisa: 10000,
              requireCleanCodHistory: false,
              currency: "PKR",
              status: "ACTIVE",
              serviceAreas: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          })
        });
        return;
      }

      if (url.endsWith("/seller/orders/commission-summary")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              storeId,
              currency: "PKR",
              accountingDisclaimer: "0%",
              completedGrossPaisa: 0,
              accruedCommissionPaisa: 0,
              settledCommissionPaisa: 0,
              outstandingCommissionOwedPaisa: 0,
              promotionalBetaNote: "0%"
            }
          })
        });
        return;
      }

      if (url.includes("/admin/review-queue")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { sellers: [], products: [], services: [] } })
        });
        return;
      }

      if (
        url.includes("/demands") &&
        method === "GET"
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: "99999999-1111-4111-8111-111111111111",
                buyerId: "22222222-2222-4222-8222-222222222222",
                buyerDisplayName: "Usman Khan",
                districtId,
                districtNameEn: "Mianwali",
                areaZoneId: zoneId,
                areaZoneNameEn: "Mianwali",
                categoryId: null,
                categoryNameEn: null,
                title: "Need Homemade Desi Ghee 2kg",
                description: "Fresh pure butter ghee delivered in Mianwali.",
                budgetMaxPaisa: 500000,
                status: "OPEN",
                responsesCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ]
          })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: { unreadCount: 0, requestId: "e2e" } })
      });
    });

    // 1. Monthly Plan is hidden when seller_subscriptions_enabled is OFF
    await page.goto("/seller");
    await expect(page.getByRole("button", { name: /Monthly Plan/i })).toHaveCount(0);

    // 2. Admin visits /admin Feature Control Center and enables Subscriptions & Demand Board in 1 click each
    await page.goto("/admin");
    await expect(page.getByText("Saudavo Feature Control Center")).toBeVisible();
    const enableButtons = page.getByRole("button", { name: "Enable (1-Click)" });
    await enableButtons.first().click();
    await expect(page.getByText("LIVE").first()).toBeVisible();
    await page.getByRole("button", { name: "Enable (1-Click)" }).first().click();

    // 3. Visit /demands at 375px mobile width
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/demands");
    await expect(page.getByText("Need Homemade Desi Ghee 2kg")).toBeVisible();
    const fitsMobile = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(fitsMobile).toBe(true);
  });

  test("renders SEO /download page with GitHub Releases APK link, PWA CTA, and homepage download entry", async ({
    page
  }) => {
    await page.route("**/api/v1/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/api/v1/features")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              shopping_messenger_enabled: true,
              seller_subscriptions_enabled: false,
              buyer_requests_board_enabled: false,
              messenger_voice_notes_enabled: false,
              handover_pin_enabled: false,
              flash_deals_coupons_enabled: false,
              cod_refusal_shield_enabled: false
            }
          })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: { unreadCount: 0, requestId: "e2e" } })
      });
    });

    await page.goto("/");
    await expect(page.getByRole("link", { name: /Download App/i }).first()).toBeVisible();

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/download");
    await expect(
      page.getByRole("heading", { name: /Download Saudavo App for Android & Mobile/i })
    ).toBeVisible();
    const apkLink = page.getByRole("link", { name: /Download Android APK/i });
    await expect(apkLink).toBeVisible();
    await expect(apkLink).toHaveAttribute("href", "/api/download-apk");
    await expect(apkLink).toHaveAttribute("download", /Saudavo-v.*\.apk/);
    await expect(page.getByRole("button", { name: /Install/i })).toBeVisible();

    const fitsMobile = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(fitsMobile).toBe(true);
  });
});
