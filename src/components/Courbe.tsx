// Courbe SVG (jalon 5) : vitesse ou consommation au fil du trajet, libellé ARIA qui en donne la moyenne et le maximum.
export function cheminCourbe(vals: number[], w: number, h: number, max: number): string {
  if (vals.length === 0 || !(max > 0)) return "";
  const n = Math.max(vals.length - 1, 1);
  return vals.map((v, i) => `${i ? "L" : "M"}${((i / n) * w).toFixed(1)} ${(h - 2 - (Math.min(Math.max(v, 0), max) / max) * (h - 6)).toFixed(1)}`).join(" ");
}

interface Props {
  valeurs: number[];
  max: number;
  label: string;
  couleur: string;
  hauteur?: number;
  el?: string;
  className?: string;
}

export function Courbe({ valeurs, max, label, couleur, hauteur = 70, el, className }: Props) {
  return (
    <svg className={className} viewBox={`0 0 300 ${hauteur}`} preserveAspectRatio="none" role="img" aria-label={label} data-el={el} data-points={valeurs.length}>
      <path d={cheminCourbe(valeurs, 300, hauteur, max)} fill="none" stroke={couleur} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
