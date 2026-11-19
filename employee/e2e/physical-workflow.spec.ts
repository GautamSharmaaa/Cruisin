import { test, expect, type APIRequestContext } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
const api = new URL("/api/v1", process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:8192").href;
const storefrontOrigin = new URL(process.env.PLAYWRIGHT_STOREFRONT_URL ?? "http://127.0.0.1:3192").origin;
const adminOrigin = process.env.PLAYWRIGHT_ADMIN_URL ?? "http://127.0.0.1:3193";
const employeeOrigin = process.env.PLAYWRIGHT_EMPLOYEE_URL ?? "http://127.0.0.1:3194";
let paymentRestore: {
  headers: Record<string, string>;
  codCheckoutEnabled: boolean;
  codFee: number;
} | null = null;
test.afterEach(async ({ request }) => {
  if (paymentRestore) {
    await request.put(api + "/admin/site-settings/payment", {
      headers: paymentRestore.headers,
      data: {
        codCheckoutEnabled: paymentRestore.codCheckoutEnabled,
        codFee: paymentRestore.codFee,
      },
    });
    paymentRestore = null;
  }
});
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1UAAAAASUVORK5CYII=",
  "base64",
);
test("physical unit follows QC, packaging, customer reservation and fulfillment", async ({
  page,
  request,
  browser,
}, testInfo) => {
  const id = randomUUID().slice(0, 8);
  const sku = `BROWSER-${id}`;
  const phone = `+919${Date.now().toString().slice(-7)}${testInfo.project.name === "desktop" ? "303" : "404"}`;
  const login = await request.post(api + "/auth/login", {
    headers: { Origin: adminOrigin },
    data: { email: "admin@cruisin.local", password: "CruisinAdmin123" },
  });
  expect(login.ok()).toBeTruthy();
  const token = (await login.json()).data.accessToken as string;
  const headers = { Origin: adminOrigin, Authorization: `Bearer ${token}` };
  async function post<T>(path: string, data: unknown): Promise<T> {
    const r = await request.post(api + path, { headers, data });
    expect(r.ok(), await r.text()).toBeTruthy();
    return (await r.json()).data as T;
  }
  async function get<T>(path: string): Promise<T> {
    const r = await request.get(api + path, { headers });
    expect(r.ok(), await r.text()).toBeTruthy();
    return (await r.json()).data as T;
  }
  const categories = await get<{ _id: string }[]>("/categories");
  const product = await post<{ _id: string; variants: { _id: string }[] }>(
    "/products",
    {
      title: `Synthetic physical ${id}`,
      slug: `physical-browser-${id}`,
      description: "Synthetic isolated warehouse browser workflow",
      richDescription: "Synthetic isolated warehouse browser workflow",
      brand: "CRUISIN",
      category: categories[0]._id,
      images: [],
      basePrice: 1000,
      status: "published",
      visibility: "visible",
      isActive: true,
      variants: [
        {
          sku,
          size: "XL",
          color: "Yellow",
          colorHex: "#ffff00",
          price: 1000,
          stock: 0,
        },
      ],
    },
  );
  const employee = await post<{ _id: string }>("/admin/operations/employees", {
    name: `Unit operator ${id}`,
    phone,
    role: "operations_manager",
    grants: [],
    denials: [],
  });
  const reviewerPhone = `+919${Date.now().toString().slice(-7)}${testInfo.project.name === "desktop" ? "505" : "606"}`;
  await post("/admin/operations/employees", {
    name: `Independent reviewer ${id}`,
    phone: reviewerPhone,
    role: "operations_manager",
    grants: [],
    denials: [],
  });
  const reviewer = await browser.newContext();
  const challenge = await reviewer.request.post(
    api + "/employee/auth/request-otp",
    { headers: { Origin: employeeOrigin }, data: { phone: reviewerPhone } },
  );
  const challengeData = (await challenge.json()).data;
  const verified = await reviewer.request.post(
    api + "/employee/auth/verify-otp",
    {
      headers: { Origin: employeeOrigin },
      data: {
        challengeId: challengeData.challengeId,
        code: challengeData.developmentCode,
      },
    },
  );
  expect(verified.ok(), await verified.text()).toBeTruthy();
  const reviewerCsrf = (await verified.json()).data.csrf;
  const sops: Record<string, string> = {};
  for (const kind of ["PRODUCT", "PACKAGING"]) {
    const s = await post<{ _id: string; version: number }>(
      "/admin/operations/sops",
      {
        kind,
        title: `${kind} ${id}`,
        category: kind,
        body: "Follow the administrator configured synthetic specification.",
        products: [product._id],
        requirements: [
          {
            key: "verify",
            label: "Verify synthetic specification",
            mandatory: true,
            photo: true,
            scan: kind === "PACKAGING",
          },
        ],
      },
    );
    const approval = await post<{ _id: string; version: number }>(
      `/admin/operations/sops/${s._id}/request-publication`,
      { version: s.version },
    );
    const reviewed = await reviewer.request.post(
      api + `/employee/approvals/${approval._id}/review`,
      {
        headers: { Origin: employeeOrigin, "X-Employee-Csrf": reviewerCsrf },
        data: {
          version: approval.version,
          status: "APPROVED",
          notes: "Independent product specification accepted",
        },
      },
    );
    expect(reviewed.ok(), await reviewed.text()).toBeTruthy();
    sops[kind] = s._id;
  }
  const units = await post<{ unitId: string; code: string }[]>(
    "/admin/operations/units/receive",
    {
      variant: product.variants[0]._id,
      quantity: 1,
      location: "BROWSER-01",
      idempotencyKey: randomUUID(),
    },
  );
  const unit = units[0];
  await post("/admin/operations/tasks", {
    title: `QC and package ${id}`,
    assignees: [employee._id],
    category: "product_inspection",
    unit: unit.unitId,
    requiresApproval: false,
  });
  await page.goto(employeeOrigin + "/login");
  await page.getByLabel("Registered phone").fill(phone);
  await page.getByRole("button", { name: "Send login code" }).click();
  const otp = await page
    .getByRole("status")
    .filter({ hasText: "Synthetic development code" })
    .locator("strong")
    .innerText();
  await page.getByLabel("One-time code").fill(otp);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page).toHaveURL(employeeOrigin + "/");
  await page.goto(employeeOrigin + "/units");
  await page.getByLabel("Search unit / SKU").fill(sku);
  await page
    .getByRole("row")
    .filter({ hasText: sku })
    .getByRole("button", { name: "Inspect unit" })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Published Product SOP").selectOption(sops.PRODUCT);
  await dialog
    .getByLabel("Verify synthetic specification (required) · photo required")
    .check();
  await dialog.locator("input[type=file]").setInputFiles({
    name: "synthetic-qc.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(dialog.locator("img").first()).toBeVisible();
  await dialog.getByRole("button", { name: "Save QC inspection" }).click();
  await expect(
    dialog.getByText("PACKAGING_PENDING", { exact: true }).first(),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Label preview / reprint" }).click();
  await expect(dialog.getByAltText(`QR for ${unit.unitId}`)).toBeVisible();
  await page.evaluate(() => {
    const state = window as Window & { acceptancePrintCalls?: number };
    state.acceptancePrintCalls = 0;
    window.print = () => {
      state.acceptancePrintCalls = (state.acceptancePrintCalls ?? 0) + 1;
    };
  });
  await dialog.getByRole("button", { name: "Print / system preview" }).click();
  expect(
    await page.evaluate(
      () =>
        (window as Window & { acceptancePrintCalls?: number })
          .acceptancePrintCalls,
    ),
  ).toBe(1);
  await dialog
    .getByLabel("Published Packaging SOP")
    .selectOption(sops.PACKAGING);
  await dialog
    .getByLabel(
      "Verify synthetic specification (required) · photo required · scan required",
    )
    .check();
  await dialog.getByLabel("SKU or label code").fill(unit.code);
  await dialog.getByRole("button", { name: "Resolve code" }).click();
  await dialog.locator("input[type=file]").setInputFiles({
    name: "synthetic-packaging.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(dialog.getByAltText("synthetic-packaging.png")).toBeVisible();
  await dialog
    .getByRole("button", { name: "Verify packaging and make available" })
    .click();
  await expect(
    dialog.getByText("PACKED_AVAILABLE", { exact: true }).first(),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: sku })).toContainText(
    "PACKED_AVAILABLE",
  );
  const available = await get<{ variants: { stock: number }[] }>(
    "/products/" + `physical-browser-${id}`,
  );
  expect(available.variants[0].stock).toBe(1);
  await page.goto(employeeOrigin + "/inventory");
  await page.getByRole("textbox", { name: "Search", exact: true }).fill(sku);
  const inventoryVariant = page.getByRole("row").filter({ hasText: sku });
  await inventoryVariant.getByRole("button", { name: "Packaging report", exact: true }).click();
  const report = page.getByRole("dialog", { name: "Packaging report" });
  await report.getByRole("button", { name: new RegExp(unit.unitId) }).click();
  await expect(report.getByText("VERIFIED", { exact: true })).toBeVisible();
  await expect(report.getByAltText("synthetic-packaging.png")).toBeVisible();
  await page.keyboard.press("Escape");
  // A synthetic customer uses the existing commerce API; external payment services are not called.
  const customer = await browser.newContext();
  if (process.env.CI === "true") {
    execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "src/scripts/v2-operations-customer.ts",
        `unit-${id}@example.test`,
      ],
      { cwd: resolve(process.cwd(), "../server"), stdio: "pipe" },
    );
  } else {
    execFileSync(
      process.execPath,
      ["scripts/v2.mjs", "operations-customer", `unit-${id}@example.test`],
      { cwd: resolve(process.cwd(), ".."), stdio: "pipe" },
    );
  }
  const customerLogin = await customer.request.post(api + "/auth/login", {
    headers: { Origin: storefrontOrigin },
    data: { email: `unit-${id}@example.test`, password: "SyntheticTest123!" },
  });
  expect(customerLogin.ok(), await customerLogin.text()).toBeTruthy();
  const customerToken = (await customerLogin.json()).data.accessToken;
  const customerHeaders = {
    Origin: storefrontOrigin,
    Authorization: `Bearer ${customerToken}`,
  };
  const add = await customer.request.post(api + "/cart/items", {
    headers: customerHeaders,
    data: {
      product: product._id,
      variant: product.variants[0]._id,
      quantity: 1,
    },
  });
  expect(add.ok(), await add.text()).toBeTruthy();
  const currentSettings = await get<{
    codCheckoutEnabled: boolean;
    codFee: number;
  }>("/admin/site-settings");
  paymentRestore = {
    headers,
    codCheckoutEnabled: currentSettings.codCheckoutEnabled,
    codFee: currentSettings.codFee,
  };
  const paymentSettings = await request.put(
    api + "/admin/site-settings/payment",
    { headers, data: { codCheckoutEnabled: true, codFee: 0 } },
  );
  expect(paymentSettings.ok(), await paymentSettings.text()).toBeTruthy();
  const address = {
    fullName: "Synthetic customer",
    phone: "+919000000001",
    line1: "Synthetic test lane",
    city: "Delhi",
    state: "Delhi",
    postalCode: "110001",
    country: "India",
  };
  const checkout = await customer.request.post(api + "/orders/cod", {
    headers: customerHeaders,
    data: {
      shippingAddress: address,
      billingAddress: address,
      paymentMethod: "cod",
      shippingMethod: "standard",
      idempotencyKey: randomUUID(),
    },
  });
  expect(checkout.ok(), await checkout.text()).toBeTruthy();
  const order = (await checkout.json()).data.order;
  const tasks = await get<{
    items: { _id: string; order: string; version: number }[];
  }>("/admin/operations/tasks?limit=100");
  const task = tasks.items.find((t) => t.order === order._id);
  expect(task).toBeTruthy();
  const assignment = await request.patch(
    api + `/admin/operations/tasks/${task!._id}`,
    { headers, data: { version: task!.version, assignees: [employee._id] } },
  );
  expect(assignment.ok(), await assignment.text()).toBeTruthy();
  await post("/admin/operations/courier-policies", {
    courier: `Synthetic courier ${id}`,
    divisor: 6000,
    minWeightKg: 0.01,
    maxWeightKg: 10,
    requireEvidence: true,
  });
  await page.goto(employeeOrigin + "/orders");
  await page
    .getByRole("row")
    .filter({ hasText: order.orderNumber })
    .getByRole("button", { name: "Open fulfillment" })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("SKU or label code").fill(unit.code);
  await dialog.getByRole("button", { name: "Resolve code" }).click();
  await expect(dialog.getByText("Picked 1 of 1")).toBeVisible();
  await dialog
    .getByLabel("Courier measurement policy")
    .selectOption(`Synthetic courier ${id}`);
  await dialog.getByLabel("Actual parcel weight (kg)").fill("0.5");
  await dialog.getByLabel("Length (cm)", { exact: true }).fill("30");
  await dialog.getByLabel("Width (cm)", { exact: true }).fill("20");
  await dialog.getByLabel("Height (cm)", { exact: true }).fill("10");
  await dialog.locator("input[type=file]").setInputFiles({
    name: "synthetic-parcel.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(dialog.locator("img").first()).toBeVisible();
  await dialog
    .getByRole("button", { name: "Verify package measurements and evidence" })
    .click();
  await expect(dialog.getByText(/Packed\. Shipping documents/)).toBeVisible();
  for (const action of ["prepare", "awb", "label"]) {
    await dialog.getByRole("button", { name: action, exact: true }).click();
    await expect(
      dialog.getByRole("button", { name: action, exact: true }),
    ).toBeEnabled();
  }
  const labelPopupPromise = page.waitForEvent("popup");
  await dialog
    .getByRole("button", { name: "Open shipping label / print" })
    .click();
  const labelPopup = await labelPopupPromise;
  await expect(
    labelPopup.getByText(
      /Mock document reference: mock:\/\/logistics\/label\//,
    ),
  ).toBeVisible();
  await labelPopup.close();
  await expect(
    dialog.getByRole("button", {
      name: "Confirm attached shipping label matches this AWB",
    }),
  ).toBeEnabled();
  await dialog
    .getByRole("button", {
      name: "Confirm attached shipping label matches this AWB",
    })
    .click();
  await dialog.getByRole("button", { name: "Record courier handover" }).click();
  await expect(
    dialog.getByText("Handed over. Waiting for carrier confirmation."),
  ).toBeVisible();
  await page.screenshot({
    path: `/tmp/cruisin-physical-${testInfo.project.name}.png`,
    fullPage: true,
  });
  const finalDetail = await get<{ shipments: { _id: string }[] }>(
    `/admin/operations/fulfillment/${order._id}`,
  );
  await post(`/admin/logistics/${finalDetail.shipments[0]._id}/sync`, {});
  await page.reload();
  await page
    .getByRole("row")
    .filter({ hasText: order.orderNumber })
    .getByRole("button", { name: "Open fulfillment" })
    .click();
  await expect(page.getByRole("dialog").getByText(/SHIPPED/)).toBeVisible();
  await customer.close();
  await reviewer.close();
  const reconciliation = await get<{ variant: string; reconciled: boolean }[]>(
    "/admin/operations/units/reconciliation",
  );
  expect(
    reconciliation.find((v) => v.variant === product.variants[0]._id)
      ?.reconciled,
  ).toBe(true);
});
