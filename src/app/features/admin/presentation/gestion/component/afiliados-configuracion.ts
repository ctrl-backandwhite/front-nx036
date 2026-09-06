import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { ConfiguracionDeAfiliados } from '../../../domain/gestion/model/afiliados';
import {
  GuardaLaConfiguracionDeAfiliados,
} from '../../../application/gestion/use-case/afiliados.use-case';
import { VentanaModal } from './ventana-modal';

/**
 * La configuración del programa de afiliados.
 *
 * <p>Los importes se teclean en CÉNTIMOS, igual que en el panel de React: es como los guarda el backend
 * y como se comparan con el mínimo de pago. Convertirlos aquí a unidades obligaría a redondear dos veces
 * —al pintar y al guardar— y el mínimo dejaría de coincidir con el que aplica el servidor.
 *
 * <p>Los campos son texto y no números: un `input[type=number]` vacío devuelve cadena vacía y, si se
 * guarda tal cual, `Number('')` es 0 — se ha visto poner la comisión a cero sin querer. Aquí lo que se
 * guarda pasa siempre por `Number(...)` de forma explícita y con el valor de partida a la vista.
 *
 * <p>MOBILE FIRST: una columna en el móvil, dos desde `sm`.
 */
@Component({
  selector: 'nx-afiliados-configuracion',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="t('admin.affiliates.config')" (cierra)="cierra.emit()">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-ink-500" for="afiliados-cfg-porcentaje">
            {{ t('admin.affiliates.cfg.default') }} (%)
          </label>
          <input id="afiliados-cfg-porcentaje" type="number"
                 class="input input-bordered input-sm w-full"
                 [value]="porcentaje()" (input)="porcentaje.set(escrito($event))" />
        </div>
        <div>
          <label class="text-xs text-ink-500" for="afiliados-cfg-divisa">
            {{ t('admin.affiliates.cfg.currency') }}
          </label>
          <input id="afiliados-cfg-divisa" type="text"
                 class="input input-bordered input-sm w-full"
                 [value]="divisa()" (input)="divisa.set(escrito($event))" />
        </div>
        <div>
          <label class="text-xs text-ink-500" for="afiliados-cfg-ventana">
            {{ t('admin.affiliates.cfg.window') }} (d)
          </label>
          <input id="afiliados-cfg-ventana" type="number"
                 class="input input-bordered input-sm w-full"
                 [value]="ventana()" (input)="ventana.set(escrito($event))" />
        </div>
        <div>
          <label class="text-xs text-ink-500" for="afiliados-cfg-devolucion">
            {{ t('admin.affiliates.cfg.return') }} (d)
          </label>
          <input id="afiliados-cfg-devolucion" type="number"
                 class="input input-bordered input-sm w-full"
                 [value]="devolucion()" (input)="devolucion.set(escrito($event))" />
        </div>
        <div>
          <label class="text-xs text-ink-500" for="afiliados-cfg-minimo">
            {{ t('admin.affiliates.cfg.min') }} (cents)
          </label>
          <input id="afiliados-cfg-minimo" type="number"
                 class="input input-bordered input-sm w-full"
                 [value]="minimo()" (input)="minimo.set(escrito($event))" />
        </div>
        <div>
          <label class="text-xs text-ink-500" for="afiliados-cfg-maximo">
            {{ t('admin.affiliates.cfg.max') }} (cents)
          </label>
          <input id="afiliados-cfg-maximo" type="number"
                 class="input input-bordered input-sm w-full"
                 [value]="maximo()" (input)="maximo.set(escrito($event))" />
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" class="btn btn-ghost btn-sm" (click)="cierra.emit()">
          {{ t('common.cancel') }}
        </button>
        <button type="button" class="btn btn-primary btn-sm" [disabled]="guardando()"
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
  protected readonly porcentaje = linkedSignal(() => String(this.config().porcentajePorDefecto));
  protected readonly divisa = linkedSignal(() => this.config().divisa);
  protected readonly ventana = linkedSignal(() => String(this.config().ventanaDeAtribucionDias));
  protected readonly devolucion = linkedSignal(() => String(this.config().periodoDeDevolucionDias));
  protected readonly minimo = linkedSignal(() => String(this.config().minimoDePagoCentimos));
  protected readonly maximo = linkedSignal(() => String(this.config().maximoPorPeriodoCentimos));

  protected readonly guardando = signal(false);

  protected escrito(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected async guarda(): Promise<void> {
    this.guardando.set(true);
    const resultado = await this.guardaLaConfiguracion.ejecuta({
      porcentajePorDefecto: Number(this.porcentaje()),
      ventanaDeAtribucionDias: Number(this.ventana()),
      periodoDeDevolucionDias: Number(this.devolucion()),
      minimoDePagoCentimos: Number(this.minimo()),
      divisa: this.divisa().trim().toUpperCase(),
      maximoPorPeriodoCentimos: Number(this.maximo()),
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
