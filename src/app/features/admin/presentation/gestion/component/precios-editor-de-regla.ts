import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AmbitosDisponibles } from '../../../application/gestion/use-case/precios.use-case';
import {
  AMBITOS,
  AmbitoDeRegla,
  BorradorDeRegla,
  ReglaDePrecio,
  TipoDeMargen,
  reglasSolapadas,
} from '../../../domain/gestion/model/precios';
import { OpcionDeAmbito } from '../../../domain/gestion/port/precios.port';
import { VentanaModal } from './ventana-modal';

/**
 * El editor de una regla de MARGEN.
 *
 * <p>Aquí no se calcula ningún precio: el precio de venta lo compone siempre el backend con el margen,
 * el envío, el arancel y el IVA. Esta ventana solo edita la regla con la que lo hará.
 *
 * <p>AVISO DE SOLAPE. Dos reglas activas del mismo ámbito con tramos de coste que se pisan dejan sin
 * determinar cuál gana: el mismo producto puede salir a dos precios distintos según el orden en que se
 * evalúen. Es el fallo más caro de esta pantalla, así que se avisa MIENTRAS se edita y no después de
 * guardar. No bloquea: hay casos legítimos, y quien administra decide.
 *
 * <p>El ámbito concreto se elige por NOMBRE en un desplegable y no tecleando un identificador: escribir
 * un UUID a mano es la forma más fácil de aplicar un margen a la categoría equivocada. La variante es la
 * excepción —son demasiadas para un desplegable— y ahí se mantiene el identificador como opción avanzada.
 *
 * <p>MOBILE FIRST: los campos van en una columna en el móvil y se reparten en dos a partir de `sm:`.
 */
@Component({
  selector: 'nx-precios-editor-de-regla',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal
      [titulo]="borrador().id ? t('common.edit') : t('admin.pricing.add')"
      ancho="sm:max-w-lg"
      (cierra)="cancela.emit()"
    >
      <div class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <label for="regla-ambito" class="text-xs text-ink-500">
            {{ t('admin.pricing.col.scope') }}
          </label>
          <select
            id="regla-ambito"
            class="input"
            [value]="borrador().ambito"
            (change)="cambiaAmbito($event)"
          >
            <!--
              Cada opción dice explícitamente si está elegida, además del valor del desplegable: las
              opciones las crea un bucle y el navegador no puede seleccionar una que todavía no existe
              en el momento en que se le asigna el valor.
            -->
            @for (ambito of ambitosPosibles; track ambito) {
              <option [value]="ambito" [selected]="ambito === borrador().ambito">
                {{ t('admin.pricing.scope.' + ambito) }}
              </option>
            }
          </select>
        </div>

        <!--
          El país de la regla es aquel al que se aplica el margen, y el backend lo casa con el país de
          REGISTRO de quien compra, nunca con el de envío del pedido. Vacío significa «cualquiera».
        -->
        <div>
          <label for="regla-pais" class="text-xs text-ink-500">
            {{ t('admin.pricing.col.country') }}
          </label>
          <input
            id="regla-pais"
            class="input"
            maxlength="2"
            placeholder="—"
            [value]="borrador().pais ?? ''"
            (input)="cambiaPais($event)"
          />
        </div>

        <div>
          <label for="regla-tipo" class="text-xs text-ink-500">
            {{ t('admin.pricing.col.type') }}
          </label>
          <select
            id="regla-tipo"
            class="input"
            [value]="borrador().tipo"
            (change)="cambiaTipo($event)"
          >
            <option value="PERCENTAGE" [selected]="borrador().tipo === 'PERCENTAGE'">
              {{ t('admin.pricing.type.PERCENTAGE') }}
            </option>
            <option value="FIXED" [selected]="borrador().tipo === 'FIXED'">
              {{ t('admin.pricing.type.FIXED') }}
            </option>
          </select>
        </div>

        <div>
          <label for="regla-valor" class="text-xs text-ink-500">
            {{ t('admin.pricing.col.value') }}
          </label>
          <input
            id="regla-valor"
            type="number"
            step="0.01"
            class="input"
            [value]="borrador().valor ?? 0"
            (input)="cambiaNumero('valor', $event)"
          />
        </div>

        @if (borrador().ambito !== 'GLOBAL') {
          <div>
            <label for="regla-entidad" class="text-xs text-ink-500">
              {{ t('admin.pricing.scope.' + borrador().ambito) }}
            </label>
            @if (borrador().ambito === 'VARIANT') {
              <input
                id="regla-entidad"
                class="input font-mono text-xs"
                [placeholder]="t('admin.pricing.scope.VARIANT')"
                [value]="borrador().idAmbito ?? ''"
                (input)="cambiaIdDeAmbito($event)"
              />
            } @else {
              <select
                id="regla-entidad"
                class="input"
                [value]="borrador().idAmbito ?? ''"
                (change)="cambiaIdDeAmbito($event)"
              >
                <option value="" [selected]="!borrador().idAmbito">—</option>
                @for (opcion of opcionesDelAmbito(); track opcion.id) {
                  <option [value]="opcion.id" [selected]="opcion.id === borrador().idAmbito">
                    {{ opcion.nombre }}
                  </option>
                }
              </select>
            }
          </div>
        }

        <div>
          <label for="regla-coste-min" class="text-xs text-ink-500">
            {{ t('admin.pricing.min_cost_usd') }}
          </label>
          <input
            id="regla-coste-min"
            type="number"
            step="0.01"
            class="input"
            [value]="borrador().costeMinimoUsd ?? ''"
            (input)="cambiaOpcional('costeMinimoUsd', $event)"
          />
        </div>

        <div>
          <label for="regla-coste-max" class="text-xs text-ink-500">
            {{ t('admin.pricing.max_cost_usd') }}
          </label>
          <input
            id="regla-coste-max"
            type="number"
            step="0.01"
            class="input"
            [value]="borrador().costeMaximoUsd ?? ''"
            (input)="cambiaOpcional('costeMaximoUsd', $event)"
          />
        </div>

        <div class="sm:col-span-2 text-[11px] text-ink-500">{{ t('admin.pricing.cost_hint') }}</div>

        @if (solapadas().length > 0) {
          <div
            role="alert"
            class="sm:col-span-2 text-[12px] rounded-box bg-warning/15 border border-warning/40 p-2"
          >
            <span class="font-medium">
              {{ tCon('admin.pricing.overlap_warning', { n: solapadas().length }) }}
            </span>
            <span class="opacity-70"> {{ t('admin.pricing.overlap_hint') }}</span>
          </div>
        }

        <div class="sm:col-span-2">
          <label for="regla-descripcion" class="text-xs text-ink-500">
            {{ t('admin.pricing.col.description') }}
          </label>
          <input
            id="regla-descripcion"
            class="input"
            [value]="borrador().descripcion ?? ''"
            (input)="cambiaDescripcion($event)"
          />
        </div>

        <div class="sm:col-span-2">
          <label for="regla-activa" class="text-sm flex items-center gap-2">
            <input
              id="regla-activa"
              type="checkbox"
              [checked]="borrador().activa !== false"
              (change)="cambiaActiva($event)"
            />
            {{ t('admin.users.active') }}
          </label>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3">
        <button type="button" class="btn btn-outline" (click)="cancela.emit()">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          [disabled]="guardando()"
          (click)="guarda.emit(borrador())"
        >
          {{ guardando() ? t('common.saving') : t('common.save') }}
        </button>
      </div>
    </nx-ventana-modal>
  `,
})
export class PreciosEditorDeRegla {
  readonly inicial = input.required<BorradorDeRegla>();
  /** Todas las reglas vivas: hacen falta para poder avisar del solape mientras se edita. */
  readonly reglas = input<readonly ReglaDePrecio[]>([]);
  readonly ambitos = input.required<AmbitosDisponibles>();
  readonly guardando = input(false);

  readonly cancela = output<void>();
  readonly guarda = output<BorradorDeRegla>();

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly tCon = this.traduccion.tCon;

  protected readonly ambitosPosibles = AMBITOS;

  /** Copia de trabajo; se rehace cuando entra otra regla, para no arrastrar lo tecleado en la anterior. */
  protected readonly borrador = linkedSignal<BorradorDeRegla>(() => ({ ...this.inicial() }));

  protected readonly solapadas = computed(() => reglasSolapadas(this.borrador(), this.reglas()));

  protected readonly opcionesDelAmbito = computed<readonly OpcionDeAmbito[]>(() => {
    const disponibles = this.ambitos();
    switch (this.borrador().ambito) {
      case 'CATEGORY':
        return disponibles.categorias;
      case 'SUPPLIER':
        return disponibles.proveedores;
      case 'PRODUCT':
        return disponibles.productos;
      case 'PRODUCT_GROUP':
        return disponibles.grupos;
      default:
        return [];
    }
  });

  /** Cambiar de ámbito deja huérfano el identificador anterior: se olvida para no apuntar a otra cosa. */
  protected cambiaAmbito(evento: Event): void {
    const ambito = (evento.target as HTMLSelectElement).value as AmbitoDeRegla;
    this.borrador.update((regla) => ({ ...regla, ambito, idAmbito: undefined }));
  }

  protected cambiaTipo(evento: Event): void {
    const tipo = (evento.target as HTMLSelectElement).value as TipoDeMargen;
    this.borrador.update((regla) => ({ ...regla, tipo }));
  }

  /** El código de país va siempre en mayúsculas; vacío significa «cualquier país». */
  protected cambiaPais(evento: Event): void {
    const pais = (evento.target as HTMLInputElement).value.toUpperCase();
    this.borrador.update((regla) => ({ ...regla, pais: pais || undefined }));
  }

  protected cambiaIdDeAmbito(evento: Event): void {
    const id = (evento.target as HTMLInputElement | HTMLSelectElement).value;
    this.borrador.update((regla) => ({ ...regla, idAmbito: id || undefined }));
  }

  protected cambiaNumero(campo: 'valor', evento: Event): void {
    const valor = Number((evento.target as HTMLInputElement).value);
    this.borrador.update((regla) => ({ ...regla, [campo]: Number.isFinite(valor) ? valor : 0 }));
  }

  /** Un extremo del tramo vacío NO es cero: es «sin límite por ese lado», y eso se dice con `undefined`. */
  protected cambiaOpcional(campo: 'costeMinimoUsd' | 'costeMaximoUsd', evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.borrador.update((regla) => ({
      ...regla,
      [campo]: texto ? Number(texto) : undefined,
    }));
  }

  protected cambiaDescripcion(evento: Event): void {
    const descripcion = (evento.target as HTMLInputElement).value;
    this.borrador.update((regla) => ({ ...regla, descripcion }));
  }

  protected cambiaActiva(evento: Event): void {
    const activa = (evento.target as HTMLInputElement).checked;
    this.borrador.update((regla) => ({ ...regla, activa }));
  }
}
