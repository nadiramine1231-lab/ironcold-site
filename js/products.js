// ===== IRONCOLD — catalogue =====
// Photos live in images/web/<image>.webp (and <image>-sm.webp for thumbnails).
// cat: 'zip' | 'oversize' | 'tshirt'  ·  prices in MAD (the server reads them from here too).
(typeof window !== 'undefined' ? window : globalThis).IC_CATEGORIES = [
  { id: 'zip', label: 'Zip Hoodies', short: 'Zip', tagline: 'Full-zip 330 GSM, zip YKK.', cover: 'ironcold-zipup-hoodie' },
  { id: 'oversize', label: 'Hoodies Oversize', short: 'Oversize', tagline: 'Coupe boxy, épaules tombantes.', cover: 'ironcold-oversize-hoodie' },
  { id: 'tshirt', label: 'T-Shirts', short: 'T-Shirts', tagline: 'Coton premium 260 GSM.', cover: 'ironcold-oversized-tee' }
];

const TEE = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const HOODIE = ['S', 'M', 'L', 'XL', 'XXL'];
const OVERSIZE = ['M', 'L', 'XL', 'XXL'];

(typeof window !== 'undefined' ? window : globalThis).IC_PRODUCTS = [
  // ---------- Zip hoodies ----------
  { id: 'ironcold-zipup-hoodie', cat: 'zip', name: 'IRONCOLD Zip-Up Hoodie', gender: 'homme', color: 'Noir', price: 339, badge: 'Bestseller',
    images: ['ironcold-zipup-hoodie', 'ironcold-zipup-hoodie-2'], sizes: HOODIE,
    desc: 'Hoodie full-zip 330gsm. Fermeture YKK, épaules tombantes, badge IC embossé sur la poitrine.' },
  { id: 'ironcold-cold-zip-premium', cat: 'zip', name: 'IRONCOLD Cold Zip Premium', gender: 'homme', color: 'Gris chiné', price: 339, badge: 'New',
    images: ['ironcold-cold-zip-premium', 'ironcold-cold-zip-premium-2'], sizes: HOODIE,
    desc: 'Hoodie full-zip 330gsm avec poches latérales, thumb holes et label IRONCOLD tissé.' },
  { id: 'ironcold-femme-zip-1', cat: 'zip', name: 'IRONCOLD Zip Slim Femme', gender: 'femme', color: 'Noir', price: 339, badge: 'New',
    images: ['ironcold-femme-zip-1', 'ironcold-femme-zip-1-2'], sizes: HOODIE,
    desc: 'Zip hoodie slim femme 330gsm. Coupe ajustée, fermeture YKK, logo IRONCOLD.' },
  { id: 'ironcold-femme-zip-2', cat: 'zip', name: 'IRONCOLD Zip Cold Femme', gender: 'femme', color: 'Gris chiné', price: 339, badge: '',
    images: ['ironcold-femme-zip-2'], sizes: HOODIE,
    desc: 'Cold zip hoodie femme 330gsm. Design minimaliste, badge IC tissé.' },

  // ---------- Hoodies oversize ----------
  { id: 'ironcold-oversize-hoodie', cat: 'oversize', name: 'IRONCOLD Oversize Hoodie', gender: 'homme', color: 'Noir', price: 299, badge: 'New',
    images: ['ironcold-oversize-hoodie', 'ironcold-oversize-hoodie-2'], sizes: OVERSIZE,
    desc: 'Coupe oversize boxy, épaules extra tombantes. Molleton 260gsm, grande poche kangourou.' },
  { id: 'ironcold-cold-boxy', cat: 'oversize', name: 'IRONCOLD Cold Boxy Hoodie', gender: 'homme', color: 'Blanc', price: 299, badge: 'Bestseller',
    images: ['ironcold-cold-boxy', 'ironcold-cold-boxy-2'], sizes: OVERSIZE,
    desc: 'Hoodie ultra-wide boxy. Longueur cropped, capuche oversize, emblème IC sur la poitrine.' },
  { id: 'ironcold-drop-shoulder', cat: 'oversize', name: 'IRONCOLD Drop Shoulder Hoodie', gender: 'homme', color: 'Gris chiné', price: 299, badge: '',
    images: ['ironcold-drop-shoulder', 'ironcold-drop-shoulder-2'], sizes: OVERSIZE,
    desc: 'Épaules extrêmement tombantes. Molleton 260gsm, coupe relax, logo IRONCOLD.' },
  { id: 'ironcold-femme-oversize-1', cat: 'oversize', name: 'IRONCOLD Oversize Femme', gender: 'femme', color: 'Noir', price: 299, badge: 'New',
    images: ['ironcold-femme-oversize-1', 'ironcold-femme-oversize-1-2'], sizes: OVERSIZE,
    desc: 'Hoodie oversize femme 260gsm. Épaules tombantes, poche kangourou, emblème IC.' },
  { id: 'ironcold-femme-oversize-2', cat: 'oversize', name: 'IRONCOLD Cozy Oversize Femme', gender: 'femme', color: 'Gris chiné', price: 299, badge: '',
    images: ['ironcold-femme-oversize-2', 'ironcold-femme-oversize-2-2'], sizes: OVERSIZE,
    desc: 'Hoodie oversize femme gris chiné 260gsm, coupe relax pour la salle comme pour la rue.' },
  { id: 'ironcold-femme-oversize-3', cat: 'oversize', name: 'IRONCOLD Boxy Femme Blanc', gender: 'femme', color: 'Blanc', price: 299, badge: '',
    images: ['ironcold-femme-oversize-3', 'ironcold-femme-oversize-3-2'], sizes: OVERSIZE,
    desc: 'Hoodie boxy femme blanc 260gsm. Capuche large, emblème IC sur la poitrine.' },

  // ---------- T-shirts ----------
  { id: 'ironcold-oversized-tee', cat: 'tshirt', name: 'IRONCOLD Oversized Tee', gender: 'homme', color: 'Noir', price: 249, badge: 'New',
    images: ['ironcold-oversized-tee', 'ironcold-oversized-tee-2'], sizes: TEE,
    desc: 'Tee oversize coton premium 260gsm. Épaules tombantes, emblème IRONCOLD sur la poitrine.' },
  { id: 'ironcold-cold-graphic-tee', cat: 'tshirt', name: 'IRONCOLD Cold Graphic Tee', gender: 'homme', color: 'Noir', price: 249, badge: '',
    images: ['ironcold-cold-graphic-tee', 'ironcold-cold-graphic-tee-2'], sizes: TEE,
    desc: 'Tee heavyweight avec grand print IRONCOLD dans le dos. 260gsm, tirage limité.' },
  { id: 'ironcold-essential-tee', cat: 'tshirt', name: 'IRONCOLD Essential Tee', gender: 'homme', color: 'Blanc', price: 249, badge: '',
    images: ['ironcold-essential-tee', 'ironcold-essential-tee-2'], sizes: TEE,
    desc: 'Tee minimal avec petit emblème IC sur la poitrine. Coton 260gsm, coupe regular.' },
  { id: 'ironcold-iron-back-print', cat: 'tshirt', name: 'IRONCOLD Iron Back Print Tee', gender: 'homme', color: 'Blanc', price: 249, badge: 'Bestseller',
    images: ['ironcold-iron-back-print', 'ironcold-iron-back-print-2'], sizes: TEE,
    desc: 'Bold back print : IRONCOLD en grand dans le dos. 260gsm, coupe oversize.' },
  { id: 'ironcold-femme-tee-1', cat: 'tshirt', name: 'IRONCOLD Tee Femme Noir', gender: 'femme', color: 'Noir', price: 249, badge: 'New',
    images: ['ironcold-femme-tee-1', 'ironcold-femme-tee-1-2'], sizes: TEE,
    desc: 'Tee femme coton premium 260gsm, coupe relax, emblème IRONCOLD sur la poitrine.' },
  { id: 'ironcold-femme-tee-2', cat: 'tshirt', name: 'IRONCOLD Back Print Femme Noir', gender: 'femme', color: 'Noir', price: 249, badge: '',
    images: ['ironcold-femme-tee-2', 'ironcold-femme-tee-2-2'], sizes: TEE,
    desc: 'Tee femme avec print IRONCOLD dans le dos. 260gsm coton premium.' },
  { id: 'ironcold-femme-tee-3', cat: 'tshirt', name: 'IRONCOLD Tee Femme Blanc', gender: 'femme', color: 'Blanc', price: 249, badge: '',
    images: ['ironcold-femme-tee-3', 'ironcold-femme-tee-3-2'], sizes: TEE,
    desc: 'Tee femme blanc 260gsm, parfait pour la salle. Emblème IC sur la poitrine.' },
  { id: 'ironcold-femme-tee-4', cat: 'tshirt', name: 'IRONCOLD Back Print Femme Blanc', gender: 'femme', color: 'Blanc', price: 249, badge: '',
    images: ['ironcold-femme-tee-4', 'ironcold-femme-tee-4-2'], sizes: TEE,
    desc: 'Tee femme blanc avec grand print IRONCOLD dans le dos. 260gsm, coupe oversize.' }
];
