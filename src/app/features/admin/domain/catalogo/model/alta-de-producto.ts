/**
 * El alta manual de un producto con TODO lo que admite el catálogo: los mismos datos que la carga
 * masiva, pero rellenados a mano.
 *
 * <p>Todo se teclea como TEXTO porque sale de campos de formulario; la conversión a números y a listas
 * la hace `aProductoNuevo`, y solo ahí. Convertir sobre la marcha hacía que un campo a medio escribir
 * —«1,»— se convirtiera en `NaN` y viajara así al servidor.
 */

/**
 * La forma común de una fila tecleada: campos con nombre, todos de texto.
 *
 * <p>El índice está para que las seis clases de fila —tramos, ejes, variantes, atributos, ficha técnica
 * y reseñas— se puedan pintar y editar con el MISMO componente a partir de su definición. Sin él, cada
 * una necesitaría su propia plantilla y las seis se corregirían por separado.
 */
export type FilaTecleada = Readonly<Record<string, string>>;

export interface TramoTecleado extends FilaTecleada {
  readonly cantidadMinima: string;
  readonly cantidadMaxima: string;
  readonly precioUnitario: string;
  readonly divisa: string;
}

export interface EjeTecleado extends FilaTecleada {
  readonly nombre: string;
  readonly valores: string;
  readonly imagenesPorValor: string;
  readonly traduccionesPorValor: string;
}

export interface VarianteTecleada extends FilaTecleada {
  readonly sku: string;
  readonly opciones: string;
  readonly precio: string;
  readonly existencias: string;
  readonly urlImagen: string;
  readonly pesoGramos: string;
  readonly pesoDelPaqueteGramos: string;
  readonly largoMm: string;
  readonly anchoMm: string;
  readonly altoMm: string;
}

export interface AtributoTecleado extends FilaTecleada {
  readonly clave: string;
  readonly valor: string;
  readonly idioma: string;
}

export interface EspecificacionTecleada extends FilaTecleada {
  readonly idioma: string;
  readonly clave: string;
  readonly valor: string;
  readonly posicion: string;
}

export interface ResenaTecleada extends FilaTecleada {
  readonly autor: string;
  readonly pais: string;
  readonly estrellas: string;
  readonly titulo: string;
  readonly cuerpo: string;
  readonly idioma: string;
}

/** Título y descripción de un idioma. La lista de idiomas la administra el registro y es ilimitada. */
export interface ContenidoDeIdioma {
  readonly titulo: string;
  readonly descripcion: string;
}

/** Los campos escalares del alta. Van en un mapa porque son cuarenta y se pintan por secciones. */
export type CamposDeAlta = Readonly<Record<string, string>>;

export const CAMPOS_DE_ALTA_VACIOS: CamposDeAlta = {
  categorySlug: '', category1688Id: '', category1688Name: '',
  manufacturer: '', supplierName: '', supplierExternalId: '',
  price: '', moq: '1', monthlySales: '', rating: '', status: 'DRAFT',
  imageUrls: '', videoUrl: '', videoUrls: '',
  weightGrams: '', packageWeightGrams: '', lengthMm: '', widthMm: '', heightMm: '',
  countryOfOrigin: '', hsCode: '', certifications: '', shipFrom: '', leadTimeDays: '',
  salesRegions: '', ratingBreakdown: '', dropshipShipped30d: '', dropshipPickupRate48h: '',
};

export interface BorradorDeAlta {
  readonly campos: CamposDeAlta;
  readonly contenido: Readonly<Record<string, ContenidoDeIdioma>>;
  readonly tramos: readonly TramoTecleado[];
  readonly ejes: readonly EjeTecleado[];
  readonly variantes: readonly VarianteTecleada[];
  readonly atributos: readonly AtributoTecleado[];
  readonly especificaciones: readonly EspecificacionTecleada[];
  readonly resenas: readonly ResenaTecleada[];
}

export const BORRADOR_DE_ALTA_VACIO: BorradorDeAlta = {
  campos: CAMPOS_DE_ALTA_VACIOS,
  contenido: {},
  tramos: [],
  ejes: [],
  variantes: [],
  atributos: [],
  especificaciones: [],
  resenas: [],
};

export const TRAMO_TECLEADO_VACIO: TramoTecleado = {
  cantidadMinima: '',
  cantidadMaxima: '',
  precioUnitario: '',
  divisa: 'CNY',
};

export const EJE_TECLEADO_VACIO: EjeTecleado = {
  nombre: '',
  valores: '',
  imagenesPorValor: '',
  traduccionesPorValor: '',
};

export const VARIANTE_TECLEADA_VACIA: VarianteTecleada = {
  sku: '', opciones: '', precio: '', existencias: '', urlImagen: '',
  pesoGramos: '', pesoDelPaqueteGramos: '', largoMm: '', anchoMm: '', altoMm: '',
};

export const RESENA_TECLEADA_VACIA: ResenaTecleada = {
  autor: '', pais: '', estrellas: '5', titulo: '', cuerpo: '', idioma: 'es',
};

/** Por qué no se puede dar de alta todavía. Quien pinta decide con qué texto se dice. */
export type FalloDeAlta = 'sin_categoria' | 'sin_titulo' | 'sin_precio';

/**
 * Lo mínimo para que un producto exista.
 *
 * <p>La CATEGORÍA puede venir por slug o por la de origen, que el backend mapea. El TÍTULO vale en
 * cualquier idioma —el backend rellena los canónicos desde el mapa—. Y el PRECIO puede estar en el
 * campo o en un tramo: un producto sin precio no se puede vender, y dejarlo entrar significaba
 * descubrirlo al primer pedido.
 */
export function validaAlta(borrador: BorradorDeAlta): FalloDeAlta | undefined {
  const campos = borrador.campos;
  const sinCategoria =
    !campos['categorySlug'] &&
    !campos['category1688Id']?.trim() &&
    !campos['category1688Name']?.trim();
  if (sinCategoria) {
    return 'sin_categoria';
  }
  if (!Object.values(borrador.contenido).some((c) => c.titulo.trim())) {
    return 'sin_titulo';
  }
  const sinPrecio =
    !campos['price']?.trim() && borrador.tramos.every((t) => !t.precioUnitario.trim());
  return sinPrecio ? 'sin_precio' : undefined;
}
