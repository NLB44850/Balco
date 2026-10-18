// Le logo de Balco (choisi le 18/10) : un « b » dont le haut devient une feuille, en coordonnées 1024.
const leaf = (L, w) => `M0 0 C${w * 1.15} ${-L * 0.25} ${w * 1.15} ${-L * 0.75} 0 ${-L} C${-w * 1.15} ${-L * 0.75} ${-w * 1.15} ${-L * 0.25} 0 0Z`;

/** Le dessin occupe x 318-782, y 125-850 : son centre est en (550, 487). */
export const MOTIF_CENTER = { x: 550, y: 487 };

export function motif({ letter = "#FFFFFF", leafColor = "#9BE3B5", mono = false } = {}) {
  if (mono) leafColor = letter = "#FFFFFF";
  return `
  <rect x="318" y="330" width="104" height="470" rx="52" fill="${letter}"/>
  <circle cx="560" cy="628" r="170" fill="none" stroke="${letter}" stroke-width="104"/>
  <g transform="translate(370 372)"><path d="${leaf(290, 100)}" fill="${leafColor}" transform="rotate(34)"/></g>`;
}
