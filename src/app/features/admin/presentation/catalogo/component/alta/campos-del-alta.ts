/**
 * Qué campos escalares tiene cada sección del alta, y cómo se pintan.
 *
 * <p>Van como DATOS y no como plantilla repetida cuarenta veces: así añadir un campo del catálogo es
 * una línea aquí, la sección se reordena moviendo una entrada, y no hay cuarenta bloques de etiqueta
 * más campo que mantener en paralelo.
 *
 * <p>`etiqueta` es la clave del diccionario y `respaldo` el texto que se enseña mientras esa clave no
 * exista en los ocho idiomas (ver `conRespaldo`).
 */
export type ClaseDeCampo = 'texto' | 'numero' | 'entero' | 'area' | 'seleccion';

export interface CampoDelAlta {
  readonly clave: string;
  readonly etiqueta: string;
  readonly respaldo: string;
  readonly clase: ClaseDeCampo;
  readonly marcador?: string;
  readonly opciones?: readonly { valor: string; etiqueta: string; respaldo: string }[];
  /** Cuántas columnas ocupa en la rejilla del escritorio. En el móvil todas ocupan la fila entera. */
  readonly ancho?: 'media' | 'tercio' | 'completa';
}

export const CAMPOS_DE_ORIGEN: readonly CampoDelAlta[] = [
  { clave: 'category1688Id', etiqueta: 'admin.create_product.field.source_category_id', respaldo: 'Categoría de origen (id)', clase: 'texto', ancho: 'media' },
  { clave: 'category1688Name', etiqueta: 'admin.create_product.field.source_category_name', respaldo: 'Categoría de origen (nombre)', clase: 'texto', ancho: 'media' },
];

export const CAMPOS_DE_PRECIO: readonly CampoDelAlta[] = [
  { clave: 'price', etiqueta: 'admin.create_product.field.price_cny', respaldo: 'Precio (CNY)', clase: 'numero', marcador: '29.90', ancho: 'media' },
  { clave: 'moq', etiqueta: 'admin.create_product.moq', respaldo: 'Pedido mínimo (MOQ)', clase: 'entero', marcador: '1', ancho: 'media' },
  { clave: 'manufacturer', etiqueta: 'admin.catalog.fields.brand', respaldo: 'Fabricante', clase: 'texto', ancho: 'completa' },
  { clave: 'monthlySales', etiqueta: 'admin.catalog.col.sales', respaldo: 'Ventas', clase: 'entero', ancho: 'tercio' },
  { clave: 'rating', etiqueta: 'admin.create_product.field.rating', respaldo: 'Valoración (0-5)', clase: 'numero', ancho: 'tercio' },
  {
    clave: 'status',
    etiqueta: 'admin.catalog.col.status',
    respaldo: 'Estado',
    clase: 'seleccion',
    ancho: 'tercio',
    opciones: [
      { valor: 'DRAFT', etiqueta: 'admin.catalog.status.DRAFT', respaldo: 'Borrador' },
      { valor: 'ACTIVE', etiqueta: 'admin.catalog.status.ACTIVE', respaldo: 'Activo' },
    ],
  },
];

export const CAMPOS_DE_PROVEEDOR: readonly CampoDelAlta[] = [
  { clave: 'supplierName', etiqueta: 'admin.suppliers.col.name', respaldo: 'Nombre del proveedor', clase: 'texto', ancho: 'media' },
  { clave: 'supplierExternalId', etiqueta: 'admin.create_product.field.supplier_id', respaldo: 'ID del proveedor', clase: 'texto', ancho: 'media' },
];

export const CAMPOS_DE_MEDIOS: readonly CampoDelAlta[] = [
  { clave: 'imageUrls', etiqueta: 'admin.create_product.images', respaldo: 'URLs de imagen (una por línea)', clase: 'area', marcador: 'https://…', ancho: 'completa' },
  { clave: 'videoUrl', etiqueta: 'admin.catalog.fields.video_url', respaldo: 'URL del vídeo', clase: 'texto', marcador: 'https://…', ancho: 'media' },
  { clave: 'videoUrls', etiqueta: 'admin.create_product.field.extra_videos', respaldo: 'Vídeos extra (uno por línea)', clase: 'area', ancho: 'media' },
];

export const CAMPOS_DE_LOGISTICA: readonly CampoDelAlta[] = [
  { clave: 'weightGrams', etiqueta: 'admin.create_product.field.weight', respaldo: 'Peso unidad (g)', clase: 'entero', ancho: 'media' },
  { clave: 'packageWeightGrams', etiqueta: 'admin.create_product.field.package_weight', respaldo: 'Peso paquete (g)', clase: 'entero', ancho: 'media' },
  { clave: 'lengthMm', etiqueta: 'admin.create_product.field.length', respaldo: 'Largo (mm)', clase: 'entero', ancho: 'tercio' },
  { clave: 'widthMm', etiqueta: 'admin.create_product.field.width', respaldo: 'Ancho (mm)', clase: 'entero', ancho: 'tercio' },
  { clave: 'heightMm', etiqueta: 'admin.create_product.field.height', respaldo: 'Alto (mm)', clase: 'entero', ancho: 'tercio' },
  { clave: 'countryOfOrigin', etiqueta: 'admin.create_product.field.origin_country', respaldo: 'País de origen', clase: 'texto', marcador: 'CN', ancho: 'media' },
  { clave: 'hsCode', etiqueta: 'admin.create_product.field.hs_code', respaldo: 'Código HS (arancel)', clase: 'texto', ancho: 'media' },
  { clave: 'shipFrom', etiqueta: 'admin.create_product.field.ship_from', respaldo: 'Envío desde', clase: 'texto', marcador: 'Yiwu, Zhejiang', ancho: 'media' },
  { clave: 'leadTimeDays', etiqueta: 'admin.create_product.field.lead_time', respaldo: 'Plazo de entrega (días)', clase: 'entero', ancho: 'media' },
  { clave: 'certifications', etiqueta: 'admin.create_product.field.certifications', respaldo: 'Certificaciones (separadas por coma)', clase: 'texto', marcador: 'CE, RoHS', ancho: 'completa' },
];

export const CAMPOS_AVANZADOS: readonly CampoDelAlta[] = [
  { clave: 'ratingBreakdown', etiqueta: 'admin.create_product.field.rating_breakdown', respaldo: 'Desglose de estrellas (5:120, 4:30, …)', clase: 'texto', marcador: '5:120, 4:30, 3:5', ancho: 'completa' },
  { clave: 'salesRegions', etiqueta: 'admin.create_product.field.sales_regions', respaldo: 'Regiones de venta (separadas por coma)', clase: 'texto', marcador: 'EU, US, LATAM', ancho: 'completa' },
  { clave: 'dropshipShipped30d', etiqueta: 'admin.create_product.field.dropship_30d', respaldo: 'Envíos dropship 30 d', clase: 'entero', ancho: 'media' },
  { clave: 'dropshipPickupRate48h', etiqueta: 'admin.create_product.field.pickup_48h', respaldo: 'Tasa de recogida 48 h', clase: 'numero', ancho: 'media' },
];
