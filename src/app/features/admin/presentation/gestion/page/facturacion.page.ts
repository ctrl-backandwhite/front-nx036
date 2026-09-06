import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CampoBusqueda } from '@ds/component/campo-busqueda/campo-busqueda';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { BarraFiltros } from '@ds/component/filtros/barra-filtros';
import { FiltroSeleccion, OpcionFiltro } from '@ds/component/filtros/filtro-seleccion';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import {
  ActualizaElPlan,
  ConsultaPlanes,
  ConsultaSuscripciones,
} from '../../../application/gestion/use-case/facturacion.use-case';
import {
  ESTADOS_DE_SUSCRIPCION,
  Periodo,
  Plan,
  Suscripcion,
  claveDePeriodo,
  estadoEfectivo,
  periodoDelPlan,
  suscripcionCoincide,
} from '../../../domain/gestion/model/facturacion';
import { FacturacionEditorDePlan } from '../component/facturacion-editor-de-plan';
import { Paginacion } from '../component/paginacion';

/** Cuántas suscripciones caben en una pantalla sin que la tabla se vuelva un rollo infinito. */
const POR_PAGINA = 25;

/**
 * Facturación: los planes que se venden y quién los tiene contratados.
 *
 * <p>Los precios se GUARDAN y se editan en céntimos de dólar; lo que se pinta en la tabla ya va
 * convertido a la divisa activa por `ImportesStore`. Esta pantalla no calcula nada: el importe que se
 * cobra lo compone el backend.
 *
 * <p>El listado de suscripciones se filtra EN LOCAL —el backend devuelve la lista entera— así que el
 * buscador y el estado no viajan a la red; por eso al cambiar cualquiera de los dos hay que volver a la
 * primera página, o se quedaría mirando una página que ya no existe.
 *
 * <p>MOBILE FIRST: las dos tablas van dentro de su propio contenedor con desplazamiento horizontal, que
 * es lo que permite que en una pantalla estrecha se vean sin encoger la letra ni romper la página.
 */
@Component({
  selector: 'nx-facturacion-admin',
  imports: [
    FaIconComponent,
    BarraFiltros,
    FiltroSeleccion,
    CampoBusqueda,
    Paginacion,
    FacturacionEditorDePlan,
  ],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-bold">{{ t('admin.billing.title') }}</h1>

      <section class="card overflow-hidden">
        <div class="card-header"><span>{{ t('admin.billing.plans') }}</span></div>
        <div class="overflow-x-auto">
          <table class="table table-zebra table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-4 py-2 font-medium">{{ t('admin.billing.col.code') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.billing.col.name') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.billing.col.monthly') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.billing.col.yearly') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.billing.col.period') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.billing.col.active') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.billing.col.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (plan of planes(); track plan.id) {
                @let ciclo = cicloDe(plan);
                <tr class="border-t border-ink-100">
                  <td class="px-4 py-2 font-mono text-xs">{{ plan.codigo }}</td>
                  <td class="px-4 py-2 font-medium">{{ plan.nombre }}</td>
                  <td class="px-4 py-2">
                    @if (plan.mensualCentimos > 0) {
                      {{ importes.escribeCentimos(plan.mensualCentimos) }}
                    } @else {
                      <span class="text-ink-500 text-[12px]">{{ precioAusente(ciclo) }}</span>
                    }
                  </td>
                  <td class="px-4 py-2">
                    @if (plan.anualCentimos > 0) {
                      {{ importes.escribeCentimos(plan.anualCentimos) }}
                    } @else {
                      <span class="text-ink-500 text-[12px]">{{ precioAusente(ciclo) }}</span>
                    }
                  </td>
                  <td class="px-4 py-2">
                    <span class="badge bg-ink-100 text-ink-700">{{ etiquetaDelCiclo(ciclo) }}</span>
                  </td>
                  <td class="px-4 py-2">
                    <span
                      class="badge"
                      [class.bg-emerald-100]="plan.activo"
                      [class.text-emerald-700]="plan.activo"
                      [class.bg-ink-200]="!plan.activo"
                      [class.text-ink-600]="!plan.activo"
                    >
                      {{ plan.activo ? t('common.yes') : t('common.no') }}
                    </span>
                  </td>
                  <td class="px-4 py-2">
                    <button
                      type="button"
                      class="btn btn-outline btn-square text-[11px]"
                      [title]="t('actions.edit')"
                      [attr.aria-label]="t('actions.edit')"
                      (click)="editando.set(plan)"
                    >
                      <fa-icon [icon]="iconoLapiz" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <!--
        Las suscripciones quedan por debajo del pliegue: al entrar se mira la tabla de planes, que es
        lo que se edita. Diferirlas evita además su lectura al backend a quien solo venía a eso.
      -->
      @defer (on viewport) {
      <section class="card overflow-hidden">
        <div class="card-header"><span>{{ t('admin.billing.subs') }}</span></div>
        <div class="p-3 border-b border-ink-100">
          <nx-barra-filtros
            [activos]="filtrosPuestos()"
            [hayActivos]="filtrosPuestos() > 0"
            (limpia)="limpiaFiltros()"
          >
            <nx-campo-busqueda
              [valor]="texto()"
              (valorChange)="cambiaTexto($event)"
              [marcador]="t('admin.billing.subs_search')"
              clase="min-w-[280px]"
            />
            <nx-filtro-seleccion
              [etiqueta]="t('admin.billing.col.status')"
              [valor]="estado()"
              (valorChange)="cambiaEstado($event)"
              [opciones]="opcionesDeEstado()"
              [marcador]="t('filters.all')"
            />
            <span class="text-[11px] text-ink-400 ml-auto">
              {{ t('pagination.showing') }} <strong>{{ trozo().length }}</strong> /
              {{ filtradas().length }}
            </span>
          </nx-barra-filtros>
        </div>
        <div class="overflow-x-auto">
          <table class="table table-zebra table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-4 py-2 font-medium">{{ t('admin.billing.col.user') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.billing.col.plan') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.billing.col.status') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.billing.col.period') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.billing.col.start') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.billing.col.end') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (suscripcion of trozo(); track suscripcion.id) {
                <tr class="border-t border-ink-100">
                  <td class="px-4 py-2 text-xs">{{ suscripcion.emailUsuario }}</td>
                  <td class="px-4 py-2 font-medium">{{ suscripcion.plan }}</td>
                  <td class="px-4 py-2">
                    <span class="badge bg-ink-100 text-ink-700">
                      {{ etiquetaDeEstado(estadoDe(suscripcion)) }}
                    </span>
                  </td>
                  <!--
                    El plan gratuito no tiene ciclo de cobro: pintar «mensual» haría creer que quien lo
                    tiene eligió una periodicidad que nunca eligió.
                  -->
                  <td class="px-4 py-2">
                    {{
                      suscripcion.plan === 'FREE' ? '—' : etiquetaDePeriodo(suscripcion.periodo)
                    }}
                  </td>
                  <td class="px-4 py-2 text-xs">{{ dia(suscripcion.inicioDelPeriodo) }}</td>
                  <td class="px-4 py-2 text-xs">{{ dia(suscripcion.finDelPeriodo) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-4 py-8 text-center text-ink-500">
                    {{ t('admin.billing.empty') }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <nx-paginacion [pagina]="pagina()" [paginas]="paginas()" (cambia)="pagina.set($event)" />
      </section>
      } @placeholder {
        <section class="card h-64"></section>
      }

      @if (editando(); as plan) {
        <nx-facturacion-editor-de-plan
          [plan]="plan"
          [guardando]="guardando()"
          (cancela)="editando.set(null)"
          (guarda)="guardaElPlan($event)"
        />
      }
    </div>
  `,
})
export class FacturacionPage {
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  private readonly consultaPlanes = inject(ConsultaPlanes);
  private readonly consultaSuscripciones = inject(ConsultaSuscripciones);
  private readonly actualizaElPlan = inject(ActualizaElPlan);
  private readonly dialogo = inject(DialogoStore);

  protected readonly importes = inject(ImportesStore);
  protected readonly iconoLapiz = faPen;

  protected readonly planes = signal<readonly Plan[]>([]);
  protected readonly suscripciones = signal<readonly Suscripcion[]>([]);
  protected readonly editando = signal<Plan | null>(null);
  protected readonly guardando = signal(false);

  protected readonly texto = signal('');
  protected readonly estado = signal<string | null>(null);
  protected readonly pagina = signal(0);

  protected readonly filtradas = computed(() =>
    this.suscripciones().filter((s) => suscripcionCoincide(s, this.estado(), this.texto())),
  );
  protected readonly paginas = computed(() =>
    Math.max(1, Math.ceil(this.filtradas().length / POR_PAGINA)),
  );
  protected readonly trozo = computed(() =>
    this.filtradas().slice(this.pagina() * POR_PAGINA, (this.pagina() + 1) * POR_PAGINA),
  );

  protected readonly filtrosPuestos = computed(
    () => (this.texto().trim() ? 1 : 0) + (this.estado() ? 1 : 0),
  );

  protected readonly opcionesDeEstado = computed<readonly OpcionFiltro[]>(() =>
    ESTADOS_DE_SUSCRIPCION.map((codigo) => ({
      value: codigo,
      label: this.etiquetaDeEstado(codigo),
    })),
  );

  constructor() {
    // Las tasas de cambio se piden una sola vez; mientras no llegan, los importes se escriben en dólares.
    void this.importes.carga();
    void this.carga();
  }

  private async carga(): Promise<void> {
    const [planes, suscripciones] = await Promise.all([
      this.consultaPlanes.ejecuta(),
      this.consultaSuscripciones.ejecuta(),
    ]);
    if (planes.ok) {
      this.planes.set(planes.valor);
    }
    if (suscripciones.ok) {
      this.suscripciones.set(suscripciones.valor);
    }
    // Un fallo de lectura deja la tabla vacía con su rótulo de «aún no hay»: no hay nada que reintentar
    // desde aquí y un aviso rojo al abrir la pantalla no ayudaría a quien administra.
  }

  /**
   * Guarda el plan.
   *
   * <p>Un rechazo del backend —una validación del precio, por ejemplo— se ENSEÑA. Sin esto, el editor se
   * quedaba abierto sin explicación y quien administra se iba creyendo que el precio estaba cambiado.
   * Cuando el backend no manda mensaje se usa la clave genérica, que sí está traducida a los ocho
   * idiomas; inventar una clave nueva pintaría el literal `admin.billing.…` en pantalla.
   */
  protected async guardaElPlan(plan: Plan): Promise<void> {
    this.guardando.set(true);
    try {
      const resultado = await this.actualizaElPlan.ejecuta(plan);
      if (!resultado.ok) {
        await this.dialogo.alerta(
          resultado.error.mensaje || this.t('errors.generic'),
          undefined,
          'error',
        );
        return;
      }
      this.editando.set(null);
      await this.carga();
    } finally {
      this.guardando.set(false);
    }
  }

  protected cambiaTexto(texto: string): void {
    this.texto.set(texto);
    this.pagina.set(0);
  }

  protected cambiaEstado(estado: string | null): void {
    this.estado.set(estado);
    this.pagina.set(0);
  }

  protected limpiaFiltros(): void {
    this.texto.set('');
    this.estado.set(null);
    this.pagina.set(0);
  }

  protected cicloDe(plan: Plan): Periodo {
    return periodoDelPlan(plan);
  }

  protected estadoDe(suscripcion: Suscripcion): string {
    return estadoEfectivo(suscripcion.plan, suscripcion.estado);
  }

  /**
   * El estado, traducido. Cuando la clave no existe se devuelve el código crudo en vez de la clave: un
   * estado nuevo del backend se lee mal, pero se lee; `billing.status.WHATEVER` no lo entiende nadie.
   */
  protected etiquetaDeEstado(codigo: string): string {
    const clave = `billing.status.${codigo}`;
    const texto = this.t(clave);
    return texto === clave ? codigo : texto;
  }

  /** El ciclo de cobro de una suscripción, con el valor crudo como último respaldo. */
  protected etiquetaDePeriodo(periodo: string | null | undefined): string {
    const clave = claveDePeriodo(periodo);
    return clave ? this.t(clave) : (periodo ?? '—');
  }

  /**
   * El ciclo que ofrece un plan. Cuando ofrece los dos se dicen los dos: poner uno fijo haría creer que
   * el plan está atado a esa periodicidad.
   */
  protected etiquetaDelCiclo(ciclo: Periodo): string {
    return ciclo === 'BOTH'
      ? `${this.t('admin.billing.period.monthly')} / ${this.t('admin.billing.period.yearly')}`
      : this.etiquetaDePeriodo(ciclo);
  }

  /**
   * Qué se escribe donde no hay precio.
   *
   * <p>Un ciclo que el plan NO vende no es «gratis»: solo el plan realmente gratuito puede anunciarse
   * como tal, y el de precio a medida remite a ventas. El resto lleva un guion, para no prometer una
   * cuota de cero que no existe.
   */
  protected precioAusente(ciclo: Periodo): string {
    if (ciclo === 'CUSTOM') {
      return this.t('admin.billing.contact_sales');
    }
    if (ciclo === 'FREE') {
      return this.t('billing.period.FREE');
    }
    return '—';
  }

  /** La fecha, recortada al día: la hora de un periodo de facturación no dice nada a quien administra. */
  protected dia(iso: string | undefined): string {
    return iso ? iso.slice(0, 10) : '—';
  }
}
