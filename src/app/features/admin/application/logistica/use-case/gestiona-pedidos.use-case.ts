import { Injectable, inject } from '@angular/core';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  AccionSobrePedido,
  CriterioDePedidos,
  FichaDePedido,
  PaginaDePedidos,
  Pedido,
  ResultadoEnLote,
  permite,
} from '../../../domain/logistica/model/pedido';
import {
  PEDIDOS_ADMIN_PORT,
  TRANSICIONES_DE_PEDIDO_PORT,
} from '../../../domain/logistica/port/pedidos-admin.port';

/** Busca pedidos con los filtros puestos. */
@Injectable()
export class BuscaPedidos {
  private readonly pedidos = inject(PEDIDOS_ADMIN_PORT);

  ejecuta(criterio: CriterioDePedidos): Promise<Result<PaginaDePedidos, AppError>> {
    return this.pedidos.busca(criterio);
  }
}

/** Abre la ficha de un pedido en el idioma del panel. */
@Injectable()
export class ConsultaPedido {
  private readonly pedidos = inject(PEDIDOS_ADMIN_PORT);

  ejecuta(id: string, idioma: string): Promise<Result<FichaDePedido, AppError>> {
    return this.pedidos.ficha(id, idioma);
  }
}

/** Vuelve a indexar los pedidos para que el buscador los encuentre. Es mantenimiento, no negocio. */
@Injectable()
export class ReindexaPedidos {
  private readonly pedidos = inject(PEDIDOS_ADMIN_PORT);

  ejecuta(): Promise<Result<number, AppError>> {
    return this.pedidos.reindexa();
  }
}

/**
 * Hace avanzar un pedido.
 *
 * <p>Comprueba ANTES si el estado admite la transición. No es la seguridad —el backend vuelve a
 * comprobarlo— sino evitar una petición que ya se sabe que va a fallar y un mensaje de error que quien
 * lo lee no entendería, porque desde su punto de vista el botón estaba ahí.
 */
@Injectable()
export class CambiaEstadoDePedido {
  private readonly transiciones = inject(TRANSICIONES_DE_PEDIDO_PORT);

  async ejecuta(
    pedido: Pick<Pedido, 'id' | 'estado'>,
    accion: AccionSobrePedido,
  ): Promise<Result<void, AppError>> {
    if (!permite(pedido.estado, accion)) {
      return fallo<AppError>({
        tipo: 'conflicto',
        mensaje: '',
        codigo: 'TRANSICION_NO_PERMITIDA',
      });
    }
    return this.transiciones.aplica(pedido.id, accion);
  }
}

/** El parte de un lote: lo que salió, lo que falló y lo que ni se intentó por no admitir la acción. */
export interface ParteDeLoteDePedidos extends ResultadoEnLote {
  readonly saltadas: number;
}

/**
 * Aplica una transición a varios pedidos.
 *
 * <p>Se filtran primero los que la ADMITEN y se cuentan aparte los que no: mandarlos todos haría que el
 * backend devolviera fallos por estado incompatible mezclados con fallos de verdad, y quien mira el
 * parte no sabría cuáles repetir. «Saltadas» no es un error: es «ese pedido ya no estaba para esto».
 */
@Injectable()
export class CambiaEstadoEnLote {
  private readonly transiciones = inject(TRANSICIONES_DE_PEDIDO_PORT);

  async ejecuta(
    pedidos: readonly Pick<Pedido, 'id' | 'estado'>[],
    accion: AccionSobrePedido,
  ): Promise<Result<ParteDeLoteDePedidos, AppError>> {
    const elegibles = pedidos.filter((p) => permite(p.estado, accion));
    const saltadas = pedidos.length - elegibles.length;
    if (elegibles.length === 0) {
      return exito({ correctas: 0, fallidas: 0, errores: [], saltadas });
    }
    const resultado = await this.transiciones.aplicaEnLote(
      elegibles.map((p) => p.id),
      accion,
    );
    return resultado.ok ? exito({ ...resultado.valor, saltadas }) : fallo(resultado.error);
  }

  /** Cuántos de los elegidos aceptarían la acción. Lo consulta la pantalla para no ofrecer un botón vacío. */
  cuantosElegibles(
    pedidos: readonly Pick<Pedido, 'estado'>[],
    accion: AccionSobrePedido,
  ): number {
    return pedidos.filter((p) => permite(p.estado, accion)).length;
  }
}
