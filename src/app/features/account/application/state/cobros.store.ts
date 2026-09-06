import { Injectable, computed, signal } from '@angular/core';
import {
  ConfiguracionDeCobro,
  MetodoDePago,
  cobroConTarjetaDisponible,
} from '../../domain/model/cobro';

/**
 * La configuración de cobro y los métodos de pago guardados.
 *
 * <p>La configuración se guarda aparte de la lista porque decide si la sección ENTERA se pinta: sin
 * pasarela activa no hay nada que enseñar, y pedir la lista sería una llamada condenada al 404.
 */
@Injectable()
export class CobrosStore {
  private readonly _configuracion = signal<ConfiguracionDeCobro | null>(null);
  private readonly _metodos = signal<readonly MetodoDePago[]>([]);

  readonly configuracion = this._configuracion.asReadonly();
  readonly metodos = this._metodos.asReadonly();

  readonly conTarjeta = computed(() => cobroConTarjetaDisponible(this._configuracion()));
  readonly activo = computed(() => !!this._configuracion()?.activo);
  readonly clavePublicable = computed(() => this._configuracion()?.clavePublicable ?? '');
  readonly pruebaGratisGastada = computed(() => !!this._configuracion()?.pruebaGratisGastada);
  readonly sinMetodos = computed(() => this._metodos().length === 0);

  fijaConfiguracion(configuracion: ConfiguracionDeCobro | null): void {
    this._configuracion.set(configuracion);
  }

  fijaMetodos(metodos: readonly MetodoDePago[]): void {
    this._metodos.set(metodos);
  }
}
