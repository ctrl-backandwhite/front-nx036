import { EjeDeVariacion } from './eje-de-variacion';
import { ImagenDeProducto } from './imagen-de-producto';
import { VarianteDeProducto } from './variante-de-producto';

/**
 * La ficha completa de un producto en el panel.
 *
 * <p>Aquí conviven dos clases de importe y NO se pueden mezclar: los CRUDOS en yuanes —coste, recargo y
 * las dos bolsas de subvención—, que son los que se editan, y los ya FORMATEADOS por el backend, que
 * son los que se enseñan. El front no convierte ni suma: el precio de venta lo calcula el servidor.
 */
export interface TramoDePrecio {
  readonly cantidadMinima: number;
  readonly cantidadMaxima?: number | null;
  readonly precioUnitario: number;
  readonly divisa: string;
}

/** El fabricante, que el Reglamento (UE) 2023/988 obliga a publicar y que 1688 no entrega. */
export interface FabricanteDelProducto {
  readonly nombre?: string;
  readonly direccion?: string;
  readonly correo?: string;
  readonly completo: boolean;
}

/** Los tres importes en yuanes que se editan a mano, por su nombre de negocio. */
export type ImporteEnYuanes = 'recargo' | 'subvencionDeEnvio' | 'subvencionDeArancel';

export const IMPORTES_EN_YUANES: readonly ImporteEnYuanes[] = [
  'recargo',
  'subvencionDeEnvio',
  'subvencionDeArancel',
];

export interface FichaDeProducto {
  readonly id: string;
  readonly slug: string;
  readonly titulo: string;
  readonly tituloZh: string;
  readonly origen: string;
  readonly idExterno: string;
  readonly estado: string;
  readonly moq: number;
  readonly marca?: string;
  readonly categoriaId?: string;
  /** COSTE de origen. Lo que paga el cliente es `precioDeVentaFormateado`. */
  readonly coste?: number;
  readonly divisa: string;
  readonly precioDeVenta?: number;
  readonly divisaDeVenta?: string;
  readonly ventasMensuales: number;
  readonly tendencia?: number;
  readonly descripcion?: string;
  readonly descripcionHtml?: string;
  readonly metaTitulo?: string;
  readonly metaDescripcion?: string;
  readonly urlVideo?: string;
  /** Importes crudos en yuanes, indexados por su nombre de negocio. Los edita el administrador. */
  readonly yuanes: Readonly<Partial<Record<ImporteEnYuanes, number | null>>>;
  /** Los mismos, ya convertidos y formateados por el backend. Es lo que se PINTA. */
  readonly yuanesFormateados: Readonly<Partial<Record<ImporteEnYuanes, string>>>;
  readonly imagenes: readonly ImagenDeProducto[];
  readonly variantes: readonly VarianteDeProducto[];
  readonly ejes: readonly EjeDeVariacion[];
  readonly tramos: readonly TramoDePrecio[];
  /** Título por idioma, para el selector de idioma de la ficha. */
  readonly titulosPorIdioma: Readonly<Record<string, string>>;
  readonly fabricante?: FabricanteDelProducto;
}

/** Lo que admite el guardado parcial de la ficha. Todo opcional: se manda solo lo que se tocó. */
export interface CambiosDeFicha {
  readonly titulo?: string;
  readonly marca?: string;
  readonly coste?: number;
  readonly divisa?: string;
  readonly moq?: number;
  readonly urlVideo?: string;
  readonly categoriaId?: string;
  readonly descripcion?: string;
  readonly metaTitulo?: string;
  readonly metaDescripcion?: string;
  readonly verificado?: boolean;
  readonly yuanes?: Readonly<Partial<Record<ImporteEnYuanes, number>>>;
  /**
   * Se mandan SIEMPRE, aunque estén vacíos: el backend trata la cadena vacía como borrado y el nulo
   * como «no lo edito». Sin esto no habría forma de quitar un dato de fabricante mal metido.
   */
  readonly fabricante?: {
    readonly nombre: string;
    readonly direccion: string;
    readonly correo: string;
  };
}

export type PestanaDeFicha = 'overview' | 'description' | 'seo' | 'inventory' | 'pricing';

export const PESTANAS_DE_FICHA: readonly PestanaDeFicha[] = [
  'overview',
  'description',
  'seo',
  'inventory',
  'pricing',
];

/** El título en el idioma que se está revisando, con los respaldos en el orden en que se quiere leer. */
export function tituloEnIdioma(ficha: FichaDeProducto, idioma: string): string {
  return ficha.titulosPorIdioma[idioma] || ficha.titulo || ficha.tituloZh;
}

/** «1–9» o «≥10»: así se lee un tramo de precio por cantidad. */
export function etiquetaDeTramo(tramo: TramoDePrecio): string {
  return tramo.cantidadMaxima != null
    ? `${tramo.cantidadMinima}–${tramo.cantidadMaxima}`
    : `≥${tramo.cantidadMinima}`;
}

/** Los slugs importados de fuentes externas llegan con guiones sueltos delante o detrás. */
export function normalizaSlug(slug?: string | null): string {
  if (!slug) {
    return '—';
  }
  return slug.replace(/^[-_/]+/, '').replace(/[-_/]+$/, '');
}
