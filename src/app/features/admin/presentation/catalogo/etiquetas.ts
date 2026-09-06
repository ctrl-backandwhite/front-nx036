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

/**
 * Un error de validación de Signal Forms, con lo poco que aquí hace falta de él.
 *
 * <p>Se declara suelto en vez de importar `ValidationError` para que este fichero no dependa de
 * `@angular/forms`: es una tabla de textos, y una tabla de textos no tiene por qué saber de formularios.
 * La forma es la del contrato público (`kind` más `message`), y los límites —`min`, `minLength`…— llegan
 * como opcionales porque cada motivo trae el suyo.
 */
export interface ErrorDeCampo {
  readonly kind: string;
  readonly message?: string;
  readonly min?: number | Date;
  readonly max?: number | Date;
  readonly minLength?: number;
  readonly maxLength?: number;
}

/** Lo que se necesita saber de un campo para decidir si hay que avisar y de qué. */
export interface EstadoDeCampo {
  touched(): boolean;
  errors(): readonly ErrorDeCampo[];
}

/**
 * Cómo se llama en el diccionario cada motivo por el que un campo no vale, y qué se enseña mientras esa
 * clave no exista en los ocho idiomas.
 *
 * <p>Solo `required` tiene hoy entrada propia (`dialog.field.required`). PENDIENTE del equipo que cuida
 * `shared/i18n`: hacen falta `admin.catalog.error.min`, `.max`, `.min_length`, `.max_length`, `.email` y
 * `.pattern`. Hasta entonces manda el respaldo escrito, que es exactamente lo que ya hace `conRespaldo`
 * con los rótulos del alta.
 */
const MOTIVOS_DE_ERROR: Readonly<
  Record<string, { readonly clave: string; readonly respaldo: (error: ErrorDeCampo) => string }>
> = {
  required: { clave: 'dialog.field.required', respaldo: () => 'Este campo es obligatorio.' },
  email: {
    clave: 'admin.catalog.error.email',
    respaldo: () => 'Ese correo no tiene forma de correo.',
  },
  min: { clave: 'admin.catalog.error.min', respaldo: (e) => `El valor mínimo es ${String(e.min)}.` },
  max: { clave: 'admin.catalog.error.max', respaldo: (e) => `El valor máximo es ${String(e.max)}.` },
  minLength: {
    clave: 'admin.catalog.error.min_length',
    respaldo: (e) => `Escribe al menos ${e.minLength} caracteres.`,
  },
  maxLength: {
    clave: 'admin.catalog.error.max_length',
    respaldo: (e) => `No caben más de ${e.maxLength} caracteres.`,
  },
  pattern: { clave: 'admin.catalog.error.pattern', respaldo: () => 'Ese formato no vale.' },
  parse: { clave: 'admin.catalog.error.pattern', respaldo: () => 'Ese formato no vale.' },
};

/**
 * El texto de un error de validación de un campo.
 *
 * <p>Cuando el validador trae su propia clave en `message` gana esa, porque dice exactamente qué pasa en
 * ESE campo —«los slugs usan minúsculas, dígitos y guiones»— y eso ayuda más que un «formato no válido»
 * genérico. Si no la trae, se cae a la tabla del motivo.
 */
export function textoDelErrorDeCampo(t: (clave: string) => string, error: ErrorDeCampo): string {
  if (error.message) {
    return t(error.message);
  }
  const motivo = MOTIVOS_DE_ERROR[error.kind];
  return motivo ? conRespaldo(t, motivo.clave, motivo.respaldo(error)) : t('common.error');
}

/**
 * El aviso que va debajo de un campo: el texto del PRIMER error, y solo si ya se ha tocado.
 *
 * <p>Solo el primero porque apilar tres avisos mueve el resto del formulario a cada tecla y no se lee
 * ninguno. Y solo si se ha tocado porque un formulario que nace gritando «obligatorio» en todos los
 * campos no informa de nada: el botón apagado ya dice que falta algo, y el aviso dice el qué cuando se
 * llega a ese campo.
 *
 * <p>Devuelve la cadena vacía cuando no hay nada que decir, que es falsa: en la plantilla basta con
 * `@if (fallo(...); as texto)`.
 */
export function falloDelCampo(t: (clave: string) => string, estado: EstadoDeCampo): string {
  return estado.touched() && estado.errors().length > 0
    ? textoDelErrorDeCampo(t, estado.errors()[0])
    : '';
}
