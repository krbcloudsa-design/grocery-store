/**
 * Assembles product photos:
 * 1. Pack-shots generated for key SKUs (copied from assets/)
 * 2. Verified Pexels photos for the rest
 *
 * Run: npm run fetch-images
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const productsDir = join(root, "public/products");
const categoriesDir = join(root, "public/categories");
const assetsDir = "/opt/cursor/artifacts/assets";

/** Product-accurate AI pack-shots (filename matches catalogue id). */
const aiProducts = new Set([
  "onion-nashik",
  "tomato-hybrid",
  "potato-jyoti",
  "green-chilli",
  "chicken-curry-cut",
  "chicken-boneless",
  "chicken-lollipop",
  "chicken-mince",
  "mutton-curry-cut",
  "mutton-keema",
  "lamb-chops",
  "eggs-tray",
  "prawns-medium",
  "seer-fish",
  "basa-fillet",
  "pomfret",
  "paneer",
  "toned-milk",
  "curd-bucket",
  "kashmiri-chilli-powder",
  "turmeric-powder",
  "garam-masala",
  "cumin-seeds",
  "cardamom",
  "basmati-rice",
  "toor-dal",
  "sunflower-oil",
  "cow-ghee",
  "round-containers",
]);

const aiCategories = new Set(["vegetables", "chicken-poultry", "seafood"]);

/** Verified Pexels ids for remaining SKUs — each depicts the named item. */
const pexelsProducts = {
  "ginger": 6157020,
  "garlic-peeled": 4207909,
  "coriander-leaves": 4198719,
  "palak": 4750383,
  "capsicum-green": 1435901,
  "cauliflower": 1300975,
  "bottle-gourd": 1435904,
  "cucumber": 2329440,
  "lemon": 1414125,
  "banana-robusta": 61127,
  "pineapple": 1125774,
  "pomegranate": 1407305,
  "apple-shimla": 102104,
  "broccoli": 4750386,
  "zucchini": 1592842,
  "iceberg-lettuce": 1199957,
  "basil": 1132047,
  "rosemary": 4750386,
  "mushroom-button": 547115,
  "chicken-salami": 604969,
  "mozzarella": 821007,
  "amul-butter": 248412,
  "sona-masoori": 4038738,
  "chakki-atta": 209206,
  "maida": 209206,
  "groundnut-oil": 965323,
  "paper-bags": 3941859,
  "aluminium-foil": 4039006,
  "wooden-cutlery": 3941859,
  "dishwash-liquid": 4039006,
  "hand-gloves": 4483324,
  "floor-cleaner": 4039006,
};

const pexelsCategories = {
  fruits: 61127,
  "exotics-herbs": 1132047,
  "mutton-meat": 769289,
  dairy: 4109111,
  "masalas-spices": 928274,
  "grains-pulses": 4038738,
  "oils-ghee": 3370706,
  packaging: 4493650,
  cleaning: 4039006,
};

function pexelsUrl(id, w, h) {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;
}

async function downloadPexels(targetPath, id, w, h) {
  const res = await fetch(pexelsUrl(id, w, h));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 3000) throw new Error("too small");
  await writeFile(targetPath, buf);
  return buf.length;
}

await mkdir(productsDir, { recursive: true });
await mkdir(categoriesDir, { recursive: true });

const failures = [];

for (const id of aiProducts) {
  const src = join(assetsDir, `${id}.jpg`);
  const dest = join(productsDir, `${id}.jpg`);
  try {
    await copyFile(src, dest);
    console.log(`✓ ${id} (ai pack-shot)`);
  } catch {
    failures.push({ id, error: "missing AI asset — re-generate or add pexels fallback" });
    console.error(`✗ ${id}: missing ${src}`);
  }
}

for (const [id, photoId] of Object.entries(pexelsProducts)) {
  if (aiProducts.has(id)) continue;
  try {
    const bytes = await downloadPexels(join(productsDir, `${id}.jpg`), photoId, 640, 640);
    console.log(`✓ ${id} (pexels:${photoId}, ${bytes} bytes)`);
  } catch (err) {
    failures.push({ id, error: err.message });
    console.error(`✗ ${id}: ${err.message}`);
  }
}

for (const slug of aiCategories) {
  const src = join(assetsDir, `${slug}.jpg`);
  const dest = join(categoriesDir, `${slug}.jpg`);
  try {
    await copyFile(src, dest);
    console.log(`✓ category ${slug} (ai banner)`);
  } catch {
    failures.push({ id: slug, error: "missing AI category asset" });
    console.error(`✗ category ${slug}: missing asset`);
  }
}

for (const [slug, photoId] of Object.entries(pexelsCategories)) {
  if (aiCategories.has(slug)) continue;
  try {
    const bytes = await downloadPexels(join(categoriesDir, `${slug}.jpg`), photoId, 960, 600);
    console.log(`✓ category ${slug} (pexels:${photoId}, ${bytes} bytes)`);
  } catch (err) {
    failures.push({ id: slug, error: err.message });
    console.error(`✗ category ${slug}: ${err.message}`);
  }
}

if (failures.length) {
  console.error(`\n${failures.length} failed.`);
  process.exit(1);
}

console.log(`\nDone — ${aiProducts.size + Object.keys(pexelsProducts).length} products, ${aiCategories.size + Object.keys(pexelsCategories).length} categories.`);
