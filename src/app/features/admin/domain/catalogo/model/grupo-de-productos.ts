/**
 * Los grupos de productos: el ámbito `PRODUCT_GROUP` de las reglas de margen.
 *
 * <p>Que un producto entre o no en su grupo decide con qué MARGEN se vende. Un alta o una baja que el
 * backend rechaza y nadie avisa deja el producto con el margen genérico, y la diferencia solo aparece
 * al cuadrar el mes: por eso todas las operaciones devuelven su fallo en vez de tragárselo.
 */
export interface GrupoDeProductos {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion?: string;
  readonly activo: boolean;
  readonly numeroDeMiembros: number;
}

/** Un producto dentro de un grupo: lo justo para listarlo y poder quitarlo. */
export interface MiembroDeGrupo {
  readonly id: string;
  readonly titulo: string;
  readonly slug: string;
}

/** Lo que se teclea al crear o editar un grupo. `id` ausente = alta. */
export interface BorradorDeGrupo {
  readonly id?: string;
  readonly nombre: string;
  readonly descripcion: string;
  readonly activo: boolean;
}

export const BORRADOR_DE_GRUPO_VACIO: BorradorDeGrupo = {
  nombre: '',
  descripcion: '',
  activo: true,
};

/** Sin nombre no hay grupo: es lo que se elige después en la regla de margen. */
export function grupoGuardable(borrador: BorradorDeGrupo): boolean {
  return borrador.nombre.trim() !== '';
}

/** Los candidatos a entrar: los que la búsqueda encontró y todavía no son miembros. */
export function candidatosAMiembro(
  encontrados: readonly MiembroDeGrupo[],
  miembros: readonly MiembroDeGrupo[],
): readonly MiembroDeGrupo[] {
  const yaDentro = new Set(miembros.map((miembro) => miembro.id));
  return encontrados.filter((candidato) => !yaDentro.has(candidato.id));
}
