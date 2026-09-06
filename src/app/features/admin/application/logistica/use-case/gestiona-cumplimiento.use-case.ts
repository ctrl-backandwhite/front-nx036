import { Injectable, inject } from '@angular/core';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  EstadoDeCumplimiento,
  OperadorEconomico,
  PapelDeOperador,
  operadorCompleto,
  operadorEnBlanco,
} from '../../../domain/logistica/model/cumplimiento';
import { CUMPLIMIENTO_PORT } from '../../../domain/logistica/port/configuracion-logistica.port';

/** Todo lo que la pantalla de cumplimiento necesita para pintarse. */
export interface VistaDeCumplimiento {
  readonly operador: OperadorEconomico;
  readonly papeles: readonly PapelDeOperador[];
  readonly estado: EstadoDeCumplimiento;
}

/**
 * Reúne lo que hace falta para la pantalla de cumplimiento.
 *
 * <p>Las tres lecturas van juntas porque siempre se piden juntas y las tres dependen del IDIOMA: el
 * backend traduce la figura del art. 4.2, así que cambiar de idioma tiene que refrescar los datos y no
 * solo las etiquetas. Si la pantalla tuviera que acordarse de encadenar las tres, la tercera acabaría
 * quedándose con el idioma anterior.
 *
 * <p>Sin operador declarado se devuelve uno EN BLANCO, no un nulo: el formulario existe igual, y es
 * precisamente donde se declara el primero.
 */
@Injectable()
export class ConsultaCumplimiento {
  private readonly cumplimiento = inject(CUMPLIMIENTO_PORT);

  async ejecuta(idioma: string): Promise<Result<VistaDeCumplimiento, AppError>> {
    const [operador, papeles, estado] = await Promise.all([
      this.cumplimiento.operador(idioma),
      this.cumplimiento.papeles(idioma),
      this.cumplimiento.estado(idioma),
    ]);
    if (!operador.ok) {
      return fallo(operador.error);
    }
    if (!papeles.ok) {
      return fallo(papeles.error);
    }
    if (!estado.ok) {
      return fallo(estado.error);
    }
    return exito({
      operador: operador.valor ?? operadorEnBlanco(),
      papeles: papeles.valor,
      estado: estado.valor,
    });
  }
}

/** Se rechaza sin salir: faltan campos del art. 16.3 y publicarlo así incumpliría el reglamento. */
export type Incompleto = 'incompleto';

/**
 * Guarda el operador económico de la UE.
 *
 * <p>Se comprueba que esté completo antes de mandarlo PUBLICADO: el art. 16.1 impide introducir un
 * producto en el mercado sin un operador establecido en la Unión, y el art. 19 obliga a mostrar sus
 * datos en la oferta. Publicar un bloque a medias es peor que no publicarlo.
 *
 * <p>Guardar SIN publicar sí se permite con datos incompletos: así se puede ir rellenando.
 */
@Injectable()
export class GuardaOperadorEconomico {
  private readonly cumplimiento = inject(CUMPLIMIENTO_PORT);

  async ejecuta(
    operador: OperadorEconomico,
    idioma: string,
  ): Promise<Result<void, AppError | Incompleto>> {
    if (operador.publicado && !operadorCompleto(operador)) {
      return fallo<Incompleto>('incompleto');
    }
    return this.cumplimiento.guardaOperador(operador, idioma);
  }
}
