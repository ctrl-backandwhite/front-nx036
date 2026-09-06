import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { ReferidoPort } from '../domain/port/referido.port';

const CLAVE_CODIGO = 'nx036-aff-ref';
const CLAVE_VISITANTE = 'nx036-aff-visitor';

/**
 * La atribución de la venta a quien la recomendó.
 *
 * <p>Son DOS llamadas y las dos importan: la primera apunta la visita contra el código, y la segunda la
 * ata a la cuenta que está comprando. Sin la segunda, la comisión se queda colgando de un visitante
 * anónimo y nunca se paga.
 *
 * <p>El identificador de visitante vive en el equipo y se crea al vuelo si no había. Va aquí, en la
 * infraestructura, porque es un detalle del navegador: el dominio solo habla de códigos.
 */
@Injectable()
export class ReferidoHttpAdapter implements ReferidoPort {
  private readonly api = inject(ApiService);
  private readonly almacen = inject(ALMACEN_LOCAL);

  pendiente(): string | null {
    return this.almacen.lee(CLAVE_CODIGO);
  }

  async aplica(codigo: string): Promise<Result<boolean, AppError>> {
    const respuesta = await this.api.post<{ visitorToken: string; attributed: boolean }>(
      '/affiliate/track',
      { ref: codigo, visitorToken: this.visitante() },
    );
    if (!respuesta.ok) {
      return fallo(respuesta.error);
    }
    if (!respuesta.valor?.attributed) {
      return exito(false);
    }
    this.almacen.guarda(CLAVE_CODIGO, codigo);
    // Si el enlace con la cuenta falla se sigue adelante: la venta ya está atribuida al visitante y la
    // pantalla no puede hacer nada distinto. Bloquear la compra por esto sería desproporcionado.
    await this.api.post<void>('/me/affiliate/bind', { visitorToken: this.visitante() });
    return exito(true);
  }

  /** El identificador del visitante, creado la primera vez. Sin almacenamiento, uno de usar y tirar. */
  private visitante(): string {
    const guardado = this.almacen.lee(CLAVE_VISITANTE);
    if (guardado) {
      return guardado;
    }
    const nuevo = crypto.randomUUID();
    this.almacen.guarda(CLAVE_VISITANTE, nuevo);
    return nuevo;
  }
}
