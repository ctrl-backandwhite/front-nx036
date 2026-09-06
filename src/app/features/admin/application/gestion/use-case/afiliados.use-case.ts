import { Injectable, inject } from '@angular/core';
import { Result, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { Pagina } from '../../../domain/gestion/model/pagina';
import {
  Afiliado, ConfiguracionDeAfiliados, DetalleDeAfiliado, PagoPendiente, exigeReferencia,
} from '../../../domain/gestion/model/afiliados';
import {
  AFILIADOS_PORT, PAGOS_DE_AFILIADOS_PORT,
} from '../../../domain/gestion/port/afiliados.port';

@Injectable()
export class BuscaAfiliados {
  private readonly afiliados = inject(AFILIADOS_PORT);

  ejecuta(
    estado: string | undefined,
    pagina: number,
    tamano: number,
  ): Promise<Result<Pagina<Afiliado>, AppError>> {
    return this.afiliados.busca(estado, pagina, tamano);
  }
}

@Injectable()
export class ConsultaElAfiliado {
  private readonly afiliados = inject(AFILIADOS_PORT);

  ejecuta(id: string): Promise<Result<DetalleDeAfiliado, AppError>> {
    return this.afiliados.detalle(id);
  }
}

@Injectable()
export class CambiaElEstadoDelAfiliado {
  private readonly afiliados = inject(AFILIADOS_PORT);

  ejecuta(id: string, estado: string): Promise<Result<void, AppError>> {
    return this.afiliados.cambiaEstado(id, estado);
  }
}

@Injectable()
export class ReindexaAfiliados {
  private readonly afiliados = inject(AFILIADOS_PORT);

  ejecuta(): Promise<Result<number, AppError>> {
    return this.afiliados.reindexa();
  }
}

@Injectable()
export class ConsultaLaConfiguracionDeAfiliados {
  private readonly afiliados = inject(AFILIADOS_PORT);

  ejecuta(): Promise<Result<ConfiguracionDeAfiliados, AppError>> {
    return this.afiliados.configuracion();
  }
}

@Injectable()
export class GuardaLaConfiguracionDeAfiliados {
  private readonly afiliados = inject(AFILIADOS_PORT);

  ejecuta(config: ConfiguracionDeAfiliados): Promise<Result<void, AppError>> {
    return this.afiliados.guardaConfiguracion(config);
  }
}

@Injectable()
export class ConsultaPagosPendientes {
  private readonly pagos = inject(PAGOS_DE_AFILIADOS_PORT);

  ejecuta(): Promise<Result<readonly PagoPendiente[], AppError>> {
    return this.pagos.pendientes();
  }
}

/**
 * Aprueba una solicitud de pago.
 *
 * <p>Una transferencia bancaria o de PayPal EXIGE referencia: es lo único que permite casar el apunte
 * del banco con la comisión cuando el afiliado reclama que no ha cobrado. La comprobación vive aquí, no
 * en el formulario, porque es una regla del negocio y no una ayuda al teclear.
 */
@Injectable()
export class ApruebaElPago {
  private readonly pagos = inject(PAGOS_DE_AFILIADOS_PORT);

  ejecuta(pago: PagoPendiente, referencia: string): Promise<Result<void, AppError>> {
    const limpia = referencia.trim();
    if (exigeReferencia(pago.metodo) && !limpia) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return this.pagos.aprueba(pago.id, limpia || undefined);
  }
}

/** Rechazar SIEMPRE lleva motivo: es lo que se le acaba contando al afiliado. */
@Injectable()
export class RechazaElPago {
  private readonly pagos = inject(PAGOS_DE_AFILIADOS_PORT);

  ejecuta(id: string, motivo: string): Promise<Result<void, AppError>> {
    const limpio = motivo.trim();
    if (!limpio) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return this.pagos.rechaza(id, limpio);
  }
}

@Injectable()
export class PagaAlAfiliado {
  private readonly pagos = inject(PAGOS_DE_AFILIADOS_PORT);

  ejecuta(idAfiliado: string): Promise<Result<number, AppError>> {
    return this.pagos.paga(idAfiliado);
  }
}

@Injectable()
export class ApruebaComisionesVencidas {
  private readonly pagos = inject(PAGOS_DE_AFILIADOS_PORT);

  ejecuta(): Promise<Result<number, AppError>> {
    return this.pagos.apruebaVencidas();
  }
}

@Injectable()
export class ResuelveLaRevision {
  private readonly pagos = inject(PAGOS_DE_AFILIADOS_PORT);

  ejecuta(idComision: string, aprueba: boolean): Promise<Result<void, AppError>> {
    return this.pagos.revisaComision(idComision, aprueba);
  }
}
