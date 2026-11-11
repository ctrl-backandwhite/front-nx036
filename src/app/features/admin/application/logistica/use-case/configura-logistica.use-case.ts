import { Injectable, inject } from '@angular/core';
import {
  FiltroDeTarifas,
  TarifaDeTransportista,
} from '../../../domain/logistica/model/tarifa-transportista';
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
  COBERTURA_DE_TRANSPORTISTA_PORT,
  LIMITES_DE_TRANSPORTISTA_PORT,
  TARIFAS_DE_TRANSPORTISTA_PORT,
} from '../../../domain/logistica/port/configuracion-logistica.port';
import {
  CoberturaDeTransportista,
  coberturaGuardable,
} from '../../../domain/logistica/model/cobertura-transportista';

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
    return this.limites.borra(limite.carrier, limite.canal, limite.pais);
  }
}

/** Consulta a qué países llega cada transportista, destinos apagados incluidos. */
@Injectable()
export class ConsultaCoberturaDeTransportista {
  private readonly cobertura = inject(COBERTURA_DE_TRANSPORTISTA_PORT);

  ejecuta(): Promise<Result<readonly CoberturaDeTransportista[], AppError>> {
    return this.cobertura.lista();
  }
}

/**
 * Los transportistas a los que se les puede declarar cobertura.
 *
 * <p>Salen del backend y no de una constante del front: la lista es la de los proveedores REGISTRADOS,
 * y una copia aquí se quedaría vieja el día que se añada o se retire uno — con el agravante de que la
 * fila mal escrita se guardaría igual y el destino seguiría sin servirse.
 */
@Injectable()
export class ConsultaTransportistasDisponibles {
  private readonly cobertura = inject(COBERTURA_DE_TRANSPORTISTA_PORT);

  ejecuta(): Promise<Result<readonly string[], AppError>> {
    return this.cobertura.transportistas();
  }
}

/**
 * Guarda la cobertura de un destino. Alta y edición son lo mismo: la clave es transportista+país.
 *
 * <p>Es la operación que permite encender uno de los destinos que solo cubre el segundo transportista
 * sin pasar por una migración, que es para lo que existe la pantalla.
 */
@Injectable()
export class GuardaCoberturaDeTransportista {
  private readonly cobertura = inject(COBERTURA_DE_TRANSPORTISTA_PORT);

  async ejecuta(
    cobertura: CoberturaDeTransportista,
  ): Promise<Result<void, AppError | SinClave>> {
    if (!coberturaGuardable(cobertura)) {
      return fallo<SinClave>('sin-clave');
    }
    return this.cobertura.guarda(cobertura);
  }
}

/**
 * Enciende o apaga un destino sin abrir el formulario.
 *
 * <p>Es la acción normal, y por eso está separada del borrado: apagar conserva la tarifa de reserva y
 * el plazo ya medidos para cuando el destino vuelva; borrar los pierde y hay que averiguarlos otra vez.
 */
@Injectable()
export class AlternaCoberturaDeTransportista {
  private readonly cobertura = inject(COBERTURA_DE_TRANSPORTISTA_PORT);

  ejecuta(cobertura: CoberturaDeTransportista): Promise<Result<void, AppError>> {
    return this.cobertura.guarda({ ...cobertura, habilitado: !cobertura.habilitado });
  }
}

@Injectable()
export class BorraCoberturaDeTransportista {
  private readonly cobertura = inject(COBERTURA_DE_TRANSPORTISTA_PORT);

  ejecuta(cobertura: CoberturaDeTransportista): Promise<Result<void, AppError>> {
    return this.cobertura.borra(cobertura.carrier, cobertura.pais);
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

/**
 * Lo que cuesta cada canal del transportista en cada destino.
 *
 * <p>La tabla la mide sola un cron cada tres horas. Estos casos de uso son para MIRARLA y para forzar
 * una medición cuando el transportista acaba de cambiar precios y no se quiere esperar a la siguiente
 * pasada.
 */
@Injectable()
export class ConsultaTarifasDeTransportista {
  private readonly tarifas = inject(TARIFAS_DE_TRANSPORTISTA_PORT);

  ejecuta(filtro: FiltroDeTarifas): Promise<Result<readonly TarifaDeTransportista[], AppError>> {
    return this.tarifas.lista(filtro);
  }
}

/**
 * Vuelve a medir la tarifa de un destino, o la de todos.
 *
 * <p>El barrido completo son varios minutos —una tanda de llamadas por destino—, así que quien lo
 * lanza tiene que verlo trabajando: la pantalla deja el botón ocupado hasta que responde.
 */
@Injectable()
export class RefrescaTarifasDeTransportista {
  private readonly tarifas = inject(TARIFAS_DE_TRANSPORTISTA_PORT);

  unDestino(pais: string): Promise<Result<number, AppError>> {
    return this.tarifas.refrescaDestino(pais);
  }

  todos(): Promise<Result<number, AppError>> {
    return this.tarifas.refrescaTodo();
  }
}

/**
 * Corrige a mano una fila de tarifa.
 *
 * <p><b>Lo que se escriba aquí se pisa en el siguiente refresco</b>, porque la fuente de verdad es el
 * transportista. Sirve de parche mientras se aclara con la gestora; para que un valor sobreviva hay
 * que desactivar la fila, no editarla.
 */
@Injectable()
export class GuardaTarifaDeTransportista {
  private readonly tarifas = inject(TARIFAS_DE_TRANSPORTISTA_PORT);

  ejecuta(tarifa: TarifaDeTransportista): Promise<Result<void, AppError>> {
    return this.tarifas.guarda(tarifa);
  }
}

/**
 * Borra una fila de tarifa.
 *
 * <p>No deja el destino sin tarifa para siempre: el siguiente refresco la vuelve a medir. Si lo que
 * se quiere es que un canal NO se ofrezca, se desactiva.
 */
@Injectable()
export class BorraTarifaDeTransportista {
  private readonly tarifas = inject(TARIFAS_DE_TRANSPORTISTA_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.tarifas.borra(id);
  }
}
