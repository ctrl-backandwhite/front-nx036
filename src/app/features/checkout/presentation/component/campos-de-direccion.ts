import { Component, inject, input, output } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { SelectorPais } from '@ds/component/pais/selector-pais';
import { Provincia, SelectorProvincia } from '@ds/component/provincia/selector-provincia';
import { DireccionDeEnvio } from '../../domain/model/pedido';

/**
 * El formulario de una dirección de envío.
 *
 * <p>Es una versión MÍNIMA hecha dentro de «checkout». El componente equivalente del front anterior está
 * asignado al contexto de la cuenta, que aún no se ha portado, y el pago no puede importar sus piezas: el
 * lint lo impide y con razón. Cuando exista, lo natural es que suba al sistema de diseño —lo usan la
 * cuenta, las direcciones y el pago— y este fichero desaparezca. Queda anotado en el informe.
 *
 * <p>MÓVIL PRIMERO: una columna, y a partir de `sm` los pares que se leen juntos —ciudad y código postal,
 * provincia y país— se ponen en dos.
 *
 * <p>Cada campo con su `<label for>`: sin él, quien usa un lector de pantalla oye «cuadro de texto» siete
 * veces seguidas y no puede rellenar una dirección.
 */
@Component({
  selector: 'nx-campos-de-direccion',
  imports: [SelectorPais, SelectorProvincia],
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
          [value]="valor().nombreCompleto"
          (input)="cambia('nombreCompleto', $event)"
        />
      </div>

      <div class="sm:col-span-2">
        <label class="text-xs text-ink-500" [attr.for]="id('linea1')">{{
          t('checkout.line1')
        }}</label>
        <input
          [id]="id('linea1')"
          class="input mt-1 w-full"
          autocomplete="address-line1"
          [value]="valor().linea1"
          (input)="cambia('linea1', $event)"
        />
      </div>

      <div class="sm:col-span-2">
        <label class="text-xs text-ink-500" [attr.for]="id('linea2')">{{
          t('checkout.line2')
        }}</label>
        <input
          [id]="id('linea2')"
          class="input mt-1 w-full"
          autocomplete="address-line2"
          [value]="valor().linea2 ?? ''"
          (input)="cambia('linea2', $event)"
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
          [value]="valor().ciudad"
          (input)="cambia('ciudad', $event)"
        />
      </div>

      <div>
        <label class="text-xs text-ink-500" [attr.for]="id('cp')">{{
          t('checkout.postal_code')
        }}</label>
        <input
          [id]="id('cp')"
          class="input mt-1 w-full"
          autocomplete="postal-code"
          [value]="valor().codigoPostal ?? ''"
          (input)="cambia('codigoPostal', $event)"
        />
      </div>

      <div>
        <label class="text-xs text-ink-500" [attr.for]="id('provincia')">{{
          t('checkout.state')
        }}</label>
        <!-- La provincia viaja como CÓDIGO cuando el país tiene lista: es lo que el servidor usa para
             calcular el impuesto por región. -->
        <nx-selector-provincia
          [valor]="valor().provincia ?? ''"
          (valorChange)="fija('provincia', $event)"
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
          [valor]="valor().pais"
          (valorChange)="fija('pais', $event)"
          [etiqueta]="t('checkout.country_iso')"
          clase="input mt-1 w-full"
        />
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
          [value]="valor().telefono ?? ''"
          (input)="cambia('telefono', $event)"
        />
      </div>
    </div>
  `,
})
export class CamposDeDireccion {
  readonly valor = input.required<DireccionDeEnvio>();
  readonly provincias = input<readonly Provincia[]>([]);
  readonly valorChange = output<DireccionDeEnvio>();

  protected readonly t = inject(TraduccionService).t;

  /** Los identificadores llevan prefijo propio: en esta pantalla puede haber más de una dirección. */
  protected id(campo: string): string {
    return `direccion-envio-${campo}`;
  }

  protected cambia(campo: keyof DireccionDeEnvio, evento: Event): void {
    this.fija(campo, (evento.target as HTMLInputElement).value);
  }

  protected fija(campo: keyof DireccionDeEnvio, valor: string): void {
    this.valorChange.emit({ ...this.valor(), [campo]: valor });
  }
}
