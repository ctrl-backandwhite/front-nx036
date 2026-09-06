/**
 * Inteligencia de mercado: qué se anuncia, qué se vende y qué merece una alerta.
 */

export interface TendenciaDeAnuncio {
  readonly id: string;
  readonly fuente: string;
  readonly titular: string;
  readonly slugDeProducto?: string;
  readonly impresiones?: number;
  readonly interacciones?: number;
  /** Puntuación de 0 a 1. Ver {@link puntuacionSobreCien}. */
  readonly puntuacion?: number;
  readonly region?: string;
  readonly capturadaEl: string;
}

export interface ProductoGanador {
  readonly slug: string;
  readonly titulo: string;
  readonly ventasMensuales: number;
  readonly puntuacionDeTendencia?: number;
  readonly imagenPrincipal?: string;
  /** En yuanes: es la divisa canónica del coste. Quien lo pinta lo convierte a la divisa activa. */
  readonly precio?: number;
}

export type CanalDeAlerta = 'EMAIL' | 'IN_APP' | 'PUSH' | 'WEBHOOK';

export const CANALES_DE_ALERTA: readonly CanalDeAlerta[] = ['EMAIL', 'IN_APP', 'PUSH', 'WEBHOOK'];

export interface AlertaDeTendencia {
  readonly id: string;
  readonly palabraClave?: string;
  readonly idCategoria?: string;
  readonly nombreCategoria?: string;
  readonly canal: string;
  /** Umbral de 0 a 1, como la puntuación. La pantalla lo enseña sobre 100. */
  readonly umbral?: number;
  readonly activa: boolean;
  readonly creadaEl: string;
}

export interface NuevaAlerta {
  readonly palabraClave?: string;
  readonly idCategoria?: string;
  readonly canal?: string;
  readonly umbral?: number;
}

/**
 * La puntuación en la escala de 0 a 100 que se enseña.
 *
 * <p>El contrato dice 0–1, pero hay filas antiguas guardadas ya en 0–100: mezclarlas sin mirar pintaba
 * «6000/100» en la tabla. Se distingue por el valor —lo que pasa de 1 ya venía en la escala grande— y
 * se recorta arriba y abajo, de modo que ningún dato torcido puede salir fuera de la escala.
 */
export function puntuacionSobreCien(bruta: number | undefined | null): number {
  const valor = Number(bruta ?? 0);
  if (!Number.isFinite(valor)) {
    return 0;
  }
  const enEscala = valor > 1 ? valor : valor * 100;
  return Math.min(100, Math.max(0, Math.round(enEscala)));
}

/**
 * El camino inverso: lo que el usuario teclea de 0 a 100 se guarda de 0 a 1.
 *
 * <p>Se recorta antes de enviarlo. Un umbral de 900 no es una alerta muy exigente: es una alerta que
 * no va a saltar nunca, y quien la creó se queda esperando un aviso que no existe.
 */
export function umbralNormalizado(sobreCien: string | number): number {
  const valor = Number(sobreCien);
  if (!Number.isFinite(valor)) {
    return 0;
  }
  return Math.min(1, Math.max(0, valor / 100));
}

/** Resumen por fuente: cuántos anuncios y cuánta interacción suman. Lo pinta la fila de tarjetas. */
export interface ResumenPorFuente {
  readonly fuente: string;
  readonly cuantos: number;
  readonly interacciones: number;
}

/**
 * Agrupa las tendencias por fuente.
 *
 * <p>Es un cálculo, no una vista: vive aquí para poder probarlo sin montar una tabla y para que la
 * plantilla se limite a pintar lo que ya está resuelto.
 */
export function resumePorFuente(
  tendencias: readonly TendenciaDeAnuncio[],
): readonly ResumenPorFuente[] {
  const acumulado = new Map<string, { cuantos: number; interacciones: number }>();
  for (const tendencia of tendencias) {
    const clave = tendencia.fuente || '—';
    const previo = acumulado.get(clave) ?? { cuantos: 0, interacciones: 0 };
    acumulado.set(clave, {
      cuantos: previo.cuantos + 1,
      interacciones: previo.interacciones + Number(tendencia.interacciones ?? 0),
    });
  }
  return [...acumulado].map(([fuente, datos]) => ({ fuente, ...datos }));
}

/**
 * El mayor total de interacciones, con suelo de 1.
 *
 * <p>El suelo no es cosmético: es el divisor de la barra de progreso. Sin él, un conjunto recién
 * capturado —todo a cero— dividía entre cero y la barra salía con anchura `NaN%`.
 */
export function maximoDeInteracciones(resumen: readonly ResumenPorFuente[]): number {
  return Math.max(1, ...resumen.map((r) => r.interacciones));
}
