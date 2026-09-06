import { Component, computed, inject, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  FormField,
  apply,
  applyEach,
  form,
  maxLength,
  min,
  required,
} from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  DireccionDeEnvio,
  PedidoNuevo,
  cantidadValida,
} from '../../../domain/logistica/model/pedido';
import {
  BuscaProductosParaPedido,
  CreaPedido,
} from '../../../application/logistica/use-case/alta-de-pedidos.use-case';
import { TEXTO_CON_CONTENIDO, claveDeError } from '../form/reglas-de-formulario';

/** Una línea mientras se está montando: lleva el título para poder enseñarla sin volver a buscar. */
interface LineaEnCurso {
  productoId: string;
  titulo: string;
  cantidad: number | null;
}

/**
 * La dirección mientras se teclea, con los nueve campos SIEMPRE como texto.
 *
 * <p>En el modelo del dominio la mitad son opcionales, y un `undefined` atado a un campo se pinta
 * literalmente como «undefined». Aquí se normalizan a cadena vacía; el dominio los admite igual.
 */
type BorradorDeDireccion = { [K in keyof DireccionDeEnvio]-?: string };

/** Todo lo que hay en el diálogo, incluido el buscador, que NO viaja en el pedido. */
interface BorradorDePedido {
  emailCliente: string;
  idExterno: string;
  consulta: string;
  notas: string;
  direccion: BorradorDeDireccion;
  lineas: LineaEnCurso[];
}

function direccionVacia(): BorradorDeDireccion {
  return {
    nombreCompleto: '',
    telefono: '',
    email: '',
    linea1: '',
    linea2: '',
    ciudad: '',
    provincia: '',
    codigoPostal: '',
    pais: '',
  };
}

function pedidoEnBlanco(): BorradorDePedido {
  return {
    emailCliente: '',
    idExterno: '',
    consulta: '',
    notas: '',
    direccion: direccionVacia(),
    lineas: [],
  };
}

/**
 * Alta manual de un pedido.
 *
 * <p>Las etiquetas van ATADAS a su campo con `for`/`id`. Sueltas al lado, el lector de pantalla anunciaba
 * «cuadro de texto» sin decir cuál, y pulsar en el texto no llevaba el foco al campo.
 */
@Component({
  selector: 'nx-modal-alta-de-pedido',
  imports: [FaIconComponent, FormField],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="t('admin.orders.create.title')"
    >
      <!-- El fondo cierra al pulsarlo. Va como hermano y no envolviendo al panel: anidarlo obliga a
           frenar la propagación de cada clic de dentro, y basta olvidarlo una vez para que el
           formulario se cierre solo al escribir. -->
      <div class="absolute inset-0 bg-black/40" (click)="cierra.emit()" aria-hidden="true"></div>
      <div
        class="relative bg-base-100 rounded-box shadow-xl w-full max-w-2xl p-5 max-h-[92vh] overflow-y-auto space-y-3"
      >
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-lg">{{ t('admin.orders.create.title') }}</h3>
          <button
            type="button"
            (click)="cierra.emit()"
            class="btn btn-ghost btn-xs btn-square"
            [attr.aria-label]="t('common.close')"
          >
            <fa-icon [icon]="iconoAspa" />
          </button>
        </div>

        <!-- Móvil primero: una columna, y a partir de la anchura media dos. -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label for="alta-email" class="text-[12px] font-medium text-ink-600 mb-1 block">
              {{ t('admin.orders.create.customer_email') }}
            </label>
            <input
              id="alta-email"
              class="input input-bordered input-sm w-full"
              [formField]="formulario.emailCliente"
            />
          </div>
          <div>
            <label for="alta-externo" class="text-[12px] font-medium text-ink-600 mb-1 block">
              {{ t('admin.orders.create.external_id') }}
            </label>
            <input
              id="alta-externo"
              class="input input-bordered input-sm w-full"
              [formField]="formulario.idExterno"
            />
          </div>
        </div>

        <div>
          <label for="alta-buscar" class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.orders.create.items') }}
          </label>
          <!-- La búsqueda se lanza con lo que hay en el ELEMENTO, no con lo que ya haya llegado al
               modelo: el campo tiene su propio oyente del mismo suceso y así da igual cuál corra
               primero. -->
          <input
            id="alta-buscar"
            class="input input-bordered input-sm w-full"
            [placeholder]="t('admin.orders.create.search_product')"
            [formField]="formulario.consulta"
            (input)="busca($any($event.target).value)"
          />
          @if (consulta() && sugerencias().length > 0) {
            <div
              class="mt-1 max-h-40 overflow-y-auto border border-ink-100 rounded-md divide-y divide-ink-100"
            >
              @for (producto of sugerencias(); track producto.id) {
                <button
                  type="button"
                  (click)="anade(producto)"
                  class="w-full text-left px-3 py-1.5 text-[12px] hover:bg-ink-50 flex items-center gap-2"
                >
                  <fa-icon [icon]="iconoMas" class="text-ink-400" /> {{ producto.titulo }}
                </button>
              }
            </div>
          }
          @if (lineas().length > 0) {
            <div class="mt-2 space-y-1">
              @for (linea of lineas(); track linea.productoId; let posicion = $index) {
                <div class="flex items-center gap-2 text-[12px] bg-ink-50 rounded-md px-2 py-1">
                  <span class="flex-1 truncate">{{ linea.titulo }}</span>
                  <!-- Mientras se escribe se guarda lo tecleado tal cual; el mínimo se aplica al
                       salir del campo. Forzarlo en cada pulsación hacía que corregir una línea a 5
                       acabara pidiendo 15. El mínimo de 1 lo declara el esquema, no el marcado. -->
                  <input
                    type="number"
                    class="input input-bordered input-xs w-16"
                    [formField]="formulario.lineas[posicion].cantidad"
                    [attr.aria-label]="linea.titulo"
                    (blur)="normaliza(posicion)"
                  />
                  <button
                    type="button"
                    (click)="quita(linea.productoId)"
                    class="btn btn-ghost btn-xs btn-square text-error"
                    [attr.aria-label]="t('actions.delete')"
                  >
                    <fa-icon [icon]="iconoPapelera" />
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <fieldset>
          <legend class="text-[12px] font-medium text-ink-600 mb-1">
            {{ t('admin.orders.create.shipping') }}
          </legend>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            @for (campo of campos; track campo.clave) {
              <div>
                <label
                  [attr.for]="'alta-' + campo.clave"
                  class="text-[12px] text-ink-600 mb-1 block"
                >
                  {{ t(campo.etiqueta) }}{{ campo.obligatorio ? ' *' : '' }}
                </label>
                <input
                  [id]="'alta-' + campo.clave"
                  class="input input-bordered input-sm w-full"
                  [formField]="formulario.direccion[campo.clave]"
                />
                @if (
                  formulario.direccion[campo.clave]().touched() &&
                    errorDe(formulario.direccion[campo.clave]().errors());
                  as clave
                ) {
                  <p class="text-[11px] text-error mt-1" role="alert">{{ t(clave) }}</p>
                }
              </div>
            }
          </div>
        </fieldset>

        <div>
          <label for="alta-notas" class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.orders.create.notes') }}
          </label>
          <textarea
            id="alta-notas"
            class="textarea textarea-bordered textarea-sm w-full h-16"
            [formField]="formulario.notas"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <button type="button" (click)="cierra.emit()" class="btn btn-ghost btn-sm">
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            (click)="guarda()"
            [disabled]="guardando()"
            class="btn btn-primary btn-sm"
          >
            {{ t('actions.save') }}
          </button>
        </div>
      </div>
    </div>
  `,
  host: { '(document:keydown.escape)': 'cierra.emit()' },
})
export class ModalAltaDePedido {
  readonly cierra = output<void>();
  readonly creado = output<void>();

  protected readonly iconoAspa = faXmark;
  protected readonly iconoMas = faPlus;
  protected readonly iconoPapelera = faTrash;
  protected readonly errorDe = claveDeError;
  protected readonly t = inject(TraduccionService).t;

  private readonly crea = inject(CreaPedido);
  private readonly buscador = inject(BuscaProductosParaPedido);
  private readonly avisos = inject(AvisosStore);
  private readonly preferencias = inject(PreferenciasService);

  protected readonly guardando = signal(false);
  protected readonly sugerencias = signal<readonly { id: string; titulo: string }[]>([]);

  protected readonly modelo = signal<BorradorDePedido>(pedidoEnBlanco());

  /**
   * Los mismos campos que exige `faltanDatosDeEnvio` en el dominio, dichos aquí de forma declarativa.
   *
   * <p>El botón de guardar NO se apaga con esto: sin líneas o sin dirección el aviso tiene que
   * llegar, y quien decide sigue siendo el caso de uso. Lo que aporta el esquema es señalar EN EL
   * CAMPO cuál de los cuatro falta, en vez de un mensaje al pie que no dice dónde mirar.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    apply(ruta.direccion.nombreCompleto, TEXTO_CON_CONTENIDO);
    apply(ruta.direccion.linea1, TEXTO_CON_CONTENIDO);
    apply(ruta.direccion.ciudad, TEXTO_CON_CONTENIDO);
    apply(ruta.direccion.pais, TEXTO_CON_CONTENIDO);
    maxLength(ruta.direccion.pais, 2);
    maxLength(ruta.notas, 500);
    // Una línea siempre vale al menos una unidad ENTERA: con 0 o con media el almacén no sabe qué
    // preparar. Declararlo aquí devuelve al campo el tope que antes ponía el marcado.
    applyEach(ruta.lineas, (linea) => {
      required(linea.cantidad);
      min(linea.cantidad, 1);
    });
  });

  protected readonly consulta = computed(() => this.modelo().consulta);
  protected readonly lineas = computed(() => this.modelo().lineas);

  /** Los campos de la dirección, en el orden en que se rellenan. */
  protected readonly campos = [
    { clave: 'nombreCompleto', etiqueta: 'admin.orders.create.full_name', obligatorio: true },
    { clave: 'telefono', etiqueta: 'admin.orders.create.phone', obligatorio: false },
    { clave: 'email', etiqueta: 'admin.orders.create.email', obligatorio: false },
    { clave: 'linea1', etiqueta: 'admin.orders.create.line1', obligatorio: true },
    { clave: 'linea2', etiqueta: 'admin.orders.create.line2', obligatorio: false },
    { clave: 'ciudad', etiqueta: 'admin.orders.create.city', obligatorio: true },
    { clave: 'provincia', etiqueta: 'admin.orders.create.state', obligatorio: false },
    { clave: 'codigoPostal', etiqueta: 'admin.orders.create.postal', obligatorio: false },
    { clave: 'pais', etiqueta: 'admin.orders.create.country', obligatorio: true },
  ] as const satisfies readonly {
    clave: keyof BorradorDeDireccion;
    etiqueta: string;
    obligatorio: boolean;
  }[];

  protected async busca(texto: string): Promise<void> {
    if (!texto.trim()) {
      this.sugerencias.set([]);
      return;
    }
    const resultado = await this.buscador.ejecuta(texto, this.preferencias.idioma());
    this.sugerencias.set(resultado.ok ? [...resultado.valor] : []);
  }

  /** Añadir dos veces el mismo producto SUMA una unidad en vez de crear una línea repetida. */
  protected anade(producto: { id: string; titulo: string }): void {
    this.modelo.update((actual) => ({
      ...actual,
      lineas: actual.lineas.some((l) => l.productoId === producto.id)
        ? actual.lineas.map((l) =>
            l.productoId === producto.id ? { ...l, cantidad: (l.cantidad ?? 0) + 1 } : l,
          )
        : [...actual.lineas, { productoId: producto.id, titulo: producto.titulo, cantidad: 1 }],
    }));
  }

  protected normaliza(posicion: number): void {
    const campo = this.formulario.lineas[posicion].cantidad;
    campo().value.set(cantidadValida(campo().value() ?? 1));
  }

  protected quita(productoId: string): void {
    this.modelo.update((actual) => ({
      ...actual,
      lineas: actual.lineas.filter((l) => l.productoId !== productoId),
    }));
  }

  protected async guarda(): Promise<void> {
    // Al intentar guardar se marcan todos los campos como tocados: así lo que falta sale en rojo de
    // una vez, en vez de descubrirse campo a campo al ir pasando por ellos.
    this.formulario().markAsTouched();
    const borrador = this.modelo();
    const pedido: PedidoNuevo = {
      emailCliente: borrador.emailCliente.trim(),
      idExterno: borrador.idExterno.trim(),
      direccionDeEnvio: borrador.direccion,
      lineas: borrador.lineas.map((l) => ({
        productoId: l.productoId,
        cantidad: cantidadValida(l.cantidad ?? 1),
      })),
      notas: borrador.notas.trim(),
    };
    this.guardando.set(true);
    try {
      const resultado = await this.crea.ejecuta(pedido);
      if (resultado.ok) {
        this.creado.emit();
        this.cierra.emit();
        return;
      }
      this.avisos.error(this.mensajeDeFallo(resultado.error));
    } finally {
      this.guardando.set(false);
    }
  }

  /** Los dos rechazos propios tienen texto propio; el del servidor llega ya localizado por él. */
  private mensajeDeFallo(error: unknown): string {
    if (error === 'sin-lineas') {
      return this.t('admin.orders.create.no_items');
    }
    if (error === 'sin-direccion') {
      return this.t('admin.orders.create.addr_required');
    }
    const conMensaje = error as { mensaje?: string };
    return conMensaje.mensaje || this.t('common.error');
  }
}
