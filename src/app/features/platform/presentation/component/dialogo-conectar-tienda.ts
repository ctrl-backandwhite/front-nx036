import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FieldTree, FormField, form, required, validate } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PlataformaDeTienda, SolicitudDeConexion, estaDisponible } from '../../domain/model/tienda';
import { VentanaModal } from './ventana-modal';

/** Lo que se teclea para conectar una tienda. Todas las claves presentes: Signal Forms crea un campo
 *  por cada una que EXISTE en el objeto, y una que falte deja la plantilla sin nada a lo que atarse. */
interface DatosDeConexion {
  plataforma: string;
  identificador: string;
  token: string;
}

/**
 * El formulario de conexión de una tienda.
 *
 * <p>Componente aparte de la pantalla porque la pantalla ya tenía bastante con la lista y sus acciones;
 * y porque así el formulario se puede probar solo, que es donde están las trampas: los nombres de los
 * campos y el relleno automático del navegador.
 *
 * <p>El estado lo lleva Signal Forms. Lo que antes estaba repartido —un `computed` que sumaba tres
 * comprobaciones sueltas para apagar el botón— ahora es un esquema: quien lee el fichero ve de un
 * vistazo qué exige el formulario, y quien se deja el identificador ve POR QUÉ no puede enviar, en vez
 * de un botón apagado sin explicación.
 */
@Component({
  selector: 'nx-dialogo-conectar-tienda',
  imports: [FormField, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="t('shops.connect')" (cierra)="cancela.emit()">
      <form class="space-y-3 mt-3" (submit)="envia($event)">
        <div>
          <label for="tienda-plataforma" class="text-xs text-ink-500">
            {{ t('shops.connect.platform') }}
          </label>
          <select id="tienda-plataforma" class="input mt-1" [formField]="formulario.plataforma">
            @for (opcion of plataformas(); track opcion.codigo) {
              <option [value]="opcion.codigo" [disabled]="!opcion.disponible">
                {{ opcion.etiqueta }}{{ opcion.disponible ? '' : ' — ' + t('shops.coming_soon') }}
              </option>
            }
          </select>
        </div>

        <!--
          autocomplete="off", y new-password en el token: sin esto, Chrome rellenaba el identificador
          de la tienda con el correo de quien había entrado y pegaba tokens guardados de otras webs. El
          resultado era una conexión que fallaba sin motivo aparente. El atributo «name» propio que
          había aquí lo pone ahora la propia directiva —uno único por campo—, que es lo mismo que se
          buscaba: en un nodo con [formField] no se puede escribir a mano.
        -->
        <div>
          <label for="tienda-identificador" class="text-xs text-ink-500">
            {{ t('shops.connect.handle') }}
          </label>
          <input
            id="tienda-identificador"
            class="input mt-1"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="my-shop.myshopify.com"
            [formField]="formulario.identificador"
          />
          @if (falloDe(formulario.identificador); as fallo) {
            <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
          }
        </div>

        <div>
          <label for="tienda-token" class="text-xs text-ink-500">
            {{ t('shops.connect.token') }}
          </label>
          <input
            id="tienda-token"
            type="password"
            class="input mt-1"
            autocomplete="new-password"
            spellcheck="false"
            [formField]="formulario.token"
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
   *
   * <p>Se recalcula SOLO la plataforma y se conserva lo ya tecleado: si cambiar de plataforma borrara
   * el identificador y el token, quien se equivoca de desplegable pierde el token que acaba de pegar.
   */
  protected readonly modelo = linkedSignal<string, DatosDeConexion>({
    source: this.inicial,
    computation: (inicial, anterior) => ({
      plataforma: inicial,
      identificador: anterior?.value.identificador ?? '',
      token: anterior?.value.token ?? '',
    }),
  });

  /**
   * Lo que el formulario exige. El token es opcional a propósito: hay plataformas que lo piden después.
   *
   * <p>La plataforma no disponible se declara aquí como error SIN mensaje: la opción ya sale marcada
   * «Próximamente» y deshabilitada en el propio desplegable, así que repetirlo debajo sería ruido. Lo
   * que aporta es que el botón se apague solo, sin que el manejador tenga que acordarse.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    validate(ruta.plataforma, ({ value }) =>
      estaDisponible(this.plataformas(), value()) ? null : { kind: 'no-disponible' },
    );
    required(ruta.identificador, { message: () => this.t('dialog.field.required') });
    // Y además sin espacios a secas: «   » no es un identificador de tienda, pero no está vacío.
    validate(ruta.identificador, ({ value }) =>
      value().trim() === '' ? { kind: 'en-blanco', message: this.t('dialog.field.required') } : null,
    );
  });

  /**
   * No se envía mientras la plataforma no esté disponible: el botón deshabilitado dice lo mismo que
   * diría un error del servidor, pero antes de que nadie pegue su token.
   */
  protected readonly sePuedeEnviar = computed(
    () => !this.enviando() && !this.formulario().invalid(),
  );

  protected envia(evento: Event): void {
    evento.preventDefault();
    if (!this.sePuedeEnviar()) {
      return;
    }
    const datos = this.modelo();
    this.conecta.emit({
      plataforma: datos.plataforma,
      identificador: datos.identificador,
      token: datos.token || undefined,
    });
  }

  /**
   * El mensaje que toca enseñar bajo un campo, o nulo. Se calla hasta que el campo se ha TOCADO:
   * pintar de rojo un formulario recién abierto acusa a quien todavía no ha escrito nada.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }
}
