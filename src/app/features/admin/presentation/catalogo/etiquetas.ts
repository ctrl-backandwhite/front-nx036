import { estadoLegible } from '../../domain/catalogo/model/producto-admin';
import { FalloDeCategoria } from '../../domain/catalogo/model/categoria-admin';
import { FalloDeAlta } from '../../domain/catalogo/model/alta-de-producto';

/** Cómo se llama en el diccionario cada motivo de que un borrador de categoría no valga. */
const TEXTO_DEL_FALLO_DE_CATEGORIA: Readonly<Record<FalloDeCategoria, string>> = {
  slug_obligatorio: 'admin.categories.error.slug_required',
  slug_formato: 'admin.categories.error.slug_format',
  nombre_obligatorio: 'admin.categories.error.name_required',
};

/**
 * Y cada motivo de que un alta de producto no se pueda mandar todavía.
 *
 * <p>Los tres comparten texto porque el diccionario solo tiene esa entrada. PENDIENTE del equipo que
 * cuida `shared/i18n`: hacen falta `admin.create_product.error_category` y
 * `admin.create_product.error_price` en los ocho idiomas para poder decir cuál de los tres falta, que
 * es lo que hacía el frontal anterior. Con cuarenta campos repartidos en trece secciones plegadas, un
 * mensaje genérico deja buscando a ciegas.
 */
const TEXTO_DEL_FALLO_DE_ALTA: Readonly<Record<FalloDeAlta, string>> = {
  sin_categoria: 'admin.create_product.required',
  sin_titulo: 'admin.create_product.required',
  sin_precio: 'admin.create_product.required',
};

/**
 * El estado de un producto, en el idioma activo.
 *
 * <p>Cuando la clave no existe, `t()` devuelve la clave misma: eso delata la traducción que falta, pero
 * en pantalla queda peor que el propio estado escrito de forma legible, así que se cae a eso.
 */
export function etiquetaDeEstado(t: (clave: string) => string, estado: string): string {
  const clave = `admin.catalog.status.${estado}`;
  const texto = t(clave);
  return texto === clave ? estadoLegible(estado) : texto;
}

export function textoDelFalloDeCategoria(fallo: FalloDeCategoria): string {
  return TEXTO_DEL_FALLO_DE_CATEGORIA[fallo];
}

export function textoDelFalloDeAlta(fallo: FalloDeAlta): string {
  return TEXTO_DEL_FALLO_DE_ALTA[fallo];
}

/**
 * El mensaje de un fallo del backend, o el de repuesto.
 *
 * <p>Los textos de error los redacta el SERVIDOR —es la regla del proyecto— y aquí solo se pintan. El
 * repuesto es para cuando no viene ninguno, que pasa con los fallos de red.
 */
export function mensajeDeError(
  t: (clave: string) => string,
  error: { mensaje?: string },
  claveDeRepuesto = 'admin.catalog.actions.error',
): string {
  return error.mensaje || t(claveDeRepuesto);
}

/**
 * Un problema de validación de una fila, escrito para quien lo tiene que arreglar.
 *
 * <p>Lleva SIEMPRE el número de fila: en un fichero de diez mil, «falta el campo obligatorio» sin decir
 * dónde no sirve de nada.
 */
export function textoDelProblema(
  t: (clave: string) => string,
  tCon: (clave: string, valores: Readonly<Record<string, string | number>>) => string,
  problema: { fila: number; clave: string; campo?: string },
): string {
  const detalle = problema.campo ? tCon(problema.clave, { f: problema.campo }) : t(problema.clave);
  return problema.fila > 0
    ? `${tCon('admin.catalog.bulk.row', { n: problema.fila })}: ${detalle}`
    : detalle;
}

/**
 * La traducción de una clave, con un respaldo escrito.
 *
 * <p>`t()` devuelve la CLAVE cuando no hay traducción, que es deliberado —delata el hueco—, pero
 * enseñar `admin.create_product.section.pricing` en mitad de un formulario es peor que enseñar el
 * texto. Esta función es el puente: la clave manda, y el respaldo solo aparece mientras el diccionario
 * no la tenga. El frontal anterior hacía exactamente esto en la ficha de producto.
 *
 * <p>Es TRANSITORIA: en cuanto las claves estén en los ocho idiomas, se sustituye por `t()` a secas.
 */
export function conRespaldo(
  t: (clave: string) => string,
  clave: string,
  respaldo: string,
): string {
  const texto = t(clave);
  return texto === clave ? respaldo : texto;
}
