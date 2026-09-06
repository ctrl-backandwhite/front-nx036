/** Cómo se factura un plan. En el vocabulario del negocio, no en el del backend (`MONTHLY`/`YEARLY`). */
export type Periodo = 'MENSUAL' | 'ANUAL';

/**
 * Un plan de suscripción.
 *
 * <p>Los importes vienen HECHOS del backend, formateados en la divisa de quien mira. Regla dura de la
 * plataforma: el front no calcula ni formatea precios. Los céntimos en crudo están solo para decidir si
 * un plan es gratuito, nunca para pintarlos —dividir entre cien enseña las facturas en yenes o wones,
 * divisas sin céntimos, cien veces más baratas de lo que se cobró.
 */
export interface Plan {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string;
  readonly centimosMensuales: number;
  readonly centimosAnuales: number;
  readonly precioMensualFormateado?: string;
  readonly precioAnualFormateado?: string;
  readonly posicion: number;
  readonly limites: Readonly<Record<string, number>>;
}

export interface Suscripcion {
  readonly idPlan: string;
  readonly estado: string;
  readonly periodoDeFacturacion: string;
  readonly finDelPeriodo?: string;
  readonly cancelaEl?: string;
  /** Bajada de plan programada: se aplica en la renovación, no ahora. */
  readonly planPendiente?: string;
  readonly planPendienteEl?: string;
}

export interface Factura {
  readonly numero?: string;
  /** Ya formateado por el backend en la divisa en que se emitió. Es lo ÚNICO que se pinta. */
  readonly totalFormateado?: string;
  readonly estado?: string;
  /** Segundos desde la época, como los devuelve la pasarela. */
  readonly creadaEl?: number;
}

export function centimosDelPeriodo(plan: Plan, periodo: Periodo): number {
  return periodo === 'MENSUAL' ? plan.centimosMensuales : plan.centimosAnuales;
}

export function precioFormateado(plan: Plan, periodo: Periodo): string | undefined {
  return periodo === 'MENSUAL' ? plan.precioMensualFormateado : plan.precioAnualFormateado;
}

/** El plan a medida no tiene precio de tarifa: se contrata hablando con alguien. */
export function esPlanDeEmpresa(plan: Plan): boolean {
  return plan.codigo === 'ENTERPRISE';
}

export function esPlanGratis(plan: Plan, periodo: Periodo): boolean {
  return centimosDelPeriodo(plan, periodo) === 0 && !esPlanDeEmpresa(plan);
}

/** El destacado de la parrilla. Lo decide la posición que le da el backend, no el front. */
export function esPlanDestacado(plan: Plan): boolean {
  return plan.posicion === 3;
}

export function esPlanActual(suscripcion: Suscripcion | null, plan: Plan): boolean {
  return !!suscripcion && suscripcion.idPlan === plan.id && suscripcion.estado === 'ACTIVE';
}

/**
 * El plan gratis es una PRUEBA de quince días, no un plan perpetuo: vence y no se renueva.
 *
 * <p>Se reconoce por el código o por no costar nada en ninguna periodicidad, porque las dos cosas se han
 * dado en producción y mirar solo una dejaba fuera la mitad de los casos.
 */
export function esPlanDePrueba(plan: Plan | undefined): boolean {
  return (
    !!plan &&
    (plan.codigo.toUpperCase() === 'FREE' ||
      (plan.centimosMensuales <= 0 && plan.centimosAnuales <= 0))
  );
}

/** La prueba gratis es de un solo uso: gastada, el plan gratis deja de poder elegirse. */
export function pruebaAgotada(
  plan: Plan,
  periodo: Periodo,
  pruebaGratisGastada: boolean,
  esElActual: boolean,
): boolean {
  return esPlanGratis(plan, periodo) && pruebaGratisGastada && !esElActual;
}

/**
 * El código con el que el backend pide una tarjeta antes de contratar.
 *
 * <p>Es el ÚNICO fallo que ofrece añadir una tarjeta. Los demás —prueba ya usada, falta el país— se
 * enseñan tal cual: pasar al plan gratis no debe pedir tarjeta a nadie.
 */
export const HACE_FALTA_TARJETA = 'PLAN_CARD_REQUIRED';

/** La contratación de una bajada de plan no cobra ahora: se programa para la renovación. */
export const BAJADA_PROGRAMADA = 'scheduled';
