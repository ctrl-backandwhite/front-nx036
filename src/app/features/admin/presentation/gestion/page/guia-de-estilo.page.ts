import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBolt, faChartLine, faCircleCheck, faCircleExclamation, faCircleInfo, faPencil, faPlus,
  faShieldHalved, faTrashCan, faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { PreferenciasService } from '@core/preferences/preferencias';
import { Minigrafica } from '../component/minigrafica';

/**
 * Un color del tema, tal y como se documenta.
 *
 * <p>`clase` va escrita ENTERA y no compuesta a partir de `nombre`. Tailwind lee las clases del código
 * fuente como texto: un nombre construido al vuelo (`'bg-' + nombre`) no aparece en ningún sitio, la
 * utilidad no se genera y los cuadrados de la paleta salen transparentes. Es el fallo clásico de este
 * patrón y el mismo motivo por el que la ventana modal recibe su ancho como clase completa.
 */
interface ColorDelTema {
  readonly nombre: string;
  readonly token: string;
  readonly clase: string;
  readonly descripcion: string;
}

const PALETA: readonly ColorDelTema[] = [
  { nombre: 'primary', token: '--color-primary', clase: 'bg-primary', descripcion: 'Lavanda pastel — acción principal, links activos, énfasis.' },
  { nombre: 'secondary', token: '--color-secondary', clase: 'bg-secondary', descripcion: 'Aqua pastel — acción secundaria o data viz.' },
  { nombre: 'accent', token: '--color-accent', clase: 'bg-accent', descripcion: 'Melocotón pastel — destaques cálidos y promociones.' },
  { nombre: 'neutral', token: '--color-neutral', clase: 'bg-neutral', descripcion: 'Gris neutro para textos secundarios y borders.' },
  { nombre: 'base-100', token: '--color-base-100', clase: 'bg-base-100', descripcion: 'Superficie elevada (cards, modales).' },
  { nombre: 'base-200', token: '--color-base-200', clase: 'bg-base-200', descripcion: 'Fondo de página y carriles de tabla zebra.' },
  { nombre: 'base-300', token: '--color-base-300', clase: 'bg-base-300', descripcion: 'Borders y separadores.' },
  { nombre: 'success', token: '--color-success', clase: 'bg-success', descripcion: 'Estados positivos (verificado, activo).' },
  { nombre: 'info', token: '--color-info', clase: 'bg-info', descripcion: 'Estados informativos (pendiente, neutral).' },
  { nombre: 'warning', token: '--color-warning', clase: 'bg-warning', descripcion: 'Estados a revisar (atención requerida).' },
  { nombre: 'error', token: '--color-error', clase: 'bg-error', descripcion: 'Estados negativos y acciones destructivas (papelera, cancelar).' },
];

interface IndicadorDeMuestra {
  readonly tono: string;
  readonly clase: string;
  readonly icono: IconDefinition;
  readonly etiqueta: string;
  readonly valor: string;
}

const INDICADORES: readonly IndicadorDeMuestra[] = [
  { tono: 'primary', clase: 'text-primary', icono: faBolt, etiqueta: 'Conversiones', valor: '2,431' },
  { tono: 'success', clase: 'text-success', icono: faCircleCheck, etiqueta: 'Activos', valor: '1,002' },
  { tono: 'info', clase: 'text-info', icono: faChartLine, etiqueta: 'MRR', valor: '$ 38.2k' },
];

/** La serie de ejemplo de las minigráficas. Son datos inventados: esto documenta la forma, no un dato. */
const SERIE_DE_MUESTRA: readonly number[] = [5, 7, 6, 8, 9, 7, 11, 13, 12, 14];

/**
 * La guía de estilo interna del panel.
 *
 * <p>Es la documentación VIVA del sistema de diseño: enseña los tokens, la jerarquía tipográfica, los
 * botones, los estados, las superficies y la tabla con los estilos reales del tema, para poder revisar
 * el sistema sin abrir el inspector del navegador. Si un token cambia, esta página cambia sola.
 *
 * <p>Sus textos son documentación técnica interna y van en español a propósito: los nombres de token,
 * las clases y las variantes no se traducen —traducir `card-border` o `shadow-pastel-lg` haría la guía
 * inútil para buscar de dónde sale un estilo—.
 *
 * <p>MOBILE FIRST: las rejillas arrancan en una o dos columnas y se amplían con `sm:` y `lg:`; los
 * indicadores se apilan y pasan a fila desde `sm`, y la tabla lleva su propio desplazamiento lateral
 * para que la página nunca se desplace en horizontal.
 */
@Component({
  selector: 'nx-guia-de-estilo-admin',
  imports: [FaIconComponent, Minigrafica],
  template: `
    <div class="space-y-8">
      <header>
        <h1>Style guide — Pastel NX036</h1>
        <p class="text-sm opacity-70 mt-1">
          Sistema de diseño basado en daisyUI 5 + tema custom <code>nx036-pastel</code>.
          Activo: <span class="badge badge-primary badge-sm">{{ tema() }}</span>
        </p>
      </header>

      <section class="card">
        <div class="card-body">
          <h2 class="card-title">Paleta</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
            @for (color of paleta; track color.nombre) {
              <div class="card card-border bg-base-100">
                <div class="card-body p-3 gap-2">
                  <div class="h-10 rounded-md border border-base-300" [class]="color.clase"></div>
                  <div class="text-[13px] font-medium">{{ color.nombre }}</div>
                  <code class="text-[10px] opacity-60">{{ color.token }}</code>
                  <p class="text-[11px] opacity-70 leading-snug">{{ color.descripcion }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-body">
          <h2 class="card-title">Tipografía</h2>
          <div class="space-y-2 mt-2">
            <h1>Heading 1 — 1.5rem / 500</h1>
            <h2>Heading 2 — 1.125rem / 500</h2>
            <h3>Heading 3 — 0.95rem / 500</h3>
            <p class="text-sm">Body — texto principal en <code>base-content</code>.</p>
            <p class="text-sm opacity-70">Body 70% — textos secundarios.</p>
            <p class="text-[12px] opacity-60">Caption 12px / 60% — metadatos, fechas.</p>
            <code class="font-mono text-[12px] block">code · monospace</code>
          </div>
        </div>
      </section>

      <!-- De aquí hacia abajo todo queda por debajo del pliegue: al entrar solo se ven la paleta y
           la tipografía. Cada bloque se descarga cuando su hueco entra en pantalla, y el hueco
           reserva la altura para que la página no pegue un salto al llegar el contenido.

           Son CINCO bloques y no uno grande a propósito: con un solo bloque su hueco quedaría justo
           debajo de la tipografía y, en una pantalla alta, ya estaría a la vista al cargar —el
           disparador saltaría de inmediato y no se diferiría nada—. Partido, cada sección espera a que
           de verdad se baje hasta ella. -->
      @defer (on viewport) {
        <section class="card">
          <div class="card-body">
            <h2 class="card-title">Botones</h2>
            <div class="flex flex-wrap gap-2 mt-2">
              <button type="button" class="btn btn-primary">Primary</button>
              <button type="button" class="btn btn-secondary">Secondary</button>
              <button type="button" class="btn btn-accent">Accent</button>
              <button type="button" class="btn btn-outline">Outline</button>
              <button type="button" class="btn btn-ghost">Ghost</button>
              <button type="button" class="btn btn-primary btn-sm" disabled>Disabled</button>
            </div>
            <!-- Los botones de solo icono llevan nombre accesible: sin él se anuncian como «botón» a
                 secas, y aquí además son el ejemplo que se copiará en el resto del panel. -->
            <div class="flex flex-wrap gap-2 mt-3">
              <button type="button" class="btn btn-ghost btn-sm btn-square" aria-label="add">
                <fa-icon [icon]="iconos.anadir" />
              </button>
              <button type="button" class="btn btn-ghost btn-sm btn-square" aria-label="edit">
                <fa-icon [icon]="iconos.editar" />
              </button>
              <button type="button" class="btn btn-ghost btn-sm btn-square text-error" aria-label="delete">
                <fa-icon [icon]="iconos.borrar" />
              </button>
            </div>
          </div>
        </section>
      } @placeholder {
        <section class="card min-h-[210px]"></section>
      }

      @defer (on viewport) {
        <section class="card">
          <div class="card-body">
            <h2 class="card-title">Estados (badges + alerts)</h2>
            <div class="flex flex-wrap gap-2 mt-2">
              <span class="badge">default</span>
              <span class="badge badge-ghost">ghost</span>
              <span class="badge badge-primary">primary</span>
              <span class="badge badge-secondary">secondary</span>
              <span class="badge badge-accent">accent</span>
              <span class="badge badge-info">info</span>
              <span class="badge badge-success">success</span>
              <span class="badge badge-warning">warning</span>
              <span class="badge badge-error">error</span>
              <span class="badge badge-trustpass">
                <fa-icon [icon]="iconos.escudo" class="mr-1" /> TrustPass
              </span>
            </div>
            <div class="grid sm:grid-cols-2 gap-3 mt-4">
              <div role="alert" class="alert alert-info">
                <fa-icon [icon]="iconos.info" /><span>Información general</span>
              </div>
              <div role="alert" class="alert alert-success">
                <fa-icon [icon]="iconos.hecho" /><span>Operación completada</span>
              </div>
              <div role="alert" class="alert alert-warning">
                <fa-icon [icon]="iconos.atencion" /><span>Revisa los datos antes de continuar</span>
              </div>
              <div role="alert" class="alert alert-error">
                <fa-icon [icon]="iconos.fallo" /><span>No se pudo completar la acción</span>
              </div>
            </div>
          </div>
        </section>
      } @placeholder {
        <section class="card min-h-[320px]"></section>
      }

      @defer (on viewport) {
        <section class="card">
          <div class="card-body">
            <h2 class="card-title">Superficies + sombras</h2>
            <div class="grid sm:grid-cols-3 gap-3 mt-2">
              <div class="card card-border bg-base-100">
                <div class="card-body p-3 text-sm">card-border · base-100</div>
              </div>
              <div class="card bg-base-100 shadow-pastel-sm">
                <div class="card-body p-3 text-sm">shadow-pastel-sm</div>
              </div>
              <div class="card bg-base-100 shadow-pastel-lg">
                <div class="card-body p-3 text-sm">shadow-pastel-lg</div>
              </div>
            </div>
          </div>
        </section>
      } @placeholder {
        <section class="card min-h-[190px]"></section>
      }

      @defer (on viewport) {
        <section class="card">
          <div class="card-body">
            <h2 class="card-title">Tabla zebra + estados</h2>
            <!-- El desplazamiento lateral vive DENTRO de este recuadro: si no, en el móvil la tabla
                 empujaría el ancho de la página entera. -->
            <div class="overflow-x-auto">
              <table class="table table-zebra table-sm mt-2">
                <thead>
                  <tr><th>SKU</th><th>Producto</th><th>Estado</th><th class="text-right">Stock</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="font-mono text-[11px]">SKU-001</td>
                    <td>Camiseta pastel</td>
                    <td><span class="badge badge-success badge-sm">Activo</span></td>
                    <td class="text-right">124</td>
                  </tr>
                  <tr>
                    <td class="font-mono text-[11px]">SKU-002</td>
                    <td>Mochila lavanda</td>
                    <td><span class="badge badge-warning badge-sm">Revisión</span></td>
                    <td class="text-right">12</td>
                  </tr>
                  <tr>
                    <td class="font-mono text-[11px]">SKU-003</td>
                    <td>Gorra accent</td>
                    <td><span class="badge badge-ghost badge-sm">Inactivo</span></td>
                    <td class="text-right">0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      } @placeholder {
        <section class="card min-h-[260px]"></section>
      }

      @defer (on viewport) {
        <section class="card">
          <div class="card-body">
            <h2 class="card-title">KPIs y sparklines</h2>
            <div class="stats stats-vertical sm:stats-horizontal shadow-pastel w-full bg-base-100 mt-2">
              @for (indicador of indicadores; track indicador.etiqueta) {
                <div class="stat">
                  <div class="stat-figure" [class]="indicador.clase">
                    <span class="kpi-icon"><fa-icon [icon]="indicador.icono" class="text-lg" /></span>
                  </div>
                  <div class="stat-title text-[11px]">{{ indicador.etiqueta }}</div>
                  <div class="stat-value text-2xl">{{ indicador.valor }}</div>
                  <div class="stat-desc">
                    <!-- La minigráfica es la del panel, no otra copia: una segunda implementación del
                         mismo dibujo acabaría documentando algo que ya no se usa en ninguna pantalla. -->
                    <nx-minigrafica [datos]="serie" [tono]="indicador.tono" />
                  </div>
                </div>
              }
            </div>
          </div>
        </section>
      } @placeholder {
        <section class="card min-h-[230px]"></section>
      }

      <p class="text-[11px] opacity-60">
        El sistema se aplica automáticamente vía <code>data-theme</code>. Para alternar entre modo claro
        y oscuro, usa el botón en la barra superior.
      </p>
    </div>
  `,
})
export class GuiaDeEstiloPage {
  /** El tema activo sale de las preferencias: es el mismo valor que acaba en `data-theme`. */
  protected readonly tema = inject(PreferenciasService).tema;

  protected readonly paleta = PALETA;
  protected readonly indicadores = INDICADORES;
  protected readonly serie = SERIE_DE_MUESTRA;

  protected readonly iconos = {
    anadir: faPlus, editar: faPencil, borrar: faTrashCan, escudo: faShieldHalved,
    info: faCircleInfo, hecho: faCircleCheck, atencion: faTriangleExclamation,
    fallo: faCircleExclamation,
  };
}
