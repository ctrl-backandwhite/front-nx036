import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@core/config/app-config';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { mapeaError } from '@core/http/mapea-error';
import { ArchivoDescargable } from '../domain/model/pedido';
import { FacturaDePedidoPort } from '../domain/port/pedidos.port';

/**
 * La factura en PDF.
 *
 * <p>Es el ÚNICO adaptador del contexto que no pasa por `ApiService`, y por un motivo concreto: ese
 * servicio solo habla JSON y un PDF necesita `responseType: 'blob'`. Se usa `HttpClient` directamente,
 * que sigue pasando por los interceptores —así la credencial viaja igual—, y el fallo se traduce con el
 * mismo `mapeaError` para que el puerto cumpla su contrato entero, incluido cómo falla.
 *
 * <p>La factura es un recurso protegido: abrirlo como un enlace normal no lleva la credencial —viaja en
 * la cabecera, no en una cookie— y el servidor responde 401. Por eso se descarga aquí y se entrega ya
 * como archivo.
 */
@Injectable()
export class FacturaHttpAdapter implements FacturaDePedidoPort {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  async descarga(
    id: string,
    numero: string,
    idioma: string,
  ): Promise<Result<ArchivoDescargable, AppError>> {
    try {
      const contenido = await firstValueFrom(
        this.http.get(`${this.config.apiBase}/api/me/orders/${id}/invoice.pdf`, {
          params: { lang: idioma },
          responseType: 'blob',
        }),
      );
      return exito({ contenido, nombre: `${numero || 'factura'}.pdf` });
    } catch (error) {
      return fallo(mapeaError(error));
    }
  }
}
