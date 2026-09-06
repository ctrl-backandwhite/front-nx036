import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PlataformaDeTienda, SolicitudDeConexion, estaDisponible } from '../../domain/model/tienda';
import { VentanaModal } from './ventana-modal';

/**
 * El formulario de conexión de una tienda.
 *
 * <p>Componente aparte de la pantalla porque la pantalla ya tenía bastante con la lista y sus acciones;
 * y porque así el formulario se puede probar solo, que es donde están las trampas: los nombres de los
 * campos y el relleno automático del navegador.
 */
@Component({
  selector: 'nx-dialogo-conectar-tienda',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="t('shops.connect')" (cierra)="cancela.emit()">
      <form class="space-y-3 mt-3" (submit)="envia($event)">
        <div>
          <label for="tienda-plataforma" class="text-xs text-ink-500">
            {{ t('shops.connect.platform') }}
          </label>
          <select
            id="tienda-plataforma"
            class="input mt-1"
            [value]="plataforma()"
            (change)="plataforma.set(valor($event))"
          >
            @for (opcion of plataformas(); track opcion.codigo) {
              <option [value]="opcion.codigo" [disabled]="!opcion.disponible">
                {{ opcion.etiqueta }}{{ opcion.disponible ? '' : ' — ' + t('shops.coming_soon') }}
              </option>
            }
          </select>
        </div>

        <!--
          autocomplete="off" con nombre propio, y new-password en el token: sin esto, Chrome
          rellenaba el identificador de la tienda con el correo de quien había entrado y pegaba tokens
          guardados de otras webs. El resultado era una conexión que fallaba sin motivo aparente.
        -->
        <div>
          <label for="tienda-identificador" class="text-xs text-ink-500">
            {{ t('shops.connect.handle') }}
          </label>
          <input
            id="tienda-identificador"
            name="tienda-identificador"
            class="input mt-1"
            required
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="my-shop.myshopify.com"
            [value]="identificador()"
            (input)="identificador.set(valor($event))"
          />
        </div>

        <div>
          <label for="tienda-token" class="text-xs text-ink-500">
            {{ t('shops.connect.token') }}
          </label>
          <input
            id="tienda-token"
            name="tienda-token"
            type="password"
            class="input mt-1"
            autocomplete="new-password"
            spellcheck="false"
            [value]="token()"
            (input)="token.set(valor($event))"
          />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn btn-ghost" (click)="cancela.emit()">
            {{ t('common.cancel') }}
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="!sePuedeEnviar()">
            {{ enviando() ? t('common.saving') : t('shops.connect') }}
          </button>
        </div>
      </form>
    </nx-ventana-modal>
  `,
})
export class DialogoConectarTienda {
  readonly plataformas = input.required<readonly PlataformaDeTienda[]>();
  /** La plataforma preseleccionada al abrir desde el mosaico del estado vacío. */
  readonly inicial = input('shopify');
  readonly enviando = input(false);

  readonly conecta = output<SolicitudDeConexion>();
  readonly cancela = output<void>();

  protected readonly t = inject(TraduccionService).t;

  /**
   * `linkedSignal`: la elección de fuera —el mosaico del estado vacío preselecciona una plataforma— se
   * respeta al abrir, y a partir de ahí manda lo que se elija en el desplegable.
   */
  protected readonly plataforma = linkedSignal(() => this.inicial());
  protected readonly identificador = signal('');
  protected readonly token = signal('');

  /**
   * No se envía mientras la plataforma no esté disponible: el botón deshabilitado dice lo mismo que
   * diría un error del servidor, pero antes de que nadie pegue su token.
   */
  protected readonly sePuedeEnviar = computed(
    () =>
      !this.enviando() &&
      this.identificador().trim().length > 0 &&
      estaDisponible(this.plataformas(), this.plataforma()),
  );

  protected envia(evento: Event): void {
    evento.preventDefault();
    if (!this.sePuedeEnviar()) {
      return;
    }
    this.conecta.emit({
      plataforma: this.plataforma(),
      identificador: this.identificador(),
      token: this.token() || undefined,
    });
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }
}
