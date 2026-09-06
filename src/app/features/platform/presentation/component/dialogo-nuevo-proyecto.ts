import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FieldTree, FormField, form, min, required, validate } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  CLASES_DE_PROYECTO,
  DIVISAS_DE_PRESUPUESTO,
  presupuestoEnCentimosUsd,
} from '../../domain/model/proyecto-odm';
import { TasaDeCambio, formateaImporte } from '../../domain/model/tasa-de-cambio';
import { FormularioDeProyecto } from '../../application/use-case/crea-proyecto-odm.use-case';
import { VentanaModal } from './ventana-modal';

/**
 * Lo que se teclea al abrir un proyecto.
 *
 * <p>El presupuesto es `number | null` y no una cadena: un `<input type="number">` atado con
 * `[formField]` habla en números, y el vacío se representa con nulo —no con cero—, porque un proyecto
 * sin presupuesto no es un proyecto de cero dólares.
 */
interface DatosDeProyecto {
  clase: string;
  titulo: string;
  resumen: string;
  divisa: string;
  presupuesto: number | null;
}

/**
 * El formulario para abrir un proyecto a medida.
 *
 * <p>El presupuesto se escribe en la divisa que se quiera y el backend lo guarda en dólares. Se enseña
 * la conversión ANTES de enviar: es la única forma de que quien autoriza un presupuesto vea lo que se
 * va a guardar. Cuando no se enseñaba, un error en el sentido de la división convirtió 100 € en 92 $ y
 * nadie lo notó hasta que el proveedor entregó por debajo de lo esperado.
 *
 * <p>Con Signal Forms el «no se puede enviar» deja de ser un `!titulo().trim()` repetido en el botón y
 * en el manejador: es una regla del esquema, y además dice cuál es el campo que falta.
 */
@Component({
  selector: 'nx-dialogo-nuevo-proyecto',
  imports: [FormField, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="t('odm.new')" (cierra)="cancela.emit()">
      <form class="space-y-3 mt-3" (submit)="envia($event)">
        <div>
          <label for="odm-clase" class="text-xs text-ink-500">{{ t('odm.kind') }}</label>
          <select id="odm-clase" class="input mt-1" [formField]="formulario.clase">
            @for (opcion of clases; track opcion) {
              <option [value]="opcion">{{ t('odm.kind.' + opcion) }}</option>
            }
          </select>
        </div>

        <div>
          <label for="odm-titulo" class="text-xs text-ink-500">{{ t('odm.field.title') }}</label>
          <input id="odm-titulo" class="input mt-1" [formField]="formulario.titulo" />
          @if (falloDe(formulario.titulo); as fallo) {
            <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
          }
        </div>

        <div>
          <label for="odm-resumen" class="text-xs text-ink-500">{{ t('odm.field.brief') }}</label>
          <textarea
            id="odm-resumen"
            rows="3"
            class="input mt-1"
            [formField]="formulario.resumen"
          ></textarea>
        </div>

        <div>
          <label for="odm-presupuesto" class="text-xs text-ink-500">
            {{ t('odm.field.budget') }}
          </label>
          <div class="flex items-center gap-2 mt-1">
            <!--
              El selector de divisa necesita su propio nombre accesible: sin él, un lector de pantalla
              anuncia dos campos seguidos llamados «Presupuesto».
            -->
            <select
              class="select select-bordered text-sm w-auto"
              [attr.aria-label]="t('common.currency')"
              [formField]="formulario.divisa"
            >
              @for (codigo of divisas; track codigo) {
                <option [value]="codigo">{{ codigo }}</option>
              }
            </select>
            <input
              id="odm-presupuesto"
              type="number"
              step="0.01"
              class="input flex-1"
              [formField]="formulario.presupuesto"
            />
          </div>
          <div class="text-[10px] text-ink-400 mt-0.5">{{ t('odm.field.budget_hint') }}</div>
          @if (falloDe(formulario.presupuesto); as fallo) {
            <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
          }
          @if (equivalenteEnDolares(); as equivalente) {
            <div class="text-[11px] text-ink-500 mt-1">
              {{ t('odm.budget_stored_usd') }}: <strong>{{ equivalente }}</strong>
            </div>
          }
        </div>

        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-ghost" (click)="cancela.emit()">
            {{ t('common.cancel') }}
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="!sePuedeEnviar()">
            {{ t('odm.new') }}
          </button>
        </div>
      </form>
    </nx-ventana-modal>
  `,
})
export class DialogoNuevoProyecto {
  readonly tasas = input<readonly TasaDeCambio[]>([]);
  /** La divisa activa de quien mira: es la que tiene sentido preseleccionar. */
  readonly divisaInicial = input('USD');
  readonly enviando = input(false);

  readonly crea = output<FormularioDeProyecto>();
  readonly cancela = output<void>();

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  protected readonly clases = CLASES_DE_PROYECTO;
  protected readonly divisas = DIVISAS_DE_PRESUPUESTO;

  protected readonly modelo = signal<DatosDeProyecto>({
    clase: 'ODM_FREE',
    titulo: '',
    resumen: '',
    divisa: this.divisaInicial(),
    presupuesto: null,
  });

  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.titulo, { message: () => this.t('dialog.field.required') });
    // Un título de solo espacios está tan vacío como uno sin nada, y `required` no lo ve.
    validate(ruta.titulo, ({ value }) =>
      value().trim() === '' ? { kind: 'en-blanco', message: this.t('dialog.field.required') } : null,
    );
    // Un presupuesto negativo no se rechazaba en ningún sitio: llegaba al dominio, que lo trataba como
    // «sin presupuesto», y el proyecto se abría sin importe sin que nadie dijera nada.
    min(ruta.presupuesto, 0, { message: () => this.t('dialog.field.min') });
  });

  /** El presupuesto tal y como lo espera el dominio: tecleado, en texto y con su divisa aparte. */
  private readonly presupuestoTecleado = computed(() => {
    const importe = this.modelo().presupuesto;
    return importe === null ? '' : String(importe);
  });

  /** Solo se enseña cuando hay algo que convertir y la divisa no es ya el dólar. */
  protected readonly equivalenteEnDolares = computed(() => {
    const divisa = this.modelo().divisa;
    if (divisa === 'USD') {
      return null;
    }
    const centimos = presupuestoEnCentimosUsd(this.presupuestoTecleado(), divisa, this.tasas());
    return centimos ? formateaImporte(centimos / 100, 'USD', this.traduccion.idioma()) : null;
  });

  /** Un único sitio al que preguntar si esto se puede mandar. */
  protected readonly sePuedeEnviar = computed(
    () => !this.enviando() && !this.formulario().invalid(),
  );

  protected envia(evento: Event): void {
    evento.preventDefault();
    if (!this.sePuedeEnviar()) {
      return;
    }
    const datos = this.modelo();
    this.crea.emit({
      clase: datos.clase,
      titulo: datos.titulo,
      resumen: datos.resumen,
      presupuesto: this.presupuestoTecleado(),
      divisa: datos.divisa,
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
