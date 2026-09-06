import { Injectable, inject } from '@angular/core';
import { Result, fallo } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  DatosDeImpuesto,
  DatosDeRegion,
  ImpuestoDePais,
  RegionFiscal,
  datosDeImpuesto,
  impuestoGuardable,
  regionGuardable,
} from '../../../domain/logistica/model/impuesto';
import { IMPUESTOS_PORT } from '../../../domain/logistica/port/configuracion-logistica.port';

export type SinClaveFiscal = 'sin-clave';

/**
 * Los impuestos por país y por región.
 *
 * <p>El panel los CONFIGURA; quien los aplica al cobro es el backend. Por eso una escritura que falla no
 * puede quedarse en silencio: apagar el IVA de un país y que el servidor lo rechace sin decir nada hace
 * que se cobre lo contrario de lo que quien administra cree haber configurado, y eso no se descubre
 * hasta la liquidación.
 */
@Injectable()
export class ConsultaImpuestos {
  private readonly impuestos = inject(IMPUESTOS_PORT);

  paises(): Promise<Result<readonly ImpuestoDePais[], AppError>> {
    return this.impuestos.lista();
  }

  regiones(pais: string): Promise<Result<readonly RegionFiscal[], AppError>> {
    return this.impuestos.regiones(pais);
  }
}

@Injectable()
export class GuardaImpuestoDePais {
  private readonly impuestos = inject(IMPUESTOS_PORT);

  async ejecuta(datos: DatosDeImpuesto): Promise<Result<void, AppError | SinClaveFiscal>> {
    if (!impuestoGuardable(datos)) {
      return fallo<SinClaveFiscal>('sin-clave');
    }
    return this.impuestos.guarda(datos);
  }
}

/** Enciende o apaga el impuesto de un país conservando el resto de la fila tal como estaba. */
@Injectable()
export class AlternaImpuestoDePais {
  private readonly impuestos = inject(IMPUESTOS_PORT);

  ejecuta(fila: ImpuestoDePais): Promise<Result<void, AppError>> {
    return this.impuestos.guarda({ ...datosDeImpuesto(fila), activo: !fila.activo });
  }
}

@Injectable()
export class BorraImpuestoDePais {
  private readonly impuestos = inject(IMPUESTOS_PORT);

  ejecuta(pais: string): Promise<Result<void, AppError>> {
    return this.impuestos.borra(pais);
  }
}

@Injectable()
export class GuardaRegionFiscal {
  private readonly impuestos = inject(IMPUESTOS_PORT);

  async ejecuta(
    pais: string,
    datos: DatosDeRegion,
  ): Promise<Result<void, AppError | SinClaveFiscal>> {
    if (!regionGuardable(datos)) {
      return fallo<SinClaveFiscal>('sin-clave');
    }
    return this.impuestos.guardaRegion(pais, datos);
  }
}

/**
 * Enciende o apaga una región conservando SU tasa, incluida la ausencia de tasa.
 *
 * <p>El vacío significa «usa la nacional»: convertirlo en un cero al alternar la marca dejaría el estado
 * exento sin que nadie lo hubiera pedido.
 */
@Injectable()
export class AlternaRegionFiscal {
  private readonly impuestos = inject(IMPUESTOS_PORT);

  ejecuta(fila: RegionFiscal): Promise<Result<void, AppError>> {
    return this.impuestos.guardaRegion(fila.pais, {
      codigo: fila.codigo,
      nombre: fila.nombre,
      porcentaje: fila.porcentaje != null ? String(fila.porcentaje) : '',
      activo: !fila.activo,
    });
  }
}

@Injectable()
export class BorraRegionFiscal {
  private readonly impuestos = inject(IMPUESTOS_PORT);

  ejecuta(pais: string, codigo: string): Promise<Result<void, AppError>> {
    return this.impuestos.borraRegion(pais, codigo);
  }
}
