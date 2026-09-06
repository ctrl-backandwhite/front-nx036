import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBoxOpen,
  faCircleCheck,
  faFloppyDisk,
  faShieldHalved,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  EstadoDeCumplimiento,
  OperadorEconomico,
  PapelDeOperador,
  camposQueFaltan,
  operadorEnBlanco,
} from '../../../domain/logistica/model/cumplimiento';
import {
  ConsultaCumplimiento,
  GuardaOperadorEconomico,
} from '../../../application/logistica/use-case/gestiona-cumplimiento.use-case';

/**
 * Los campos de texto del formulario, con su clave de traducción y su tope de longitud.
 *
 * <p>El tipo va DECLARADO y no deducido: sin él, `ancho` solo existía en el elemento que lo trae y la
 * plantilla no compilaba. Declararlo obliga además a decidir el ancho de cada campo en vez de dejar que
 * lo herede el orden en que se escribieron.
 */
interface CampoDelOperador {
  readonly clave: keyof OperadorEconomico;
  readonly etiqueta: string;
  readonly maximo: number;
  readonly obligatorio: boolean;
  /** Ocupa las dos columnas: la dirección no cabe en media línea. */
  readonly ancho: boolean;
}

const CAMPOS: readonly CampoDelOperador[] = [
  { clave: 'nombre', etiqueta: 'compliance.field.name', maximo: 200, obligatorio: true, ancho: false },
  { clave: 'direccion', etiqueta: 'compliance.field.address', maximo: 300, obligatorio: true, ancho: true },
  { clave: 'codigoPostal', etiqueta: 'compliance.field.postal_code', maximo: 20, obligatorio: true, ancho: false },
  { clave: 'ciudad', etiqueta: 'compliance.field.city', maximo: 120, obligatorio: true, ancho: false },
  { clave: 'provincia', etiqueta: 'compliance.field.region', maximo: 120, obligatorio: false, ancho: false },
  { clave: 'pais', etiqueta: 'compliance.field.country', maximo: 2, obligatorio: true, ancho: false },
  { clave: 'email', etiqueta: 'compliance.field.email', maximo: 200, obligatorio: true, ancho: false },
  { clave: 'telefono', etiqueta: 'compliance.field.phone', maximo: 40, obligatorio: false, ancho: false },
];

/**
 * Operador económico de la UE y estado de cumplimiento del catálogo.
 *
 * <p>El art. 16.1 del Reglamento (UE) 2023/988 impide introducir un producto en el mercado si no hay un
 * operador económico establecido en la Unión, y el art. 19 obliga a mostrarlo —junto al fabricante y a
 * las advertencias— en la propia oferta en línea. Aquí es donde se declara y donde se ve lo que falta.
 *
 * <p>El estado del catálogo va PRIMERO porque es lo que dice si hay un problema ahora mismo.
 */
@Component({
  selector: 'nx-cumplimiento-page',
  imports: [FaIconComponent, RouterLink],
  template: `
    <div class="space-y-6">
      <header>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <fa-icon [icon]="iconos.escudo" class="text-primary" />
          {{ t('admin.compliance.title') }}
        </h1>
        <p class="opacity-70 text-sm mt-1">{{ t('admin.compliance.subtitle') }}</p>
      </header>

      @if (estado(); as resumen) {
        <!-- Móvil primero: una columna, y tres a partir de la anchura pequeña. -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div
            class="card card-border"
            [class.bg-success]="resumen.operadorPublicado"
            [class.bg-error]="!resumen.operadorPublicado"
          >
            <div class="card-body p-4">
              <div class="text-xs uppercase tracking-wide opacity-70">
                {{ t('admin.compliance.status.operator') }}
              </div>
              <div class="font-semibold flex items-center gap-2">
                <fa-icon [icon]="resumen.operadorPublicado ? iconos.si : iconos.aviso" />
                {{
                  resumen.operadorPublicado
                    ? t('admin.compliance.status.published')
                    : t('admin.compliance.status.not_published')
                }}
              </div>
            </div>
          </div>
          <div class="card card-border bg-base-100">
            <div class="card-body p-4">
              <div class="text-xs uppercase tracking-wide opacity-70">
                {{ t('admin.compliance.status.active_products') }}
              </div>
              <div class="font-semibold text-lg">{{ resumen.productosActivos }}</div>
            </div>
          </div>
          <div class="card card-border bg-base-100">
            <div class="card-body p-4">
              <div class="text-xs uppercase tracking-wide opacity-70">
                {{ t('admin.compliance.status.missing_manufacturer') }}
              </div>
              <div class="font-semibold text-lg flex items-center gap-2">
                <fa-icon [icon]="resumen.sinFabricante > 0 ? iconos.caja : iconos.si" />
                {{ resumen.sinFabricante }}
              </div>
              @if (resumen.sinFabricante > 0) {
                <a routerLink="/admin/catalog" class="link link-hover text-xs mt-1">
                  {{ t('admin.compliance.status.fix_in_catalog') }}
                </a>
              }
            </div>
          </div>
        </div>

        @if (resumen.sinFabricante > 0) {
          <div class="alert alert-warning items-start" role="alert">
            <fa-icon [icon]="iconos.aviso" class="mt-0.5" />
            <span class="text-sm">{{ t('admin.compliance.warn.manufacturer') }}</span>
          </div>
        }
      }

      <section class="card card-border bg-base-100">
        <div class="card-body gap-4">
          <h2 class="card-title text-base">{{ t('admin.compliance.operator.title') }}</h2>

          @if (cargando()) {
            <div class="skeleton h-40 w-full"></div>
          } @else {
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              @for (campo of campos; track campo.clave) {
                <div [class.sm:col-span-2]="campo.ancho">
                  <label
                    [attr.for]="'cumpl-' + campo.clave"
                    class="label-text text-xs block mb-1"
                  >
                    {{ t(campo.etiqueta) }}{{ campo.obligatorio ? ' *' : '' }}
                  </label>
                  <input
                    [id]="'cumpl-' + campo.clave"
                    class="input input-bordered input-sm w-full"
                    [class.uppercase]="campo.clave === 'pais'"
                    [type]="campo.clave === 'email' ? 'email' : 'text'"
                    [attr.maxlength]="campo.maximo"
                    [value]="valorDe(campo.clave)"
                    (input)="cambia(campo.clave, $any($event.target).value)"
                  />
                </div>
              }
              <div>
                <label for="cumpl-papel" class="label-text text-xs block mb-1">
                  {{ t('compliance.field.role') }} *
                </label>
                <select
                  id="cumpl-papel"
                  class="select select-bordered select-sm w-full"
                  [value]="operador().papel"
                  (change)="cambia('papel', $any($event.target).value)"
                >
                  @for (papel of papeles(); track papel.codigo) {
                    <option [value]="papel.codigo">{{ papel.etiqueta }}</option>
                  }
                </select>
              </div>
            </div>

            @if (faltan().length > 0) {
              <div class="alert alert-warning py-2 text-sm items-start" role="alert">
                <fa-icon [icon]="iconos.aviso" class="mt-0.5" />
                <span>
                  {{ t('admin.compliance.incomplete') }}:
                  <strong>{{ nombresQueFaltan() }}</strong>
                </span>
              </div>
            }

            <label class="label cursor-pointer justify-start gap-3 w-fit">
              <input
                type="checkbox"
                class="toggle toggle-primary toggle-sm"
                [checked]="operador().publicado"
                [disabled]="faltan().length > 0"
                (change)="marcaPublicado($any($event.target).checked)"
              />
              <span class="label-text text-sm">{{ t('admin.compliance.publish') }}</span>
            </label>

            <div class="card-actions">
              <button
                type="button"
                class="btn btn-primary btn-sm"
                [disabled]="guardando()"
                (click)="guarda()"
              >
                <fa-icon [icon]="iconos.disquete" /> {{ t('common.save') }}
              </button>
            </div>
          }
        </div>
      </section>
    </div>
  `,
})
export class CumplimientoPage {
  protected readonly campos = CAMPOS;
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconos = {
    escudo: faShieldHalved,
    aviso: faTriangleExclamation,
    si: faCircleCheck,
    caja: faBoxOpen,
    disquete: faFloppyDisk,
  };

  private readonly consulta = inject(ConsultaCumplimiento);
  private readonly guardador = inject(GuardaOperadorEconomico);
  private readonly preferencias = inject(PreferenciasService);
  private readonly avisos = inject(AvisosStore);

  protected readonly operador = signal<OperadorEconomico>(operadorEnBlanco());
  protected readonly papeles = signal<readonly PapelDeOperador[]>([]);
  protected readonly estado = signal<EstadoDeCumplimiento | null>(null);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);

  protected readonly faltan = computed(() => camposQueFaltan(this.operador()));
  protected readonly nombresQueFaltan = computed(() =>
    this.faltan()
      .map((clave) => this.t(clave))
      .join(', '),
  );

  constructor() {
    // El IDIOMA está en la dependencia: el backend traduce la figura del art. 4.2, así que cambiar de
    // idioma tiene que refrescar los datos y no solo las etiquetas de la pantalla.
    effect(() => {
      const idioma = this.preferencias.idioma();
      void this.carga(idioma);
    });
  }

  private async carga(idioma: string): Promise<void> {
    this.cargando.set(true);
    try {
      const resultado = await this.consulta.ejecuta(idioma);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('common.error'));
        return;
      }
      // El formulario arranca con lo GUARDADO, no con lo que se tecleó: al recargar tras guardar se
      // tiene que ver lo que hay en la base de datos.
      this.operador.set(resultado.valor.operador);
      this.papeles.set(resultado.valor.papeles);
      this.estado.set(resultado.valor.estado);
    } finally {
      this.cargando.set(false);
    }
  }

  protected valorDe(clave: keyof OperadorEconomico): string {
    return String(this.operador()[clave] ?? '');
  }

  protected cambia(clave: keyof OperadorEconomico, valor: string): void {
    this.operador.update((actual) => ({ ...actual, [clave]: valor }));
  }

  protected marcaPublicado(publicado: boolean): void {
    this.operador.update((actual) => ({ ...actual, publicado }));
  }

  protected async guarda(): Promise<void> {
    this.guardando.set(true);
    try {
      const idioma = this.preferencias.idioma();
      const resultado = await this.guardador.ejecuta(this.operador(), idioma);
      if (!resultado.ok) {
        this.avisos.error(
          resultado.error === 'incompleto'
            ? this.t('admin.compliance.incomplete')
            : (resultado.error as { mensaje?: string }).mensaje || this.t('common.error'),
        );
        return;
      }
      this.avisos.exito(this.t('common.saved'));
      await this.carga(idioma);
    } finally {
      this.guardando.set(false);
    }
  }
}
