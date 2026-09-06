/**
 * Los ejes de variación (Color, Talla) y sus valores.
 *
 * <p>El valor canónico es el CHINO (`valorZh`): es el que casa con el catálogo de origen y no se toca
 * nunca. `valor` es la etiqueta visible, que sí se corrige a mano cuando el origen trae nombres
 * ambiguos —«Blanco 2» y «Blanco 3» que en realidad son estampados distintos.
 */
export interface ValorDeVariacion {
  readonly id: string;
  readonly valorZh: string;
  readonly valor?: string;
  readonly urlImagen?: string;
  readonly urlImagenOrigen?: string;
  readonly posicion: number;
}

export interface EjeDeVariacion {
  readonly id: string;
  readonly nombreZh: string;
  readonly nombre?: string;
  readonly posicion: number;
  readonly valores: readonly ValorDeVariacion[];
}

/**
 * ¿Este eje es el del color?
 *
 * <p>Solo los ejes de color llevan foto por valor, así que de esto depende que se ofrezca el campo de
 * imagen. Se mira el nombre en los dos idiomas porque según de qué carga venga llega uno u otro.
 */
export function esEjeDeColor(eje: Pick<EjeDeVariacion, 'nombre' | 'nombreZh'>): boolean {
  return /color|colour|颜色/i.test(`${eje.nombre ?? ''} ${eje.nombreZh ?? ''}`);
}

/** Una etiqueta GUARDADA se distingue de un hueco: el hueco enseña el valor de origen como marcador. */
export function tieneEtiquetaGuardada(valor: Pick<ValorDeVariacion, 'valor'>): boolean {
  return (valor.valor ?? '').trim() !== '';
}

/** La dirección de la foto de un valor, venga del CDN o del origen. */
export function fotoDelValor(valor: ValorDeVariacion): string {
  return (valor.urlImagen || valor.urlImagenOrigen || '').trim();
}
