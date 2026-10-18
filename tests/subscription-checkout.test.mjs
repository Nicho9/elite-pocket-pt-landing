import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);

// Execute the actual route/page with explicit dependencies. Never load .env,
// the Stripe SDK, Next's server or a real fetch implementation in these tests.
function loadSource(path, imports, globals = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const loadedModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: loadedModule,
    exports: loadedModule.exports,
    require(name) {
      assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
      return imports[name];
    },
    Request,
    Response,
    ...globals,
  }, { filename: path });
  return loadedModule.exports;
}

const fakeEnv = {
  STRIPE_SECRET_KEY: "isolated-test-key",
  STRIPE_FULL_APP_PRICE_ID: "price_test_monthly",
  STRIPE_FULL_APP_ANNUAL_PRICE_ID: "price_test_annual",
  STRIPE_VIP_PRICE_ID: "price_test_vip",
  NEXT_PUBLIC_SITE_URL: "https://website.example.test/",
  SB_URL: "https://signup.example.test/",
  WEBSITE_SIGNUP_SECRET: "isolated-signup-secret",
};

const validBody = {
  name: "Example Member",
  email: "member@example.test",
  password: "test-password-only",
  plan: "full_app",
};

function checkoutHarness({ env = {}, signupFails = false, stripeFails = false } = {}) {
  const signupCalls = [];
  const checkoutCalls = [];
  const stripeKeys = [];
  class FakeStripe {
    constructor(key) {
      stripeKeys.push(key);
      this.checkout = {
        sessions: {
          async create(params) {
            checkoutCalls.push(JSON.parse(JSON.stringify(params)));
            if (stripeFails) throw new Error("Isolated Stripe failure");
            return { url: "https://checkout.example.test/session" };
          },
        },
      };
    }
  }
  const route = loadSource("src/app/api/stripe/create-checkout-session/route.ts", {
    stripe: FakeStripe,
  }, {
    process: { env: { ...fakeEnv, ...env } },
    async fetch(url, options) {
      assert.equal(url, "https://signup.example.test/functions/v1/create-user-from-website");
      assert.equal(options.method, "POST");
      signupCalls.push(JSON.parse(options.body));
      return signupFails
        ? Response.json({ error: "Isolated signup failure" }, { status: 409 })
        : Response.json({ user_id: "test-user-id" });
    },
  });
  return {
    signupCalls,
    checkoutCalls,
    stripeKeys,
    submit(body) {
      return route.POST(new Request("https://website.example.test/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }));
    },
  };
}

for (const [label, fields, price, metadata] of [
  ["omitted interval defaults to monthly", {}, fakeEnv.STRIPE_FULL_APP_PRICE_ID, { user_id: "test-user-id", plan: "full_app" }],
  ["explicit monthly", { billingInterval: "monthly" }, fakeEnv.STRIPE_FULL_APP_PRICE_ID, { user_id: "test-user-id", plan: "full_app" }],
  ["annual", { billingInterval: "annual" }, fakeEnv.STRIPE_FULL_APP_ANNUAL_PRICE_ID, { user_id: "test-user-id", plan: "full_app" }],
  ["legacy VIP", { plan: "vip" }, fakeEnv.STRIPE_VIP_PRICE_ID, { user_id: "test-user-id", plan: "vip", tier: "vip" }],
  ["explicit monthly VIP", { plan: "vip", billingInterval: "monthly" }, fakeEnv.STRIPE_VIP_PRICE_ID, { user_id: "test-user-id", plan: "vip", tier: "vip" }],
]) {
  test(`${label}: trusted price, unchanged metadata and redirect contract`, async () => {
    const h = checkoutHarness();
    const response = await h.submit({ ...validBody, ...fields, priceId: "untrusted-client-price", amount: 1 });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, url: "https://checkout.example.test/session" });
    assert.deepEqual(h.signupCalls, [{ email: validBody.email, password: validBody.password, full_name: validBody.name }]);
    assert.deepEqual(h.stripeKeys, [fakeEnv.STRIPE_SECRET_KEY]);
    assert.deepEqual(h.checkoutCalls, [{
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: validBody.email,
      client_reference_id: "test-user-id",
      metadata,
      subscription_data: { metadata },
      success_url: "https://website.example.test/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://website.example.test/checkout/cancelled",
      allow_promotion_codes: true,
    }]);
  });
}

for (const interval of ["weekly", "year", "MONTHLY", "", null, 1, {}, []]) {
  test(`invalid interval ${JSON.stringify(interval)} is rejected before signup or Stripe`, async () => {
    const h = checkoutHarness();
    const response = await h.submit({ ...validBody, billingInterval: interval });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Billing interval/);
    assert.equal(h.signupCalls.length, 0);
    assert.equal(h.checkoutCalls.length, 0);
    assert.equal(h.stripeKeys.length, 0);
  });
}

test("VIP cannot accidentally use the Full App annual price", async () => {
  const h = checkoutHarness();
  const response = await h.submit({ ...validBody, plan: "vip", billingInterval: "annual" });
  assert.equal(response.status, 400);
  assert.equal(h.signupCalls.length, 0);
  assert.equal(h.checkoutCalls.length, 0);
});

test("missing annual configuration fails before signup without falling back", async () => {
  const h = checkoutHarness({ env: { STRIPE_FULL_APP_ANNUAL_PRICE_ID: undefined } });
  const response = await h.submit({ ...validBody, billingInterval: "annual" });
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /not configured/);
  assert.equal(h.signupCalls.length, 0);
  assert.equal(h.checkoutCalls.length, 0);
});

test("missing annual configuration does not disrupt monthly or VIP", async () => {
  const h = checkoutHarness({ env: { STRIPE_FULL_APP_ANNUAL_PRICE_ID: undefined } });
  assert.equal((await h.submit(validBody)).status, 200);
  assert.equal((await h.submit({ ...validBody, plan: "vip" })).status, 200);
  assert.deepEqual(h.checkoutCalls.map((call) => call.line_items[0].price), [
    fakeEnv.STRIPE_FULL_APP_PRICE_ID, fakeEnv.STRIPE_VIP_PRICE_ID,
  ]);
});

test("signup failure still prevents checkout creation", async () => {
  const h = checkoutHarness({ signupFails: true });
  assert.equal((await h.submit({ ...validBody, billingInterval: "annual" })).status, 409);
  assert.equal(h.checkoutCalls.length, 0);
});

test("Stripe failure retains the existing error response", async () => {
  const h = checkoutHarness({ stripeFails: true });
  const response = await h.submit({ ...validBody, billingInterval: "annual" });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { success: false, error: "Could not create checkout session." });
});

// Small hook harness for exercising the real homepage's selection and submit
// handlers without a browser, timers, external media or network access.
function homepageHarness() {
  const states = [];
  const requests = [];
  const location = { href: "" };
  let hookIndex = 0;
  const hooks = {
    ...React,
    useState(initial) {
      const index = hookIndex++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    },
    useRef: () => ({ current: null }),
    useEffect: () => {},
  };
  const Home = loadSource("src/app/page.tsx", {
    react: hooks,
    "react/jsx-runtime": require("react/jsx-runtime"),
    "next/image": ({ src, alt, width, height, className }) => React.createElement("img", { src, alt, width, height, className }),
    "next/link": "a",
    "@/lib/eliteBandPricing": loadSource("src/lib/eliteBandPricing.ts", {}),
  }, {
    window: { location },
    async fetch(url, options) {
      assert.equal(url, "/api/stripe/create-checkout-session");
      requests.push(JSON.parse(options.body));
      return Response.json({ url: "https://checkout.example.test/session" });
    },
  }).default;
  return {
    requests,
    location,
    render() { hookIndex = 0; return Home(); },
  };
}

function findAll(node, predicate) {
  const found = [];
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;
    if (predicate(child)) found.push(child);
    found.push(...findAll(child.props.children, predicate));
  });
  return found;
}

function textOf(node) {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return React.isValidElement(node) ? textOf(node.props.children) : "";
}

function button(tree, text) {
  const result = findAll(tree, (node) => node.type === "button" && textOf(node) === text);
  assert.equal(result.length, 1, `Expected one ${text} button`);
  return result[0];
}

for (const interval of ["monthly", "annual"]) {
  test(`homepage ${interval}: shared mobile/desktop markup and selected interval survives signup`, async () => {
    const h = homepageHarness();
    let tree = h.render();
    const selector = findAll(tree, (node) => node.type === "input" && node.props.type === "radio" && node.props.value === interval)[0];
    selector.props.onChange();
    tree = h.render();
    const pricing = findAll(tree, (node) => node.props.id === "pricing")[0];
    const html = renderToStaticMarkup(pricing);
    assert.match(html, /Monthly/);
    assert.match(html, /Annual/);
    assert.match(html, /\$29 USD\/month/);
    assert.match(html, /\$199 USD\/year/);
    assert.doesNotMatch(html, /\$39/);
    const checked = findAll(pricing, (node) => node.type === "input" && node.props.checked);
    assert.deepEqual(checked.map((node) => node.props.value), [interval]);

    button(tree, "Start your training").props.onClick();
    tree = h.render();
    const dialog = findAll(tree, (node) => node.props.role === "dialog")[0];
    assert.ok(textOf(dialog).includes(interval === "annual" ? "Annual subscription — $199 USD/year" : "Monthly subscription — $29 USD/month"));
    const fields = findAll(dialog, (node) => node.type === "input");
    assert.equal(fields.length, 4);
    for (const [index, value] of ["Example Member", "member@example.test", "test-password-only", "test-password-only"].entries()) {
      fields[index].props.onChange({ target: { value } });
    }
    tree = h.render();
    const form = findAll(tree, (node) => node.type === "form")[0];
    await form.props.onSubmit({ preventDefault() {} });
    assert.deepEqual(h.requests, [{ ...validBody, billingInterval: interval }]);
    assert.equal(h.location.href, "https://checkout.example.test/session");
  });
}

test("generic web checkout uses the selected Full App interval; VIP payload stays unchanged", async () => {
  const h = homepageHarness();
  let tree = h.render();
  findAll(tree, (node) => node.type === "input" && node.props.value === "annual")[0].props.onChange();
  tree = h.render();
  const webCheckout = findAll(tree, (node) => node.type === "button" && textOf(node).includes("WEB CHECKOUT"))[0];
  webCheckout.props.onClick();
  tree = h.render();
  assert.ok(textOf(findAll(tree, (node) => node.props.role === "dialog")[0]).includes("Annual subscription — $199 USD/year"));
  button(tree, "Cancel").props.onClick();
  tree = h.render();
  button(tree, "Apply for VIP coaching").props.onClick();
  tree = h.render();
  const dialog = findAll(tree, (node) => node.props.role === "dialog")[0];
  assert.ok(!textOf(dialog).includes("Annual subscription"));
  const fields = findAll(dialog, (node) => node.type === "input");
  for (const [index, value] of ["Example Member", "member@example.test", "test-password-only", "test-password-only"].entries()) {
    fields[index].props.onChange({ target: { value } });
  }
  tree = h.render();
  await findAll(tree, (node) => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
  assert.deepEqual(h.requests, [{ ...validBody, plan: "vip" }]);
});
