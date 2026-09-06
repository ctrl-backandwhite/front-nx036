/**
 * Las comisiones de afiliado que aún no se han aprobado, vistas DESDE LA CARTERA.
 *
 * <p>No es el panel de afiliados: es el trozo mínimo que la cartera necesita para explicar por qué hay
 * dinero prometido que todavía no está en el saldo. El panel completo —códigos, estadísticas, perfil de
 * cobro— es de otro contexto y no se importa aquí.
 */
export interface ComisionPendiente {
  readonly id: string;
  /** Ya formateado por quien lo trae, en la divisa que declara el servidor. */
  readonly importeFormateado: string;
  readonly creadaEl?: string;
  /** Cuándo se espera que pase a aprobada: creación más el periodo de devolución. */
  readonly apruebaEl?: string | null;
}

export interface ComisionesPendientes {
  /** Falso si quien mira no se ha dado de alta como afiliado: entonces no hay sección que pintar. */
  readonly esAfiliado: boolean;
  readonly totalFormateado: string;
  readonly comisiones: readonly ComisionPendiente[];
}

/** Cuánto falta para que una comisión se apruebe, en la unidad que toca decir. */
export type EsperaHastaLaAprobacion =
  | { readonly clase: 'sin-fecha' }
  | { readonly clase: 'inminente' }
  | { readonly clase: 'horas'; readonly cuantas: number }
  | { readonly clase: 'dias'; readonly cuantos: number };

/**
 * La cuenta atrás hasta que una comisión pendiente se aprueba.
 *
 * <p>En días mientras falte más de uno y en horas el último día: «faltan 27 horas» no se lee tan rápido
 * como «faltan 2 días», y «faltan 0 días» no dice nada. Si el plazo ya venció se dice «inminente» en vez
 * de un número negativo: la aprobación la ejecuta un proceso que corre cada cierto tiempo.
 *
 * <p>`ahora` se pasa como argumento para que la regla sea determinista y se pueda probar sin trucar el
 * reloj del entorno.
 */
export function esperaHastaLaAprobacion(
  apruebaEl: string | null | undefined,
  ahora: number = Date.now(),
): EsperaHastaLaAprobacion {
  if (!apruebaEl) {
    return { clase: 'sin-fecha' };
  }
  const restante = new Date(apruebaEl).getTime() - ahora;
  if (!Number.isFinite(restante) || restante <= 0) {
    return { clase: 'inminente' };
  }
  const horas = Math.ceil(restante / 3_600_000);
  return horas > 24 ? { clase: 'dias', cuantos: Math.ceil(horas / 24) } : { clase: 'horas', cuantas: horas };
}
