# Shopify Products & Prices Scraper

Open-source Node.js scraper that extracts products, prices, discounts, variants, SKUs and stock status from Shopify stores, using the public `/products.json` feed that most Shopify stores serve. It needs no browser and no proxies. It runs **locally and standalone, with no Apify account or API token**, and the same code also runs as a hosted Apify Actor: [apify.com/small-offer-desk/shopify-products-scraper](https://apify.com/small-offer-desk/shopify-products-scraper).

## Requirements
- Node.js 18+ (uses the built-in `fetch`)

## Run locally (no account needed)
```bash
git clone https://github.com/jeremyam/shopify-products-scraper.git
cd shopify-products-scraper
npm install
mkdir -p storage/key_value_stores/default
echo '{"startUrls":["https://www.allbirds.com"],"maxProductsPerStore":50}' > storage/key_value_stores/default/INPUT.json
npm start        # same as: node src/main.js
```
Results are written as one JSON file per row to `storage/datasets/default/`. Without an Apify token, the Apify SDK simply uses this local `storage/` folder, so nothing is sent to Apify.

If you have the [Apify CLI](https://docs.apify.com/cli) installed, `apify run` also works and uses the same local storage (no login required).

## Input
| Field | Type | Default | Description |
|---|---|---|---|
| `startUrls` | array of URLs | `[]` | Store URLs or collection URLs (e.g. `https://kith.com/collections/mens-footwear`) |
| `outputMode` | `product` \| `variant` | `product` | One row per product, or one row per variant/SKU |
| `maxProductsPerStore` | number | `0` (no limit) | Cap per store |
| `onlyOnSale` | boolean | `false` | Keep only discounted items |
| `onlyAvailable` | boolean | `false` | Keep only in-stock items |
| `includeDescription` | boolean | `false` | Add plain-text product description |

## Output fields
`store`, `currency`, `productId`, `title`, `handle`, `url`, `vendor`, `productType`, `tags`, `createdAt`, `publishedAt`, `updatedAt`, `image`, plus price fields (`priceMin`/`priceMax`, `compareAtPrice`, `discountPct`, `onSale`, `available`). Variant mode adds `variantId`, `variantTitle`, `sku`, `options`, `price`, `grams`, `requiresShipping`.

## Limitations
Some headless or custom Shopify stores disable `/products.json`; those are logged and skipped. The scraper reads only the public product catalog and collects no customer or personal data. Follow the laws and site terms that apply to you.

## License
MIT © Small Offer Desk. See [LICENSE](LICENSE).
