import { ClaseDeImportacion } from './esquema-de-importacion';

/**
 * Las plantillas que se precargan en el importador.
 *
 * <p>Son DOS a propósito: el ejemplo mínimo enseña lo imprescindible para que una fila entre, y la
 * plantilla completa enseña TODOS los campos rellenos, que es la única forma de descubrir que algo
 * existe sin leer el código del backend. Van como texto y no como objetos porque lo que se edita es
 * texto: el formato, el orden de las claves y los comentarios de espaciado son parte de lo que se
 * copia.
 */
const EJEMPLO_DE_PRODUCTOS = `[
  {
    "categorySlug": "consumer-electronics",
    "titleEs": "Auricular X",
    "titleEn": "Headset X",
    "price": 29.90,
    "shippingCny": 8.00,
    "ivaCny": 0.00,
    "surchargeCny": 0.00,
    "shippingUserCny": 0.00,
    "dutyUserCny": 0.00,
    "moq": 1,
    "imageUrls": ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"]
  }
]`;

const EJEMPLO_DE_CATEGORIAS = `[
  {
    "slug": "mi-categoria",
    "nameEs": "Mi categoría",
    "nameEn": "My category",
    "namePt": "Minha categoria",
    "nameZh": "我的分类",
    "icon": "tag"
  }
]`;

const PLANTILLA_DE_PRODUCTOS = `[
  {
    "categorySlug": "consumer-electronics",
    "category1688Id": "126546700",
    "category1688Name": "蓝牙耳机",
    "titleEs": "Auricular inalámbrico X",
    "titleEn": "Wireless Headset X",
    "titlePt": "Fone de ouvido sem fio X",
    "titleZh": "无线耳机 X",
    "descriptionEs": "Auriculares Bluetooth con cancelación de ruido.",
    "descriptionEn": "Bluetooth headphones with noise cancelling.",
    "descriptionPt": "Fones Bluetooth com cancelamento de ruído.",
    "descriptionZh": "蓝牙降噪耳机。",
    "translations": {
      "fr": { "title": "Casque sans fil X", "description": "Casque Bluetooth à réduction de bruit." },
      "de": { "title": "Kabelloses Headset X", "description": "Bluetooth-Kopfhörer mit Geräuschunterdrückung." },
      "it": { "title": "Cuffie wireless X", "description": "Cuffie Bluetooth con cancellazione del rumore." }
    },
    "price": 29.90,
    "shippingCny": 8.00,
    "ivaCny": 0.00,
    "surchargeCny": 0.00,
    "shippingUserCny": 0.00,
    "dutyUserCny": 0.00,
    "moq": 1,
    "monthlySales": 1200,
    "rating": 4.6,
    "ratingBreakdown": { "5": 120, "4": 30, "3": 5, "2": 1, "1": 0 },
    "supplierName": "Shenzhen Acme Audio Co., Ltd.",
    "supplierExternalId": "1688-supplier-001",
    "manufacturer": "Acme Manufacturing Co.",
    "imageUrls": ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"],
    "videoUrl": "https://cdn.example.com/video/headset-x.mp4",
    "videoUrls": ["https://cdn.example.com/video/headset-x-2.mp4"],
    "salesRegions": ["EU", "US", "LATAM"],
    "tieredPricing": [
      { "minQty": 1, "maxQty": 9, "unitPrice": 18.5, "currency": "CNY" },
      { "minQty": 10, "unitPrice": 15.0, "currency": "CNY" }
    ],
    "variantAxes": [
      { "name": "Color", "values": ["Blanco", "Negro"], "valueImages": { "Blanco": "https://img.example.com/x-white.jpg", "Negro": "https://img.example.com/x-black.jpg" }, "valueTranslations": { "Blanco": { "en": "White", "pt": "Branco", "zh": "白色" }, "Negro": { "en": "Black", "pt": "Preto", "zh": "黑色" } } },
      { "name": "Talla", "values": ["M", "L"] }
    ],
    "variants": [
      { "sku": "HX-WH-M", "optionValues": { "Color": "Blanco", "Talla": "M" }, "price": 18.5, "stock": 120, "imageUrl": "https://img.example.com/x-white.jpg", "weightGrams": 450, "packageWeightGrams": 500, "lengthMm": 300, "widthMm": 185, "heightMm": 110, "supplierSkuId": "1688-sku-001" },
      { "sku": "HX-BK-L", "optionValues": { "Color": "Negro", "Talla": "L" }, "price": 18.5, "stock": 80, "imageUrl": "https://img.example.com/x-black.jpg", "weightGrams": 460 }
    ],
    "attributes": [
      { "key": "material", "value": "ABS" },
      { "key": "material", "value": "ABS plastic", "locale": "en" },
      { "key": "connectivity", "value": "Bluetooth 5.3" }
    ],
    "specifications": [
      { "locale": "es", "key": "Material", "value": "Plástico ABS", "position": 0 },
      { "locale": "en", "key": "Material", "value": "ABS plastic", "position": 0 },
      { "locale": "es", "key": "Autonomía", "value": "30 h", "position": 1 }
    ],
    "reviews": [
      { "authorName": "Li Wei", "authorCountry": "CN", "rating": 5, "title": "很好", "body": "音质很好，电池耐用。", "language": "zh", "verifiedPurchase": true },
      { "authorName": "María G.", "authorCountry": "ES", "rating": 5, "title": "Excelentes", "body": "Gran sonido y batería duradera.", "language": "es", "verifiedPurchase": true },
      { "authorName": "John D.", "authorCountry": "US", "rating": 4, "title": "Good value", "body": "Solid sound, comfortable fit.", "language": "en" }
    ],
    "weightGrams": 450,
    "packageWeightGrams": 500,
    "lengthMm": 300,
    "widthMm": 185,
    "heightMm": 110,
    "countryOfOrigin": "CN",
    "hsCode": "8518300000",
    "customsMaterial": "Plastic and electronic components",
    "customsUsage": "Personal audio device",
    "batteryType": "BUILT_IN",
    "certifications": ["CE", "RoHS"],
    "shipFrom": "Shenzhen, Guangdong",
    "leadTimeDays": 2,
    "dropshipShipped30d": 3200,
    "dropshipPickupRate48h": 0.98,
    "crossBorderSupport": { "fastShipping": true, "warehouses": ["DE", "US"] },
    "status": "ACTIVE",
    "externalId": "979099339858",
    "sourceUrl": "https://detail.1688.com/offer/979099339858.html"
  }
]`;

const PLANTILLA_DE_CATEGORIAS = `[
  {
    "slug": "electronica",
    "nameEs": "Electrónica",
    "nameEn": "Electronics",
    "namePt": "Eletrónica",
    "nameZh": "电子产品",
    "icon": "tag",
    "position": 10
  },
  {
    "slug": "auriculares",
    "nameEs": "Auriculares",
    "nameEn": "Headphones",
    "namePt": "Fones de ouvido",
    "nameZh": "耳机",
    "icon": "headphones",
    "position": 1,
    "parentSlug": "electronica"
  }
]`;

/** Lo mínimo para que una fila entre. */
export const EJEMPLOS: Readonly<Record<ClaseDeImportacion, string>> = {
  products: EJEMPLO_DE_PRODUCTOS,
  categories: EJEMPLO_DE_CATEGORIAS,
};

/** Todos los campos rellenos, para poder verlos y copiarlos. */
export const PLANTILLAS: Readonly<Record<ClaseDeImportacion, string>> = {
  products: PLANTILLA_DE_PRODUCTOS,
  categories: PLANTILLA_DE_CATEGORIAS,
};
