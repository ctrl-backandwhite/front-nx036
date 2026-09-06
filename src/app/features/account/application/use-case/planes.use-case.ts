import { Injectable, inject } from '@angular/core';
import { Result, exito } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { BAJADA_PROGRAMADA, Periodo } from '../../domain/model/plan';
import { FACTURAS_PORT, PLANES_PORT } from '../../domain/port/planes.port';
import { DESCARGA_PORT } from '../../domain/port/descarga.port';
import { PlanesStore } from '../state/planes.store';

/**
 * Trae el catálogo de planes y la suscripción vigente.
 *
 * <p>El catálogo es PÚBLICO —la página de precios lo enseña sin sesión— y la suscripción no: por eso se
 * piden por separado y el fallo de la segunda no arrastra a la primera. Sin sesión, la suscripción
 * sencillamente no se consulta.
 */
@Injectable({ providedIn: 'root' })
export class CargaPlanes {
  private readonly planes = inject(PLANES_PORT);
  private readonly almacen = inject(PlanesStore);

  async ejecuta(conSesion: boolean): Promise<Result<void, AppError>> {
    const catalogo = await this.planes.lista();
    if (!catalogo.ok) {
      return catalogo;
    }
    this.almacen.fijaPlanes(catalogo.valor);
    if (!conSesion) {
      this.almacen.fijaSuscripcion(null);
      return exito(undefined);
    }
    return this.refrescaSuscripcion();
  }

  async refrescaSuscripcion(): Promise<Result<void, AppError>> {
    const suscripcion = await this.planes.suscripcionActual();
    if (!suscripcion.ok) {
      // Que falle preguntar por la suscripción no puede vaciar la parrilla de planes: quien mira sigue
      // pudiendo elegir uno, y el fallo se cuenta donde toca.
      return suscripcion;
    }
    this.almacen.fijaSuscripcion(suscripcion.valor);
    return exito(undefined);
  }
}

/** Trae el historial de facturas del plan. */
@Injectable({ providedIn: 'root' })
export class CargaFacturas {
  private readonly facturas = inject(FACTURAS_PORT);
  private readonly almacen = inject(PlanesStore);

  async ejecuta(): Promise<Result<void, AppError>> {
    const resultado = await this.facturas.lista();
    if (!resultado.ok) {
      return resultado;
    }
    this.almacen.fijaFacturas(resultado.valor);
    return exito(undefined);
  }
}

/** Lo que hay que contarle a quien acaba de contratar: se aplicó ya, o se aplicará al renovar. */
export type ResultadoDeContratacion = 'contratado' | 'bajada-programada';

/**
 * Contrata o cambia de plan, cobrando con la tarjeta guardada por defecto.
 *
 * <p>Bajar de plan NO cobra ahora: se mantiene el actual hasta la renovación y entonces se aplica el
 * menor. El servidor lo dice con un estado propio, y distinguirlo importa porque el mensaje «contratado»
 * en una bajada haría creer que el plan grande se pierde hoy.
 */
@Injectable({ providedIn: 'root' })
export class ContrataPlan {
  private readonly planes = inject(PLANES_PORT);
  private readonly carga = inject(CargaPlanes);
  private readonly facturas = inject(CargaFacturas);

  async ejecuta(
    codigoDePlan: string,
    periodo: Periodo,
  ): Promise<Result<ResultadoDeContratacion, AppError>> {
    const resultado = await this.planes.contrata(codigoDePlan, periodo);
    if (!resultado.ok) {
      return resultado;
    }
    await this.carga.refrescaSuscripcion();
    await this.facturas.ejecuta();
    return exito(resultado.valor === BAJADA_PROGRAMADA ? 'bajada-programada' : 'contratado');
  }
}

/** Cancela la suscripción vigente. Sigue activa hasta el final del periodo ya pagado. */
@Injectable({ providedIn: 'root' })
export class CancelaSuscripcion {
  private readonly planes = inject(PLANES_PORT);
  private readonly carga = inject(CargaPlanes);

  async ejecuta(): Promise<Result<void, AppError>> {
    const resultado = await this.planes.cancela();
    return resultado.ok ? this.carga.refrescaSuscripcion() : resultado;
  }
}

/** Baja la factura del plan y se la entrega al navegador. */
@Injectable({ providedIn: 'root' })
export class DescargaFactura {
  private readonly facturas = inject(FACTURAS_PORT);
  private readonly descarga = inject(DESCARGA_PORT);

  async ejecuta(numero: string): Promise<Result<void, AppError>> {
    const fichero = await this.facturas.descarga(numero);
    if (!fichero.ok) {
      return fichero;
    }
    this.descarga.entrega(fichero.valor);
    return exito(undefined);
  }
}
