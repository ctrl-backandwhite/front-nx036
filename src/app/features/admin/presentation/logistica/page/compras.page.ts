import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faFileExcel,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  AvanceDeHoja,
  COLUMNAS_DE_COMPRA,
  CompraAProveedor,
  DIAS_HASTA_DESTRUCCION,
  EstadoDeCompra,
  PasoDeCompra,
  agrupaPorPedido,
  pedidosBloqueados,
} from '../../../domain/logistica/model/compra';
import {
  AnulaCompra,
  ConsultaCompras,
  CopiaDireccionDeAlmacen,
  DescargaHojaDeEmpaquetado,
  MarcaCompraHecha,
  MarcaEnvioDelProveedor,
  MarcaRecepcionEnAlmacen,
  MarcaReempaquetado,
  ReexportaCompra,
} from '../../../application/logistica/use-case/gestiona-compras.use-case';
import { TarjetaDeCompra } from '../component/tarjeta-de-compra';

/** Filas por página. En servidor: el tablero no puede cargar la cola entera a volumen alto. */
const TAMANO_PAGINA = 25;

/**
 * La mesa de trabajo del tramo chino: qué comprar, qué está de camino al almacén y qué falta por
 * registrar en el sistema de re-empaquetado.
 *
 * <p>Antes era un Kanban que cargaba la cola ENTERA: con miles de pedidos el navegador se arrastraba.
 * Ahora es una lista PAGINADA en servidor, filtrable por estado (lo que eran las columnas). Los avisos
 * de «en riesgo» y «bloqueados» se piden aparte, acotados, para que no dependan de la página mirada.
 *
 * <p>Un fallo se explica: el caso frecuente es que la pantalla lleve rato abierta y la fila ya no
 * exista; entonces se dice eso y se recarga.
 */
@Component({
  selector: 'nx-compras-page',
  imports: [FaIconComponent, TarjetaDeCompra],
  template: `
    <div class="space-y-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold">{{ t('admin.purchases.title') }}</h1>
          <p class="text-sm text-ink-500">{{ t('admin.purchases.subtitle') }}</p>
        </div>
        <button
          type="button"
          (click)="descarga()"
          [disabled]="!exportables() || descargando()"
          class="btn btn-success btn-sm"
        >
          <fa-icon [icon]="iconos.hoja" />
          {{ t('admin.purchases.download_sheet') }} ({{ exportables() }})
        </button>
      </header>

      @if (enPeligro().length > 0) {
        <div class="rounded-xl border border-red-300 bg-red-50 p-4" role="alert">
          <p class="flex items-center gap-2 font-medium text-red-800">
            <fa-icon [icon]="iconos.aviso" />
            {{ rotuloDeRiesgo() }}
          </p>
          <p class="mt-1 text-sm text-red-700">{{ ayudaDeRiesgo() }}</p>
          <ul class="mt-2 space-y-1 text-sm">
            @for (compra of enPeligro(); track compra.id) {
              <li class="text-red-800">
                {{ compra.numeroDePedido }} · {{ compra.seguimientoDomestico }} ·
                {{ compra.diasEnAlmacen }} {{ t('admin.purchases.days') }}
              </li>
            }
          </ul>
        </div>
      }

      @if (bloqueados() > 0) {
        <details class="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <!-- Se cuentan PEDIDOS, no incidencias: uno solo puede acumular varios motivos. -->
          <summary class="cursor-pointer font-medium text-amber-900">
            {{ rotuloDeIncidencias() }}
          </summary>
          <ul class="mt-2 space-y-1 text-sm text-amber-800">
            @for (incidencia of incidencias(); track $index) {
              <li>
                <span class="font-mono">{{ incidencia.numeroDePedido }}</span> —
                {{ incidencia.motivo }}
              </li>
            }
          </ul>
        </details>
      }

      <!-- Filtro por estado: lo que antes eran las columnas del Kanban. Alterna: volver a pulsar el
           activo lo quita. Mobile first: las fichas fluyen a varias líneas en pantalla estrecha. -->
      <div class="flex flex-wrap gap-2">
        @for (estado of estados; track estado) {
          <button
            type="button"
            (click)="filtra(estado)"
            class="btn btn-sm"
            [class.btn-primary]="filtroEstado() === estado"
            [class.btn-ghost]="filtroEstado() !== estado"
          >
            {{ t('admin.purchases.status.' + estado.toLowerCase()) }}
          </button>
        }
      </div>

      <p class="text-sm text-ink-500">{{ rotuloDeTotal() }}</p>

      <div class="space-y-4">
        @for (grupo of grupos(); track grupo.pedido) {
          <div class="rounded-lg border border-ink-200">
            <div
              class="flex items-center justify-between gap-2 border-b border-ink-200 px-3 py-2"
            >
              <span class="font-mono text-xs text-ink-500">{{ grupo.pedido }}</span>
              @if (grupo.compras.length > 1) {
                <span class="rounded-full bg-ink-100 px-2 text-[11px] text-ink-500">
                  {{ grupo.compras.length }}
                </span>
              }
            </div>
            <div class="divide-y divide-ink-200">
              @for (compra of grupo.compras; track compra.id) {
                <nx-tarjeta-de-compra
                  [compra]="compra"
                  [ocupado]="ocupada() === compra.id"
                  (pide)="avanza(compra, $event)"
                  (copia)="copiaDireccion(compra)"
                />
              }
            </div>
          </div>
        } @empty {
          <p class="py-10 text-center text-sm text-ink-400">{{ t('admin.purchases.empty') }}</p>
        }
      </div>

      @if (totalPaginas() > 1) {
        <div class="flex items-center justify-center gap-4">
          <button
            type="button"
            (click)="anterior()"
            [disabled]="!puedeAnterior()"
            class="btn btn-sm btn-ghost"
          >
            <fa-icon [icon]="iconos.anterior" /> {{ t('pagination.previous') }}
          </button>
          <span class="text-sm text-ink-600">{{ rotuloDePagina() }}</span>
          <button
            type="button"
            (click)="siguiente()"
            [disabled]="!puedeSiguiente()"
            class="btn btn-sm btn-ghost"
          >
            {{ t('pagination.next') }} <fa-icon [icon]="iconos.siguiente" />
          </button>
        </div>
      }

      <footer class="rounded-xl border border-ink-200 p-4 text-sm">
        <p class="flex items-center gap-2 font-medium">
          <fa-icon [icon]="iconos.correcto" class="text-emerald-600" />
          {{ t('admin.purchases.howto_title') }}
        </p>
        <ol class="mt-2 list-decimal space-y-1 pl-5 text-ink-600">
          <li>{{ t('admin.purchases.howto_1') }}</li>
          <li>{{ t('admin.purchases.howto_2') }}</li>
          <li>{{ t('admin.purchases.howto_dispatch') }}</li>
          <li>{{ t('admin.purchases.howto_3') }}</li>
          <li>{{ t('admin.purchases.howto_4') }}</li>
        </ol>
      </footer>
    </div>
  `,
})
export class ComprasPage {
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconos = {
    hoja: faFileExcel,
    aviso: faTriangleExclamation,
    correcto: faCircleCheck,
    anterior: faChevronLeft,
    siguiente: faChevronRight,
  };

  /** Los estados filtrables, en el orden del proceso (lo que eran las columnas del Kanban). */
  protected readonly estados = COLUMNAS_DE_COMPRA;

  private readonly consulta = inject(ConsultaCompras);
  private readonly comprada = inject(MarcaCompraHecha);
  private readonly enviada = inject(MarcaEnvioDelProveedor);
  private readonly recibida = inject(MarcaRecepcionEnAlmacen);
  private readonly reempaquetada = inject(MarcaReempaquetado);
  private readonly anulacion = inject(AnulaCompra);
  private readonly reexportacion = inject(ReexportaCompra);
  private readonly hoja = inject(DescargaHojaDeEmpaquetado);
  private readonly portapapeles = inject(CopiaDireccionDeAlmacen);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);

  protected readonly compras = signal<readonly CompraAProveedor[]>([]);
  protected readonly avance = signal<AvanceDeHoja | null>(null);
  protected readonly enPeligro = signal<readonly CompraAProveedor[]>([]);
  protected readonly ocupada = signal<string | null>(null);
  protected readonly descargando = signal(false);
  protected readonly filtroEstado = signal<EstadoDeCompra | null>(null);
  protected readonly pagina = signal(0);
  protected readonly total = signal(0);
  protected readonly totalPaginas = signal(0);

  protected readonly grupos = computed(() => agrupaPorPedido(this.compras()));
  protected readonly exportables = computed(() => this.avance()?.exportables ?? 0);
  protected readonly incidencias = computed(() => this.avance()?.incidencias ?? []);
  protected readonly bloqueados = computed(() => pedidosBloqueados(this.incidencias()));
  protected readonly puedeAnterior = computed(() => this.pagina() > 0);
  protected readonly puedeSiguiente = computed(() => this.pagina() + 1 < this.totalPaginas());

  // Los rótulos con cifra se arman UNA vez por cambio, no en cada repintado, y dejan el número fuera
  // de la cadena traducida para poder encontrarlo.
  protected readonly rotuloDeRiesgo = computed(() =>
    this.t('admin.purchases.at_risk_title').replace('{n}', String(this.enPeligro().length)),
  );
  protected readonly ayudaDeRiesgo = computed(() =>
    this.t('admin.purchases.at_risk_help').replace('{d}', String(DIAS_HASTA_DESTRUCCION)),
  );
  protected readonly rotuloDeIncidencias = computed(() =>
    this.t('admin.purchases.issues_title').replace('{n}', String(this.bloqueados())),
  );
  protected readonly rotuloDeTotal = computed(
    () => `${this.t('pagination.showing')} ${this.compras().length} / ${this.total()}`,
  );
  protected readonly rotuloDePagina = computed(
    () =>
      `${this.t('pagination.page')} ${this.pagina() + 1} ${this.t('pagination.of')} ` +
      `${Math.max(this.totalPaginas(), 1)}`,
  );

  constructor() {
    void this.recarga();
  }

  private async recarga(): Promise<void> {
    const [pagina, avance, riesgo] = await Promise.all([
      this.consulta.cola({
        estado: this.filtroEstado() ?? undefined,
        pagina: this.pagina(),
        tamano: TAMANO_PAGINA,
      }),
      this.consulta.avanceDeLaHoja(),
      this.consulta.enRiesgo(),
    ]);
    if (pagina.ok) {
      this.compras.set(pagina.valor.items);
      this.total.set(pagina.valor.total);
      this.totalPaginas.set(pagina.valor.totalPaginas);
    }
    if (avance.ok) {
      this.avance.set(avance.valor);
    }
    if (riesgo.ok) {
      this.enPeligro.set(riesgo.valor);
    }
  }

  /** Alterna el filtro de estado: volver a pulsar el activo lo quita. Vuelve a la primera página. */
  protected filtra(estado: EstadoDeCompra): void {
    this.filtroEstado.set(this.filtroEstado() === estado ? null : estado);
    this.pagina.set(0);
    void this.recarga();
  }

  protected anterior(): void {
    if (this.puedeAnterior()) {
      this.pagina.update((p) => p - 1);
      void this.recarga();
    }
  }

  protected siguiente(): void {
    if (this.puedeSiguiente()) {
      this.pagina.update((p) => p + 1);
      void this.recarga();
    }
  }

  protected async avanza(compra: CompraAProveedor, paso: PasoDeCompra): Promise<void> {
    const accion = await this.accionDelPaso(compra, paso);
    if (!accion) {
      return;
    }
    this.ocupada.set(compra.id);
    try {
      const resultado = await accion();
      if (!resultado.ok) {
        // Un 404 significa que la fila ya no existe: se dice eso, que es lo único accionable, y se
        // recarga. El resto de mensajes llegan ya humanizados por el backend.
        this.avisos.error(
          resultado.error.tipo === 'no-encontrado'
            ? this.t('admin.purchases.gone')
            : resultado.error.mensaje || this.t('admin.purchases.error'),
        );
      }
      await this.recarga();
    } finally {
      this.ocupada.set(null);
    }
  }

  /** Traduce el paso pedido en la llamada que toca, pidiendo antes los datos que hagan falta. */
  private async accionDelPaso(compra: CompraAProveedor, paso: PasoDeCompra) {
    switch (paso) {
      case 'bought':
        return this.pideDatosDeCompra(compra);
      case 'shipped':
        return this.pideDatosDeEnvio(compra);
      case 'received':
        return () => this.recibida.ejecuta(compra.id);
      case 'packed':
        return this.pideDatosDeReempaquetado(compra);
      case 'cancel':
        return this.pideMotivoDeAnulacion(compra);
      case 'reexport':
        return () => this.reexportacion.ejecuta(compra.id);
      default:
        return null;
    }
  }

  private async pideDatosDeCompra(compra: CompraAProveedor) {
    const datos = await this.dialogo.formulario({
      titulo: this.t('admin.purchases.form_bought'),
      campos: [
        { nombre: 'ref', etiqueta: this.t('admin.purchases.ask_ref') },
        { nombre: 'coste', etiqueta: this.t('admin.purchases.ask_cost'), tipo: 'number', min: 0 },
        { nombre: 'envio', etiqueta: this.t('admin.purchases.ask_shipping'), tipo: 'number', min: 0 },
      ],
    });
    if (!datos) {
      return null;
    }
    return () =>
      this.comprada.ejecuta(compra.id, {
        referencia: datos['ref'] || undefined,
        costeCny: datos['coste'] ? Number(datos['coste']) : undefined,
        envioCny: datos['envio'] ? Number(datos['envio']) : undefined,
      });
  }

  private async pideDatosDeEnvio(compra: CompraAProveedor) {
    const datos = await this.dialogo.formulario({
      titulo: this.t('admin.purchases.form_shipped'),
      mensaje: this.t('admin.purchases.form_shipped_hint'),
      campos: [
        // Obligatorio: es el dato que dispara la guía internacional, y el almacén empareja el bulto
        // por coincidencia exacta.
        {
          nombre: 'seguimiento',
          etiqueta: this.t('admin.purchases.ask_tracking'),
          obligatorio: true,
        },
        { nombre: 'transportista', etiqueta: this.t('admin.purchases.ask_carrier') },
      ],
    });
    if (!datos) {
      return null;
    }
    return () =>
      this.enviada.ejecuta(compra.id, {
        seguimiento: datos['seguimiento'],
        transportista: datos['transportista'] || undefined,
      });
  }

  private async pideDatosDeReempaquetado(compra: CompraAProveedor) {
    const numero = await this.dialogo.pregunta({
      mensaje: this.t('admin.purchases.ask_pack_no'),
      valorInicial: '',
    });
    if (numero === null) {
      return null;
    }
    return () =>
      this.reempaquetada.ejecuta(compra.id, {
        numeroDeOrden: numero || undefined,
        tipoDeServicio: compra.servicioSugerido,
      });
  }

  private async pideMotivoDeAnulacion(compra: CompraAProveedor) {
    // La confirmación y el motivo van JUNTOS: preguntar y luego pedir el motivo en otra ventana
    // obligaba a decidir dos veces lo mismo.
    const datos = await this.dialogo.formulario({
      titulo: this.t('admin.purchases.confirm_cancel'),
      variante: 'error',
      etiquetaConfirmar: this.t('admin.purchases.cancel'),
      campos: [{ nombre: 'motivo', etiqueta: this.t('admin.purchases.ask_reason') }],
    });
    if (!datos) {
      return null;
    }
    return () => this.anulacion.ejecuta(compra.id, datos['motivo'] || undefined);
  }

  protected async descarga(): Promise<void> {
    this.descargando.set(true);
    try {
      const resultado = await this.hoja.ejecuta();
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('admin.purchases.error'));
        return;
      }
      // La descarga MARCA las compras como exportadas: hay que recargar para que salgan de la cola.
      await this.recarga();
    } finally {
      this.descargando.set(false);
    }
  }

  protected async copiaDireccion(compra: CompraAProveedor): Promise<void> {
    const copiado = await this.portapapeles.ejecuta(compra.direccionDeAlmacen);
    if (copiado) {
      this.avisos.exito(this.t('admin.purchases.copied'));
    }
  }
}
