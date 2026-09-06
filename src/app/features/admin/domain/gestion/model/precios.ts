/**
 * Las reglas de MARGEN.
 *
 * <p>Esta pantalla EDITA las reglas; no calcula ningún precio. El precio de venta lo compone siempre el
 * backend —margen, envío, arancel e IVA— y el panel se limita a pintar lo que llega. Una regla mal
 * puesta cambia el precio de todo el catálogo, así que aquí lo único que se hace es avisar de lo que
 * suele salir mal: duplicados y tramos de coste solapados.
 */
export type AmbitoDeRegla =
  | 'GLOBAL' | 'CATEGORY' | 'SUPPLIER' | 'PRODUCT' | 'PRODUCT_GROUP' | 'VARIANT';

export type TipoDeMargen = 'PERCENTAGE' | 'FIXED';

export interface ReglaDePrecio {
  readonly id: string;
  readonly ambito: AmbitoDeRegla;
  readonly idAmbito?: string;
  readonly nombreDelAmbito?: string;
  readonly tipo: TipoDeMargen;
  readonly valor: number;
  readonly costeMinimoUsd?: number;
  readonly costeMaximoUsd?: number;
  readonly activa: boolean;
  readonly posicion: number;
  readonly descripcion?: string;
  /** País de DESTINO al que aplica; vacío significa cualquiera. */
  readonly pais?: string;
  readonly canal?: string;
}

/** Lo que se manda al crear o editar. El identificador solo está al editar. */
export type BorradorDeRegla = Partial<ReglaDePrecio>;

export const AMBITOS: readonly AmbitoDeRegla[] = [
  'GLOBAL', 'CATEGORY', 'SUPPLIER', 'PRODUCT', 'PRODUCT_GROUP', 'VARIANT',
];

/** La regla nueva parte de un porcentaje global activo: es lo que se crea nueve de cada diez veces. */
export function reglaEnBlanco(): BorradorDeRegla {
  return { ambito: 'GLOBAL', tipo: 'PERCENTAGE', valor: 30, activa: true, posicion: 0, descripcion: '' };
}

/**
 * El ajuste de pedido mínimo: para los productos con MOQ mayor que uno, el margen se reduce al
 * porcentaje configurado. No es una fila de reglas, es una palanca aparte.
 */
export interface AjusteDeMoq {
  readonly activo: boolean;
  readonly factorPorcentaje: number;
}

/** La huella de una regla: dos reglas con la misma huella hacen lo mismo y sobra una. */
export function huellaDeRegla(regla: ReglaDePrecio): string {
  return [regla.ambito, regla.idAmbito ?? '', regla.tipo, regla.valor, regla.pais ?? '', regla.canal ?? ''].join('|');
}

/** Las huellas que aparecen más de una vez. Es lo que se marca en amarillo para poder limpiarlas. */
export function huellasDuplicadas(reglas: readonly ReglaDePrecio[]): ReadonlySet<string> {
  const cuenta = new Map<string, number>();
  const duplicadas = new Set<string>();
  for (const regla of reglas) {
    const huella = huellaDeRegla(regla);
    const vistas = (cuenta.get(huella) ?? 0) + 1;
    cuenta.set(huella, vistas);
    if (vistas > 1) {
      duplicadas.add(huella);
    }
  }
  return duplicadas;
}

/** ¿Se pisan dos tramos de coste? Un extremo sin valor es infinito por ese lado. */
export function tramosSeSolapan(
  minA: number | null | undefined,
  maxA: number | null | undefined,
  minB: number | null | undefined,
  maxB: number | null | undefined,
): boolean {
  const desdeA = minA ?? Number.NEGATIVE_INFINITY;
  const hastaA = maxA ?? Number.POSITIVE_INFINITY;
  const desdeB = minB ?? Number.NEGATIVE_INFINITY;
  const hastaB = maxB ?? Number.POSITIVE_INFINITY;
  return desdeA <= hastaB && desdeB <= hastaA;
}

/**
 * Las reglas activas que se pisarían con la que se está editando.
 *
 * <p>Dos reglas activas del mismo ámbito con tramos de coste solapados dejan sin determinar cuál gana:
 * el mismo producto puede salir a dos precios distintos según el orden en que se evalúen. Es el fallo
 * más caro de esta pantalla, y por eso se avisa ANTES de guardar.
 */
export function reglasSolapadas(
  borrador: BorradorDeRegla,
  reglas: readonly ReglaDePrecio[],
): readonly ReglaDePrecio[] {
  if (borrador.activa === false) {
    return [];
  }
  return reglas.filter(
    (regla) =>
      regla.id !== borrador.id &&
      regla.activa &&
      regla.ambito === borrador.ambito &&
      (regla.idAmbito ?? '') === (borrador.idAmbito ?? '') &&
      tramosSeSolapan(borrador.costeMinimoUsd, borrador.costeMaximoUsd, regla.costeMinimoUsd, regla.costeMaximoUsd),
  );
}

/** ¿Tiene la regla un tramo de coste, o vale para cualquier coste? */
export function tieneTramo(regla: ReglaDePrecio): boolean {
  return regla.costeMinimoUsd != null || regla.costeMaximoUsd != null;
}
