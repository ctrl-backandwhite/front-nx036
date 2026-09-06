import { ResumenDeProducto, VarianteDeProducto } from './producto';

/**
 * Los modelos pequeños del contexto: categorías, proveedores, reseñas, promociones y la báscula.
 * Van juntos porque ninguno llega a tener reglas propias suficientes para un fichero, y repartirlos en
 * cinco ficheros de doce líneas cada uno no aclara nada.
 */

export interface Categoria {
  readonly id: string;
  readonly slug: string;
  readonly nombre: string;
  readonly padre?: string | null;
  readonly posicion: number;
  readonly cuantosProductos: number;
  readonly hijas: readonly Categoria[];
}

export interface Proveedor {
  readonly id: string;
  readonly slug: string;
  readonly nombre: string;
  readonly pais?: string;
}

/**
 * Aplana el árbol de categorías.
 *
 * <p>El filtro ofrece SOLO las que tienen productos cargados —en este catálogo, las hojas—, pero el
 * rótulo de la categoría elegida puede ser cualquier nodo, así que se necesitan las dos listas.
 */
export function aplanaCategorias(arbol: readonly Categoria[]): readonly Categoria[] {
  const salida: Categoria[] = [];
  const recorre = (nodos: readonly Categoria[]): void => {
    for (const nodo of nodos) {
      salida.push(nodo);
      if (nodo.hijas.length > 0) {
        recorre(nodo.hijas);
      }
    }
  };
  recorre(arbol);
  return salida;
}

export function categoriasConProductos(categorias: readonly Categoria[]): readonly Categoria[] {
  return categorias.filter((categoria) => categoria.cuantosProductos > 0);
}

/** Una hilera de la portada. El código lo pone el backend y decide icono y rótulo. */
export interface SeccionDePortada {
  readonly codigo: string;
  readonly titulo: string;
  readonly items: readonly ResumenDeProducto[];
}

export interface Portada {
  readonly secciones: readonly SeccionDePortada[];
  readonly categoriasDestacadas: readonly Categoria[];
  readonly totalDeProductos: number;
}

export interface Resena {
  readonly id: string;
  readonly autor?: string;
  readonly valoracion: number;
  readonly titulo?: string;
  readonly cuerpo?: string;
  /** SUPPLIER = importada del catálogo del proveedor; CUSTOMER = escrita en esta plataforma. */
  readonly origen?: 'SUPPLIER' | 'CUSTOMER';
  readonly idioma?: string;
  readonly fecha?: string;
}

export interface ResumenDeResenas {
  readonly items: readonly Resena[];
  readonly total: number;
  readonly media: number;
  readonly reparto: Readonly<Record<string, number>>;
}

/** El reparto de estrellas en porcentaje, listo para pintar las barras. */
export function repartoEnPorcentaje(
  reparto: Readonly<Record<string, number>>,
): readonly { readonly estrellas: number; readonly porcentaje: number }[] {
  const total = Object.values(reparto).reduce((suma, n) => suma + Number(n), 0) || 1;
  return [5, 4, 3, 2, 1].map((estrellas) => ({
    estrellas,
    porcentaje: Math.round((Number(reparto[String(estrellas)] ?? 0) / total) * 100),
  }));
}

/** Los idiomas en los que hay reseñas escritas. Con uno solo no se ofrece filtro. */
export function idiomasDeLasResenas(items: readonly Resena[]): readonly string[] {
  return [...new Set(items.map((r) => r.idioma).filter((l): l is string => !!l))];
}

/**
 * Hay que decir de dónde vienen las reseñas importadas.
 *
 * <p>No es cortesía: presentarlas como si fueran de compradores de esta tienda es una práctica desleal
 * de la lista negra de la Directiva Ómnibus, sancionable sin necesidad de probar que engañó a nadie.
 */
export function hayResenasDelProveedor(items: readonly Resena[]): boolean {
  return items.some((resena) => resena.origen === 'SUPPLIER');
}

export interface PromocionViva {
  readonly id: string;
  readonly nombre: string;
  readonly porcentaje?: number;
  readonly terminaEl?: string;
  readonly productos: readonly ResumenDeProducto[];
}

/** Días que quedan de una rebaja, o `null` si ya pasó o no tiene fin anunciado. */
export function diasQueQuedan(terminaEl: string | undefined, ahora: number = Date.now()): number | null {
  if (!terminaEl) {
    return null;
  }
  const dias = Math.ceil((new Date(terminaEl).getTime() - ahora) / 86_400_000);
  return dias > 0 ? dias : null;
}

/** Un punto del histórico de precios. */
export interface PuntoDeHistorico {
  readonly fecha: string;
  readonly precio: number;
  readonly existencias: number;
}

/** El estimado de margen que solo ve el administrador. */
export interface EstimacionDeMargen {
  readonly coste: number;
  readonly precioSugerido: number;
  readonly envio: number;
  readonly comision: number;
  readonly beneficio: number;
  readonly margenPorcentaje: number;
  readonly divisa: string;
  readonly reglaAplicadaPorcentaje?: number;
  readonly tramoAplicadoDesde?: number;
}

/** Un margen por debajo de esto se avisa: se está vendiendo casi a coste. */
export const MARGEN_BAJO = 5;

/** Milímetros a centímetros para la báscula; un guión cuando el dato no está. */
export function enCentimetros(milimetros?: number): string {
  return milimetros != null && milimetros > 0
    ? (milimetros / 10).toLocaleString(undefined, { maximumFractionDigits: 1 })
    : '—';
}

/** El volumen se calcula, no viaja: es el producto de las tres medidas. */
export function volumenCm3(variante: VarianteDeProducto): string {
  if (!variante.largoMm || !variante.anchoMm || !variante.altoMm) {
    return '—';
  }
  return Math.round(
    (variante.largoMm * variante.anchoMm * variante.altoMm) / 1000,
  ).toLocaleString();
}

/** ¿Hay báscula que enseñar? Sin ningún dato la tabla entera sobra. */
export function hayBascula(variantes: readonly VarianteDeProducto[]): boolean {
  return variantes.some((v) => v.pesoGramos || v.largoMm || v.anchoMm || v.altoMm);
}
