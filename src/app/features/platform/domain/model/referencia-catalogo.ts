import { ApartadoDeReferencia, URL_DE_PRODUCCION } from './referencia-api';
import { PRODUCTOS } from './referencia-catalogo-productos';

/**
 * El capítulo de catálogo de la referencia: seis apartados y unos treinta endpoints.
 *
 * <p>Va en su propio fichero porque es el grueso de la documentación y porque cambia solo: cuando el
 * backend añade un filtro, se toca aquí y en ningún otro sitio. Es la parte que en React estaban
 * escritas a mano una por una dentro del marcado.
 */

const CATEGORIAS: ApartadoDeReferencia = {
  id: 'cat-categories',
  claveTitulo: 'docs.cat.categories.title',
  icono: 'arbol',
  claveIntro: 'docs.cat.categories.intro',
  endpoints: [
    {
      metodo: 'GET',
      ruta: '/api/catalog/categories',
      claveIntro: 'docs.cat.categories.ep_flat',
      parametros: [
        {
          nombre: 'lang',
          tipo: 'string',
          obligatorio: false,
          descripcion: 'Translation locale (es, en, pt, zh). Default: es.',
        },
      ],
      peticion: {
        curl: `curl ${URL_DE_PRODUCCION}/api/catalog/categories?lang=es`,
        node: `const r = await fetch('${URL_DE_PRODUCCION}/api/catalog/categories?lang=es')`,
        python: `r = requests.get("${URL_DE_PRODUCCION}/api/catalog/categories", params={"lang": "es"})`,
        php: `$cats = json_decode(file_get_contents('${URL_DE_PRODUCCION}/api/catalog/categories?lang=es'), true);`,
      },
      respuesta: `[
  {
    "id":          "9c3d…",
    "slug":        "consumer-electronics",
    "name":        "Electrónica de consumo",
    "nameZh":      "数码电子",
    "parentId":    null,
    "position":    1,
    "icon":        "microchip",
    "directProductCount": 10,
    "children":    []
  }
]`,
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/categories/tree',
      claveIntro: 'docs.cat.categories.ep_tree',
      parametros: [
        { nombre: 'lang', tipo: 'string', obligatorio: false, descripcion: 'Translation locale.' },
      ],
      peticion: {
        curl: `curl ${URL_DE_PRODUCCION}/api/catalog/categories/tree`,
        node: `const tree = await (await fetch('${URL_DE_PRODUCCION}/api/catalog/categories/tree')).json()`,
        python: `tree = requests.get("${URL_DE_PRODUCCION}/api/catalog/categories/tree").json()`,
        php: `$tree = json_decode(file_get_contents('${URL_DE_PRODUCCION}/api/catalog/categories/tree'), true);`,
      },
      respuesta: `[
  {
    "id": "9c3d…",
    "slug": "consumer-electronics",
    "name": "Consumer Electronics",
    "children": [
      { "id": "abcd…", "slug": "audio", "name": "Audio", "children": [] }
    ]
  }
]`,
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/categories/{idOrSlug}',
      claveIntro: 'docs.cat.categories.ep_detail',
      parametros: [
        {
          nombre: 'idOrSlug',
          tipo: 'uuid|slug',
          obligatorio: true,
          descripcion: 'Either internal UUID or storefront slug.',
        },
        { nombre: 'lang', tipo: 'string', obligatorio: false, descripcion: 'Locale.' },
      ],
      peticion: {
        curl: `curl ${URL_DE_PRODUCCION}/api/catalog/categories/consumer-electronics`,
        node: `const cat = await (await fetch('${URL_DE_PRODUCCION}/api/catalog/categories/consumer-electronics')).json()`,
        python: `cat = requests.get("${URL_DE_PRODUCCION}/api/catalog/categories/consumer-electronics").json()`,
        php: `$cat = json_decode(file_get_contents('${URL_DE_PRODUCCION}/api/catalog/categories/consumer-electronics'), true);`,
      },
      respuesta: `{ "id": "9c3d…", "slug": "consumer-electronics", "directProductCount": 10, "children": [ … ] }`,
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/categories/{idOrSlug}/children',
      claveIntro: 'docs.cat.categories.ep_children',
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/categories/{idOrSlug}/breadcrumb',
      claveIntro: 'docs.cat.categories.ep_breadcrumb',
      respuesta: `[
  { "id": "root", "slug": "consumer-electronics", "name": "Electrónica" },
  { "id": "child", "slug": "audio",               "name": "Audio" }
]`,
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/categories/{idOrSlug}/products',
      claveIntro: 'docs.cat.categories.ep_products',
      parametros: [
        { nombre: 'page', tipo: 'int', obligatorio: false, descripcion: 'Default 0.' },
        { nombre: 'size', tipo: 'int', obligatorio: false, descripcion: 'Default 24.' },
        {
          nombre: 'sort',
          tipo: 'string',
          obligatorio: false,
          descripcion: 'trending | sales | newest | price_asc | price_desc | rating',
        },
      ],
    },
  ],
};

const VARIANTES: ApartadoDeReferencia = {
  id: 'cat-variants',
  claveTitulo: 'docs.cat.variants.title',
  icono: 'muestrario',
  claveIntro: 'docs.cat.variants.intro',
  endpoints: [
    {
      metodo: 'GET',
      ruta: '/api/catalog/products/{productId}/variants',
      claveIntro: 'docs.cat.variants.ep_list',
      respuesta: `[
  {
    "id":         "f12…",
    "sku":        "XPRO-BLK",
    "externalId": "XPRO-BLK",
    "title":      "Negro mate",
    "price":      "8.83",
    "stock":      540,
    "imageUrl":   "https://cdn.nx036.local/v/f12.webp",
    "options":    { "颜色": "黑色" },
    "active":     true
  }
]`,
    },
    { metodo: 'GET', ruta: '/api/catalog/variants/{id}', claveIntro: 'docs.cat.variants.ep_by_id' },
    {
      metodo: 'GET',
      ruta: '/api/catalog/products/{productId}/variants/by-sku/{sku}',
      claveIntro: 'docs.cat.variants.ep_by_sku',
      parametros: [
        {
          nombre: 'sku',
          tipo: 'string',
          obligatorio: true,
          descripcion: 'Internal SKU or supplier external id (case-insensitive).',
        },
      ],
    },
    {
      metodo: 'POST',
      ruta: '/api/catalog/products/{productId}/variants/match',
      claveIntro: 'docs.cat.variants.ep_match',
      peticion: {
        curl: `curl -X POST ${URL_DE_PRODUCCION}/api/catalog/products/d023e7b5-…/variants/match \\
  -H 'Content-Type: application/json' \\
  -d '{ "颜色": "黑色" }'`,
        node: `const matches = await (await fetch(\`${URL_DE_PRODUCCION}/api/catalog/products/\${id}/variants/match\`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ '颜色': '黑色' }),
})).json()`,
        python: `r = requests.post(f"${URL_DE_PRODUCCION}/api/catalog/products/{id}/variants/match",
    json={"颜色": "黑色"})`,
        php: `$ch = curl_init("${URL_DE_PRODUCCION}/api/catalog/products/$id/variants/match");
curl_setopt_array($ch, [
  CURLOPT_POST       => true,
  CURLOPT_POSTFIELDS => json_encode(['颜色' => '黑色']),
  CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
  CURLOPT_RETURNTRANSFER => true,
]);
$matches = json_decode(curl_exec($ch), true);`,
      },
    },
  ],
};

const ATRIBUTOS: ApartadoDeReferencia = {
  id: 'cat-attrs',
  claveTitulo: 'docs.cat.attrs.title',
  icono: 'ajustes',
  claveIntro: 'docs.cat.attrs.intro',
  endpoints: [
    {
      metodo: 'GET',
      ruta: '/api/catalog/attributes/keys',
      claveIntro: 'docs.cat.attrs.ep_keys',
      respuesta: `[
  { "key": "brand",     "usage": 50 },
  { "key": "origin",    "usage": 50 },
  { "key": "category",  "usage": 50 },
  { "key": "season",    "usage": 50 },
  { "key": "age_group", "usage": 50 }
]`,
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/attributes/{key}/values',
      claveIntro: 'docs.cat.attrs.ep_values',
      respuesta: `["NX036 Generic", "Sony", "Apple", "Generic"]`,
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/tags',
      claveIntro: 'docs.cat.attrs.ep_tags_all',
      respuesta: `["bluetooth", "casual", "eco", "gym", "kbeauty", "trending", "wireless"]`,
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/tags/{tag}/products',
      claveIntro: 'docs.cat.attrs.ep_tags_products',
      parametros: [
        {
          nombre: 'tag',
          tipo: 'string',
          obligatorio: true,
          descripcion: 'Tag string, case-insensitive.',
        },
        { nombre: 'limit', tipo: 'int', obligatorio: false, descripcion: 'Default 24.' },
      ],
    },
  ],
};

const ENVIOS: ApartadoDeReferencia = {
  id: 'cat-shipping',
  claveTitulo: 'docs.cat.shipping.title',
  icono: 'camion',
  claveIntro: 'docs.cat.shipping.intro',
  endpoints: [
    {
      metodo: 'GET',
      ruta: '/api/catalog/shipping/zones',
      claveIntro: 'docs.cat.shipping.ep_zones',
      parametros: [
        {
          nombre: 'supplierId',
          tipo: 'uuid',
          obligatorio: true,
          descripcion: 'Supplier whose zones to list.',
        },
      ],
      respuesta: `[
  { "supplierId": "abc…", "supplierName": "Shenzhen TechNova Co.", "countryCode": "US", "region": "NORTH_AMERICA", "active": true },
  { "supplierId": "abc…", "supplierName": "Shenzhen TechNova Co.", "countryCode": "ES", "region": "EUROPE",        "active": true }
]`,
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/shipping/rates',
      claveIntro: 'docs.cat.shipping.ep_rates',
      parametros: [
        { nombre: 'supplierId', tipo: 'uuid', obligatorio: true, descripcion: 'Supplier.' },
        {
          nombre: 'country',
          tipo: 'string',
          obligatorio: true,
          descripcion: 'ISO 3166-1 alpha-2 destination code.',
        },
      ],
      respuesta: `[
  { "method": "STANDARD", "carrier": "Standard Shipping",       "transitDaysMin": 7,  "transitDaysMax": 14, "baseCost": "3.50", "perKgCost": "8.00" },
  { "method": "EXPRESS",  "carrier": "DHL Express",    "transitDaysMin": 3,  "transitDaysMax": 6,  "baseCost": "12.00","perKgCost": "25.00" },
  { "method": "AIR",      "carrier": "China Post Air", "transitDaysMin": 5,  "transitDaysMax": 10, "baseCost": "7.00", "perKgCost": "15.00" },
  { "method": "SEA",      "carrier": "Sea LCL",        "transitDaysMin": 25, "transitDaysMax": 45, "baseCost": "15.00","perKgCost": "4.00" }
]`,
    },
    {
      metodo: 'POST',
      ruta: '/api/catalog/shipping/quote',
      claveIntro: 'docs.cat.shipping.ep_quote',
      peticion: {
        curl: `curl -X POST ${URL_DE_PRODUCCION}/api/catalog/shipping/quote \\
  -H 'Content-Type: application/json' \\
  -d '{ "productId":"d023e7b5-…", "quantity": 3, "country": "ES" }'`,
        node: `const quote = await (await fetch('${URL_DE_PRODUCCION}/api/catalog/shipping/quote', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ productId, quantity: 3, country: 'ES' }),
})).json()`,
        python: `r = requests.post("${URL_DE_PRODUCCION}/api/catalog/shipping/quote",
    json={"productId": product_id, "quantity": 3, "country": "ES"})`,
        php: `$ch = curl_init('${URL_DE_PRODUCCION}/api/catalog/shipping/quote');
curl_setopt_array($ch, [
  CURLOPT_POST          => true,
  CURLOPT_HTTPHEADER    => ['Content-Type: application/json'],
  CURLOPT_POSTFIELDS    => json_encode(['productId' => $id, 'quantity' => 3, 'country' => 'ES']),
  CURLOPT_RETURNTRANSFER=> true,
]);
$quote = json_decode(curl_exec($ch), true);`,
      },
      respuesta: `[
  { "supplierId": "abc…", "method": "STANDARD", "carrier": "Standard Shipping",    "transitDaysMin": 7, "transitDaysMax": 14, "cost":  "9.10", "currency": "USD" },
  { "supplierId": "abc…", "method": "AIR",      "carrier": "China Post",  "transitDaysMin": 5, "transitDaysMax": 10, "cost": "17.80", "currency": "USD" },
  { "supplierId": "abc…", "method": "EXPRESS",  "carrier": "DHL Express", "transitDaysMin": 3, "transitDaysMax": 6,  "cost": "30.90", "currency": "USD" }
]`,
    },
  ],
};

const PROVEEDORES: ApartadoDeReferencia = {
  id: 'cat-suppliers',
  claveTitulo: 'admin.suppliers.title',
  icono: 'comercio',
  endpoints: [
    {
      metodo: 'GET',
      ruta: '/api/catalog/suppliers',
      claveIntro: 'docs.cat.suppliers.ep_list',
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/suppliers/{id}',
      claveIntro: 'docs.cat.suppliers.ep_detail',
    },
    {
      metodo: 'GET',
      ruta: '/api/catalog/suppliers/{id}/products',
      claveIntro: 'docs.cat.suppliers.ep_products',
    },
  ],
};

export const APARTADOS_DE_CATALOGO: readonly ApartadoDeReferencia[] = [
  CATEGORIAS,
  PRODUCTOS,
  VARIANTES,
  ATRIBUTOS,
  ENVIOS,
  PROVEEDORES,
];
