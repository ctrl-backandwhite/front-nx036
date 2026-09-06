import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ProyectoOdm, presupuestoEnCentimosUsd } from '../../domain/model/proyecto-odm';
import { TasaDeCambio } from '../../domain/model/tasa-de-cambio';
import { PROYECTOS_ODM_PORT } from '../../domain/port/odm.port';

/** Lo que la pantalla recoge del formulario, antes de convertir nada. */
export interface FormularioDeProyecto {
  readonly clase: string;
  readonly titulo: string;
  readonly resumen: string;
  /** Tal y como se ha tecleado, con su divisa. */
  readonly presupuesto: string;
  readonly divisa: string;
}

/**
 * Abrir un proyecto a medida.
 *
 * <p>Existe por la CONVERSIÓN DEL PRESUPUESTO, que es la parte cara de equivocarse: el backend guarda
 * en dólares y el formulario deja escribir en ocho divisas. La tasa son unidades por dólar, así que
 * pasar de euros a dólares es dividir; multiplicando, 100 € se guardaban como 92 $ y el proveedor
 * trabajaba con un 15 % menos del presupuesto que el cliente había autorizado.
 *
 * <p>La cuenta vive en el dominio y aquí solo se orquesta, pero el caso de uso es lo que impide que la
 * pantalla la haga por su cuenta «porque son dos líneas».
 */
@Injectable()
export class CreaProyectoOdm {
  private readonly proyectos = inject(PROYECTOS_ODM_PORT);

  async ejecuta(
    formulario: FormularioDeProyecto,
    tasas: readonly TasaDeCambio[],
  ): Promise<Result<ProyectoOdm, AppError>> {
    return this.proyectos.crea({
      clase: formulario.clase,
      titulo: formulario.titulo.trim(),
      resumen: formulario.resumen.trim() || undefined,
      presupuestoEnCentimosUsd: presupuestoEnCentimosUsd(
        formulario.presupuesto,
        formulario.divisa,
        tasas,
      ),
    });
  }
}
