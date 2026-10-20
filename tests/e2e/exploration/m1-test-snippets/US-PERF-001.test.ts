import { test, expect } from "@playwright/test";
import { lignes } from "./_aides";

test("US-PERF-001 — liste affichée en moins de 2,5 s en 4G", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 85, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
  const t0 = Date.now();
  await page.goto("/", { waitUntil: "commit" });
  await lignes(page).first().waitFor();
  expect(Date.now() - t0).toBeLessThan(2500);
});
