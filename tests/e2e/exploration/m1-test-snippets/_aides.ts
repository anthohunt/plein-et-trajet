// Aides communes des extraits Playwright du jalon 1 (appli déployée, base réelle).
import { expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export const ALBI = { latitude: 43.9289, longitude: 2.1464 };
const env = Object.fromEntries(
  fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8").split("\n").filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const h = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` };

export async function rest(chemin: string) {
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${chemin}`, { headers: h });
  expect(r.ok, chemin).toBe(true);
  return r.json();
}
export async function autour(rayon_m = 10000): Promise<{ id: string; lat: number; lon: number }[]> {
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/stations_autour`, {
    method: "POST", headers: { ...h, "Content-Type": "application/json" },
    body: JSON.stringify({ lat: ALBI.latitude, lon: ALBI.longitude, rayon_m }),
  });
  return r.json();
}
export const lignes = (p: Page) => p.locator('[data-el="ligne-station"]');
export const pastilles = (p: Page) => p.locator('[data-el="pastille-station"]');
export async function ouvrirPrix(p: Page) {
  await p.goto("/");
  await expect(lignes(p).first()).toBeVisible();
  await expect(p.locator('[data-el="carte-stations"]')).toHaveAttribute("data-pastilles", /\d+/);
}
export async function choisir(p: Page, c: string) {
  await p.getByRole("group", { name: "Carburant" }).getByRole("button", { name: c, exact: true }).click();
  await expect(p.locator('[data-el="titre-liste"]')).toHaveText(`Stations · ${c}`);
}
export async function lireLignes(p: Page) {
  return lignes(p).evaluateAll((els) => els.map((e) => ({
    id: (e as HTMLElement).dataset.station!,
    nom: e.querySelector(".n")?.textContent ?? "",
    meta: e.querySelector(".m")?.textContent ?? "",
    prix: Number((e.querySelector(".totem")?.getAttribute("aria-label") ?? "").split(" ")[0].replace(",", ".")),
    km: (() => { const m = (e.querySelector(".m")?.textContent ?? "").match(/^([\d,]+) (km|m)/); return m ? Number(m[1].replace(",", ".")) / (m[2] === "m" ? 1000 : 1) : NaN; })(),
  })));
}
export const croissant = (t: number[]) => t.every((v, i) => i === 0 || t[i - 1] <= v + 1e-9);
export const centre = (p: Page) => p.evaluate(() => { const c = (window as any).__carte.getCenter(); return { lat: c.lat, lon: c.lng }; });
export function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180, s = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}
export async function glisser(p: Page, dx: number, dy: number) {
  const b = (await p.locator('[data-el="carte-stations"]').boundingBox())!;
  const d = await p.evaluate(({ x, y, w, hh }) => {
    for (let yy = y + 40; yy < y + hh - 40; yy += 15) for (let xx = x + 40; xx < x + w - 60; xx += 15)
      if (document.elementFromPoint(xx, yy)?.tagName === "CANVAS") return { x: xx, y: yy };
    return { x: x + w / 2, y: y + hh / 2 };
  }, { x: b.x, y: b.y, w: b.width, hh: b.height });
  await p.mouse.move(d.x, d.y); await p.mouse.down();
  await p.mouse.move(d.x + dx, d.y + dy, { steps: 12 }); await p.mouse.up();
}
/** pastille dont le centre n'est recouvert par rien */
export async function pastilleDegagee(p: Page) {
  const id = await p.evaluate(() => {
    for (const b of document.querySelectorAll<HTMLElement>('[data-el="pastille-station"]')) {
      const r = b.getBoundingClientRect(), m = document.querySelector('[data-el="carte-stations"]')!.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < m.left + 10 || x > m.right - 50 || y < m.top + 30 || y > m.bottom - 30) continue;
      if (document.elementFromPoint(x, y) === b) return b.dataset.station!;
    }
    return null;
  });
  expect(id).toBeTruthy();
  return id!;
}
