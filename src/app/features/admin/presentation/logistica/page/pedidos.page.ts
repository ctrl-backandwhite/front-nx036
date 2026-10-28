import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFileImport, faPlus, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { APP_CONFIG } from '@core/config/app-config';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { BarraFiltros } from '@ds/component/filtros/barra-filtros';
import { CampoBusqueda } from '@ds/component/campo-busqueda/campo-busqueda';
import {
  AccionSobrePedido,
  CriterioDePedidos,
  ESTADOS_DE_PEDIDO,
  Pedido,
  aniosDisponibles,
} from '../../../domain/logistica/model/pedido';
import { Seleccion } from '../../../application/logistica/state/seleccion';
import {
  BuscaPedidos,
  CambiaEstadoDePedido,
  CambiaEstadoEnLote,
  ReindexaPedidos,
} from '../../../application/logistica/use-case/gestiona-pedidos.use-case';
import { CreaPedidoDeDemostracion } from '../../../application/logistica/use-case/alta-de-pedidos.use-case';
import { AccionesEnLote } from '../component/acciones-en-lote';
import { FiltrosDePedidos } from '../component/filtros-de-pedidos';
import { ModalAltaDePedido } from '../component/modal-alta-de-pedido';
import { ModalImportaPedidos } from '../component/modal-importa-pedidos';
import { Paginacion } from '../component/paginacion';
import { PeticionSobrePedido, TablaDePedidos } from '../component/tabla-de-pedidos';

/** Cuántas filas por página. Las mismas que pedía el front anterior, para que los enlaces cuadren. */
const POR_PAGINA = 25;

/**
 * El listado de pedidos del panel.
 *
 * <p>Orquesta: pide, confirma, avisa y recarga. No sabe qué transiciones existen —eso es del dominio— ni
 * cómo se habla con el backend —eso es del adaptador—. Lo que sí decide es el FLUJO: una acción
 * destructiva se confirma antes, y un fallo se enseña con el mensaje del servidor.
 *
 * <p>Un cambio de estado que falla NO puede quedarse en silencio. El caso que lo obliga es el despacho:
 * cuando al producto le faltan datos de aduana, el backend responde con el detalle producto a producto
 * («falta partida arancelaria, peso unitario…»), y sin enseñarlo el pedido se queda cobrado y atascado —
 * quien opera cree haberlo despachado y nadie vuelve a mirarlo.
 */
@Component({
  selector: 'nx-pedidos-page',
  imports: [
    FaIconComponent,
    BarraFiltros,
    CampoBusqueda,
    AccionesEnLote,
    FiltrosDePedidos,
    ModalAltaDePedido,
    ModalImportaPedidos,
    Paginacion,
    TablaDePedidos,
  ],
  template: `
    <div class="space-y-5">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{{ t('admin.orders.title') }}</h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('admin.orders.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <nx-acciones-en-lote
            [cuantos]="seleccion.cuantos()"
            [ocupado]="enLote()"
            (pide)="aplicaEnLote($event)"
          />
          <button
            type="button"
            (click)="reindexa()"
            [disabled]="reindexando()"
            class="btn btn-outline text-[12px]"
            [title]="t('admin.reindex')"
          >
            <fa-icon [icon]="iconoRecarga" [class.fa-spin]="reindexando()" />
            {{ t('admin.reindex') }}
          </button>
          <button
            type="button"
            (click)="importando.set(true)"
            class="btn btn-outline text-[12px]"
          >
            <fa-icon [icon]="iconoImportar" /> {{ t('admin.orders.import.title') }}
          </button>
          <button type="button" (click)="creando.set(true)" class="btn btn-primary text-[12px]">
            <fa-icon [icon]="iconoMas" /> {{ t('admin.orders.create.title') }}
          </button>
          @if (permiteDemostracion) {
            <button type="button" (click)="creaDemostracion()" class="btn btn-outline text-[12px]">
              <fa-icon [icon]="iconoMas" /> {{ t('admin.orders.create_demo') }}
            </button>
          }
        </div>
      </header>

      @if (creando()) {
        <nx-modal-alta-de-pedido (cierra)="creando.set(false)" (creado)="recarga()" />
      }
      @if (importando()) {
        <nx-modal-importa-pedidos (cierra)="importando.set(false)" (importado)="recarga()" />
      }

      <nx-barra-filtros
        [activos]="cuantosFiltros()"
        [hayActivos]="cuantosFiltros() > 0"
        (limpia)="limpiaFiltros()"
      >
        <nx-campo-busqueda
          [(valor)]="texto"
          [marcador]="t('admin.orders.search_placeholder')"
          clase="w-full sm:min-w-[280px]"
        />
        <nx-filtros-de-pedidos
          [(estado)]="estado"
          [(anio)]="anio"
          [(mes)]="mes"
          [(dia)]="dia"
          [(rango)]="rango"
          [estados]="estados"
          [anios]="anios"
        />
        <span class="text-[11px] text-ink-400 ml-auto">
          {{ t('pagination.showing') }} <strong>{{ pedidos().length }}</strong> / {{ total() }}
        </span>
      </nx-barra-filtros>

      <nx-tabla-de-pedidos
        [pedidos]="pedidos()"
        [seleccion]="seleccion"
        [resaltado]="focus() ?? null"
        (pide)="aplicaAUno($event)"
      />

      <nx-paginacion [(pagina)]="pagina" [paginas]="paginas()" />
    </div>
  `,
})
export class PedidosPage {
  /** Identificador o número que llega por la dirección para resaltar una fila. */
  readonly focus = input<string | undefined>(undefined);

  protected readonly iconoMas = faPlus;
  protected readonly iconoImportar = faFileImport;
  protected readonly iconoRecarga = faRotateRight;
  protected readonly estados = ESTADOS_DE_PEDIDO;
  protected readonly t = inject(TraduccionService).t;

  private readonly buscador = inject(BuscaPedidos);
  private readonly cambia = inject(CambiaEstadoDePedido);
  private readonly cambiaEnLote = inject(CambiaEstadoEnLote);
  private readonly reindexador = inject(ReindexaPedidos);
  private readonly demostracion = inject(CreaPedidoDeDemostracion);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);

  /** Sembrar pedidos de mentira solo tiene sentido fuera de producción. */
  protected readonly permiteDemostracion = !inject(APP_CONFIG).produccion;

  protected readonly seleccion = new Seleccion();

  protected readonly estado = signal<string | null>(null);
  protected readonly texto = signal('');
  protected readonly rango = signal({ desde: '', hasta: '' });
  protected readonly anio = signal<string | null>(null);
  protected readonly mes = signal<string | null>(null);
  protected readonly dia = signal<string | null>(null);
  protected readonly pagina = signal(0);

  protected readonly enLote = signal(false);
  protected readonly reindexando = signal(false);
  protected readonly creando = signal(false);
  protected readonly importando = signal(false);

  protected readonly pedidos = signal<readonly Pedido[]>([]);
  protected readonly total = signal(0);
  protected readonly paginas = signal(1);

  // Los años del filtro NO salen de la página cargada (a volumen dejaría fuera años sin pedidos en las
  // 25 filas visibles): se generan hasta el año en curso. El filtrado por fecha va en el servidor.
  protected readonly anios = aniosDisponibles(new Date().getFullYear());

  protected readonly cuantosFiltros = computed(
    () =>
      [
        this.estado(),
        this.texto(),
        this.rango().desde,
        this.rango().hasta,
        this.anio(),
        this.mes(),
        this.dia(),
      ].filter(Boolean).length,
  );

  constructor() {
    // Volver a pedir cuando cambia cualquier filtro. Las fechas TAMBIÉN van al servidor (año/mes/día son
    // desplegables y el rango son campos de fecha: cada cambio es una sola petición, no una por tecla),
    // porque recortarlas en el navegador solo afinaba las 25 filas visibles y fallaba a volumen.
    effect(() => {
      void this.pide(this.criterioActual());
    });
  }

  /** El criterio que define la vista actual: lo que se pide al servidor y lo que se repite al recargar. */
  private criterioActual(): CriterioDePedidos {
    return {
      estado: this.estado() ?? undefined,
      texto: this.texto() || undefined,
      desde: this.rango().desde || undefined,
      hasta: this.rango().hasta || undefined,
      anio: this.anio() ?? undefined,
      mes: this.mes() ?? undefined,
      dia: this.dia() ?? undefined,
      pagina: this.pagina(),
      tamano: POR_PAGINA,
    };
  }

  private async pide(criterio: CriterioDePedidos): Promise<void> {
    const resultado = await this.buscador.ejecuta(criterio);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
      return;
    }
    this.pedidos.set(resultado.valor.pedidos);
    this.total.set(resultado.valor.total);
    this.paginas.set(Math.max(1, resultado.valor.paginas));
  }

  protected recarga(): void {
    void this.pide(this.criterioActual());
  }

  protected limpiaFiltros(): void {
    this.estado.set(null);
    this.texto.set('');
    this.rango.set({ desde: '', hasta: '' });
    this.anio.set(null);
    this.mes.set(null);
    this.dia.set(null);
    this.pagina.set(0);
  }

  protected async aplicaAUno({ pedido, accion }: PeticionSobrePedido): Promise<void> {
    const confirmado = await this.dialogo.confirma(this.t(this.claveDeConfirmacion(accion)));
    if (!confirmado) {
      return;
    }
    const resultado = await this.cambia.ejecuta(pedido, accion);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
      return;
    }
    this.avisos.exito(this.t(`admin.orders.toast.${SUFIJO_DE_AVISO[accion]}`));
    this.recarga();
  }

  protected async aplicaEnLote(accion: AccionSobrePedido): Promise<void> {
    const marcados = this.seleccion.filasDe(this.pedidos());
    const elegibles = this.cambiaEnLote.cuantosElegibles(marcados, accion);
    if (elegibles === 0) {
      this.avisos.muestra({
        tipo: 'warning',
        mensaje: this.t('admin.orders.bulk.none_eligible'),
      });
      return;
    }
    const confirmado = await this.dialogo.confirma(
      this.t('admin.orders.bulk.confirm').replace('{n}', String(elegibles)),
      this.t(`admin.orders.bulk.${accion}`),
    );
    if (!confirmado) {
      return;
    }
    this.enLote.set(true);
    try {
      const resultado = await this.cambiaEnLote.ejecuta(marcados, accion);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
        return;
      }
      const parte = resultado.valor;
      this.seleccion.limpia();
      this.recarga();
      // Se dice qué salió, qué falló y qué se saltó: un lote a medias sin detalle obliga a repetirlo
      // entero, y repetir una transición ya hecha da otro error encima.
      const resumen = this.t('admin.orders.bulk.done')
        .replace('{ok}', String(parte.correctas))
        .replace('{fail}', String(parte.fallidas))
        .replace('{skip}', String(parte.saltadas));
      this.avisos.muestra({
        tipo: parte.fallidas ? 'warning' : 'success',
        mensaje: parte.fallidas ? `${resumen}\n${parte.errores.slice(0, 8).join('\n')}` : resumen,
      });
    } finally {
      this.enLote.set(false);
    }
  }

  protected async reindexa(): Promise<void> {
    this.reindexando.set(true);
    try {
      const resultado = await this.reindexador.ejecuta();
      if (!resultado.ok) {
        this.avisos.error(this.t('admin.reindex_error'));
        return;
      }
      this.avisos.exito(this.t('admin.reindex_ok').replace('{n}', String(resultado.valor)));
      this.recarga();
    } finally {
      this.reindexando.set(false);
    }
  }

  protected async creaDemostracion(): Promise<void> {
    const resultado = await this.demostracion.ejecuta();
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
      return;
    }
    this.avisos.exito(this.t('admin.orders.toast.demo_created'));
    this.recarga();
  }

  /** El texto de la confirmación. «Cancelar» tiene clave propia por historia del diccionario. */
  private claveDeConfirmacion(accion: AccionSobrePedido): string {
    return accion === 'cancel'
      ? 'admin.orders.cancel_confirm'
      : `admin.orders.confirm.${accion}`;
  }
}

/** El sufijo del aviso de cada acción: el diccionario los guarda en pasado. */
const SUFIJO_DE_AVISO: Readonly<Record<AccionSobrePedido, string>> = {
  forward: 'forwarded',
  ship: 'shipped',
  deliver: 'delivered',
  cancel: 'cancelled',
  refund: 'refunded',
};
