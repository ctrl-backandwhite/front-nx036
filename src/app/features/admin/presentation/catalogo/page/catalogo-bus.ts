import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { esNavegador } from '@core/platform/plataforma';
import { ConsultaAnunciosFallidos } from '../../../application/catalogo/use-case/revisa-anuncios-al-bus.use-case';
import { ReintentaAnunciosAlBus } from '../../../application/catalogo/use-case/reintenta-anuncios-al-bus.use-case';
import { AnuncioFallido } from '../../../domain/catalogo/port/productos-admin.port';
import { mensajeDeError } from '../etiquetas';

/** Cada cuánto se vuelve a mirar. Medio minuto basta para que el aviso salga sin recargar la página. */
const REVISION_MS = 30_000;

/**
 * Los anuncios al bus del catálogo que se dieron por perdidos.
 *
 * <p>Se consulta sola cada medio minuto porque certificar responde AL INSTANTE —el envío al bus va
 * diferido— y el fallo no cabe en esa respuesta: sin esta revisión, un producto certificado que no
 * llegó a producción no se echaría en falta hasta semanas después.
 */
@Injectable()
export class AnunciosDelBus {
  private readonly t = inject(TraduccionService).t;
  private readonly tCon = inject(TraduccionService).tCon;
  private readonly avisos = inject(AvisosStore);
  private readonly consulta = inject(ConsultaAnunciosFallidos);
  private readonly reintento = inject(ReintentaAnunciosAlBus);

  private readonly _fallidos = signal<readonly AnuncioFallido[]>([]);
  private readonly _reintentando = signal(false);

  readonly fallidos = this._fallidos.asReadonly();
  readonly reintentando = this._reintentando.asReadonly();

  constructor() {
    // Al prerenderizar no hay temporizadores ni sesión: el sondeo solo tiene sentido en el navegador.
    if (!esNavegador()) {
      return;
    }
    void this.revisa();
    const temporizador = setInterval(() => void this.revisa(), REVISION_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(temporizador));
  }

  private async revisa(): Promise<void> {
    const resultado = await this.consulta.ejecuta();
    if (resultado.ok) {
      this._fallidos.set(resultado.valor);
    }
  }

  async reintenta(): Promise<void> {
    this._reintentando.set(true);
    try {
      const resultado = await this.reintento.ejecuta();
      if (!resultado.ok) {
        this.avisos.error(mensajeDeError(this.t, resultado.error));
        return;
      }
      this.avisos.exito(this.tCon('admin.catalog.bus.retry_done', { n: resultado.valor }));
      await this.revisa();
    } finally {
      this._reintentando.set(false);
    }
  }
}
