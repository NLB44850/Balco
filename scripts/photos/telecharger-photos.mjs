#!/usr/bin/env node
/**
 * Photos libres de droits des plantes du catalogue, depuis Wikimedia Commons.
 * À lancer dans le Codespace (qui a accès à Internet), depuis la racine du projet :
 *
 *   node scripts/photos/telecharger-photos.mjs          → 3 photos candidates par plante (petites),
 *                                                         dans scripts/photos/candidats/ + candidats.json
 *   node scripts/photos/telecharger-photos.mjs --encore → 3 nouvelles candidates pour les plantes de
 *                                                         scripts/photos/recherches-bis.json (autre recherche)
 *   node scripts/photos/telecharger-photos.mjs --final  → la photo choisie (scripts/photos/choix.json),
 *                                                         en bonne qualité, dans assets/plants/ + credits.json
 *
 * Le script reprend là où il s'est arrêté : relancé, il ne retélécharge pas ce qui existe déjà.
 * Seules les licences qui permettent l'usage dans une app sont gardées (CC0, domaine public,
 * CC BY, CC BY-SA), avec l'auteur et la licence pour l'écran « Crédits photos ».
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CANDIDATES_DIR = path.join(ROOT, "scripts/photos/candidats");
const CANDIDATES_JSON = path.join(ROOT, "scripts/photos/candidats.json");
const CHOICES_JSON = path.join(ROOT, "scripts/photos/choix.json");
const RETRY_JSON = path.join(ROOT, "scripts/photos/recherches-bis.json");
const FINAL_DIR = path.join(ROOT, "assets/plants");
const CREDITS_JSON = path.join(FINAL_DIR, "credits.json");

const API = "https://commons.wikimedia.org/w/api.php";
// Wikimedia demande un User-Agent qui identifie l'outil.
const USER_AGENT = "BalcoPlantPhotos/1.0 (https://github.com/nlb44850/balco)";
const CANDIDATES_PER_PLANT = 3;
const CANDIDATE_WIDTH = 400;
const FINAL_WIDTH = 800;

/** Identifiant Balco → recherche sur Commons (nom latin, parfois précisé). */
const PLANTS = {
  basil: "Ocimum basilicum",
  mint: "Mentha spicata",
  parsley: "Petroselinum crispum",
  chives: "Allium schoenoprasum",
  thyme: "Thymus vulgaris",
  rosemary: "Rosmarinus officinalis",
  coriander: "Coriandrum sativum",
  sage: "Salvia officinalis",
  oregano: "Origanum vulgare",
  dill: "Anethum graveolens",
  "lemon-balm": "Melissa officinalis",
  "lemon-verbena": "Aloysia citrodora",
  tarragon: "Artemisia dracunculus",
  chervil: "Anthriscus cerefolium",
  savory: "Satureja montana",
  shiso: "Perilla frutescens",
  lemongrass: "Cymbopogon citratus",
  stevia: "Stevia rebaudiana",
  hyssop: "Hyssopus officinalis",
  "wild-garlic": "Allium ursinum",
  "cherry-tomato": "cherry tomatoes plant",
  chili: "chili pepper plant Capsicum",
  strawberry: "Fragaria ananassa fruit plant",
  zucchini: "zucchini plant Cucurbita pepo",
  eggplant: "Solanum melongena plant",
  "dwarf-bean": "Phaseolus vulgaris bush bean",
  pea: "Pisum sativum pods plant",
  "mini-cucumber": "Cucumis sativus plant",
  "dwarf-tomato": "tomato plant pot",
  "sweet-pepper": "bell pepper plant Capsicum annuum",
  physalis: "Physalis peruviana",
  "pole-bean": "runner bean Phaseolus coccineus",
  cucamelon: "Melothria scabra",
  "mini-melon": "Cucumis melo plant",
  "cut-lettuce": "Lactuca sativa lettuce",
  arugula: "Eruca vesicaria sativa rocket",
  spinach: "Spinacia oleracea",
  chard: "Swiss chard Beta vulgaris",
  "lambs-lettuce": "Valerianella locusta",
  kale: "kale Brassica oleracea",
  "garden-cress": "Lepidium sativum",
  sorrel: "Rumex acetosa",
  purslane: "Portulaca oleracea",
  "pak-choi": "bok choy Brassica rapa chinensis",
  mizuna: "mizuna Brassica rapa nipposinica",
  microgreens: "microgreens",
  radish: "radishes Raphanus sativus",
  "round-carrot": "carrots Daucus carota harvest",
  "spring-onion": "spring onions",
  beetroot: "beetroot Beta vulgaris",
  turnip: "turnips Brassica rapa",
  garlic: "Allium sativum garlic",
  potato: "Solanum tuberosum potato plant",
  nasturtium: "Tropaeolum majus",
  calendula: "Calendula officinalis",
  lavender: "Lavandula angustifolia",
  cosmos: "Cosmos bipinnatus",
  borage: "Borago officinalis",
  marigold: "Tagetes patula",
  "dwarf-sunflower": "Helianthus annuus sunflower",
  viola: "Viola wittrockiana pansy",
  zinnia: "Zinnia elegans",
  phacelia: "Phacelia tanacetifolia",
  cornflower: "Centaurea cyanus",
  "sweet-alyssum": "Lobularia maritima",
  "sweet-pea": "Lathyrus odoratus",
  "hardy-geranium": "Geranium Rozanne",
  "tall-verbena": "Verbena bonariensis",
  "dwarf-raspberry": "Rubus idaeus raspberries",
  blueberry: "Vaccinium corymbosum blueberries",
  redcurrant: "Ribes rubrum redcurrant",
  "lemon-tree": "Citrus limon lemon tree",
  "dwarf-fig": "Ficus carica figs",
};

// Planches botaniques, herbiers, cartes… : on veut une vraie photo de la plante.
const EXCLUDED_WORDS = /herbarium|herbier|illustration|drawing|köhler|koehler|thomé|botanical|plate|flora|map|distribution|stamp|logo|seed packet|diagram|\.svg|\.gif|\.tif/i;
const ALLOWED_LICENSE = /^(cc0|public domain|pd|cc by(-sa)? [0-9.]+|cc by(-sa)?)$/i;

/** « User:Dupont », « Dupont (Dupont) I'd appreciate… » → « Dupont » */
const cleanAuthor = (text) => text.replace(/\s*I'd appreciate.*$/u, "").replace(/^User:/u, "").replace(/^(\S+) \(\1\)$/u, "$1").trim() || "Auteur inconnu";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const stripHtml = (html = "") => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#039;/g, "'").replace(/\s+/g, " ").trim();

async function fetchWithRetry(url, asJson = true) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (response.status === 429 || response.status >= 500) throw new Error(`HTTP ${response.status}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return asJson ? await response.json() : Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === 4) throw error;
      await sleep(1000 * 2 ** attempt);
    }
  }
}

function describe(page) {
  const info = page.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value);
  return {
    title: page.title,
    width: info.width,
    height: info.height,
    mime: info.mime,
    thumb: info.thumburl,
    page: info.descriptionurl,
    author: cleanAuthor(stripHtml(meta.Artist?.value)),
    license,
    licenseUrl: meta.LicenseUrl?.value ?? "",
  };
}

function acceptable(file) {
  if (!file || !file.thumb) return false;
  if (!/^image\/(jpeg|png|webp)$/.test(file.mime)) return false;
  if (EXCLUDED_WORDS.test(file.title)) return false;
  if (!ALLOWED_LICENSE.test(file.license)) return false;
  if (file.width < 800 || file.height < 600) return false;
  // Ni bandeau très allongé ni photo trop étroite : elle doit tenir dans une carte.
  const ratio = file.width / file.height;
  return ratio > 0.6 && ratio < 1.9;
}

async function search(query, width) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: `${query} filetype:bitmap`,
    gsrlimit: "30",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(width),
  });
  const data = await fetchWithRetry(`${API}?${params}`);
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index);
  return pages.map(describe).filter(acceptable);
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function candidates() {
  await fs.mkdir(CANDIDATES_DIR, { recursive: true });
  const all = await readJson(CANDIDATES_JSON, {});
  const ids = Object.keys(PLANTS);
  let index = 0;
  for (const id of ids) {
    index += 1;
    if (all[id]?.length) {
      console.log(`[${index}/${ids.length}] ${id} : déjà fait`);
      continue;
    }
    try {
      const found = (await search(PLANTS[id], CANDIDATE_WIDTH)).slice(0, CANDIDATES_PER_PLANT);
      const kept = [];
      for (const [position, file] of found.entries()) {
        const name = `${id}-${position + 1}.jpg`;
        await fs.writeFile(path.join(CANDIDATES_DIR, name), await fetchWithRetry(file.thumb, false));
        kept.push({ ...file, file: name });
        await sleep(300);
      }
      all[id] = kept;
      await fs.writeFile(CANDIDATES_JSON, `${JSON.stringify(all, null, 2)}\n`);
      console.log(`[${index}/${ids.length}] ${id} : ${kept.length} photo(s)`);
    } catch (error) {
      console.log(`[${index}/${ids.length}] ${id} : échec (${error.message}), relance le script plus tard`);
    }
    await sleep(500);
  }
  const missing = ids.filter((id) => !all[id]?.length);
  console.log(`\nTerminé : ${ids.length - missing.length}/${ids.length} plantes ont des photos candidates.`);
  if (missing.length) console.log(`Sans photo : ${missing.join(", ")}`);
}

/** Une autre recherche pour les plantes dont aucune candidate ne convenait : 3 photos de plus (-4, -5, -6). */
async function again() {
  const queries = await readJson(RETRY_JSON, null);
  if (!queries) throw new Error("scripts/photos/recherches-bis.json manquant.");
  await fs.mkdir(CANDIDATES_DIR, { recursive: true });
  const all = await readJson(CANDIDATES_JSON, {});
  const entries = Object.entries(queries);
  let index = 0;
  for (const [id, query] of entries) {
    index += 1;
    const known = all[id] ?? [];
    if (known.some((file) => file.query === query)) {
      console.log(`[${index}/${entries.length}] ${id} : déjà fait`);
      continue;
    }
    try {
      const seen = new Set(known.map((file) => file.title));
      const found = (await search(query, CANDIDATE_WIDTH)).filter((file) => !seen.has(file.title)).slice(0, CANDIDATES_PER_PLANT);
      const kept = [];
      for (const [position, file] of found.entries()) {
        const name = `${id}-${known.length + position + 1}.jpg`;
        await fs.writeFile(path.join(CANDIDATES_DIR, name), await fetchWithRetry(file.thumb, false));
        kept.push({ ...file, file: name, query });
        await sleep(300);
      }
      all[id] = [...known, ...kept];
      await fs.writeFile(CANDIDATES_JSON, `${JSON.stringify(all, null, 2)}\n`);
      console.log(`[${index}/${entries.length}] ${id} : ${kept.length} nouvelle(s) photo(s)`);
    } catch (error) {
      console.log(`[${index}/${entries.length}] ${id} : échec (${error.message}), relance le script plus tard`);
    }
    await sleep(500);
  }
  console.log("\nTerminé.");
}

async function final() {
  const choices = await readJson(CHOICES_JSON, null);
  if (!choices) throw new Error("scripts/photos/choix.json manquant : il est préparé par Claude après la revue des candidates.");
  await fs.mkdir(FINAL_DIR, { recursive: true });
  const credits = await readJson(CREDITS_JSON, {});
  const entries = Object.entries(choices);
  let index = 0;
  for (const [id, title] of entries) {
    index += 1;
    const target = path.join(FINAL_DIR, `${id}.jpg`);
    // Une photo provisoire (petite, reprise des candidates) est retéléchargée en bonne qualité.
    if (credits[id]?.title === title && !credits[id].provisional && (await fs.stat(target).catch(() => null))) {
      console.log(`[${index}/${entries.length}] ${id} : déjà fait`);
      continue;
    }
    try {
      const params = new URLSearchParams({ action: "query", format: "json", titles: title, prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: String(FINAL_WIDTH) });
      const data = await fetchWithRetry(`${API}?${params}`);
      const file = describe(Object.values(data.query?.pages ?? {})[0] ?? {});
      if (!file?.thumb) throw new Error("photo introuvable");
      await fs.writeFile(target, await fetchWithRetry(file.thumb, false));
      credits[id] = { title: file.title, author: file.author, license: file.license, licenseUrl: file.licenseUrl, page: file.page };
      await fs.writeFile(CREDITS_JSON, `${JSON.stringify(credits, null, 2)}\n`);
      console.log(`[${index}/${entries.length}] ${id} : ok`);
    } catch (error) {
      console.log(`[${index}/${entries.length}] ${id} : échec (${error.message}), relance le script plus tard`);
    }
    await sleep(500);
  }
  console.log("\nTerminé.");
}

(process.argv.includes("--final") ? final() : process.argv.includes("--encore") ? again() : candidates()).catch((error) => {
  console.error(error);
  process.exit(1);
});
