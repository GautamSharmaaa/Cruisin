import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? "http://127.0.0.1:3193";
const employeeUrl =
  process.env.PLAYWRIGHT_EMPLOYEE_URL ?? "http://127.0.0.1:3194";
async function adminLogin(page: Page): Promise<void> {
  await page.goto(adminUrl + "/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@cruisin.local");
  await page.getByLabel("Password", { exact: true }).fill("CruisinAdmin123");
  await page.getByRole("button", { name: "Enter Dashboard" }).click();
  await expect(page).toHaveURL(adminUrl + "/");
}
async function close(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
}
async function taskDetails(page: Page, title: string): Promise<void> {
  await page
    .getByRole("row")
    .filter({ hasText: title })
    .getByRole("button", { name: "Details", exact: true })
    .click();
}
test("administrator and employee complete an independently reviewed task", async ({
  page,
  browser,
  request,
}, testInfo) => {
  const id =
    Date.now().toString().slice(-7) + testInfo.project.name.slice(0, 1);
  const name = `Warehouse ${id}`;
  const title = `Verify label ${id}`;
  const reviewReason = `Submission ${id}`;
  const phone = `+919${Date.now().toString().slice(-7)}${testInfo.project.name === "desktop" ? "101" : "202"}`;
  await adminLogin(page);
  await page.goto(adminUrl + "/employees");
  await page
    .getByRole("button", { name: "Create employee", exact: true })
    .first()
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByLabel("Registered phone").fill(phone);
  await dialog
    .getByLabel("Role", { exact: true })
    .selectOption("warehouse_employee");
  await dialog
    .getByRole("button", { name: "Create employee", exact: true })
    .click();
  await close(page);
  await expect(page.getByRole("row").filter({ hasText: name })).toBeVisible();
  await page.goto(adminUrl + "/tasks");
  await page
    .getByRole("button", { name: "Assign task", exact: true })
    .first()
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog
    .getByLabel("Description", { exact: true })
    .fill("Check the synthetic SKU and submit for independent review.");
  await dialog.getByLabel("Assign employees").selectOption({ label: name });
  await dialog
    .getByLabel("Checklist (one item per line)")
    .fill("Check the size label");
  await dialog
    .getByRole("button", { name: "Assign task", exact: true })
    .click();
  await close(page);
  await expect(page.getByRole("row").filter({ hasText: title })).toBeVisible();
  const context = await browser.newContext({
    viewport: {
      width: testInfo.project.name === "mobile" ? 390 : 1280,
      height: 900,
    },
  });
  const employee = await context.newPage();
  await employee.goto(employeeUrl + "/login");
  await employee.getByLabel("Registered phone").fill(`${phone.slice(0, 3)} ${phone.slice(3)}`);
  await employee.getByRole("button", { name: "Send login code" }).click();
  const code = await employee
    .getByRole("status")
    .filter({ hasText: "Synthetic development code" })
    .locator("strong")
    .innerText();
  await employee.getByLabel("One-time code").fill(code);
  await employee.getByRole("button", { name: "Verify and continue" }).click();
  await expect(employee).toHaveURL(employeeUrl + "/");
  await expect(employee.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  if (testInfo.project.name === "mobile") {
    const menuButton = employee.getByRole("button", { name: "Open navigation" });
    await menuButton.click();
    await expect(employee.getByRole("dialog", { name: "Operations workspace" })).toBeVisible();
    await employee.keyboard.press("Escape");
    await expect(menuButton).toBeFocused();
    await menuButton.click();
    await employee.getByRole("dialog", { name: "Operations workspace" }).getByRole("link", { name: "My Tasks", exact: true }).click();
  } else {
    await employee.getByRole("navigation", { name: "Operations workspace" }).getByRole("link", { name: "My Tasks", exact: true }).click();
  }
  await expect(employee).toHaveURL(employeeUrl + "/tasks");
  await taskDetails(employee, title);
  dialog = employee.getByRole("dialog");
  await dialog.getByRole("button", { name: "Start work" }).click();
  await expect(
    dialog.getByText("IN_PROGRESS", { exact: true }).first(),
  ).toBeVisible();
  await dialog.getByLabel("Check the size label").check();
  await dialog.getByLabel("Reason / review notes").fill(reviewReason);
  await dialog.getByRole("button", { name: "Submit for review" }).click();
  await expect(
    dialog.getByText("SUBMITTED", { exact: true }).first(),
  ).toBeVisible();
  await close(employee);
  await page.goto(adminUrl + "/approvals");
  await page
    .getByRole("row")
    .filter({ hasText: reviewReason })
    .getByRole("button", { name: "Details", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Reason / review notes")
    .fill("Independently verified the synthetic label");
  await dialog.getByRole("button", { name: "Approve", exact: true }).click();
  await close(page);
  await employee.reload();
  await taskDetails(employee, title);
  dialog = employee.getByRole("dialog");
  await expect(
    dialog.getByText("APPROVED", { exact: true }).first(),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(
    dialog.getByText("COMPLETED", { exact: true }).first(),
  ).toBeVisible();
  await close(employee);
  await employee.reload();
  await expect(
    employee.getByRole("row").filter({ hasText: title }),
  ).toContainText("COMPLETED");
  await employee
    .getByRole("combobox", { name: "Color theme" })
    .selectOption("light");
  await expect(employee.locator("html")).toHaveClass(/light/);
  await employee.reload();
  await expect(employee.locator("html")).toHaveClass(/light/);
  await employee
    .getByRole("combobox", { name: "Color theme" })
    .selectOption("dark");
  await expect(employee.locator("html")).toHaveClass(/dark/);
  await employee
    .getByRole("combobox", { name: "Color theme" })
    .selectOption("system");
  await employee.emulateMedia({ colorScheme: "light" });
  await expect(employee.locator("html")).toHaveClass(/light/);
  await expect
    .poll(() =>
      employee.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  const sopTitle = `Pack safely ${id}`;
  await page.goto(adminUrl + "/sops");
  await page.getByRole("button", { name: "Create SOP", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title", { exact: true }).fill(sopTitle);
  await dialog.getByLabel("Category", { exact: true }).fill("packaging");
  await dialog
    .getByLabel("Procedure (Markdown)")
    .fill("# Package safely\n\n**Verify the size label.**");
  await dialog
    .getByLabel("Steps (one per line)")
    .fill("Check the SKU\nSeal the package");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await close(page);
  await page
    .locator(".ops-sop-library-list li")
    .filter({ has: page.getByRole("heading", { name: sopTitle, exact: true }) })
    .getByRole("button", { name: "Details", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Publish version" }).click();
  await expect(dialog.getByText("PUBLISHED", { exact: true })).toBeVisible();
  await close(page);
  await employee.goto(employeeUrl + "/sops");
  await employee.getByRole("button", { name: "Browse SOP library" }).click();
  await employee
    .locator(".ops-sop-library-list li")
    .filter({ has: employee.getByRole("heading", { name: sopTitle, exact: true }) })
    .getByRole("button", { name: "Details", exact: true })
    .click();
  dialog = employee.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Package safely", exact: true }),
  ).toBeVisible();
  const ack = employee.waitForResponse(
    (r) => r.url().includes("/acknowledge") && r.request().method() === "POST",
  );
  await dialog
    .getByRole("button", { name: "Acknowledge current version" })
    .click();
  expect((await ack).status()).toBe(200);
  await close(employee);
  const base = new URL("/api/v1", process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:8192").href;
  const login = await request.post(base + "/auth/login", {
    headers: { Origin: adminUrl },
    data: { email: "admin@cruisin.local", password: "CruisinAdmin123" },
  });
  const authHeaders = {
    Origin: adminUrl,
    Authorization: `Bearer ${(await login.json()).data.accessToken}`,
  };
  // Exercise real notification pagination and recover a summary after a network failure.
  const employeeRows = (await (await request.get(base + "/admin/operations/employees?q=" + encodeURIComponent(name), {headers:authHeaders})).json()).data.items as {_id:string;name:string}[];
  const recipient = employeeRows.find(row => row.name === name);
  expect(recipient).toBeTruthy();
  for (let i = 0; i < 21; i++) {
    const created = await request.post(base + "/admin/operations/tasks", {
      headers:authHeaders,
      data:{title:`Notification fixture ${id} ${i}`,assignees:[recipient!._id]},
    });
    expect(created.status()).toBe(200);
  }
  await employee.goto(employeeUrl + "/");
  await expect(employee.locator(".ops-metric").filter({hasText:"Orders awaiting packing"}).locator("dd")).toHaveText("0");
  const notifications=employee.locator("section").filter({has:employee.getByRole("heading",{name:"Notifications",exact:true})});
  const pagination=notifications.getByRole("navigation",{name:"Pagination"});
  await expect(pagination).toContainText("1 / 2");
  await pagination.getByRole("button",{name:"Next",exact:true}).click();
  await expect(pagination).toContainText("2 / 2");
  await expect(pagination.getByRole("button",{name:"Next",exact:true})).toBeDisabled();
  const read=notifications.getByRole("button",{name:"Mark read",exact:true}).first();
  const readResponse=employee.waitForResponse(r=>r.url().includes("/notifications/") && r.url().endsWith("/read") && r.request().method()==="POST");
  await read.click(); expect((await readResponse).status()).toBe(200);
  await employee.route("**/employee/summary",route=>route.abort("failed"));
  await employee.getByRole("button",{name:"Refresh",exact:true}).last().click();
  await expect(employee.getByRole("alert").filter({hasText:"Network Error"})).toBeVisible();
  await employee.unroute("**/employee/summary");
  await employee.getByRole("button",{name:"Refresh",exact:true}).last().click();
  await expect(employee.locator(".ops-metric").filter({hasText:"Orders awaiting packing"}).locator("dd")).toHaveText("0");
  await expect(employee.getByRole("alert").filter({hasText:"Network Error"})).toHaveCount(0);
  const categories = (await (await request.get(base + "/categories")).json())
    .data;
  const countSku = `COUNT-${id}`;
  const fixture = await request.post(base + "/products", {
    headers: authHeaders,
    data: {
      title: `Synthetic counted ${id}`,
      slug: `counted-${id}`,
      description: "Synthetic isolated inventory count fixture",
      richDescription: "Synthetic isolated inventory count fixture",
      brand: "CRUISIN",
      category: categories[0]._id,
      images: [],
      basePrice: 100,
      variants: [
        {
          sku: countSku,
          size: "M",
          color: "Black",
          colorHex: "#000000",
          price: 100,
          stock: 0,
        },
      ],
    },
  });
  expect(fixture.ok(), await fixture.text()).toBeTruthy();
  if(process.env.CI==='true'){execFileSync(process.execPath,['--import','tsx','src/scripts/v2-legacy-count-fixture.ts',`counted-${id}`],{cwd:resolve(process.cwd(),'../server'),stdio:'pipe'});}else{execFileSync(process.execPath,['scripts/v2.mjs','legacy-count-fixture',`counted-${id}`],{cwd:resolve(process.cwd(),'..'),stdio:'pipe'});}

  await employee.goto(employeeUrl + "/inventory");
  await employee
    .getByRole("textbox", { name: "Search", exact: true })
    .fill(countSku);
  const inventoryRow = employee.getByRole("row").filter({ hasText: countSku });
  const current = Number(await inventoryRow.locator("td").nth(2).innerText());
  await inventoryRow
    .getByRole("button", { name: "Request correction", exact: true })
    .click();
  dialog = employee.getByRole("dialog");
  await dialog.getByLabel("Counted available units").fill(String(current + 1));
  await dialog.getByLabel("Reason / review notes").fill(`Count ${id}`);
  await dialog
    .getByRole("button", { name: "Request correction", exact: true })
    .click();
  await close(employee);
  await page.goto(adminUrl + "/approvals");
  await page
    .getByRole("row")
    .filter({ hasText: `Count ${id}` })
    .getByRole("button", { name: "Details", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Reason / review notes")
    .fill("Independent synthetic count verified");
  await dialog.getByRole("button", { name: "Approve", exact: true }).click();
  await close(page);
  await employee.reload();
  await employee
    .getByRole("textbox", { name: "Search", exact: true })
    .fill(countSku);
  await expect(
    employee
      .getByRole("row")
      .filter({ hasText: countSku })
      .locator("td")
      .nth(2),
  ).toHaveText(String(current + 1));
  await employee.goto(employeeUrl + "/activity");
  await expect(employee.getByRole("table")).toContainText("task.completed");
  await employee.goto(employeeUrl + "/scanner");
  await expect(employee.getByLabel("SKU or label code")).toBeVisible();
  await employee.getByLabel("SKU or label code").fill("UNKNOWN-SYNTHETIC-CODE");
  await employee
    .getByRole("button", { name: "Resolve code", exact: true })
    .click();
  await expect(
    employee.getByRole("alert").filter({ hasText: "Active SKU not found" }),
  ).toBeVisible();
  await employee.goto(employeeUrl+'/tasks');
  for(const theme of ['light','dark']){await employee.getByLabel('Color theme').selectOption(theme);const audit=await new AxeBuilder({page:employee}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(audit.violations.filter(v=>v.impact==='critical'||v.impact==='serious')).toEqual([]);}
  await employee.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(employee).toHaveURL(employeeUrl + "/login");
  await employee.goto(employeeUrl + "/tasks");
  await expect(employee).toHaveURL(employeeUrl + "/login");
  await context.close();
});
test("theme and keyboard dialog controls preserve all application shells", async ({
  page,
}) => {
  await adminLogin(page);
  const theme = page.getByRole("switch", { name: "Dark mode" });
  await expect(theme).toBeEnabled();
  if (await theme.getAttribute("aria-checked") === "true") await theme.click();
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.goto(adminUrl + "/employees");
  await page
    .getByRole("button", { name: "Create employee", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto(process.env.PLAYWRIGHT_STOREFRONT_URL ?? "http://127.0.0.1:3192");
  await page.getByRole("button", { name: "Open Cruisin quick menu" }).click();
  const light = page.getByRole("button", { name: "Switch to light mode" });
  const dark = page.getByRole("button", { name: "Switch to dark mode" });
  await expect(light.or(dark)).toBeVisible();
  if (await light.isVisible()) await light.click();
  await expect(page.locator("html")).toHaveClass(/light/);
  await dark.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("main:visible")).toHaveCount(1);
  await expect(page.getByRole("main")).toBeVisible();
});
