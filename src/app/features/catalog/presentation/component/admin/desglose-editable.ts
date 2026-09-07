import { Component, computed, inject, input, output, signal } from '@angular/core';
import { EnfocaAlAparecer } from '@ds/directive/enfoca-al-aparecer.directive';
import { FormField, form, min, required } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { GuiaPuntos } from '@ds/component/guia-puntos/guia-puntos';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DesgloseDePrecio } from '../../../domain/model/producto';
import { CampoEnYuanes } from '../../../domain/port/edicion-de-ficha.port';
import { EditaLaFicha } from '../../../application/use-case/edita-la-ficha.use-case';

interface FilaEditable {
  readonly campo: CampoEnYuanes;
  readonly clave: string;
  readonly claveDeAyuda: string;
  readonly mostrado: string;
  readonly crudo: number | null;
}

/**
 * El desglose del precio, con los importes en yuanes editables por DOBLE CLIC.
 *
 * <p>SOLO para el administrador, y por eso se carga en diferido: el desglose enseña la base, el
 * impuesto, el envío y las bolsas de subvención, que son números internos. Quien compra ve el total y
 * nada más.
 *
 * <p>Cada bolsa cubre UNA sola cosa —la de envío se descuenta del porte del pedido y la de arancel del
 * derecho de aduana— y no entra en el total del producto: es cobertura, no cargo. Se guardan por
 * separado para que cambiar una no pise la otra.
 */
@Component({
  selector: 'nx-desglose-editable',
  imports: [FormField, GuiaPuntos, EnfocaAlAparecer],
  template: `
    <div class="mt-2 rounded-lg border border-dashed border-base-300 bg-base-200/40 px-3 py-2 text-[12px]">
      <div class="opacity-60 mb-1">{{ t('product.price.breakdown_admin') }}</div>
      <div class="flex flex-col gap-0.5">
        @for (fila of filasFijas(); track fila.clave) {
          <div class="flex items-baseline">
            <span>{{ t(fila.clave) }}</span>
            <nx-guia-puntos />
            <span class="font-mono">{{ fila.mostrado }}</span>
          </div>
        }
        @for (fila of filasEditables(); track fila.campo) {
          <div
            class="flex items-baseline cursor-pointer"
            (dblclick)="empiezaEdicion(fila)"
            [title]="t(fila.claveDeAyuda)"
          >
            <span>{{ t(fila.clave) }}</span>
            <nx-guia-puntos />
            @if (editando() === fila.campo) {
              <!-- El mínimo ya no va como atributo: lo declara el esquema, que además es quien decide
                   si se guarda. El atributo solo frenaba las flechas del navegador.

                   Y el campo se ENFOCA al aparecer, como en el front anterior. Sin eso, quien daba el
                   doble clic y se ponía a teclear no veía aparecer nada: el foco seguía en el cuerpo
                   del documento y las teclas se perdían. Parecía que el campo estaba roto. -->
              <input
                type="number"
                step="0.01"
                nxEnfocaAlAparecer
                [formField]="formulario.importe"
                (keydown.enter)="guarda(fila.campo)"
                (keydown.escape)="editando.set(null)"
                (blur)="editando.set(null)"
                class="input input-xs w-24 text-right font-mono"
                [attr.aria-label]="t(fila.clave)"
              />
            } @else {
              <span class="font-mono">{{ fila.mostrado }}</span>
            }
          </div>
        }
        <div class="flex items-baseline border-t border-base-300 mt-1 pt-1 font-medium">
          <span>{{ t('product.price.total') }}</span>
          <nx-guia-puntos />
          <span class="font-mono">{{ total() }}</span>
        </div>
      </div>
    </div>
  `,
})
export class DesgloseEditable {
  readonly idDelProducto = input.required<string>();
  readonly desglose = input.required<DesgloseDePrecio>();
  readonly total = input('');
  readonly cambiado = output<void>();

  private readonly editor = inject(EditaLaFicha);
  private readonly avisos = inject(AvisosStore);
  protected readonly t = inject(TraduccionService).t;

  protected readonly editando = signal<CampoEnYuanes | null>(null);

  /** Lo que se está tecleando. En yuanes y como NÚMERO: es un campo numérico, no un texto. */
  private readonly borrador = signal<{ importe: number | null }>({ importe: 0 });

  /**
   * Las dos reglas del importe, que antes vivían repartidas entre un atributo `min="0"` del marcado y
   * una comprobación al guardar. Un importe vacío o negativo no se manda: el subsidio se RESTA, y en
   * negativo acabaría cobrando de más a quien compra.
   */
  protected readonly formulario = form(this.borrador, (ruta) => {
    required(ruta.importe, { message: () => this.t('dialog.field.required') });
    min(ruta.importe, 0, { message: () => this.t('dialog.field.min') });
  });

  protected readonly filasFijas = computed(() =>
    [
      { clave: 'product.price.base', mostrado: this.desglose().baseFormateado },
      { clave: 'product.price.iva', mostrado: this.desglose().ivaFormateado },
      { clave: 'product.price.shipping', mostrado: this.desglose().envioFormateado },
    ].filter((fila): fila is { clave: string; mostrado: string } => !!fila.mostrado),
  );

  protected readonly filasEditables = computed<readonly FilaEditable[]>(() => {
    const desglose = this.desglose();
    const posibles: FilaEditable[] = [
      {
        campo: 'surchargeCny',
        clave: 'product.price.surcharge',
        claveDeAyuda: 'product.price.surcharge_dbl',
        mostrado: desglose.recargoFormateado ?? '',
        crudo: desglose.recargoCny ?? null,
      },
      {
        campo: 'shippingUserCny',
        clave: 'product.price.shipping_user',
        claveDeAyuda: 'product.price.shipping_user_dbl',
        mostrado: desglose.subsidioDeEnvioFormateado ?? '',
        crudo: desglose.subsidioDeEnvioCny ?? null,
      },
      {
        campo: 'dutyUserCny',
        clave: 'product.price.duty_user',
        claveDeAyuda: 'product.price.duty_user_dbl',
        mostrado: desglose.subsidioDeArancelFormateado ?? '',
        crudo: desglose.subsidioDeArancelCny ?? null,
      },
    ];
    return posibles.filter((fila) => fila.mostrado !== '');
  });

  protected empiezaEdicion(fila: FilaEditable): void {
    this.borrador.set({ importe: fila.crudo ?? 0 });
    this.editando.set(fila.campo);
  }

  protected async guarda(campo: CampoEnYuanes): Promise<void> {
    const valor = this.borrador().importe;
    this.editando.set(null);
    // Un único sitio al que preguntar si el importe vale, en vez de repetir aquí la regla.
    if (this.formulario().invalid() || valor === null) {
      return;
    }
    const resultado = await this.editor.guardaImporteEnYuanes(this.idDelProducto(), campo, valor);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('admin.catalog.edit.error'));
      return;
    }
    this.avisos.exito(this.t('admin.catalog.edit.ok'));
    this.cambiado.emit();
  }
}
