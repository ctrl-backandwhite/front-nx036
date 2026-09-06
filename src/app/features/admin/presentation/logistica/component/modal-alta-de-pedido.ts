import { Component, inject, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
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

/** Una línea mientras se está montando: lleva el título para poder enseñarla sin volver a buscar. */
interface LineaEnCurso {
  readonly productoId: string;
  readonly titulo: string;
  readonly cantidad: number;
}

function direccionVacia(): DireccionDeEnvio {
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

/**
 * Alta manual de un pedido.
 *
 * <p>Las etiquetas van ATADAS a su campo con `for`/`id`. Sueltas al lado, el lector de pantalla anunciaba
 * «cuadro de texto» sin decir cuál, y pulsar en el texto no llevaba el foco al campo.
 */
@Component({
  selector: 'nx-modal-alta-de-pedido',
  imports: [FaIconComponent],
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
              [value]="emailCliente()"
              (input)="emailCliente.set($any($event.target).value)"
            />
          </div>
          <div>
            <label for="alta-externo" class="text-[12px] font-medium text-ink-600 mb-1 block">
              {{ t('admin.orders.create.external_id') }}
            </label>
            <input
              id="alta-externo"
              class="input input-bordered input-sm w-full"
              [value]="idExterno()"
              (input)="idExterno.set($any($event.target).value)"
            />
          </div>
        </div>

        <div>
          <label for="alta-buscar" class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.orders.create.items') }}
          </label>
          <input
            id="alta-buscar"
            class="input input-bordered input-sm w-full"
            [placeholder]="t('admin.orders.create.search_product')"
            [value]="consulta()"
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
              @for (linea of lineas(); track linea.productoId) {
                <div class="flex items-center gap-2 text-[12px] bg-ink-50 rounded-md px-2 py-1">
                  <span class="flex-1 truncate">{{ linea.titulo }}</span>
                  <!-- Mientras se escribe se guarda lo tecleado tal cual; el mínimo se aplica al
                       salir del campo. Forzarlo en cada pulsación hacía que corregir una línea a 5
                       acabara pidiendo 15. -->
                  <input
                    type="number"
                    min="1"
                    class="input input-bordered input-xs w-16"
                    [value]="linea.cantidad"
                    [attr.aria-label]="linea.titulo"
                    (input)="cambiaCantidad(linea.productoId, $any($event.target).valueAsNumber)"
                    (blur)="normaliza(linea.productoId)"
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
                  [value]="valorDe(campo.clave)"
                  (input)="cambiaDireccion(campo.clave, $any($event.target).value)"
                />
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
            [value]="notas()"
            (input)="notas.set($any($event.target).value)"
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
  protected readonly t = inject(TraduccionService).t;

  private readonly crea = inject(CreaPedido);
  private readonly buscador = inject(BuscaProductosParaPedido);
  private readonly avisos = inject(AvisosStore);
  private readonly preferencias = inject(PreferenciasService);

  protected readonly emailCliente = signal('');
  protected readonly idExterno = signal('');
  protected readonly notas = signal('');
  protected readonly consulta = signal('');
  protected readonly guardando = signal(false);
  protected readonly lineas = signal<readonly LineaEnCurso[]>([]);
  protected readonly sugerencias = signal<readonly { id: string; titulo: string }[]>([]);
  protected readonly direccion = signal<DireccionDeEnvio>(direccionVacia());

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
  ] as const;

  protected valorDe(clave: keyof DireccionDeEnvio): string {
    return this.direccion()[clave] ?? '';
  }

  protected cambiaDireccion(clave: keyof DireccionDeEnvio, valor: string): void {
    this.direccion.update((actual) => ({ ...actual, [clave]: valor }));
  }

  protected async busca(texto: string): Promise<void> {
    this.consulta.set(texto);
    if (!texto.trim()) {
      this.sugerencias.set([]);
      return;
    }
    const resultado = await this.buscador.ejecuta(texto, this.preferencias.idioma());
    this.sugerencias.set(resultado.ok ? [...resultado.valor] : []);
  }

  /** Añadir dos veces el mismo producto SUMA una unidad en vez de crear una línea repetida. */
  protected anade(producto: { id: string; titulo: string }): void {
    this.lineas.update((actuales) =>
      actuales.some((l) => l.productoId === producto.id)
        ? actuales.map((l) =>
            l.productoId === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l,
          )
        : [...actuales, { productoId: producto.id, titulo: producto.titulo, cantidad: 1 }],
    );
  }

  protected cambiaCantidad(productoId: string, cantidad: number): void {
    this.lineas.update((actuales) =>
      actuales.map((l) =>
        l.productoId === productoId
          ? { ...l, cantidad: Number.isFinite(cantidad) ? cantidad : 1 }
          : l,
      ),
    );
  }

  protected normaliza(productoId: string): void {
    this.lineas.update((actuales) =>
      actuales.map((l) =>
        l.productoId === productoId ? { ...l, cantidad: cantidadValida(l.cantidad) } : l,
      ),
    );
  }

  protected quita(productoId: string): void {
    this.lineas.update((actuales) => actuales.filter((l) => l.productoId !== productoId));
  }

  protected async guarda(): Promise<void> {
    const pedido: PedidoNuevo = {
      emailCliente: this.emailCliente().trim(),
      idExterno: this.idExterno().trim(),
      direccionDeEnvio: this.direccion(),
      lineas: this.lineas().map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
      notas: this.notas().trim(),
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
