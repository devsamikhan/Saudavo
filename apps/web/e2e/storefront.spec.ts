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
    await expect(page.getByText("Handmade Phulkari Shawl")).toBeVisible();
    await expect(page.getByText("Rs. 3,500")).toBeVisible();
    await expect(page.getByText("Shop Poster Design")).toBeVisible();
    await expect(page.getByText("Remote • Manual Offline")).toBeVisible();

    // Switch to Urdu RTL and confirm DOM dir/lang + Urdu copy & integer PKR
    await page
      .getByRole("button", { name: "Switch language between English and Urdu" })
      .click();

    await expect(page.locator("html")).toHaveAttribute("lang", "ur");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByText("سوداو")).toBeVisible();
    await expect(page.getByText("3,500 روپے")).toBeVisible();

    // Navigate to Auth page
    await page.getByRole("link", { name: "لاگ ان" }).click();
    await expect(page).toHaveURL(/\/auth$/);
    await expect(
      page.getByPlaceholder("name@example.com or 03001234567")
    ).toBeVisible();
  });
});
