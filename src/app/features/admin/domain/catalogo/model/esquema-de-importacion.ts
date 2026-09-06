/**
 * Los campos que acepta la importación masiva, uno a uno.
 *
 * <p>Es COPIA FIEL de lo que valida el backend (`Bulk*DtoIn`): qué es obligatorio y de qué tipo. Se
 * declara aquí para poder rechazar una fila mala antes de mandarla y, sobre todo, para poder ENSEÑAR la
 * lista completa en el propio importador: quien copiaba la plantilla sin `shippingCny` recibía «Falta
 * el envío» sin saber de dónde salía ese campo.
 *
 * <p>`clave` es el nombre EXACTO del backend, así que no se traduce; la descripción sí, y por eso viaja
 * como clave de diccionario.
 */
export type TipoDeCampo = 'string' | 'number' | 'int' | 'urls' | 'list' | 'objects' | 'map';

export interface CampoDeImportacion {
  readonly clave: string;
  readonly obligatorio?: boolean;
  readonly tipo: TipoDeCampo;
  readonly descripcion: string;
}

export type ClaseDeImportacion = 'products' | 'categories';

const CAMPOS_DE_PRODUCTO: readonly CampoDeImportacion[] = [
  { clave: 'categorySlug', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.categorySlug' },
  { clave: 'category1688Id', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.category1688Id' },
  { clave: 'category1688Name', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.category1688Name' },
  { clave: 'titleEs', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.titleEs' },
  { clave: 'titleEn', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.titleEn' },
  { clave: 'titlePt', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.titlePt' },
  { clave: 'titleZh', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.titleZh' },
  { clave: 'descriptionEs', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.descriptionEs' },
  { clave: 'descriptionEn', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.descriptionEn' },
  { clave: 'descriptionPt', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.descriptionPt' },
  { clave: 'descriptionZh', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.descriptionZh' },
  { clave: 'translations', tipo: 'map', descripcion: 'admin.catalog.bulk.fd.translations' },
  { clave: 'price', tipo: 'number', descripcion: 'admin.catalog.bulk.fd.price' },
  // OBLIGATORIOS en el backend (BulkProductRules.assertShippingAndVat). Faltaban en esta tabla, y quien
  // copiaba la plantilla recibía «Falta el envío (shippingCny)» sin saber que existía el campo.
  { clave: 'shippingCny', obligatorio: true, tipo: 'number', descripcion: 'admin.catalog.bulk.fd.shippingCny' },
  { clave: 'ivaCny', obligatorio: true, tipo: 'number', descripcion: 'admin.catalog.bulk.fd.ivaCny' },
  { clave: 'surchargeCny', tipo: 'number', descripcion: 'admin.catalog.bulk.fd.surchargeCny' },
  { clave: 'shippingUserCny', tipo: 'number', descripcion: 'admin.catalog.bulk.fd.shippingUserCny' },
  { clave: 'dutyUserCny', tipo: 'number', descripcion: 'admin.catalog.bulk.fd.dutyUserCny' },
  { clave: 'moq', tipo: 'int', descripcion: 'admin.catalog.bulk.fd.moq' },
  { clave: 'monthlySales', tipo: 'int', descripcion: 'admin.catalog.bulk.fd.monthlySales' },
  { clave: 'rating', tipo: 'number', descripcion: 'admin.catalog.bulk.fd.rating' },
  { clave: 'supplierExternalId', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.supplierExternalId' },
  { clave: 'supplierName', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.supplierName' },
  { clave: 'manufacturer', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.manufacturer' },
  { clave: 'imageUrls', tipo: 'urls', descripcion: 'admin.catalog.bulk.fd.imageUrls' },
  { clave: 'videoUrl', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.videoUrl' },
  { clave: 'tieredPricing', tipo: 'objects', descripcion: 'admin.catalog.bulk.fd.tieredPricing' },
  { clave: 'variantAxes', tipo: 'objects', descripcion: 'admin.catalog.bulk.fd.variantAxes' },
  { clave: 'variants', tipo: 'objects', descripcion: 'admin.catalog.bulk.fd.variants' },
  { clave: 'attributes', tipo: 'objects', descripcion: 'admin.catalog.bulk.fd.attributes' },
  { clave: 'specifications', tipo: 'objects', descripcion: 'admin.catalog.bulk.fd.specifications' },
  { clave: 'reviews', tipo: 'objects', descripcion: 'admin.catalog.bulk.fd.reviews' },
  { clave: 'videoUrls', tipo: 'urls', descripcion: 'admin.catalog.bulk.fd.videoUrls' },
  { clave: 'salesRegions', tipo: 'list', descripcion: 'admin.catalog.bulk.fd.salesRegions' },
  { clave: 'ratingBreakdown', tipo: 'map', descripcion: 'admin.catalog.bulk.fd.ratingBreakdown' },
  { clave: 'crossBorderSupport', tipo: 'map', descripcion: 'admin.catalog.bulk.fd.crossBorderSupport' },
  { clave: 'dropshipShipped30d', tipo: 'int', descripcion: 'admin.catalog.bulk.fd.dropshipShipped30d' },
  { clave: 'dropshipPickupRate48h', tipo: 'number', descripcion: 'admin.catalog.bulk.fd.dropshipPickupRate48h' },
  { clave: 'weightGrams', tipo: 'int', descripcion: 'admin.catalog.bulk.fd.weightGrams' },
  { clave: 'packageWeightGrams', tipo: 'int', descripcion: 'admin.catalog.bulk.fd.packageWeightGrams' },
  { clave: 'lengthMm', tipo: 'int', descripcion: 'admin.catalog.bulk.fd.lengthMm' },
  { clave: 'widthMm', tipo: 'int', descripcion: 'admin.catalog.bulk.fd.widthMm' },
  { clave: 'heightMm', tipo: 'int', descripcion: 'admin.catalog.bulk.fd.heightMm' },
  { clave: 'countryOfOrigin', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.countryOfOrigin' },
  { clave: 'hsCode', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.hsCode' },
  // La terna aduanera completa. Sin ella el producto hereda material y uso de su categoría: la ficha
  // afinada a mano se perdía en cada reimportación, y con ella CON QUIÉN agrupa en la aduana, que es
  // cuántos derechos se pagan.
  { clave: 'customsMaterial', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.customsMaterial' },
  { clave: 'customsUsage', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.customsUsage' },
  { clave: 'batteryType', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.batteryType' },
  { clave: 'certifications', tipo: 'list', descripcion: 'admin.catalog.bulk.fd.certifications' },
  { clave: 'shipFrom', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.shipFrom' },
  { clave: 'leadTimeDays', tipo: 'int', descripcion: 'admin.catalog.bulk.fd.leadTimeDays' },
  { clave: 'status', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.status' },
  { clave: 'externalId', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.externalId' },
  { clave: 'sourceUrl', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.sourceUrl' },
];

const CAMPOS_DE_CATEGORIA: readonly CampoDeImportacion[] = [
  { clave: 'slug', obligatorio: true, tipo: 'string', descripcion: 'admin.catalog.bulk.fd.slug' },
  { clave: 'nameEs', obligatorio: true, tipo: 'string', descripcion: 'admin.catalog.bulk.fd.nameEs' },
  { clave: 'nameEn', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.nameEn' },
  { clave: 'namePt', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.namePt' },
  { clave: 'nameZh', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.nameZh' },
  { clave: 'icon', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.icon' },
  { clave: 'position', tipo: 'int', descripcion: 'admin.catalog.bulk.fd.position' },
  { clave: 'parentSlug', tipo: 'string', descripcion: 'admin.catalog.bulk.fd.parentSlug' },
];

export const ESQUEMAS: Readonly<Record<ClaseDeImportacion, readonly CampoDeImportacion[]>> = {
  products: CAMPOS_DE_PRODUCTO,
  categories: CAMPOS_DE_CATEGORIA,
};
