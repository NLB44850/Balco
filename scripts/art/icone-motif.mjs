// Le dessin de Balco (pot en terre cuite + pousse), en coordonnées 1024.
export function motif({ leaf = "#F4F1E6", leafDark = "#CFE6CF", pot = "#D2642A", rim = "#B8521C", stem = "#F4F1E6", mono = false } = {}) {
  if (mono) { leaf = leafDark = pot = rim = stem = "#FFFFFF"; }
  return `
  <path d="M512 600 C512 520 512 470 512 400" stroke="${stem}" stroke-width="30" stroke-linecap="round" fill="none"/>
  <path d="M506 470 C450 470 360 450 318 360 C410 330 490 370 506 470 Z" fill="${leaf}"/>
  ${mono ? "" : `<path d="M506 470 C450 440 400 405 345 368" stroke="${leafDark}" stroke-width="10" stroke-linecap="round" fill="none"/>`}
  <path d="M518 410 C560 410 660 395 712 290 C610 255 528 310 518 410 Z" fill="${leaf}"/>
  ${mono ? "" : `<path d="M518 410 C565 380 625 340 688 300" stroke="${leafDark}" stroke-width="10" stroke-linecap="round" fill="none"/>`}
  <path d="M360 640 L664 640 L626 818 Q622 836 604 836 L420 836 Q402 836 398 818 Z" fill="${pot}"/>
  <rect x="330" y="580" width="364" height="80" rx="22" fill="${rim}"/>`;
}
