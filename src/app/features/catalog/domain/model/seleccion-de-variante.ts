import { translateVariantCN } from '@shared/i18n/color-terms';
import {
  EjeDeVariante,
  FichaDeProducto,
  TramoDePrecio,
  ValorDeEje,
  VarianteDeProducto,
} from './producto';

/**
 * Las reglas de «qué se lleva el comprador»: qué eje es el color, qué eje es la talla, qué variante
 * corresponde a lo elegido, qué precio manda y cuántas unidades faltan para el lote mínimo.
 *
 * <p>Todo esto vivía dentro de la pantalla de 2.137 líneas del front anterior. Son decisiones de
 * NEGOCIO —cada una costó una incidencia— y se prueban aquí, sin montar un componente.
 */

/** Cómo se reconoce el eje de talla, en los idiomas en los que llega del proveedor. */
const ES_TALLA = /size|talla|尺码|尺寸/i;
/** Cómo se reconoce el eje de color. */
const ES_COLOR = /color|colour|颜色/i;

export function ejeDeTalla(ejes: readonly EjeDeVariante[]): EjeDeVariante | undefined {
  return ejes.find((eje) => ES_TALLA.test(eje.nombre ?? eje.nombreZh ?? ''));
}

/**
 * El eje principal.
 *
 * <p>Es el de color; si el producto no tiene uno reconocible —«Modelo», «Enchufe», «Especificaciones»…—
 * se toma el primero que no sea la talla, para que igualmente haya selector y se vea el stock de lo
 * elegido. Sin esto, esos productos se quedaban sin ningún selector.
 */
export function ejePrincipal(ejes: readonly EjeDeVariante[]): EjeDeVariante | undefined {
  const talla = ejeDeTalla(ejes);
  return (
    ejes.find((eje) => ES_COLOR.test(eje.nombre ?? eje.nombreZh ?? '')) ??
    ejes.find((eje) => eje !== talla)
  );
}

/**
 * La etiqueta visible de un valor, y a la vez la CLAVE con la que casa con `variante.opciones`.
 *
 * <p>Desde el 25-ago-2026 el backend traduce también las opciones de la variante, así que casar por el
 * valor crudo o por el chino dejaba de encontrar SIEMPRE la variante y todas las tallas salían «sin
 * stock» aunque el proveedor tuviera existencias de sobra. La clave y el rótulo tienen que ser el mismo
 * texto, y por eso hay una sola función.
 */
export function etiquetaDeValor(valor: ValorDeEje, idioma: string): string {
  if (valor.valorLocalizado && valor.valorLocalizado.trim() !== '') {
    return valor.valorLocalizado;
  }
  if (valor.valor && valor.valor.trim() !== '') {
    return valor.valor;
  }
  return translateVariantCN(valor.valorZh, idioma);
}

/** La variante activa que casa con el color y la talla elegidos. */
export function varianteQueCasa(
  variantes: readonly VarianteDeProducto[],
  color: string | null,
  talla?: string,
): VarianteDeProducto | undefined {
  return variantes.find((variante) => {
    const valores = Object.values(variante.opciones ?? {});
    const casaColor = !color || valores.includes(color);
    const casaTalla = !talla || valores.includes(talla);
    return variante.activa && casaColor && casaTalla;
  });
}

/** Existencias de una talla dentro del color que se está mirando. El stock es por color Y talla. */
export function existenciasDe(
  variantes: readonly VarianteDeProducto[],
  color: string | null,
  talla: string,
): number {
  return varianteQueCasa(variantes, color, talla)?.existencias ?? 0;
}

/**
 * El tramo de precio aplicable a la cantidad total.
 *
 * <p>Se toma el mayor de los que la cantidad alcanza: los tramos son escalones «a partir de N».
 */
export function tramoAplicable(
  tramos: readonly TramoDePrecio[],
  cantidad: number,
): TramoDePrecio | null {
  const alcanzados = [...tramos]
    .sort((a, b) => a.cantidadMinima - b.cantidadMinima)
    .filter((tramo) => cantidad >= tramo.cantidadMinima);
  return alcanzados.at(-1) ?? null;
}

/** El precio destacado y su divisa, siempre emparejados. */
export interface PrecioDestacado {
  readonly importe: number | null;
  readonly divisa: string;
  readonly formateado?: string;
  readonly anteriorFormateado?: string;
  readonly descuentoPorcentaje?: number;
}

/**
 * Qué precio manda en la ficha.
 *
 * <p>El orden no es caprichoso: manda el de la VARIANTE elegida, porque es lo que el pedido va a
 * cobrar; los tramos son una pista por cantidad, no el cargo por unidad. Solo mientras no hay variante
 * elegida se cae al tramo y, después, al precio publicado. Si no hay ninguno de los tres se devuelve
 * `null` y se pinta un guión: componer un importe en el navegador sería inventárselo — el coste del
 * proveedor ya no viaja fuera del panel.
 *
 * <p>El importe y la CADENA siguen el mismo orden para que nunca se desparejen: cambiar de divisa deja
 * la ficha en pantalla con los importes de la anterior, y reconvertirlos aquí enseñaría un número que
 * el pedido no cobra.
 */
export function precioDestacado(
  ficha: FichaDeProducto,
  variante: VarianteDeProducto | undefined,
  tramo: TramoDePrecio | null,
): PrecioDestacado {
  const divisaDelProducto = ficha.precio.divisa ?? 'CNY';
  if (variante?.precio != null) {
    return {
      importe: Number(variante.precio),
      divisa: divisaDelProducto,
      formateado: variante.precioFormateado,
      anteriorFormateado: variante.anteriorFormateado,
      descuentoPorcentaje: variante.descuentoPorcentaje,
    };
  }
  if (tramo) {
    return {
      importe: tramo.precioUnitario,
      divisa: tramo.divisa,
      formateado: tramo.precioUnitarioFormateado,
      anteriorFormateado: ficha.precio.anteriorFormateado,
      descuentoPorcentaje: ficha.precio.descuentoPorcentaje,
    };
  }
  return {
    importe: ficha.precio.importe ?? null,
    divisa: divisaDelProducto,
    formateado: ficha.precio.formateado,
    anteriorFormateado: ficha.precio.anteriorFormateado,
    descuentoPorcentaje: ficha.precio.descuentoPorcentaje,
  };
}

/**
 * Cuántas unidades faltan para llegar al pedido mínimo.
 *
 * <p>El mínimo es del PRODUCTO, no de cada variante: en 1688 el lote se compone mezclando —dos colores,
 * o dos tallas— y el mínimo se cumple sumando. Exigirlo por tanda obligaba a llevarse el lote entero de
 * un mismo color, que es más de lo que pide el proveedor.
 */
export function unidadesQueFaltan(
  moq: number,
  yaEnLaCesta: number,
  seleccionadas: number,
): number {
  if (moq <= 1) {
    return 0;
  }
  return Math.max(0, moq - yaEnLaCesta - seleccionadas);
}

/** El mínimo del selector: lo que falta para el lote, no el lote entero si ya hay unidades dentro. */
export function minimoDelSelector(moq: number, yaEnLaCesta: number): number {
  return moq > 1 ? Math.max(1, moq - yaEnLaCesta) : 1;
}

/** Por qué no se puede añadir todavía. `null` = se puede. */
export type ImpedimentoParaAnadir =
  | 'falta-elegir-variante'
  | 'variante-sin-existencias'
  | 'falta-elegir-talla'
  | 'pedido-minimo'
  | null;

export interface EstadoDeSeleccion {
  readonly exigeColor: boolean;
  readonly colorElegido: string | null;
  readonly tieneEjeDeTalla: boolean;
  readonly unidadesPorTalla: number;
  readonly varianteElegida?: VarianteDeProducto;
  readonly unidadesQueFaltan: number;
}

/**
 * La única puerta por la que se decide si el producto entra en la cesta.
 *
 * <p>Está aquí y no en el botón porque las tres pantallas que añaden —tarjeta, vista rápida y ficha—
 * tienen que decidirlo igual. Cuando cada una lo resolvía a su manera, una añadía variantes agotadas.
 */
export function impedimentoParaAnadir(estado: EstadoDeSeleccion): ImpedimentoParaAnadir {
  if (estado.exigeColor && !estado.colorElegido) {
    return 'falta-elegir-variante';
  }
  if (
    !estado.tieneEjeDeTalla &&
    estado.varianteElegida &&
    estado.varianteElegida.existencias <= 0
  ) {
    return 'variante-sin-existencias';
  }
  if (estado.tieneEjeDeTalla && estado.unidadesPorTalla === 0) {
    return 'falta-elegir-talla';
  }
  if (estado.unidadesQueFaltan > 0) {
    return 'pedido-minimo';
  }
  return null;
}

/**
 * Reajusta las unidades pedidas por talla al cambiar de color.
 *
 * <p>El stock es por color Y talla: una talla que el color nuevo no sirve se queda a cero. Sin esto, la
 * casilla de una talla agotada seguía enseñando el número del color anterior —bloqueada, pero con él
 * dentro— y «añadir» metía unidades de una talla marcada «sin stock».
 */
export function reajustaAlCambiarDeColor(
  unidades: Readonly<Record<string, number>>,
  variantes: readonly VarianteDeProducto[],
  colorNuevo: string,
): Record<string, number> {
  const ajustado: Record<string, number> = {};
  for (const [talla, cantidad] of Object.entries(unidades)) {
    const permitido = Math.max(0, Math.min(existenciasDe(variantes, colorNuevo, talla), cantidad));
    if (permitido > 0) {
      ajustado[talla] = permitido;
    }
  }
  return ajustado;
}

/** La etiqueta que identifica la variante en la cesta: «Rojo / XL». */
export function etiquetaDeVariante(variante: VarianteDeProducto | undefined): string | undefined {
  if (!variante) {
    return undefined;
  }
  return Object.values(variante.opciones ?? {}).filter(Boolean).join(' / ') || undefined;
}

/** La primera variante activa CON existencias: la que se añade desde la tarjeta y la vista rápida. */
export function primeraDisponible(
  variantes: readonly VarianteDeProducto[],
): VarianteDeProducto | undefined {
  return variantes.find((variante) => variante.activa && variante.existencias > 0);
}
