import { Injectable, computed, signal } from '@angular/core';
import { Factura, Periodo, Plan, Suscripcion, esPlanDePrueba } from '../../domain/model/plan';

/** El catálogo de planes, la suscripción vigente y las facturas emitidas. */
@Injectable()
export class PlanesStore {
  private readonly _planes = signal<readonly Plan[]>([]);
  private readonly _suscripcion = signal<Suscripcion | null>(null);
  private readonly _facturas = signal<readonly Factura[]>([]);
  private readonly _periodo = signal<Periodo>('MENSUAL');

  readonly planes = this._planes.asReadonly();
  readonly suscripcion = this._suscripcion.asReadonly();
  readonly facturas = this._facturas.asReadonly();

  /** Mensual o anual. Es una preferencia de quien mira, no un dato del servidor. */
  readonly periodo = this._periodo.asReadonly();

  /** El plan al que corresponde la suscripción vigente, si se conoce su ficha. */
  readonly planContratado = computed(() => {
    const suscripcion = this._suscripcion();
    return suscripcion ? this._planes().find((p) => p.id === suscripcion.idPlan) : undefined;
  });

  /** La suscripción a un plan gratis es una PRUEBA de quince días: no se renueva, vence. */
  readonly enPrueba = computed(() => esPlanDePrueba(this.planContratado()));

  /** Sin suscripción y sin facturas no hay sección que enseñar. */
  readonly haySuscripcionOFacturas = computed(
    () => this._suscripcion() !== null || this._facturas().length > 0,
  );

  fijaPlanes(planes: readonly Plan[]): void {
    this._planes.set(planes);
  }

  fijaSuscripcion(suscripcion: Suscripcion | null): void {
    this._suscripcion.set(suscripcion);
  }

  fijaFacturas(facturas: readonly Factura[]): void {
    this._facturas.set(facturas);
  }

  cambiaPeriodo(periodo: Periodo): void {
    this._periodo.set(periodo);
  }
}
