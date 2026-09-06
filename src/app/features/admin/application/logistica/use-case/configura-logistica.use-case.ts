import { Injectable, inject } from '@angular/core';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  LimiteDeTransportista,
  limiteGuardable,
} from '../../../domain/logistica/model/limite-transportista';
import {
  Almacen,
  DatosDeAlmacen,
  ParteDeLote,
  almacenGuardable,
  datosDe,
} from '../../../domain/logistica/model/almacen';
import {
  ALMACENES_ADMIN_PORT,
  LIMITES_DE_TRANSPORTISTA_PORT,
} from '../../../domain/logistica/port/configuracion-logistica.port';

/** Lo que se rechaza sin llegar al servidor: falta la clave con la que se identifica la fila. */
export type SinClave = 'sin-clave';

/** Consulta los límites que el transportista impone a cada canal. */
@Injectable()
export class ConsultaLimitesDeTransportista {
  private readonly limites = inject(LIMITES_DE_TRANSPORTISTA_PORT);

  ejecuta(): Promise<Result<readonly LimiteDeTransportista[], AppError>> {
    return this.limites.lista();
  }
}

/**
 * Guarda un límite. Alta y edición son lo mismo: la clave es canal+país.
 *
 * <p>El panel MUESTRA y EDITA estos números; el reparto de un pedido en bultos lo calcula el backend con
 * ellos. Aquí no se comprueba que el límite sea «razonable» porque no hay forma de saberlo: el dato de
 * verdad lo tiene el transportista.
 */
@Injectable()
export class GuardaLimiteDeTransportista {
  private readonly limites = inject(LIMITES_DE_TRANSPORTISTA_PORT);

  async ejecuta(limite: LimiteDeTransportista): Promise<Result<void, AppError | SinClave>> {
    if (!limiteGuardable(limite)) {
      return fallo<SinClave>('sin-clave');
    }
    return this.limites.guarda(limite);
  }
}

/** Cambia si un límite está en vigor sin abrir el formulario. */
@Injectable()
export class AlternaLimiteDeTransportista {
  private readonly limites = inject(LIMITES_DE_TRANSPORTISTA_PORT);

  ejecuta(limite: LimiteDeTransportista): Promise<Result<void, AppError>> {
    return this.limites.guarda({ ...limite, activo: !limite.activo });
  }
}

@Injectable()
export class BorraLimiteDeTransportista {
  private readonly limites = inject(LIMITES_DE_TRANSPORTISTA_PORT);

  ejecuta(limite: LimiteDeTransportista): Promise<Result<void, AppError>> {
    return this.limites.borra(limite.canal, limite.pais);
  }
}

@Injectable()
export class ConsultaAlmacenes {
  private readonly almacenes = inject(ALMACENES_ADMIN_PORT);

  ejecuta(): Promise<Result<readonly Almacen[], AppError>> {
    return this.almacenes.lista();
  }
}

/** Guarda un almacén: crea si no se dio identificador, actualiza si sí. */
@Injectable()
export class GuardaAlmacen {
  private readonly almacenes = inject(ALMACENES_ADMIN_PORT);

  async ejecuta(
    id: string | null,
    datos: DatosDeAlmacen,
  ): Promise<Result<void, AppError | SinClave>> {
    if (!almacenGuardable(datos)) {
      return fallo<SinClave>('sin-clave');
    }
    return id ? this.almacenes.actualiza(id, datos) : this.almacenes.crea(datos);
  }
}

@Injectable()
export class BorraAlmacen {
  private readonly almacenes = inject(ALMACENES_ADMIN_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.almacenes.borra(id);
  }
}

/**
 * Aplica una acción a varios almacenes.
 *
 * <p>NO hay endpoint masivo: se repite la escritura por identificador. Se hace en SERIE y no en paralelo
 * a propósito —son pocas filas y el backend es el mismo—, y sobre todo se junta el parte: un lote a
 * medias sin decir cuáles fallaron obliga a repetirlo entero, y repetir un borrado ya hecho da otro
 * error encima.
 */
@Injectable()
export class AplicaLoteDeAlmacenes {
  private readonly almacenes = inject(ALMACENES_ADMIN_PORT);

  async activa(seleccionados: readonly Almacen[], activo: boolean): Promise<ParteDeLote> {
    return this.recorre(seleccionados, (almacen) =>
      this.almacenes.actualiza(almacen.id, { ...datosDe(almacen), activo }),
    );
  }

  async borra(seleccionados: readonly Almacen[]): Promise<ParteDeLote> {
    return this.recorre(seleccionados, (almacen) => this.almacenes.borra(almacen.id));
  }

  private async recorre(
    seleccionados: readonly Almacen[],
    accion: (almacen: Almacen) => Promise<Result<void, AppError>>,
  ): Promise<ParteDeLote> {
    let correctas = 0;
    const errores: string[] = [];
    for (const almacen of seleccionados) {
      const resultado = await accion(almacen);
      if (resultado.ok) {
        correctas++;
      } else {
        // El código del almacén por delante: sin él el parte es una lista de mensajes sin dueño.
        errores.push(`${almacen.codigo}: ${resultado.error.mensaje}`.trim());
      }
    }
    return { correctas, errores };
  }
}

/** Un lote vacío no es un fallo: es que no había nada seleccionado. */
export function loteVacio(): Result<ParteDeLote, never> {
  return exito({ correctas: 0, errores: [] });
}
