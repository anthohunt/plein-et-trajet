import { partiesPrix, prix3 } from "../lib/format";

/** Plaque de totem : chiffres LED, troisième décimale plus petite et surélevée. */
export function TotemPrix({ prix, unite = "€/L", ancien = false, cleAnim }: { prix: number; unite?: string; ancien?: boolean; cleAnim?: string }) {
  const { base, fin } = partiesPrix(prix);
  return (
    <span className={"totem" + (ancien ? " ancien" : "")} aria-label={`${prix3(prix)} euros le litre`} role="img">
      <span className="roll" key={cleAnim} aria-hidden="true">
        {base}
        <sup>{fin}</sup>
      </span>
      {unite && <span className="u" aria-hidden="true">{unite}</span>}
    </span>
  );
}
