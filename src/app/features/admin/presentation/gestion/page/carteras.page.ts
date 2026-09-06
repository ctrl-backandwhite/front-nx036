import { Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { BarraFiltros } from '@ds/component/filtros/barra-filtros';
import { FiltroSeleccion, OpcionFiltro } from '@ds/component/filtros/filtro-seleccion';
import { CampoBusqueda } from '@ds/component/campo-busqueda/campo-busqueda';
import {
  DIVISAS_DE_FILTRO,
  ESTADOS_DE_CARTERA,
  MovimientoDeCartera,
  ResumenDeCartera,
} from '../../../domain/gestion/model/carteras';
import { paginasAlMenosUna } from '../../../domain/gestion/model/pagina';
import {
  AjustaLaCartera,
  BuscaCarteras,
  ConsultaMovimientos,
  IngresaEnLaCartera,
  ReindexaCarteras,
} from '../../../application/gestion/use-case/carteras.use-case';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import { Paginacion } from '../component/paginacion';
import { CarterasModalHistorial } from '../component/carteras-modal-historial';
import {
  CarterasModalSaldo,
  ImporteConMotivo,
} from '../component/carteras-modal-saldo';
import {
  CarterasTabla,
  PeticionSobreCartera,
} from '../component/carteras-tabla';

/** Cuántas carteras por página. Las mismas que pedía el panel anterior. */
const POR_PAGINA = 25;

/** Cuántos apuntes trae el vistazo rápido del listado. El histórico completo está en el detalle. */
const APUNTES_DEL_VISTAZO = 30;

/**
 * El listado de carteras de clientes.
 *
 * <p>Los saldos son DÓLARES canónicos: así los guarda el backend, y así se pasan a `ImportesStore` para
 * escribirlos en la divisa activa. Mezclar las dos cosas convertía el mismo saldo en un número distinto
 * en cada pantalla.
 *
 * <p>Mover saldo es una operación CONTABLE, y por eso hay dos acciones y no una: el DEPÓSITO solo suma;
 * el AJUSTE lleva signo y motivo obligatorio, porque el apunte queda en el libro mayor. No existe «poner
 * el saldo en X»: un saldo escrito a mano no se puede reconciliar con nada.
 *
 * <p>MOBILE FIRST: la cabecera se envuelve, los filtros arrancan plegados y la tabla se desplaza dentro
 * de su caja.
 */
@Component({
  selector: 'nx-carteras-admin',
  imports: [
    FaIconComponent,
    BarraFiltros,
    FiltroSeleccion,
    CampoBusqueda,
    Paginacion,
    CarterasTabla,
    CarterasModalSaldo,
    CarterasModalHistorial,
  ],
  template: `
    <div class="space-y-5">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{{ t('admin.wallets.title') }}</h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('admin.wallets.subtitle') }}</p>
        </div>
        <button
          type="button"
          (click)="reindexa()"
          [disabled]="reindexando()"
          class="btn btn-outline text-[12px]"
          [title]="t('admin.reindex')"
        >
          <fa-icon [icon]="iconoRecarga" [class.fa-spin]="reindexando()" /> {{ t('admin.reindex') }}
        </button>
      </header>

      <nx-barra-filtros
        [activos]="cuantosFiltros()"
        [hayActivos]="cuantosFiltros() > 0"
        (limpia)="limpiaFiltros()"
      >
        <nx-campo-busqueda
          [(valor)]="texto"
          [marcador]="t('admin.wallets.search')"
          clase="min-w-[320px]"
        />
        <nx-filtro-seleccion
          [etiqueta]="t('admin.wallets.col.status')"
          [(valor)]="estado"
          [opciones]="opcionesDeEstado()"
          [marcador]="t('filters.all')"
        />
        <nx-filtro-seleccion
          [etiqueta]="t('admin.wallets.col.currency')"
          [(valor)]="divisa"
          [opciones]="opcionesDeDivisa"
          [marcador]="t('filters.all')"
        />
        <span class="text-[11px] text-ink-400 ml-auto">
          {{ t('pagination.showing') }} <strong>{{ carteras().length }}</strong> / {{ total() }}
        </span>
      </nx-barra-filtros>

      <nx-carteras-tabla [carteras]="carteras()" (pide)="abre($event)" />

      <nx-paginacion [pagina]="pagina()" [paginas]="paginas()" (cambia)="pagina.set($event)" />

      @if (moviendo(); as peticion) {
        <nx-carteras-modal-saldo
          [clase]="peticion.accion === 'deposito' ? 'deposito' : 'ajuste'"
          [email]="peticion.cartera.email"
          [enviando]="enviando()"
          (cierra)="moviendo.set(null)"
          (confirma)="mueveSaldo(peticion, $event)"
        />
      }

      @if (mirando(); as cartera) {
        <nx-carteras-modal-historial
          [email]="cartera.email"
          [movimientos]="movimientos()"
          [cargando]="cargandoHistorial()"
          (cierra)="mirando.set(null)"
        />
      }
    </div>
  `,
})
export class CarterasPage {
  protected readonly iconoRecarga = faRotateRight;

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly tCon = this.traduccion.tCon;

  private readonly buscador = inject(BuscaCarteras);
  private readonly deposito = inject(IngresaEnLaCartera);
  private readonly ajuste = inject(AjustaLaCartera);
  private readonly historial = inject(ConsultaMovimientos);
  private readonly reindexador = inject(ReindexaCarteras);
  private readonly avisos = inject(AvisosStore);
  private readonly importes = inject(ImportesStore);

  protected readonly texto = signal('');
  protected readonly estado = signal<string | null>(null);
  protected readonly divisa = signal<string | null>(null);

  /** Al tocar un filtro se vuelve a la primera página; si no, se pediría una página que ya no existe. */
  protected readonly pagina = linkedSignal<string, number>({
    source: () => `${this.texto()}|${this.estado()}|${this.divisa()}`,
    computation: () => 0,
  });

  protected readonly carteras = signal<readonly ResumenDeCartera[]>([]);
  protected readonly total = signal(0);
  protected readonly paginas = signal(1);

  protected readonly reindexando = signal(false);
  protected readonly enviando = signal(false);

  protected readonly moviendo = signal<PeticionSobreCartera | null>(null);
  protected readonly mirando = signal<ResumenDeCartera | null>(null);
  protected readonly movimientos = signal<readonly MovimientoDeCartera[]>([]);
  protected readonly cargandoHistorial = signal(false);

  protected readonly opcionesDeEstado = computed<readonly OpcionFiltro[]>(() =>
    ESTADOS_DE_CARTERA.map((e) => ({ value: e, label: this.t(`admin.wallets.status.${e}`) })),
  );

  /** Los códigos de divisa no se traducen: «EUR» es «EUR» en los ocho idiomas. */
  protected readonly opcionesDeDivisa: readonly OpcionFiltro[] = DIVISAS_DE_FILTRO.map((d) => ({
    value: d,
    label: d,
  }));

  protected readonly cuantosFiltros = computed(
    () => [this.texto(), this.estado(), this.divisa()].filter(Boolean).length,
  );

  constructor() {
    // Las tasas de cambio hacen falta para escribir cada saldo. Es idempotente: repetirla no cuesta.
    void this.importes.carga();
    effect(() => {
      void this.pide({
        ...(this.texto() ? { texto: this.texto() } : {}),
        ...(this.estado() ? { estado: this.estado() as string } : {}),
        ...(this.divisa() ? { divisa: this.divisa() as string } : {}),
        pagina: this.pagina(),
        tamano: POR_PAGINA,
      });
    });
  }

  protected limpiaFiltros(): void {
    this.texto.set('');
    this.estado.set(null);
    this.divisa.set(null);
  }

  protected abre(peticion: PeticionSobreCartera): void {
    if (peticion.accion === 'historial') {
      this.mirando.set(peticion.cartera);
      void this.cargaHistorial(peticion.cartera);
      return;
    }
    this.moviendo.set(peticion);
  }

  /**
   * El vistazo al libro mayor va por el IDENTIFICADOR DE LA CARTERA, no por el del usuario.
   *
   * <p>Son dos claves distintas y el backend expone una para cada cosa: el detalle se pide por usuario y
   * los apuntes por cartera. Confundirlas devuelve un 404 que en pantalla se lee como «sin movimientos».
   */
  private async cargaHistorial(cartera: ResumenDeCartera): Promise<void> {
    this.cargandoHistorial.set(true);
    this.movimientos.set([]);
    try {
      const resultado = await this.historial.ejecuta(cartera.id, 0, APUNTES_DEL_VISTAZO);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
        return;
      }
      this.movimientos.set(resultado.valor.elementos);
    } finally {
      this.cargandoHistorial.set(false);
    }
  }

  protected async mueveSaldo(
    peticion: PeticionSobreCartera,
    importe: ImporteConMotivo,
  ): Promise<void> {
    const esDeposito = peticion.accion === 'deposito';
    this.enviando.set(true);
    try {
      // El depósito y el ajuste van por el identificador del USUARIO: es la clave con la que el backend
      // expone las dos operaciones de la cartera.
      const resultado = esDeposito
        ? await this.deposito.ejecuta({
            idUsuario: peticion.cartera.idUsuario,
            importeCentimos: importe.importeCentimos,
            ...(importe.descripcion ? { descripcion: importe.descripcion } : {}),
          })
        : await this.ajuste.ejecuta({
            idUsuario: peticion.cartera.idUsuario,
            importeCentimos: importe.importeCentimos,
            descripcion: importe.descripcion,
          });
      if (!resultado.ok) {
        this.avisos.error(
          resultado.error.mensaje ||
            this.t(esDeposito ? 'admin.wallets.topup.error' : 'admin.wallets.adjust.error'),
        );
        return;
      }
      this.moviendo.set(null);
      this.avisos.exito(this.t(esDeposito ? 'admin.wallets.topup.ok' : 'admin.wallets.adjust.ok'));
      this.recarga();
    } finally {
      this.enviando.set(false);
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
      this.avisos.exito(this.tCon('admin.reindex_ok', { n: resultado.valor }));
      this.recarga();
    } finally {
      this.reindexando.set(false);
    }
  }

  protected recarga(): void {
    void this.pide({
      ...(this.texto() ? { texto: this.texto() } : {}),
      ...(this.estado() ? { estado: this.estado() as string } : {}),
      ...(this.divisa() ? { divisa: this.divisa() as string } : {}),
      pagina: this.pagina(),
      tamano: POR_PAGINA,
    });
  }

  private async pide(filtro: {
    texto?: string;
    estado?: string;
    divisa?: string;
    pagina: number;
    tamano: number;
  }): Promise<void> {
    const resultado = await this.buscador.ejecuta(filtro);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
      return;
    }
    this.carteras.set(resultado.valor.elementos);
    this.total.set(resultado.valor.total);
    this.paginas.set(paginasAlMenosUna(resultado.valor.paginas));
  }
}
