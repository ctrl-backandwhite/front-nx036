import { Injectable, inject } from '@angular/core';
import { Result, fallo } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  PedidoNuevo,
  ResultadoDeImportacion,
  faltanDatosDeEnvio,
} from '../../../domain/logistica/model/pedido';
import {
  ALTA_DE_PEDIDOS_PORT,
  BUSCADOR_DE_PRODUCTOS_PORT,
} from '../../../domain/logistica/port/pedidos-admin.port';

/** Los motivos por los que un alta no llega ni a salir. Se comprueban aquí para no gastar una petición. */
export type MotivoDeRechazo = 'sin-lineas' | 'sin-direccion';

/**
 * Da de alta un pedido a mano.
 *
 * <p>Un pedido sin líneas o sin dirección no es un pedido: el backend lo rechazaría igual, pero
 * comprobarlo aquí permite decir cuál de las dos cosas falta en vez de repetir el mensaje del servidor.
 */
@Injectable()
export class CreaPedido {
  private readonly alta = inject(ALTA_DE_PEDIDOS_PORT);

  async ejecuta(pedido: PedidoNuevo): Promise<Result<void, AppError | MotivoDeRechazo>> {
    if (pedido.lineas.length === 0) {
      return fallo<MotivoDeRechazo>('sin-lineas');
    }
    if (faltanDatosDeEnvio(pedido.direccionDeEnvio)) {
      return fallo<MotivoDeRechazo>('sin-direccion');
    }
    return this.alta.crea(pedido);
  }
}

/** Vuelca varios pedidos de golpe. El parte por fila lo da el backend: una fila mala no aborta el resto. */
@Injectable()
export class ImportaPedidos {
  private readonly alta = inject(ALTA_DE_PEDIDOS_PORT);

  ejecuta(pedidos: readonly PedidoNuevo[]): Promise<Result<ResultadoDeImportacion, AppError>> {
    return this.alta.importa(pedidos);
  }
}

/** Siembra un pedido de mentira. Solo se ofrece en desarrollo: en producción no existe el botón. */
@Injectable()
export class CreaPedidoDeDemostracion {
  private readonly alta = inject(ALTA_DE_PEDIDOS_PORT);

  ejecuta(): Promise<Result<void, AppError>> {
    return this.alta.creaDemostracion();
  }
}

/** Busca productos para las líneas del pedido nuevo. */
@Injectable()
export class BuscaProductosParaPedido {
  private readonly buscador = inject(BUSCADOR_DE_PRODUCTOS_PORT);

  ejecuta(
    texto: string,
    idioma: string,
  ): Promise<Result<readonly { readonly id: string; readonly titulo: string }[], AppError>> {
    return this.buscador.busca(texto, idioma);
  }
}
