import { ApartadoDeReferencia, URL_DE_PRODUCCION } from './referencia-api';

/**
 * El apartado de PRODUCTOS de la referencia de catálogo.
 *
 * <p>Sale de `referencia-catalogo.ts` por tamaño: catorce endpoints con sus ejemplos en cuatro
 * lenguajes son la mitad del capítulo, y juntarlo con los otros cinco apartados pasaba de las
 * cuatrocientas líneas que marca el lint. La frontera no es arbitraria: los endpoints de producto son
 * los que más cambian, y tenerlos aparte hace que un cambio ahí no toque el fichero de todos.
 */

export const PRODUCTOS: ApartadoDeReferencia = {
  id: 'cat-products',
  claveTitulo: 'docs.cat.products.title',
  icono: 'cajas',
  claveIntro: 'docs.cat.products.intro',
  // El listado exige identificarse: enumerar el catálogo entero es lo que hace un raspador, no un
  // integrador. La ficha suelta sigue siendo pública, y por eso el aviso va aquí y no en el capítulo.
  avisoTrasElPrimero: 'docs.cat.products.listing_auth',
  endpoints: [
    {
      metodo: 'GET',
      ruta: '/api/catalog/products',
      claveIntro: 'docs.cat.products.ep_list',
      parametros: [
        {
          nombre: 'q',
          tipo: 'string',
          obligatorio: false,
          descripcion: 'Free text on title / SKU / external id.',
        },
        {
          nombre: 'categoryId',
          tipo: 'uuid',
          obligatorio: false,
          descripcion: 'Restrict to one category.',
        },
        {
          nombre: 'supplierId',
          tipo: 'uuid',
          obligatorio: false,
          descripcion: 'Restrict to one supplier.',
        },
        {
          nombre: 'minPrice',
          tipo: 'decimal',
          obligatorio: false,
          descripcion: 'Minimum unit price (USD).',
        },
        {
          nombre: 'maxPrice',
          tipo: 'decimal',
          obligatorio: false,
          descripcion: 'Maximum unit price (USD).',
        },
        {
          nombre: 'sort',
          tipo: 'string',
          obligatorio: false,
          descripcion: 'trending | sales | newest | price_asc | price_desc | rating',
        },
        { nombre: 'page', tipo: 'int', obligatorio: false, descripcion: 'Default 0.' },
        { nombre: 'size', tipo: 'int', obligatorio: false, descripcion: 'Default 24, max 100.' },
        { nombre: 'lang', tipo: 'string', obligatorio: false, descripcion: 'Locale.' },
      ],
      peticion: {
        curl: `curl '${URL_DE_PRODUCCION}/api/catalog/products?q=auriculares&sort=sales&page=0&size=24'`,
        node: `const url = '${URL_DE_PRODUCCION}/api/catalog/products?'
  + new URLSearchParams({ q: 'auriculares', sort: 'sales', size: '24' })
const page = await (await fetch(url)).json()`,
        python: `r = requests.get("${URL_DE_PRODUCCION}/api/catalog/products",
    params={"q": "auriculares", "sort": "sales", "size": 24})
items = r.json()["items"]`,
        php: `$page = json_decode(file_get_contents('${URL_DE_PRODUCCION}/api/catalog/products?q=auriculares&sort=sales'), true);`,
      },
      respuesta: `{
  "items": [
    {
      "id":          "d023e7b5-…",
      "slug":        "auriculares-bluetooth-tws-x-pro",
      "title":       "Auriculares Bluetooth TWS X-Pro ANC",
      "mainImage":   "https://cdn.nx036.local/p/d023e7b5/1.webp",
      "displayPrice":     "23.58",
      "displayCurrency":  "USD",
      "displayFormatted": "$23.58",
      "monthlySales": 4820,
      "trendScore":   0.892
    }
  ],
  "page": 0, "size": 24, "totalElements": 50, "totalPages": 3
}`,
    },
    { metodo: 'GET', ruta: '/api/catalog/products/{slug}', claveIntro: 'docs.cat.products.ep_by_slug' },
    {
      metodo: 'GET',
      ruta: '/api/catalog/products/by-id/{id}',
      claveIntro: 'docs.cat.products.ep_by_id',
      respuesta: `{
  "id":             "d023e7b5-…",
  "slug":           "auriculares-bluetooth-tws-x-pro",
  "title":          "Auriculares Bluetooth TWS X-Pro ANC",
  "description":    "Active noise cancelling, IPX5, dual-call, 30h battery, USB-C.",
  "brand":          "NX036 Generic",
  "moq":            1,
  "displayPrice":     "23.58",
  "displayCurrency":  "USD",
  "displayFormatted": "$23.58",
  "weightGrams":    230,
  "lengthMm":       180, "widthMm": 80, "heightMm": 50,
  "leadTimeDays":   4,
  "warrantyMonths": 12,
  "certifications": ["CE","FCC","RoHS"],
  "countryOfOrigin":"CN",
  "images": [ … ],
  "variants": [ … ],
  "variantOptions": [ … ],
  "priceTiers": [ … ]
}`,
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/products/by-external/{source}/{externalId}',
      claveIntro: 'docs.cat.products.ep_by_external',
      parametros: [
        {
          nombre: 'source',
          tipo: 'string',
          obligatorio: true,
          descripcion: 'Upstream source slug (e.g. "supplier").',
        },
        {
          nombre: 'externalId',
          tipo: 'string',
          obligatorio: true,
          descripcion: 'Offer id at the source.',
        },
      ],
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/bestsellers',
      claveIntro: 'docs.cat.products.ep_bestsellers',
      parametros: [
        {
          nombre: 'categoryId',
          tipo: 'uuid',
          obligatorio: false,
          descripcion: 'Optional — restrict to one category.',
        },
        { nombre: 'page', tipo: 'int', obligatorio: false, descripcion: 'Default 0.' },
        { nombre: 'size', tipo: 'int', obligatorio: false, descripcion: 'Default 20.' },
      ],
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/products/trending',
      claveIntro: 'docs.cat.products.ep_trending',
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/products/newest',
      claveIntro: 'docs.cat.products.ep_newest',
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/products/{id}/related',
      claveIntro: 'docs.cat.products.ep_related',
      parametros: [
        { nombre: 'limit', tipo: 'int', obligatorio: false, descripcion: 'Default 8, max 100.' },
      ],
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/products/{id}/specifications',
      claveIntro: 'docs.cat.products.ep_specs',
      parametros: [
        {
          nombre: 'lang',
          tipo: 'string',
          obligatorio: false,
          descripcion: 'Locale. Falls back to en.',
        },
      ],
      respuesta: `[
  { "key": "Marca",           "value": "NX036 Generic",        "position": 0 },
  { "key": "Material",        "value": "ABS + Aluminum",       "position": 1 },
  { "key": "Modelo",          "value": "OFFER-01003",          "position": 2 },
  { "key": "País de origen",  "value": "CN",                   "position": 3 },
  { "key": "Peso neto",       "value": "230 g",                "position": 4 },
  { "key": "Garantía",        "value": "12 meses",             "position": 5 },
  { "key": "Voltaje",         "value": "100-240V AC, 50/60Hz", "position": 7 },
  { "key": "Certificaciones", "value": "CE, FCC, RoHS",        "position": 8 }
]`,
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/products/{id}/attributes',
      claveIntro: 'docs.cat.products.ep_attrs',
      respuesta: `[
  { "key": "brand",     "value": "NX036 Generic" },
  { "key": "origin",    "value": "CN" },
  { "key": "season",    "value": "all_season" },
  { "key": "age_group", "value": "adult" },
  { "key": "category",  "value": "consumer-electronics" }
]`,
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/products/{id}/tags',
      claveIntro: 'docs.cat.products.ep_tags',
      respuesta: `["wireless", "bluetooth", "gadget", "trending"]`,
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/products/{id}/images',
      claveIntro: 'docs.cat.products.ep_images',
      respuesta: `[
  { "id": "img-1", "sourceUrl": "https://supplier/img1.jpg", "cdnUrl": "https://cdn.nx036.local/p/abc/1.webp", "position": 0, "role": "MAIN" },
  { "id": "img-2", "sourceUrl": "https://supplier/img2.jpg", "cdnUrl": "https://cdn.nx036.local/p/abc/2.webp", "position": 1, "role": "GALLERY" }
]`,
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/products/{id}/price-tiers',
      claveIntro: 'docs.cat.products.ep_tiers',
      respuesta: `[
  { "minQty": 1,   "maxQty": 49,  "unitPrice": "9.43", "currency": "USD" },
  { "minQty": 50,  "maxQty": 199, "unitPrice": "8.64", "currency": "USD" },
  { "minQty": 200, "maxQty": null,"unitPrice": "7.84", "currency": "USD" }
]`,
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/products/suggest',
      claveIntro: 'docs.cat.products.ep_suggest',
      parametros: [
        {
          nombre: 'q',
          tipo: 'string',
          obligatorio: true,
          descripcion: 'Partial query (≥1 char).',
        },
        { nombre: 'lang', tipo: 'string', obligatorio: false, descripcion: 'Locale.' },
        { nombre: 'limit', tipo: 'int', obligatorio: false, descripcion: 'Default 8.' },
      ],
      respuesta: `[
  { "type": "product", "text": "Auriculares Bluetooth TWS X-Pro ANC", "slug": "auriculares-bluetooth-tws-x-pro" }
]`,
    },
  ],
};
