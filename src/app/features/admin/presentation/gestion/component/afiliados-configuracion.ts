import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormField, form, max, min, pattern, required } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { ConfiguracionDeAfiliados } from '../../../domain/gestion/model/afiliados';
import {
  GuardaLaConfiguracionDeAfiliados,
} from '../../../application/gestion/use-case/afiliados.use-case';
import { VentanaModal } from './ventana-modal';

/** El código de divisa del programa: tres letras, como manda ISO-4217. */
const DIVISA_ISO = /^[A-Za-z]{3}$/;

/**
 * La configuración del programa de afiliados.
 *
 * <p>Los importes se teclean en CÉNTIMOS, igual que en el panel de React: es como los guarda el backend
 * y como se comparan con el mínimo de pago. Convertirlos aquí a unidades obligaría a redondear dos veces
 * —al pintar y al guardar— y el mínimo dejaría de coincidir con el que aplica el servidor.
 *
 * <p>Un campo VACÍO ya no vale cero. Antes se guardaban como texto y se convertían con `Number(...)`, que
 * para la cadena vacía da cero: se ha visto poner la comisión a cero sin querer. Ahora el campo vacío es
 * nulo, el esquema lo declara obligatorio y el botón de guardar se apaga hasta que haya un número.
 *
 * <p>Los rangos también son del esquema y no de la plantilla: el porcentaje va de 0 a 100 —un 300 % de
 * comisión pagaría el triple de lo vendido—, los plazos y los importes nunca son negativos, y la divisa
 * son exactamente tres letras porque es lo que el backend compara con ISO-4217.
 *
 * <p>MOBILE FIRST: una columna en el móvil, dos desde `sm`.
 */
@Component({
  selector: 'nx-afiliados-configuracion',
  imports: [VentanaModal, FormField],
  template: `
    <nx-ventana-modal [titulo]="t('admin.affiliates.config')" (cierra)="cierra.emit()">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-ink-500" for="afiliados-cfg-porcentaje">
            {{ t('admin.affiliates.cfg.default') }} (%)
          </label>
          <input id="afiliados-cfg-porcentaje" type="number"
                 class="input input-bordered input-sm w-full"
                 [formField]="formulario.porcentaje" />
          @if (formulario.porcentaje().touched() && formulario.porcentaje().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.porcentaje().errors()[0].message }}
            </p>
          }
        </div>
        <div>
          <label class="text-xs text-ink-500" for="afiliados-cfg-divisa">
            {{ t('admin.affiliates.cfg.currency') }}
          </label>
          <input id="afiliados-cfg-divisa" type="text"
                 class="input input-bordered input-sm w-full"
                 [formField]="formulario.divisa" />
          @if (formulario.divisa().touched() && formulario.divisa().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.divisa().errors()[0].message }}
            </p>
          }
        </div>
        <div>
          <label class="text-xs text-ink-500" for="afiliados-cfg-ventana">
            {{ t('admin.affiliates.cfg.window') }} (d)
          </label>
          <input id="afiliados-cfg-ventana" type="number"
                 class="input input-bordered input-sm w-full"
                 [formField]="formulario.ventana" />
          @if (formulario.ventana().touched() && formulario.ventana().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.ventana().errors()[0].message }}
            </p>
          }
        </div>
        <div>
          <label class="text-xs text-ink-500" for="afiliados-cfg-devolucion">
            {{ t('admin.affiliates.cfg.return') }} (d)
          </label>
          <input id="afiliados-cfg-devolucion" type="number"
                 class="input input-bordered input-sm w-full"
                 [formField]="formulario.devolucion" />
          @if (formulario.devolucion().touched() && formulario.devolucion().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.devolucion().errors()[0].message }}
            </p>
          }
        </div>
        <div>
          <label class="text-xs text-ink-500" for="afiliados-cfg-minimo">
            {{ t('admin.affiliates.cfg.min') }} (cents)
          </label>
          <input id="afiliados-cfg-minimo" type="number"
                 class="input input-bordered input-sm w-full"
                 [formField]="formulario.minimo" />
          @if (formulario.minimo().touched() && formulario.minimo().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.minimo().errors()[0].message }}
            </p>
          }
        </div>
        <div>
          <label class="text-xs text-ink-500" for="afiliados-cfg-maximo">
            {{ t('admin.affiliates.cfg.max') }} (cents)
          </label>
          <input id="afiliados-cfg-maximo" type="number"
                 class="input input-bordered input-sm w-full"
                 [formField]="formulario.maximo" />
          @if (formulario.maximo().touched() && formulario.maximo().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.maximo().errors()[0].message }}
            </p>
          }
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" class="btn btn-ghost btn-sm" (click)="cierra.emit()">
          {{ t('common.cancel') }}
        </button>
        <button type="button" class="btn btn-primary btn-sm"
                [disabled]="guardando() || formulario().invalid()"
                (click)="guarda()">
          {{ t('common.save') }}
        </button>
      </div>
    </nx-ventana-modal>
  `,
})
export class AfiliadosConfiguracion {
  readonly config = input.required<ConfiguracionDeAfiliados>();
  readonly cierra = output<void>();
  readonly guardada = output<void>();

  protected readonly t = inject(TraduccionService).t;
  private readonly avisos = inject(AvisosStore);
  private readonly guardaLaConfiguracion = inject(GuardaLaConfiguracionDeAfiliados);

  // `linkedSignal` y no `signal`: si la configuración se recarga mientras la ventana está abierta, el
  // formulario se pone al día en vez de quedarse enseñando los valores viejos.
  protected readonly modelo = linkedSignal(() => ({
    porcentaje: this.config().porcentajePorDefecto as number | null,
    divisa: this.config().divisa,
    ventana: this.config().ventanaDeAtribucionDias as number | null,
    devolucion: this.config().periodoDeDevolucionDias as number | null,
    minimo: this.config().minimoDePagoCentimos as number | null,
    maximo: this.config().maximoPorPeriodoCentimos as number | null,
  }));

  protected readonly formulario = form(this.modelo, (ruta) => {
    const obligatorio = { message: () => this.t('dialog.field.required') };
    const noNegativo = { message: () => this.t('dialog.field.min') };

    required(ruta.porcentaje, obligatorio);
    min(ruta.porcentaje, 0, noNegativo);
    max(ruta.porcentaje, 100, { message: () => this.t('dialog.field.number') });

    required(ruta.divisa, obligatorio);
    // Con `pattern` basta: `maxLength` además IMPEDIRÍA teclear la cuarta letra, y un campo que se
    // niega a recibir lo que se escribe se lee como un fallo, no como una corrección.
    pattern(ruta.divisa, DIVISA_ISO, { message: () => this.t('login.error.bad_data') });

    required(ruta.ventana, obligatorio);
    min(ruta.ventana, 0, noNegativo);

    required(ruta.devolucion, obligatorio);
    min(ruta.devolucion, 0, noNegativo);

    required(ruta.minimo, obligatorio);
    min(ruta.minimo, 0, noNegativo);

    required(ruta.maximo, obligatorio);
    min(ruta.maximo, 0, noNegativo);
  });

  protected readonly guardando = signal(false);

  protected async guarda(): Promise<void> {
    const datos = this.modelo();
    this.guardando.set(true);
    const resultado = await this.guardaLaConfiguracion.ejecuta({
      // El botón está apagado mientras alguno sea nulo; el respaldo es para quien lea esto sin
      // reconstruir esa cadena de razonamiento.
      porcentajePorDefecto: datos.porcentaje ?? 0,
      ventanaDeAtribucionDias: datos.ventana ?? 0,
      periodoDeDevolucionDias: datos.devolucion ?? 0,
      minimoDePagoCentimos: datos.minimo ?? 0,
      divisa: datos.divisa.trim().toUpperCase(),
      maximoPorPeriodoCentimos: datos.maximo ?? 0,
    });
    this.guardando.set(false);
    if (!resultado.ok) {
      // El mensaje lo escribe el backend; el del diccionario es el respaldo cuando no viene ninguno.
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.guardada.emit();
  }
}
