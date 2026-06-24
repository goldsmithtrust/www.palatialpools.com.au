/*
 * Palatial Pools — Online Store catalogue (browser copy)
 *
 * This file is the in-browser view of the YAML catalogue at
 * /store/_catalogue.yaml — it powers cart rendering, the Chemistry
 * Advisor, the Fitment Checker and the Pool Pantry filter without any
 * backend round-trip.
 *
 * It is regenerated whenever scripts/build_store.py runs. Manual edits
 * here will be overwritten — change the YAML and rebuild.
 *
 * NOTE: We *also* re-emit this from build_store.py so it always matches
 * the YAML. For now this file is hand-maintained alongside the YAML and
 * a future iteration will fully auto-generate it.
 */
(function () {
  const STORE = (window.PalatialStore = window.PalatialStore || {});

  const CATEGORIES = [
    { slug: 'chemicals',     name: 'Pool Chemicals' },
    { slug: 'equipment',     name: 'Pool Equipment' },
    { slug: 'accessories',   name: 'Accessories' },
    { slug: 'parts',         name: 'Spare Parts' },
    { slug: 'water-testing', name: 'Water Testing' },
  ];

  const PRODUCTS = [
    { slug: 'variable-speed-pump', name: 'Variable Speed Pool Pump', category: 'equipment',
      brand: 'Palatial Pools', price: 1295.00, unit: 'each', sku: 'PP-PUMP-VS', stock: 'in',
      image: '/assets/store/products/variable-speed-pump.svg', tag: 'Energy efficient',
      short: 'Quiet daily filtration with lower energy use and programmable run speeds.',
      install: { available: true, price: 385, duration: '90-120 min' } },
    { slug: 'robotic-pool-cleaner', name: 'Robotic Pool Cleaner', category: 'equipment',
      brand: 'Palatial Pools', price: 1499.00, unit: 'each', sku: 'PP-ROBO-CLN', stock: 'in',
      image: '/assets/store/products/robotic-cleaner.svg', tag: 'Premium clean',
      short: 'Wall-climbing robotic cleaner with fine filtration and scheduled cleaning cycles.' },
    { slug: 'pool-heat-pump', name: 'Inverter Pool Heat Pump', category: 'equipment',
      brand: 'Palatial Pools', price: 3890.00, unit: 'from', sku: 'PP-HEAT-INV', stock: 'low',
      image: '/assets/store/products/heat-pump.svg', tag: 'Heating',
      short: 'Efficient electric heating for shoulder-season swimming and spa comfort.',
      install: { available: true, price: 690, duration: 'Half day' } },
    { slug: 'pool-pro-chlorine-granular-10kg', name: 'Pool Pro Granular Chlorine 10kg', category: 'chemicals',
      brand: 'Pool Pro', price: 124.00, unit: 'per 10kg bucket', sku: 'PP-CHL-G10', stock: 'in',
      image: '/assets/store/products/chlorine-granular.svg', emoji: '🧪', tag: 'Bestseller', subscribe: true,
      short: 'Fast-dissolving 70% calcium hypochlorite for daily sanitising and shock dosing.',
      advisor: { role: 'sanitiser', potency: 0.70 } },
    { slug: 'ph-down-5kg', name: 'Pool Pro pH Down 5kg', category: 'chemicals',
      brand: 'Pool Pro', price: 38.50, unit: 'per 5kg bucket', sku: 'PP-PHD-5', stock: 'in',
      image: '/assets/store/products/ph-balancer.svg', emoji: '⚗️', subscribe: true,
      short: 'Dry acid pH reducer — safer to store and handle than liquid hydrochloric.',
      advisor: { role: 'ph-down', potency: 1.0 } },
    { slug: 'algaecide-concentrate-5l', name: 'Algaecide Concentrate 5L', category: 'chemicals',
      brand: 'Pool Pro', price: 64.00, unit: 'per 5L bottle', sku: 'PP-ALG-5L', stock: 'in',
      image: '/assets/store/products/chlorine-granular.svg', emoji: '🟢', subscribe: true,
      short: 'Non-foaming long-life algaecide for green, black and mustard algae prevention.',
      advisor: { role: 'algaecide' } },
    { slug: 'salt-pool-chlorinator-cell', name: 'Replacement Chlorinator Cell — 25amp', category: 'equipment',
      brand: 'Universal', price: 549.00, unit: 'each', sku: 'PP-CELL-25', stock: 'low',
      image: '/assets/store/products/salt-chlorinator.svg', emoji: '⚡', tag: 'In demand',
      short: 'Universal-fit 25amp salt-chlorinator cell — suits most Australian pool sizes.',
      fits: ['Astral Viron eQuilibrium 25', 'Davey ChloroMatic MC25C', 'Pentair IntelliChlor IC25', 'Zodiac Clearwater C170', 'Waterco Hydrochlor 25'],
      install: { available: true, price: 285, duration: '60–90 min' } },
    { slug: 'sand-filter-media-25kg', name: 'High-Grade Filter Sand 25kg', category: 'parts',
      brand: 'Palatial Pools', price: 32.00, unit: 'per 25kg bag', sku: 'PP-SAND-25', stock: 'in',
      emoji: '🏖️',
      short: 'Graded silica sand — for replacement in any residential sand filter.' },
    { slug: 'cartridge-filter-c100', name: 'C100 Cartridge Filter Element', category: 'parts',
      brand: 'Universal', price: 79.00, unit: 'each', sku: 'PP-C100', stock: 'in',
      emoji: '🧰',
      short: 'Universal-fit 100 sq ft cartridge — suits Pentair, Astral, Davey & Waterco.',
      fits: ['Pentair Clean & Clear 100', 'Astral Hurlcon ZX100', 'Davey Crystal Clear C100', 'Waterco Trimline CC100'] },
    { slug: 'pool-vacuum-head-deluxe', name: 'Weighted Vacuum Head — Deluxe', category: 'accessories',
      brand: 'Palatial Pools', price: 42.50, unit: 'each', sku: 'PP-VAC-HD', stock: 'in', emoji: '🧹',
      short: 'Weighted brass-fitted vacuum head with replaceable brushes and wheels.' },
    { slug: 'telescopic-pole-4-8m', name: 'Telescopic Pole 2.4 – 4.8m', category: 'accessories',
      brand: 'Palatial Pools', price: 89.00, unit: 'each', sku: 'PP-POLE-48', stock: 'in', emoji: '📏',
      short: 'Anodised alloy telescopic pole — locks at any length up to 4.8m.' },
    { slug: 'liquid-test-kit-6way', name: 'Liquid Test Kit — 6 Way', category: 'water-testing',
      brand: 'Palatial Pools', price: 36.00, unit: 'per kit', sku: 'PP-LTK-6', stock: 'in',
      emoji: '🧫', tag: 'Starter pick',
      short: 'Test chlorine, pH, alkalinity, hardness, stabiliser and salt at home.' },
    { slug: 'digital-salt-meter', name: 'Digital Salt & Temperature Meter', category: 'water-testing',
      brand: 'Palatial Pools', price: 119.00, unit: 'each', sku: 'PP-MTR-SLT', stock: 'in', emoji: '📟',
      short: 'Pocket meter for salt-water pools — measures salinity and temperature.' },
    { slug: 'pool-cover-roller-deluxe', name: 'Pool Cover Roller — Deluxe 5.6m', category: 'equipment',
      brand: 'Palatial Pools', price: 549.00, unit: 'each', sku: 'PP-ROL-56', stock: 'in', emoji: '🛠️',
      image: '/assets/store/products/pool-cover.svg',
      short: 'Heavy-duty pool cover roller with stainless components and locking handle.',
      install: { available: true, price: 195, duration: '30–45 min' } },
    { slug: 'pool-pro-mineral-salts-10kg', name: 'Pool Pro Mineral Salts 10kg', category: 'chemicals',
      brand: 'Pool Pro', price: 49.00, unit: 'per 10kg bag', sku: 'PP-MIN-10', stock: 'in',
      emoji: '🧂', tag: 'Eco choice', subscribe: true,
      short: 'Magnesium-rich mineral salts for softer, gentler swimming water.',
      advisor: { role: 'salt' } },
  ];

  STORE.categories = CATEGORIES;
  STORE.products = PRODUCTS;
  STORE.getProduct = function (slug) { return PRODUCTS.find(p => p.slug === slug) || null; };
  STORE.getCategory = function (slug) { return CATEGORIES.find(c => c.slug === slug) || null; };
  STORE.productsByCategory = function (slug) { return PRODUCTS.filter(p => p.category === slug); };
  STORE.formatPrice = function (n) {
    return '$' + Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  STORE.search = function (q) {
    if (!q) return [];
    const term = q.toLowerCase().trim();
    return PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.short || '').toLowerCase().includes(term) ||
      p.category.includes(term) ||
      (p.sku && p.sku.toLowerCase().includes(term))
    );
  };
})();
