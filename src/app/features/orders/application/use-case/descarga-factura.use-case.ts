import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ArchivoDescargable } from '../../domain/model/pedido';
import { FACTURA_DE_PEDIDO_PORT } from '../../domain/port/pedidos.port';

/**
 * La factura del pedido, ya con su nombre de archivo.
 *
 * <p>Devuelve el archivo en vez de guardarlo: entregarlo al navegador es plumbing de pantalla, y meter
 * aquí un elemento del documento ataría el caso de uso a que exista un DOM.
 */
@Injectable()
export class DescargaFactura {
  private readonly factura = inject(FACTURA_DE_PEDIDO_PORT);
  private readonly traduccion = inject(TraduccionService);

  ejecuta(id: string, numero: string): Promise<Result<ArchivoDescargable, AppError>> {
    return this.factura.descarga(id, numero, this.traduccion.idioma());
  }
}
