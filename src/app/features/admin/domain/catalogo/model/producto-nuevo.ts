import {
  BorradorDeAlta,
  EjeTecleado,
  ResenaTecleada,
  VarianteTecleada,
} from './alta-de-producto';
import {
  asignacionesPorLinea,
  conteosPorComas,
  enteroOpcional,
  numeroOpcional,
  paresPorComas,
  porComas,
  porLineas,
  traduccionesPorLinea,
} from './analisis-de-texto';

/**
 * El producto que se va a crear, ya con los tipos del negocio.
 *
 * <p>Es el resultado de interpretar lo tecleado, y la frontera donde acaba el texto y empiezan los
 * números. El adaptador lo traduce al vocabulario del backend; ningún componente debería construir ese
 * JSON a mano.
 */
export interface MedidasDelBulto {
  readonly pesoGramos?: number;
  readonly pesoDelPaqueteGramos?: number;
  readonly largoMm?: number;
  readonly anchoMm?: number;
  readonly altoMm?: number;
}

export interface EjeNuevo {
  readonly nombre: string;
  readonly valores: readonly string[];
  readonly imagenesPorValor?: Readonly<Record<string, string>>;
  readonly traduccionesPorValor?: Readonly<Record<string, Record<string, string>>>;
}

export interface VarianteNueva extends MedidasDelBulto {
  readonly sku?: string;
  readonly opciones?: Readonly<Record<string, string>>;
  readonly precio?: number;
  readonly existencias?: number;
  readonly urlImagen?: string;
}

export interface ResenaNueva {
  readonly autor?: string;
  readonly pais?: string;
  readonly estrellas: number;
  readonly titulo?: string;
  readonly cuerpo?: string;
  readonly idioma: string;
}

export interface ProductoNuevo extends MedidasDelBulto {
  readonly categoriaSlug?: string;
  readonly categoriaDeOrigenId?: string;
  readonly categoriaDeOrigenNombre?: string;
  readonly fabricante?: string;
  readonly proveedorNombre?: string;
  readonly proveedorIdExterno?: string;
  readonly precio?: number;
  readonly moq: number;
  readonly ventasMensuales?: number;
  readonly valoracion?: number;
  readonly estado?: string;
  readonly imagenes: readonly string[];
  readonly urlVideo?: string;
  readonly videosExtra: readonly string[];
  readonly paisDeOrigen?: string;
  readonly hs6?: string;
  readonly certificaciones: readonly string[];
  readonly envioDesde?: string;
  readonly plazoDeEntregaDias?: number;
  readonly regionesDeVenta: readonly string[];
  readonly desgloseDeEstrellas?: Readonly<Record<string, number>>;
  readonly enviosDropship30d?: number;
  readonly tasaDeRecogida48h?: number;
  readonly contenido: Readonly<Record<string, { titulo: string; descripcion?: string }>>;
  readonly tramos: readonly {
    cantidadMinima: number;
    cantidadMaxima?: number;
    precioUnitario?: number;
    divisa: string;
  }[];
  readonly ejes: readonly EjeNuevo[];
  readonly variantes: readonly VarianteNueva[];
  readonly atributos: readonly { clave: string; valor: string; idioma?: string }[];
  readonly especificaciones: readonly {
    idioma: string;
    clave: string;
    valor: string;
    posicion: number;
  }[];
  readonly resenas: readonly ResenaNueva[];
}

function medidas(fuente: VarianteTecleada): MedidasDelBulto {
  return {
    pesoGramos: enteroOpcional(fuente.pesoGramos),
    pesoDelPaqueteGramos: enteroOpcional(fuente.pesoDelPaqueteGramos),
    largoMm: enteroOpcional(fuente.largoMm),
    anchoMm: enteroOpcional(fuente.anchoMm),
    altoMm: enteroOpcional(fuente.altoMm),
  };
}

function aEje(tecleado: EjeTecleado): EjeNuevo {
  const imagenes = asignacionesPorLinea(tecleado.imagenesPorValor);
  const traducciones = traduccionesPorLinea(tecleado.traduccionesPorValor);
  return {
    nombre: tecleado.nombre.trim(),
    valores: porComas(tecleado.valores),
    imagenesPorValor: Object.keys(imagenes).length ? imagenes : undefined,
    traduccionesPorValor: Object.keys(traducciones).length ? traducciones : undefined,
  };
}

function aResena(tecleada: ResenaTecleada): ResenaNueva {
  return {
    autor: tecleada.autor.trim() || undefined,
    pais: tecleada.pais.trim() || undefined,
    estrellas: enteroOpcional(tecleada.estrellas) ?? 5,
    titulo: tecleada.titulo.trim() || undefined,
    cuerpo: tecleada.cuerpo.trim() || undefined,
    idioma: tecleada.idioma.trim() || 'es',
  };
}

/** Un campo tal cual se tecleó, sin espacios sobrantes. Ausente y vacío son lo mismo. */
function crudo(campos: Readonly<Record<string, string>>, clave: string): string {
  return (campos[clave] ?? '').trim();
}

/** Un campo de texto, o nada si está vacío: la cadena vacía no es un dato. */
function texto(campos: Readonly<Record<string, string>>, clave: string): string | undefined {
  return crudo(campos, clave) || undefined;
}

/** Los datos comerciales: qué es, de quién y a cuánto. */
function comercialesDe(campos: Readonly<Record<string, string>>) {
  return {
    categoriaSlug: texto(campos, 'categorySlug'),
    categoriaDeOrigenId: texto(campos, 'category1688Id'),
    categoriaDeOrigenNombre: texto(campos, 'category1688Name'),
    fabricante: texto(campos, 'manufacturer'),
    proveedorNombre: texto(campos, 'supplierName'),
    proveedorIdExterno: texto(campos, 'supplierExternalId'),
    precio: numeroOpcional(crudo(campos, 'price')),
    moq: enteroOpcional(crudo(campos, 'moq')) ?? 1,
    ventasMensuales: enteroOpcional(crudo(campos, 'monthlySales')),
    valoracion: numeroOpcional(crudo(campos, 'rating')),
    estado: texto(campos, 'status'),
  };
}

/** Lo que se enseña: fotos y vídeos. */
function mediosDe(campos: Readonly<Record<string, string>>) {
  return {
    imagenes: porLineas(crudo(campos, 'imageUrls')),
    urlVideo: texto(campos, 'videoUrl'),
    videosExtra: porLineas(crudo(campos, 'videoUrls')),
  };
}

/** Lo que decide cuánto cuesta enviarlo y qué se declara en aduana. */
function logisticaDe(campos: Readonly<Record<string, string>>) {
  return {
    pesoGramos: enteroOpcional(crudo(campos, 'weightGrams')),
    pesoDelPaqueteGramos: enteroOpcional(crudo(campos, 'packageWeightGrams')),
    largoMm: enteroOpcional(crudo(campos, 'lengthMm')),
    anchoMm: enteroOpcional(crudo(campos, 'widthMm')),
    altoMm: enteroOpcional(crudo(campos, 'heightMm')),
    paisDeOrigen: texto(campos, 'countryOfOrigin'),
    hs6: texto(campos, 'hsCode'),
    certificaciones: porComas(crudo(campos, 'certifications')),
    envioDesde: texto(campos, 'shipFrom'),
    plazoDeEntregaDias: enteroOpcional(crudo(campos, 'leadTimeDays')),
  };
}

/** Los datos de reputación y alcance, que son opcionales y reales: si no se ponen, no se inventan. */
function reputacionDe(campos: Readonly<Record<string, string>>) {
  const desglose = conteosPorComas(crudo(campos, 'ratingBreakdown'));
  return {
    regionesDeVenta: porComas(crudo(campos, 'salesRegions')),
    desgloseDeEstrellas: Object.keys(desglose).length ? desglose : undefined,
    enviosDropship30d: enteroOpcional(crudo(campos, 'dropshipShipped30d')),
    tasaDeRecogida48h: numeroOpcional(crudo(campos, 'dropshipPickupRate48h')),
  };
}

/** El contenido por idioma. Solo viajan los idiomas que de verdad tienen título. */
function contenidoDe(borrador: BorradorDeAlta) {
  const salida: Record<string, { titulo: string; descripcion?: string }> = {};
  for (const [codigo, texto] of Object.entries(borrador.contenido)) {
    const titulo = texto.titulo?.trim();
    if (titulo) {
      salida[codigo] = { titulo, descripcion: texto.descripcion?.trim() || undefined };
    }
  }
  return salida;
}

/**
 * Las seis listas. Las filas a medio rellenar se DESCARTAN en vez de mandarse vacías: quien añade una
 * fila de tramo y no la rellena no está pidiendo un tramo sin precio.
 */
function listasDe(borrador: BorradorDeAlta) {
  return {
    tramos: borrador.tramos
      .filter((tramo) => tramo.precioUnitario.trim())
      .map((tramo) => ({
        cantidadMinima: enteroOpcional(tramo.cantidadMinima) ?? 1,
        cantidadMaxima: enteroOpcional(tramo.cantidadMaxima),
        precioUnitario: numeroOpcional(tramo.precioUnitario),
        divisa: tramo.divisa.trim() || 'CNY',
      })),
    ejes: borrador.ejes.filter((eje) => eje.nombre.trim() && eje.valores.trim()).map(aEje),
    variantes: borrador.variantes
      .filter((variante) => variante.sku.trim() || variante.opciones.trim())
      .map((variante) => ({
        sku: variante.sku.trim() || undefined,
        opciones: variante.opciones.trim() ? paresPorComas(variante.opciones) : undefined,
        precio: numeroOpcional(variante.precio),
        existencias: enteroOpcional(variante.existencias),
        urlImagen: variante.urlImagen.trim() || undefined,
        ...medidas(variante),
      })),
    atributos: borrador.atributos
      .filter((atributo) => atributo.clave.trim() && atributo.valor.trim())
      .map((atributo) => ({
        clave: atributo.clave.trim(),
        valor: atributo.valor.trim(),
        idioma: atributo.idioma.trim() || undefined,
      })),
    especificaciones: borrador.especificaciones
      .filter((fila) => fila.clave.trim() && fila.valor.trim())
      .map((fila, indice) => ({
        idioma: fila.idioma.trim() || 'es',
        clave: fila.clave.trim(),
        valor: fila.valor.trim(),
        posicion: enteroOpcional(fila.posicion) ?? indice,
      })),
    resenas: borrador.resenas
      .filter((resena) => resena.cuerpo.trim() || resena.titulo.trim())
      .map(aResena),
  };
}

/**
 * Interpreta el borrador y devuelve el producto que se va a crear.
 *
 * <p>Es la frontera donde acaba el texto y empiezan los números. Va repartida en piezas por tema
 * —comercial, medios, logística, reputación, contenido y listas— porque con los cuarenta campos
 * seguidos no se lee ni se prueba por partes.
 */
export function aProductoNuevo(borrador: BorradorDeAlta): ProductoNuevo {
  const campos = borrador.campos;
  return {
    ...comercialesDe(campos),
    ...mediosDe(campos),
    ...logisticaDe(campos),
    ...reputacionDe(campos),
    contenido: contenidoDe(borrador),
    ...listasDe(borrador),
  };
}
