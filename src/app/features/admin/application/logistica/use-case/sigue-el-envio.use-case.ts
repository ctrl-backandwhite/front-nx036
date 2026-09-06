import { Injectable, inject } from '@angular/core';
import { Result, fallo, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Seguimiento } from '../../../domain/logistica/model/seguimiento';
import {
  FACTURA_DE_PEDIDO_PORT,
  SEGUIMIENTO_ADMIN_PORT,
} from '../../../domain/logistica/port/pedidos-admin.port';
import { DESCARGA_DE_FICHEROS_PORT } from '../../../domain/logistica/port/navegador.port';

/** Consulta el rastro del envío. */
@Injectable()
export class ConsultaSeguimiento {
  private readonly seguimiento = inject(SEGUIMIENTO_ADMIN_PORT);

  ejecuta(pedidoId: string): Promise<Result<Seguimiento, AppError>> {
    return this.seguimiento.consulta(pedidoId);
  }
}

/**
 * Fuerza una consulta al transportista y devuelve el rastro ya actualizado.
 *
 * <p>Las dos llamadas van juntas porque sincronizar sin volver a leer deja la pantalla igual que estaba:
 * quien pulsa «sincronizar» quiere ver el cambio, no que le digan que se ha pedido.
 */
@Injectable()
export class SincronizaSeguimiento {
  private readonly seguimiento = inject(SEGUIMIENTO_ADMIN_PORT);

  async ejecuta(pedidoId: string): Promise<Result<Seguimiento, AppError>> {
    const sincronizado = await this.seguimiento.sincroniza(pedidoId);
    if (!sincronizado.ok) {
      return fallo(sincronizado.error);
    }
    return this.seguimiento.consulta(pedidoId);
  }
}

/**
 * Descarga la factura del pedido.
 *
 * <p>Pedirla y guardarla van en el mismo caso de uso porque son un solo gesto: si la pantalla tuviera
 * que acordarse de llamar a los dos puertos, el día que uno falle la mitad de las pantallas se
 * olvidarían de la otra mitad.
 */
@Injectable()
export class DescargaFactura {
  private readonly factura = inject(FACTURA_DE_PEDIDO_PORT);
  private readonly ficheros = inject(DESCARGA_DE_FICHEROS_PORT);

  async ejecuta(pedidoId: string, numeroDePedido: string): Promise<Result<void, AppError>> {
    const respuesta = await this.factura.descarga(pedidoId);
    return mapea(respuesta, (blob) => {
      this.ficheros.guarda(`${numeroDePedido || 'factura'}.pdf`, blob);
    });
  }
}
