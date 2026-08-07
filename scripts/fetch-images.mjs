/**
 * Downloads curated product and category photos into public/.
 * Sources: Pexels (free to use under the Pexels License).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const productsDir = join(root, "public/products");
const categoriesDir = join(root, "public/categories");

/** Verified Pexels photo ids. */
const productPhotos = {
  "onion-nashik": 4198142,
  "tomato-hybrid": 533280,
  "potato-jyoti": 1442487,
  "ginger": 6157020,
  "garlic-peeled": 4207909,
  "green-chilli": 1435902,
  "coriander-leaves": 1435898,
  "palak": 4750383,
  "capsicum-green": 1435901,
  "cauliflower": 1435901,
  "bottle-gourd": 1435904,
  "cucumber": 2329440,
  "lemon": 1414125,
  "banana-robusta": 61127,
  "pineapple": 1125774,
  "pomegranate": 1407305,
  "apple-shimla": 102104,
  "broccoli": 4750386,
  "zucchini": 1435901,
  "iceberg-lettuce": 1199957,
  "basil": 1435898,
  "rosemary": 1435898,
  "mushroom-button": 547115,
  "chicken-curry-cut": 1064172,
  "chicken-boneless": 6214716,
  "chicken-lollipop": 2491247,
  "chicken-mince": 1767434,
  "eggs-tray": 1279330,
  "mutton-curry-cut": 769289,
  "mutton-keema": 769289,
  "lamb-chops": 769289,
  "chicken-salami": 604969,
  "prawns-medium": 566566,
  "seer-fish": 725991,
  "basa-fillet": 725991,
  "pomfret": 725991,
  "paneer": 4109111,
  "mozzarella": 821007,
  "toned-milk": 236010,
  "curd-bucket": 1435735,
  "amul-butter": 4109111,
  "kashmiri-chilli-powder": 1435900,
  "turmeric-powder": 1435900,
  "garam-masala": 1435900,
  "cumin-seeds": 1435900,
  "cardamom": 1435900,
  "basmati-rice": 4038738,
  "sona-masoori": 4038738,
  "chakki-atta": 209206,
  "toor-dal": 4038738,
  "maida": 209206,
  "sunflower-oil": 3370706,
  "groundnut-oil": 3370706,
  "cow-ghee": 4109111,
  "round-containers": 4493650,
  "paper-bags": 3941859,
  "aluminium-foil": 4493650,
  "wooden-cutlery": 4493650,
  "dishwash-liquid": 4039006,
  "hand-gloves": 4483324,
  "floor-cleaner": 4039006,
};

const categoryPhotos = {
  vegetables: 1435904,
  fruits: 61127,
  "exotics-herbs": 1435898,
  "chicken-poultry": 1064172,
  "mutton-meat": 769289,
  seafood: 566566,
  dairy: 4109111,
  "masalas-spices": 1435900,
  "grains-pulses": 4038738,
  "oils-ghee": 3370706,
  packaging: 4493650,
  cleaning: 4039006,
};

function pexelsUrl(id, width, height) {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}&h=${height}&fit=crop`;
}

async function download(targetPath, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${targetPath}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error(`${targetPath}: response too small`);
  await writeFile(targetPath, buf);
  return buf.length;
}

await mkdir(productsDir, { recursive: true });
await mkdir(categoriesDir, { recursive: true });

let ok = 0;
for (const [id, photoId] of Object.entries(productPhotos)) {
  const bytes = await download(join(productsDir, `${id}.jpg`), pexelsUrl(photoId, 640, 640));
  console.log(`product ${id}.jpg (${bytes} bytes)`);
  ok++;
}

for (const [slug, photoId] of Object.entries(categoryPhotos)) {
  const bytes = await download(join(categoriesDir, `${slug}.jpg`), pexelsUrl(photoId, 800, 500));
  console.log(`category ${slug}.jpg (${bytes} bytes)`);
  ok++;
}

console.log(`Done — ${ok} images.`);
