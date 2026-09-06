import { Injectable, computed, inject, signal } from '@angular/core';
import { PreferenciasService } from '@core/preferences/preferencias';
import { Divisa, convierte, formatea, localeDeDivisa } from '../../../domain/gestion/model/dinero';
import { TIPOS_DE_CAMBIO_PORT } from '../../../domain/gestion/port/tipos-de-cambio.port';

/**
 * Cómo se escribe un importe en el panel.
 *
 * <p>Es ESTADO, no una utilidad: hace falta saber la divisa activa y las tasas vigentes, y las tasas
 * llegan por la red. Guardarlas aquí es lo que permite que `escribe()` sea síncrona y se pueda llamar
 * desde una plantilla sin encadenar promesas por cada celda de una tabla.
 *
 * <p>Mientras las tasas no han llegado se formatea SIN convertir. Es deliberado: enseñar el importe en
 * dólares un instante es correcto —el dato canónico es ese— y mucho mejor que dejar la columna vacía o
 * pintar un importe convertido con una tasa inventada.
 *
 * <p>Un fallo al pedir las tasas NO se propaga: el panel sigue funcionando con dólares. Que no se pueda
 * consultar el cambio no puede impedir administrar pedidos.
 */
@Injectable()
export class ImportesStore {
  private readonly preferencias = inject(PreferenciasService);
  private readonly tipos = inject(TIPOS_DE_CAMBIO_PORT);

  private readonly _divisas = signal<readonly Divisa[]>([]);
  private cargando = false;

  readonly divisas = this._divisas.asReadonly();

  /** La divisa en la que se pinta. Sale de la preferencia, que es el único sitio que la guarda. */
  readonly activa = computed(() => this.preferencias.moneda());

  /** El idioma con el que se puntúa: el del registro de la divisa y, si no lo trae, el habitual de esa divisa. */
  private readonly locale = computed(() => {
    const codigo = this.activa();
    return this._divisas().find((d) => d.codigo === codigo)?.locale ?? localeDeDivisa(codigo);
  });

  /**
   * Carga las tasas una sola vez.
   *
   * <p>La llaman las pantallas que enseñan importes. Repetirla no cuesta nada: la segunda vez sale por
   * el guardia, así que no hay que coordinar quién la dispara.
   */
  async carga(): Promise<void> {
    if (this.cargando || this._divisas().length > 0) {
      return;
    }
    this.cargando = true;
    const resultado = await this.tipos.vigentes();
    if (resultado.ok) {
      this._divisas.set(resultado.valor);
    }
    this.cargando = false;
  }

  /**
   * El importe, convertido a la divisa activa y escrito para leerlo.
   *
   * <p>`origen` es la divisa en la que viene el número. Casi siempre son dólares —es como el backend
   * guarda todo—, pero el programa de afiliados paga en la suya y ahí hay que decirlo.
   */
  escribe(importe: number | null | undefined, origen: string | null = 'USD'): string {
    if (importe == null || !Number.isFinite(importe)) {
      return '—';
    }
    const destino = this.activa();
    return formatea(convierte(importe, origen, destino, this._divisas()), destino, this.locale());
  }

  /** Lo mismo, partiendo de céntimos, que es como llegan casi todos los importes del backend. */
  escribeCentimos(centimos: number | null | undefined, origen: string | null = 'USD'): string {
    return centimos == null ? '—' : this.escribe(centimos / 100, origen);
  }
}
