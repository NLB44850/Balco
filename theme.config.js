/**
 * Palette Balco : fond blanc, un seul vert de marque, et des couleurs d'alerte réservées à la météo
 * (bleu pour le froid, la pluie et le vent ; orange pour la chaleur). L'app est en thème clair.
 * @type {const}
 */
const themeColors = {
  primary: { light: '#1F7A4D', dark: '#7FC29B' },
  background: { light: '#FFFFFF', dark: '#10251F' },
  surface: { light: '#F4F6F3', dark: '#19372D' },
  foreground: { light: '#121614', dark: '#F7F4E9' },
  muted: { light: '#6B736D', dark: '#B9C6B6' },
  border: { light: '#E3E7E2', dark: '#365347' },
  success: { light: '#1F7A4D', dark: '#B7D979' },
  warning: { light: '#D2642A', dark: '#F0CB72' },
  error: { light: '#C0452F', dark: '#F09B87' },
  // Chaleur et touches chaudes (anciennement terre cuite).
  terracotta: { light: '#D2642A', dark: '#E69B82' },
  cream: { light: '#F4F6F3', dark: '#2A4639' },
  leaf: { light: '#E3F1E8', dark: '#315441' },
  sun: { light: '#B8E28A', dark: '#D5E96B' },
  // Froid, pluie, vent : alertes météo.
  frost: { light: '#2F6FB3', dark: '#8DB8E8' },
  frostSoft: { light: '#E8F0FA', dark: '#23364A' },
};

module.exports = { themeColors };
