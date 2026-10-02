const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// NativeWind écrit sa feuille de style générée dans ce dossier pendant le build. Sur une installation
// neuve (CI, Docker), le fichier n'existe pas encore quand Metro recense les fichiers du projet, et
// le premier export échoue avec « Failed to get the SHA-1 for …/.cache/web.css ». On crée des
// fichiers vides à l'avance : NativeWind les remplace, Metro les connaît déjà.
const cssInteropCache = path.join(path.dirname(require.resolve("react-native-css-interop/package.json")), ".cache");
fs.mkdirSync(cssInteropCache, { recursive: true });
for (const file of ["web.css", "native.js", "ios.js", "android.js"]) {
  const target = path.join(cssInteropCache, file);
  if (!fs.existsSync(target)) fs.writeFileSync(target, "");
}

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: true,
});
