import { Injectable, inject, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { ComprimeImagenesHistoricas } from '../../../application/catalogo/use-case/comprime-imagenes-historicas.use-case';
import { EstadoDeCompresion } from '../../../domain/catalogo/port/productos-admin.port';

/**
 * El interruptor de la compresión del histórico de imágenes.
 *
 * <p>Solo avanza con la PÁGINA ABIERTA, y por eso el botón se queda encendido y va contando lo que
 * queda: el trabajo completo son unas treinta horas y nadie lo deja de una sentada. Lo que sí se
 * garantiza es que nada se pierde al cerrar y que al volver continúa donde estaba.
 *
 * <p>El aviso de fallo lleva el CÓDIGO. Un «no se pudo comprimir» a secas no permite distinguir un
 * servidor sin desplegar de una sesión caducada, y obliga a abrir las herramientas del navegador para
 * saber lo mínimo. El 404 se traduce aparte porque es el caso probable —panel nuevo contra servidor
 * viejo— y su lectura no es evidente.
 */
@Injectable()
export class CompresionDelHistorico {
  private readonly t = inject(TraduccionService).t;
  private readonly avisos = inject(AvisosStore);
  private readonly comprime = inject(ComprimeImagenesHistoricas);

  private readonly _activa = signal(false);
  private readonly _estado = signal<EstadoDeCompresion | null>(null);

  readonly activa = this._activa.asReadonly();
  readonly estado = this._estado.asReadonly();

  alterna(): void {
    if (this._activa()) {
      this._activa.set(false);
      return;
    }
    this._activa.set(true);
    void this.arranca();
  }

  private async arranca(): Promise<void> {
    const resultado = await this.comprime.ejecuta(
      () => this._activa(),
      (estado) => this._estado.set(estado),
    );
    this._activa.set(false);
    if (!resultado.ok) {
      const clave =
        resultado.error.estado === 404
          ? 'admin.catalog.compress.error_404'
          : 'admin.catalog.compress.error';
      const detalle = resultado.error.estado ? ` (HTTP ${resultado.error.estado})` : '';
      this.avisos.error(`${this.t(clave)}${resultado.error.estado === 404 ? '' : detalle}`);
    }
  }
}
