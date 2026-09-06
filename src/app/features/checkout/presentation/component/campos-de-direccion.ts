import { Component, computed, inject, input, model } from '@angular/core';
import { FieldTree, FormField, form, maxLength, required } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { SelectorPais } from '@ds/component/pais/selector-pais';
import { Provincia, SelectorProvincia } from '@ds/component/provincia/selector-provincia';
import { DireccionDeEnvio } from '../../domain/model/pedido';

/**
 * Una dirección con TODAS sus claves presentes, aunque vayan vacías.
 *
 * <p>No es un capricho de tipos: Signal Forms construye un campo por cada clave que EXISTE en el objeto.
 * Una dirección que llegue sin `linea2` no tiene campo `linea2`, y la plantilla se queda sin nada a lo
 * que atarse —revienta al pintar, no al validar—. Exigiéndolo en el tipo, el compilador obliga a quien
 * la pasa a completarla y el fallo no puede llegar a ejecución.
 */
export type DireccionEditable = Required<DireccionDeEnvio>;

/**
 * El formulario de una dirección de envío.
 *
 * <p>Es una versión MÍNIMA hecha dentro de «checkout». El componente equivalente del front anterior está
 * asignado al contexto de la cuenta, que aún no se ha portado, y el pago no puede importar sus piezas: el
 * lint lo impide y con razón. Cuando exista, lo natural es que suba al sistema de diseño —lo usan la
 * cuenta, las direcciones y el pago— y este fichero desaparezca. Queda anotado en el informe.
 *
 * <p>El estado del formulario lo lleva Signal Forms sobre el propio `model()`: la señal del modelo ES la
 * que viaja al padre, así que la dirección sigue subiendo en cada pulsación igual que antes, pero ahora
 * hay UN sitio que sabe si está completa (`formulario().invalid()`) y cuál de los campos falta. Antes eso
 * estaba repartido: el padre repetía la comprobación en `direccionUtilizable()` y el formulario no decía
 * nada, así que quien se dejaba la ciudad veía el botón de pagar apagado sin saber por qué. En el paso
 * del pago eso es abandono directo.
 *
 * <p>Los mensajes se enseñan solo cuando el campo se ha TOCADO: pintar de rojo una dirección recién
 * abierta, con los siete campos vacíos, acusa a quien todavía no ha escrito nada.
 *
 * <p>El país es una regla de negocio importante: aquí solo decide adónde se envía y qué provincias hay,
 * NUNCA el precio —el margen lo fija el país de registro de la cuenta—.
 *
 * <p>MÓVIL PRIMERO: una columna, y a partir de `sm` los pares que se leen juntos —ciudad y código postal,
 * provincia y país— se ponen en dos.
 *
 * <p>Cada campo con su `<label for>`: sin él, quien usa un lector de pantalla oye «cuadro de texto» siete
 * veces seguidas y no puede rellenar una dirección.
 */
@Component({
  selector: 'nx-campos-de-direccion',
  imports: [FormField, SelectorPais, SelectorProvincia],
  template: `
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div class="sm:col-span-2">
        <label class="text-xs text-ink-500" [attr.for]="id('nombre')">{{
          t('checkout.full_name')
        }}</label>
        <input
          [id]="id('nombre')"
          class="input mt-1 w-full"
          autocomplete="name"
          [formField]="formulario.nombreCompleto"
        />
        @if (falloDe(formulario.nombreCompleto); as fallo) {
          <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
        }
      </div>

      <div class="sm:col-span-2">
        <label class="text-xs text-ink-500" [attr.for]="id('linea1')">{{
          t('checkout.line1')
        }}</label>
        <input
          [id]="id('linea1')"
          class="input mt-1 w-full"
          autocomplete="address-line1"
          [formField]="formulario.linea1"
        />
        @if (falloDe(formulario.linea1); as fallo) {
          <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
        }
      </div>

      <div class="sm:col-span-2">
        <label class="text-xs text-ink-500" [attr.for]="id('linea2')">{{
          t('checkout.line2')
        }}</label>
        <input
          [id]="id('linea2')"
          class="input mt-1 w-full"
          autocomplete="address-line2"
          [formField]="formulario.linea2"
        />
      </div>

      <div>
        <label class="text-xs text-ink-500" [attr.for]="id('ciudad')">{{
          t('checkout.city')
        }}</label>
        <input
          [id]="id('ciudad')"
          class="input mt-1 w-full"
          autocomplete="address-level2"
          [formField]="formulario.ciudad"
        />
        @if (falloDe(formulario.ciudad); as fallo) {
          <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
        }
      </div>

      <div>
        <label class="text-xs text-ink-500" [attr.for]="id('cp')">{{
          t('checkout.postal_code')
        }}</label>
        <input
          [id]="id('cp')"
          class="input mt-1 w-full"
          autocomplete="postal-code"
          [formField]="formulario.codigoPostal"
        />
      </div>

      <div>
        <label class="text-xs text-ink-500" [attr.for]="id('provincia')">{{
          t('checkout.state')
        }}</label>
        <!-- La provincia viaja como CÓDIGO cuando el país tiene lista: es lo que el servidor usa para
             calcular el impuesto por región. El selector es una pieza del sistema de diseño y no habla
             el protocolo de Signal Forms, así que se ata al valor del campo en lugar de con la
             directiva formField; el estado sigue viviendo en el formulario. -->
        <nx-selector-provincia
          [valor]="formulario.provincia().value()"
          (valorChange)="formulario.provincia().value.set($event)"
          [provincias]="provincias()"
          [marcador]="t('checkout.state')"
          [etiqueta]="t('checkout.state')"
          claseSelect="input mt-1 w-full"
          claseInput="input mt-1 w-full"
        />
      </div>

      <div>
        <label class="text-xs text-ink-500" [attr.for]="id('pais')">{{
          t('checkout.country_iso')
        }}</label>
        <nx-selector-pais
          [valor]="formulario.pais().value()"
          (valorChange)="eligePais($event)"
          [etiqueta]="t('checkout.country_iso')"
          clase="input mt-1 w-full"
        />
        @if (falloDe(formulario.pais); as fallo) {
          <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
        }
      </div>

      <div class="sm:col-span-2">
        <label class="text-xs text-ink-500" [attr.for]="id('telefono')">{{
          t('checkout.phone')
        }}</label>
        <input
          [id]="id('telefono')"
          class="input mt-1 w-full"
          autocomplete="tel"
          inputmode="tel"
          [formField]="formulario.telefono"
        />
      </div>
    </div>
  `,
})
export class CamposDeDireccion {
  /**
   * La dirección. Es un `model()` a propósito: mantiene el par `[valor]`/`(valorChange)` que ya usaba el
   * padre y a la vez es la señal escribible que Signal Forms necesita como fuente de verdad, sin copia
   * intermedia que sincronizar.
   */
  readonly valor = model.required<DireccionEditable>();
  readonly provincias = input<readonly Provincia[]>([]);

  protected readonly t = inject(TraduccionService).t;

  /**
   * Lo que el envío exige para poder salir. Coincide con `direccionUtilizable()` del dominio, que es
   * quien MANDA: aquí solo se declara para poder decirlo campo a campo mientras se escribe. Los límites
   * de longitud son los que acepta el backend; sin ellos el fallo llega después de pulsar «pagar».
   */
  protected readonly formulario = form(this.valor, (ruta) => {
    required(ruta.nombreCompleto, { message: () => this.t('dialog.field.required') });
    maxLength(ruta.nombreCompleto, 120, { message: () => this.t('dialog.field.maxlength') });
    required(ruta.linea1, { message: () => this.t('dialog.field.required') });
    maxLength(ruta.linea1, 200, { message: () => this.t('dialog.field.maxlength') });
    required(ruta.ciudad, { message: () => this.t('dialog.field.required') });
    maxLength(ruta.ciudad, 120, { message: () => this.t('dialog.field.maxlength') });
    required(ruta.pais, { message: () => this.t('dialog.field.required') });
  });

  /** ¿Se puede cotizar y cobrar con lo que hay escrito? Un único sitio al que preguntarlo. */
  readonly completa = computed(() => !this.formulario().invalid());

  /** Los identificadores llevan prefijo propio: en esta pantalla puede haber más de una dirección. */
  protected id(campo: string): string {
    return `direccion-envio-${campo}`;
  }

  /**
   * El mensaje que toca enseñar bajo un campo, o nulo si no hay nada que decir todavía. Se calla hasta
   * que el campo se ha tocado para no acusar de vacío a quien aún no ha llegado a él.
   */
  protected falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    if (!estado.touched()) {
      return null;
    }
    return estado.errors()[0]?.message ?? null;
  }

  /**
   * El país lo elige un desplegable de fuera del formulario, así que hay que marcar el campo a mano: sin
   * ello nunca se daría por tocado y su mensaje no llegaría a verse.
   */
  protected eligePais(pais: string): void {
    this.formulario.pais().value.set(pais);
    this.formulario.pais().markAsTouched();
  }
}
