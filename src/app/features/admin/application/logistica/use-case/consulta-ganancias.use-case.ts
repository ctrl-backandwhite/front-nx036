import { Injectable, inject } from '@angular/core';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  FilaDeReporte,
  PaginaDeOperaciones,
  RangoDeFechas,
  ResumenDeGanancias,
} from '../../../domain/logistica/model/operador';
import {
  MIS_GANANCIAS_PORT,
  REPORTE_DE_OPERADORES_PORT,
} from '../../../domain/logistica/port/operadores.port';

/** Lo que la pantalla del operador enseña de una vez: su acumulado y su histórico. */
export interface MisGanancias {
  readonly resumen: ResumenDeGanancias;
  readonly historico: PaginaDeOperaciones;
}

/**
 * Las ganancias del propio operador.
 *
 * <p>Un fallo de red NO puede pintarse como «¥ 0,00 / sin operaciones»: para quien cobra por producción
 * eso significa «este mes no has ganado nada», que es justo lo contrario de «no se ha podido
 * consultar». Por eso el fallo sale como fallo y no como un resumen a cero.
 *
 * <p>RECORDATORIO DEL NEGOCIO: la comisión se devenga al ENTREGAR. Un pedido enviado aún puede volver, y
 * lo que vuelve no se ha ganado.
 */
@Injectable()
export class ConsultaMisGanancias {
  private readonly ganancias = inject(MIS_GANANCIAS_PORT);

  async ejecuta(
    rango: RangoDeFechas,
    pagina: number,
    tamano: number,
  ): Promise<Result<MisGanancias, AppError>> {
    const [resumen, historico] = await Promise.all([
      this.ganancias.resumen(rango),
      this.ganancias.historico(rango, pagina, tamano),
    ]);
    if (!resumen.ok) {
      return fallo(resumen.error);
    }
    if (!historico.ok) {
      return fallo(historico.error);
    }
    return exito({ resumen: resumen.valor, historico: historico.valor });
  }
}

/** El agregado por operador que mira quien administra. */
@Injectable()
export class ConsultaReporteDeOperadores {
  private readonly reporte = inject(REPORTE_DE_OPERADORES_PORT);

  ejecuta(rango: RangoDeFechas): Promise<Result<readonly FilaDeReporte[], AppError>> {
    return this.reporte.reporte(rango);
  }
}

/** Vuelve a indexar las operaciones registradas. Solo lo ofrece la administración. */
@Injectable()
export class ReindexaOperaciones {
  private readonly reporte = inject(REPORTE_DE_OPERADORES_PORT);

  ejecuta(): Promise<Result<number, AppError>> {
    return this.reporte.reindexa();
  }
}
