import { Actor, log } from 'apify';
await Actor.init();
const { startUrls = [], maxProductsPerStore = 0, outputMode = 'product', onlyOnSale = false, onlyAvailable = false, includeDescription = false } = (await Actor.getInput()) ?? {};
const strip = (h) => (h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url) {
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: 'application/json' } });
      if (r.status === 404 || r.status === 403 || r.status === 401) return { status: r.status };
      if (r.ok) { const t = await r.text(); try { return { data: JSON.parse(t) }; } catch { return { status: 'not-json' }; } }
      if (r.status === 429) await sleep(5000 * (i + 1)); } catch (e) { log.debug(e.message); }
    await sleep(1500 * (i + 1));
  }
  return { status: 'failed' };
}
let total = 0;
for (const raw of startUrls) {
  const u = new URL((typeof raw === 'string' ? raw : raw.url).replace(/\/$/, '').match(/^https?:/) ? (typeof raw === 'string' ? raw : raw.url) : 'https://' + raw);
  const coll = u.pathname.match(/\/collections\/[^/]+/)?.[0] || '';
  const base = `${u.origin}${coll}/products.json`; let page = 1, count = 0, currency = null;
  const meta = await getJson(`${u.origin}/meta.json`); currency = meta.data?.currency || null;
  outer: while (true) {
    const res = await getJson(`${base}?limit=250&page=${page}`);
    if (!res.data?.products) { log.warning(`${u.origin}: products.json unavailable (${res.status}) — not a Shopify store or endpoint disabled`); break; }
    const prods = res.data.products; if (!prods.length) break;
    const rows = [];
    for (const p of prods) {
      const vs = p.variants || []; const prices = vs.map((v) => +v.price); const cmp = vs.map((v) => +(v.compare_at_price || 0));
      const common = { store: u.hostname, currency, productId: p.id, title: p.title, handle: p.handle, url: `${u.origin}/products/${p.handle}`, vendor: p.vendor, productType: p.product_type || null,
        tags: Array.isArray(p.tags) ? p.tags : (p.tags ? String(p.tags).split(', ') : []), createdAt: p.created_at, publishedAt: p.published_at, updatedAt: p.updated_at,
        image: p.images?.[0]?.src || null, ...(includeDescription ? { description: strip(p.body_html) } : {}) };
      if (outputMode === 'variant') {
        for (const v of vs) { const onSale = +(v.compare_at_price || 0) > +v.price;
          if ((onlyOnSale && !onSale) || (onlyAvailable && !v.available)) continue;
          rows.push({ ...common, variantId: v.id, variantTitle: v.title, sku: v.sku || null, options: [v.option1, v.option2, v.option3].filter(Boolean), price: +v.price,
            compareAtPrice: v.compare_at_price ? +v.compare_at_price : null, discountPct: onSale ? Math.round((1 - v.price / v.compare_at_price) * 100) : 0, onSale, available: v.available,
            grams: v.grams ?? null, requiresShipping: v.requires_shipping, image: v.featured_image?.src || common.image }); }
      } else {
        const available = vs.some((v) => v.available); const onSale = vs.some((v) => +(v.compare_at_price || 0) > +v.price);
        if ((onlyOnSale && !onSale) || (onlyAvailable && !available)) continue;
        rows.push({ ...common, priceMin: Math.min(...prices), priceMax: Math.max(...prices), compareAtPriceMax: Math.max(...cmp) || null, onSale, available, variantCount: vs.length,
          availableVariantCount: vs.filter((v) => v.available).length, options: (p.options || []).map((o) => ({ name: o.name, values: o.values })), images: (p.images || []).map((i) => i.src) });
      }
    }
    for (const r of rows) { if (maxProductsPerStore && count >= maxProductsPerStore) break outer; await Actor.pushData(r); count++; }
    if (Actor.getEnv().isAtHome && rows.length) await Actor.charge({ eventName: 'product', count: Math.min(rows.length, maxProductsPerStore ? maxProductsPerStore : rows.length) }).catch(() => {});
    if (prods.length < 250) break; page++; await sleep(500);
  }
  log.info(`${u.hostname}: ${count} rows`); total += count;
}
log.info(`Done. ${total} rows saved.`);
await Actor.exit();
