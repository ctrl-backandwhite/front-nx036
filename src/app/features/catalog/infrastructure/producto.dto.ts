import {
  ArancelDelProducto,
  CumplimientoDeProducto,
  DesgloseDePrecio,
  EjeDeVariante,
  Especificacion,
  FichaDeProducto,
  ImagenDeProducto,
  PaginaDeProductos,
  PrecioParaMostrar,
  ResumenDeProducto,
  TramoDePrecio,
  VarianteDeProducto,
} from '../domain/model/producto';
import { Categoria, Portada, Proveedor } from '../domain/model/catalogo-auxiliar';

/**
 * La forma en que habla el BACKEND, y la traducción a la del dominio.
 *
 * <p>Vive solo en infraestructura. Mientras exista, el día que el servidor renombre `displayFormatted`
 * se cambia una línea aquí y no ciento y pico plantillas.
 */

export interface ResumenDto {
  id: string;
  slug: string;
  title: string;
  mainImage?: string;
  categoryId?: string;
  rating?: number;
  monthlySales?: number;
  trendScore?: number;
  status?: string;
  displayPrice?: number;
  displayCurrency?: string;
  displayFormatted?: string;
  originalFormatted?: string;
  discountPercent?: number;
  promotionName?: string;
  verified?: boolean;
  availableUnits?: number;
  extraDutyCents?: number | null;
  dutyCovered?: boolean;
  shippingCovered?: boolean;
  extraDutyFormatted?: string;
  dutyGroupId?: string;
  tags?: string[];
  supplierName?: string;
  shipFrom?: string;
}

export interface PaginaDto<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface FichaDto extends ResumenDto {
  source: string;
  externalId: string;
  sourceUrl?: string;
  videoUrl?: string;
  sku?: string;
  description?: string;
  brand?: string;
  moq?: number;
  reviewCount?: number;
  baseFormatted?: string;
  ivaFormatted?: string;
  shippingFormatted?: string;
  surchargeCny?: number | null;
  surchargeFormatted?: string;
  shippingUserCny?: number | null;
  dutyUserCny?: number | null;
  shippingUserFormatted?: string;
  dutyUserFormatted?: string;
  compliance?: {
    manufacturerName?: string;
    manufacturerAddress?: string;
    manufacturerEmail?: string;
    safetyWarnings?: string[];
    responsiblePerson?: {
      name: string;
      addressLine: string;
      postalCode?: string;
      city: string;
      country: string;
      email: string;
      roleLabel?: string;
    };
  };
  attributes?: Record<string, string>;
  specifications?: { key: string; value: string; position?: number }[];
  images?: { id: string; sourceUrl: string; cdnUrl?: string; position: number; role: string }[];
  variants?: {
    id: string;
    sku?: string;
    price?: number;
    priceFormatted?: string;
    stock?: number;
    imageUrl?: string;
    options?: Record<string, string>;
    active?: boolean;
    weightGrams?: number;
    lengthMm?: number;
    widthMm?: number;
    heightMm?: number;
    originalFormatted?: string;
    discountPercent?: number;
  }[];
  variantOptions?: {
    id: string;
    nameZh: string;
    name?: string;
    position: number;
    values: {
      id: string;
      valueZh: string;
      value?: string;
      valueLocalized?: string;
      imageUrl?: string;
      position: number;
    }[];
  }[];
  priceTiers?: {
    minQty: number;
    maxQty?: number;
    unitPrice: number;
    currency: string;
    unitPriceFormatted?: string;
  }[];
}

export interface CategoriaDto {
  id: string;
  slug: string;
  name: string;
  parentId?: string | null;
  position?: number;
  directProductCount?: number;
  children?: CategoriaDto[];
}

function aPrecio(dto: ResumenDto): PrecioParaMostrar {
  return {
    formateado: dto.displayFormatted,
    anteriorFormateado: dto.originalFormatted,
    descuentoPorcentaje: dto.discountPercent,
    promocion: dto.promotionName,
    importe: dto.displayPrice,
    divisa: dto.displayCurrency,
  };
}

function aArancel(dto: ResumenDto): ArancelDelProducto {
  return {
    // `undefined` y `null` significan lo mismo aquí —no hay nada que prometer—, y unificarlos evita
    // que la plantilla tenga que comprobar los dos.
    centimosExtra: dto.extraDutyCents ?? null,
    formateado: dto.extraDutyFormatted,
    cubierto: !!dto.dutyCovered,
    grupo: dto.dutyGroupId,
  };
}

export function aResumen(dto: ResumenDto): ResumenDeProducto {
  return {
    id: dto.id,
    slug: dto.slug,
    titulo: dto.title,
    imagenPrincipal: dto.mainImage,
    valoracion: dto.rating,
    ventasMensuales: Number(dto.monthlySales ?? 0),
    tendencia: dto.trendScore,
    estado: dto.status ?? '',
    precio: aPrecio(dto),
    arancel: aArancel(dto),
    envioCubierto: !!dto.shippingCovered,
    verificado: dto.verified,
    unidadesDisponibles: dto.availableUnits ?? undefined,
    etiquetas: dto.tags ?? [],
    proveedor: dto.supplierName,
    enviaDesde: dto.shipFrom,
  };
}

export function aPagina(dto: PaginaDto<ResumenDto>): PaginaDeProductos {
  return {
    items: (dto.items ?? []).map(aResumen),
    pagina: dto.page ?? 0,
    tamano: dto.size ?? 0,
    total: dto.totalElements ?? 0,
    totalDePaginas: dto.totalPages ?? 0,
  };
}

/**
 * La dirección efectiva de una imagen: la del CDN si existe y la de origen si no.
 *
 * <p>Se resuelve AQUÍ y no en la plantilla para que ninguna pantalla tenga que acordarse del orden. Se
 * hizo mal una vez y se sirvieron las fotos sin comprimir del proveedor.
 */
function direccionDeImagen(imagen: { cdnUrl?: string; sourceUrl: string }): string {
  return imagen.cdnUrl || imagen.sourceUrl;
}

function aImagenes(dto: FichaDto): readonly ImagenDeProducto[] {
  return (dto.images ?? []).map((imagen) => ({
    id: imagen.id,
    direccion: direccionDeImagen(imagen),
    posicion: imagen.position,
    papel: imagen.role,
  }));
}

function aVariantes(dto: FichaDto): readonly VarianteDeProducto[] {
  return (dto.variants ?? []).map((variante) => ({
    id: variante.id,
    sku: variante.sku,
    precio: variante.price,
    precioFormateado: variante.priceFormatted,
    existencias: Number(variante.stock ?? 0),
    imagen: variante.imageUrl,
    opciones: variante.options ?? {},
    activa: variante.active !== false,
    pesoGramos: variante.weightGrams,
    largoMm: variante.lengthMm,
    anchoMm: variante.widthMm,
    altoMm: variante.heightMm,
    anteriorFormateado: variante.originalFormatted,
    descuentoPorcentaje: variante.discountPercent,
  }));
}

function aEjes(dto: FichaDto): readonly EjeDeVariante[] {
  return (dto.variantOptions ?? []).map((eje) => ({
    id: eje.id,
    nombreZh: eje.nameZh,
    nombre: eje.name,
    posicion: eje.position,
    valores: (eje.values ?? []).map((valor) => ({
      id: valor.id,
      valorZh: valor.valueZh,
      valor: valor.value,
      valorLocalizado: valor.valueLocalized,
      imagen: valor.imageUrl,
      posicion: valor.position,
    })),
  }));
}

function aTramos(dto: FichaDto): readonly TramoDePrecio[] {
  return (dto.priceTiers ?? []).map((tramo) => ({
    cantidadMinima: tramo.minQty,
    cantidadMaxima: tramo.maxQty,
    precioUnitario: tramo.unitPrice,
    divisa: tramo.currency,
    precioUnitarioFormateado: tramo.unitPriceFormatted,
  }));
}

function aCumplimiento(dto: FichaDto): CumplimientoDeProducto | undefined {
  const bloque = dto.compliance;
  if (!bloque) {
    return undefined;
  }
  const operador = bloque.responsiblePerson;
  return {
    fabricante: bloque.manufacturerName,
    direccionDelFabricante: bloque.manufacturerAddress,
    emailDelFabricante: bloque.manufacturerEmail,
    advertencias: bloque.safetyWarnings ?? [],
    operadorEuropeo: operador
      ? {
          nombre: operador.name,
          direccion: operador.addressLine,
          codigoPostal: operador.postalCode,
          ciudad: operador.city,
          pais: operador.country,
          email: operador.email,
          papel: operador.roleLabel ?? '',
        }
      : undefined,
  };
}

/**
 * El desglose SOLO existe cuando el backend lo manda, y solo lo manda al administrador. Devolverlo
 * vacío haría que la ficha pintara una caja de conceptos en blanco a quien compra.
 */
function aDesglose(dto: FichaDto): DesgloseDePrecio | undefined {
  const hayAlgo =
    dto.baseFormatted ||
    dto.ivaFormatted ||
    dto.shippingFormatted ||
    dto.surchargeFormatted ||
    dto.shippingUserFormatted ||
    dto.dutyUserFormatted;
  if (!hayAlgo) {
    return undefined;
  }
  return {
    baseFormateado: dto.baseFormatted,
    ivaFormateado: dto.ivaFormatted,
    envioFormateado: dto.shippingFormatted,
    recargoFormateado: dto.surchargeFormatted,
    recargoCny: dto.surchargeCny,
    subsidioDeEnvioFormateado: dto.shippingUserFormatted,
    subsidioDeEnvioCny: dto.shippingUserCny,
    subsidioDeArancelFormateado: dto.dutyUserFormatted,
    subsidioDeArancelCny: dto.dutyUserCny,
  };
}

export function aEspecificaciones(
  lista: readonly { key: string; value: string; position?: number }[],
): readonly Especificacion[] {
  return lista.map((e) => ({ clave: e.key, valor: e.value, posicion: e.position }));
}

export function aFicha(dto: FichaDto): FichaDeProducto {
  return {
    ...aResumen(dto),
    categoriaId: dto.categoryId,
    origen: dto.source,
    idExterno: dto.externalId,
    urlDeOrigen: dto.sourceUrl,
    urlDeVideo: dto.videoUrl,
    sku: dto.sku,
    descripcion: dto.description,
    marca: dto.brand,
    moq: Number(dto.moq ?? 1),
    numeroDeResenas: Number(dto.reviewCount ?? 0),
    imagenes: aImagenes(dto),
    variantes: aVariantes(dto),
    ejesDeVariante: aEjes(dto),
    tramosDePrecio: aTramos(dto),
    especificaciones: aEspecificaciones(dto.specifications ?? []),
    atributos: dto.attributes ?? {},
    cumplimiento: aCumplimiento(dto),
    desglose: aDesglose(dto),
  };
}

export function aCategoria(dto: CategoriaDto): Categoria {
  return {
    id: dto.id,
    slug: dto.slug,
    nombre: dto.name,
    padre: dto.parentId,
    posicion: dto.position ?? 0,
    cuantosProductos: dto.directProductCount ?? 0,
    hijas: (dto.children ?? []).map(aCategoria),
  };
}

export function aProveedor(dto: {
  id: string;
  slug: string;
  name: string;
  country?: string;
}): Proveedor {
  return { id: dto.id, slug: dto.slug, nombre: dto.name, pais: dto.country };
}

export function aPortada(dto: {
  sections?: { code: string; title: string; items?: ResumenDto[] }[];
  hotCategories?: CategoriaDto[];
  totalProducts?: number;
}): Portada {
  return {
    secciones: (dto.sections ?? []).map((seccion) => ({
      codigo: seccion.code,
      titulo: seccion.title,
      items: (seccion.items ?? []).map(aResumen),
    })),
    categoriasDestacadas: (dto.hotCategories ?? []).map(aCategoria),
    totalDeProductos: dto.totalProducts ?? 0,
  };
}
