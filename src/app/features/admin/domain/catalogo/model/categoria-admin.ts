/**
 * Las categorías del catálogo, vistas desde el panel.
 *
 * <p>Son casi dos mil y forman un ÁRBOL, así que el listado va paginado en servidor y el árbol completo
 * solo se pide cuando hace falta —el selector de padre y la exportación—. Cargarlas todas para pintar
 * una tabla de cincuenta filas costaba varios segundos en cada visita.
 */
export interface CategoriaAdmin {
  readonly id: string;
  readonly slug: string;
  readonly nombreZh: string;
  readonly nombres: Readonly<Record<string, string>>;
  readonly icono?: string;
  readonly posicion: number;
  readonly activa: boolean;
  readonly padreId: string | null;
  readonly numeroDeProductos: number;
}

export interface PaginaDeCategorias {
  readonly categorias: readonly CategoriaAdmin[];
  readonly total: number;
  readonly paginas: number;
}

export interface CriterioDeCategorias {
  readonly texto?: string;
  /** Sin valor = todas; `true` = solo con productos; `false` = solo vacías. */
  readonly conProductos?: boolean;
  readonly pagina: number;
  readonly tamano: number;
}

/** Lo que se teclea en el formulario de alta y edición. */
export interface BorradorDeCategoria {
  readonly slug: string;
  readonly nombreZh: string;
  readonly nombreEn: string;
  readonly nombreEs: string;
  readonly nombrePt: string;
  readonly padreId: string;
}

export const BORRADOR_DE_CATEGORIA_VACIO: BorradorDeCategoria = {
  slug: '',
  nombreZh: '',
  nombreEn: '',
  nombreEs: '',
  nombrePt: '',
  padreId: '',
};

/** Los motivos por los que un borrador no vale. Quien pinta decide con qué texto se dicen. */
export type FalloDeCategoria = 'slug_obligatorio' | 'slug_formato' | 'nombre_obligatorio';

/** Un slug de categoría: minúsculas, dígitos y guiones interiores. Es parte de la dirección pública. */
const SLUG_VALIDO = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/**
 * Valida el borrador y devuelve el motivo por campo.
 *
 * <p>El español y el inglés son obligatorios porque son los dos idiomas con los que se opera: el resto
 * del catálogo se traduce después, pero una categoría sin ellos aparece en blanco en el menú.
 */
export function validaCategoria(
  borrador: BorradorDeCategoria,
): Readonly<Record<string, FalloDeCategoria>> {
  const fallos: Record<string, FalloDeCategoria> = {};
  if (!borrador.slug) {
    fallos['slug'] = 'slug_obligatorio';
  } else if (!SLUG_VALIDO.test(borrador.slug)) {
    fallos['slug'] = 'slug_formato';
  }
  if (!borrador.nombreEs) {
    fallos['nombreEs'] = 'nombre_obligatorio';
  }
  if (!borrador.nombreEn) {
    fallos['nombreEn'] = 'nombre_obligatorio';
  }
  return fallos;
}

/** Lo que se escribe al teclear un slug: se fuerza el formato en vez de rechazarlo después. */
export function saneaSlug(texto: string): string {
  return texto.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

/** El nombre con el que se lee una categoría, con los respaldos en orden. */
export function nombreDeCategoria(categoria: CategoriaAdmin): string {
  return categoria.nombres['es'] ?? categoria.nombres['en'] ?? categoria.nombreZh ?? categoria.slug;
}

/**
 * La ruta completa «Padre › Hijo › Nieto».
 *
 * <p>Lleva un guardián de visitados porque un ciclo en los padres —que un dato mal migrado puede
 * crear— colgaría el navegador en un bucle infinito, y eso no puede pasar por pintar un desplegable.
 */
export function rutaDeCategoria(
  categoria: CategoriaAdmin,
  porId: ReadonlyMap<string, CategoriaAdmin>,
): string {
  const partes: string[] = [];
  const visitados = new Set<string>();
  let actual: CategoriaAdmin | undefined = categoria;
  while (actual && !visitados.has(actual.id)) {
    visitados.add(actual.id);
    partes.unshift(nombreDeCategoria(actual));
    actual = actual.padreId ? porId.get(actual.padreId) : undefined;
  }
  return partes.join(' › ');
}

/** Los descendientes de una categoría: no puede ser hija de su propia rama. */
export function descendientes(id: string, todas: readonly CategoriaAdmin[]): ReadonlySet<string> {
  const hijosDe = new Map<string | null, CategoriaAdmin[]>();
  for (const categoria of todas) {
    const clave = categoria.padreId ?? null;
    const lista = hijosDe.get(clave) ?? [];
    lista.push(categoria);
    hijosDe.set(clave, lista);
  }
  const acumulado = new Set<string>();
  const pendientes = [id];
  while (pendientes.length) {
    for (const hijo of hijosDe.get(pendientes.pop() ?? null) ?? []) {
      if (!acumulado.has(hijo.id)) {
        acumulado.add(hijo.id);
        pendientes.push(hijo.id);
      }
    }
  }
  return acumulado;
}

/** Los padres que se pueden elegir: ni ella misma ni su descendencia, ordenados por su ruta. */
export function padresPosibles(
  todas: readonly CategoriaAdmin[],
  editandoId: string | null,
): readonly CategoriaAdmin[] {
  const porId = new Map(todas.map((categoria) => [categoria.id, categoria] as const));
  const prohibidos = editandoId ? descendientes(editandoId, todas) : new Set<string>();
  return todas
    .filter((categoria) => categoria.id !== editandoId && !prohibidos.has(categoria.id))
    .sort((a, b) => rutaDeCategoria(a, porId).localeCompare(rutaDeCategoria(b, porId)));
}

/** Activa pero sin un solo producto: no es un error, pero deja un hueco en el menú y hay que verlo. */
export function estaVaciaYActiva(categoria: CategoriaAdmin): boolean {
  return categoria.activa && (categoria.numeroDeProductos ?? 0) === 0;
}

/** Una fila de la exportación, en el MISMO formato que acepta la importación. */
export interface FilaDeCategoriaExportada {
  readonly slug: string;
  readonly nameEs: string;
  readonly nameEn?: string;
  readonly namePt?: string;
  readonly nameZh?: string;
  readonly icon?: string;
  readonly position: number;
  readonly parentSlug?: string;
}

/**
 * Prepara la exportación.
 *
 * <p>El padre viaja por SLUG y no por identificador: los identificadores no sobreviven al cruzar de
 * entorno, y el fichero tiene que poder importarse en otro sitio. Es la vía por la que las categorías
 * pasan de preproducción a producción.
 */
export function paraExportar(
  todas: readonly CategoriaAdmin[],
): readonly FilaDeCategoriaExportada[] {
  const slugPorId = new Map(todas.map((categoria) => [categoria.id, categoria.slug] as const));
  return todas.map((categoria) => ({
    slug: categoria.slug,
    nameEs: categoria.nombres['es'] ?? '',
    nameEn: categoria.nombres['en'] || undefined,
    namePt: categoria.nombres['pt'] || undefined,
    nameZh: categoria.nombreZh || undefined,
    icon: categoria.icono || undefined,
    position: categoria.posicion,
    parentSlug: categoria.padreId ? slugPorId.get(categoria.padreId) : undefined,
  }));
}
