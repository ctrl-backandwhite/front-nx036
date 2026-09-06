import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBars,
  faCartShopping,
  faCircleNodes,
  faClockRotateLeft,
  faEye,
  faGauge,
  faHandshake,
  faHeart,
  faHouse,
  faIdCard,
  faReceipt,
  faRightFromBracket,
  faSignInAlt,
  faStore,
  faUser,
  faWallet,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { InterruptorTema } from '@ds/component/tema/interruptor-tema';
import { SelectorPaisMoneda } from '@ds/component/selector-pais-moneda/selector-pais-moneda';
import { Migas } from '@ds/component/migas/migas';
import { SombraAlDesplazar } from '@ds/directive/sombra-al-desplazar.directive';
import { TransicionPagina } from '@ds/directive/transicion-pagina.directive';
import { PieSitio } from './pie-sitio';
import { BarraInferiorMovil } from './barra-inferior-movil';

/** Lo poco que el marco necesita saber de quien mira. El resto es asunto de cada contexto. */
export interface UsuarioDelMarco {
  readonly nombre: string;
  /** Personal interno: solo esta gente ve el acceso al panel. */
  readonly esPersonal: boolean;
}

/** Las fichas del PDP y del navegador del panel pintan sus propias migas, con el título del producto. */
const RUTA_DE_FICHA = /^\/(catalog|admin\/browse)\/[^/]+$/;

/**
 * El marco del escaparate: cabecera, cajón del móvil, contenido, pie y barra de pestañas.
 *
 * <p>Es una PIEZA DE MARCO, no una pantalla: no sabe quién ha iniciado sesión ni qué lleva la cesta, se
 * lo dicen. Así el mismo armazón sirve para el escaparate público y para una vista de prueba, y el
 * negocio —la sesión, la cesta, las notificaciones— entra por sus huecos.
 */
@Component({
  selector: 'nx-marco-escaparate',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    FaIconComponent,
    InterruptorTema,
    SelectorPaisMoneda,
    Migas,
    SombraAlDesplazar,
    TransicionPagina,
    PieSitio,
    BarraInferiorMovil,
  ],
  template: `
    <div class="min-h-full flex flex-col">
      <header
        nxSombraAlDesplazar
        class="navbar bg-base-100 border-b border-base-200 sticky top-0 z-30 min-h-14 px-4 lg:px-6"
      >
        <div class="navbar-start">
          <a routerLink="/" class="flex items-center gap-2 font-medium text-[15px]">
            <fa-icon [icon]="iconoMarca" class="text-primary" />
            <!-- La marca es «NX036» en toda la plataforma, sin la forma societaria. -->
            <span>NX036</span>
          </a>
        </div>

        <div class="navbar-center hidden md:flex">
          <ul class="menu menu-horizontal gap-1 text-[13px]">
            @for (opcion of navegacion(); track opcion.destino) {
              <li>
                <a
                  [routerLink]="opcion.destino"
                  routerLinkActive="menu-active font-medium"
                  [routerLinkActiveOptions]="{ exact: opcion.exacta }"
                  class="flex items-center gap-1.5"
                >
                  <fa-icon [icon]="opcion.icono" class="text-[11px]" />
                  {{ opcion.texto }}
                </a>
              </li>
            }
          </ul>
        </div>

        <div class="navbar-end gap-1">
          <!-- Orden: modo oscuro · campana · carrito · moneda/idioma · iniciar sesión. -->
          <nx-interruptor-tema />
          <ng-content select="[nx-campana]" />
          <!-- Carrito: en el MÓVIL no se pinta aquí, porque la barra de pestañas de abajo ya tiene el
               suyo —con su contador— y al alcance del pulgar. Tenerlo en las dos barras era repetir el
               mismo destino en la esquina peor. -->
          <div id="nx-cart-icon" class="hidden md:inline-flex indicator ml-2 mr-5">
            @if (lineasCesta() > 0) {
              <span class="indicator-item badge badge-primary badge-sm">
                {{ lineasCesta() > 9 ? '9+' : lineasCesta() }}
              </span>
            }
            <button
              type="button"
              (click)="abreCesta.emit()"
              class="btn btn-ghost btn-sm btn-square"
              [title]="t('nav.cart')"
              [attr.aria-label]="t('nav.cart')"
            >
              <fa-icon [icon]="iconoCesta" />
            </button>
          </div>
          <div class="hidden sm:block">
            <nx-selector-pais-moneda />
          </div>
          @if (usuario(); as quien) {
            @if (quien.esPersonal) {
              <a routerLink="/admin" class="btn btn-primary btn-sm text-[12px] hidden sm:inline-flex">
                <fa-icon [icon]="iconoPanel" /> {{ t('nav.admin') }}
              </a>
            }
            <div class="dropdown dropdown-end hidden sm:block">
              <button
                tabindex="0"
                type="button"
                class="btn btn-sm text-[12px]"
                [class.btn-outline]="quien.esPersonal"
                [class.btn-primary]="!quien.esPersonal"
              >
                <fa-icon [icon]="iconoPersona" />
                <span class="max-w-30 truncate">{{ quien.nombre || t('nav.profile') }}</span>
              </button>
              <ul
                tabindex="0"
                class="dropdown-content menu menu-md text-[14px] bg-base-100 rounded-box shadow-lg border border-base-200 mt-2 w-60 z-50 p-2"
              >
                @for (opcion of opcionesDeCuenta(); track opcion.destino) {
                  <li>
                    <a [routerLink]="opcion.destino">
                      <fa-icon [icon]="opcion.icono" class="w-4 text-center" /> {{ opcion.texto }}
                    </a>
                  </li>
                }
                <!-- Solo cuando está oculto: es la única forma de recuperarlo, y sin ella ocultarlo
                     sería una puerta sin retorno. -->
                @if (avatarOculto()) {
                  <li>
                    <button type="button" (click)="muestraAvatar.emit()">
                      <fa-icon [icon]="iconoOjo" class="w-4 text-center" /> {{ t('avatar.show') }}
                    </button>
                  </li>
                }
                <li>
                  <button type="button" (click)="cierraSesion.emit()">
                    <fa-icon [icon]="iconoSalir" class="w-4 text-center" /> {{ t('nav.signout') }}
                  </button>
                </li>
              </ul>
            </div>
          } @else {
            <a routerLink="/login" class="btn btn-primary btn-sm text-[12px] hidden sm:inline-flex">
              <fa-icon [icon]="iconoEntrar" /> {{ t('nav.signin') }}
            </a>
          }
          <button
            type="button"
            (click)="menu.set(true)"
            class="md:hidden btn btn-ghost btn-sm btn-square"
            [attr.aria-label]="t('nav.menu')"
          >
            <fa-icon [icon]="iconoBarras" />
          </button>
        </div>
      </header>

      @if (menu()) {
        <div class="fixed inset-0 z-40 md:hidden">
          <!-- El fondo cierra el cajón desde su propia capa, marcada como decorativa: si el clic
               colgara del contenedor, cerraría también al pulsar dentro del propio cajón. -->
          <div class="absolute inset-0 bg-black/40" (click)="menu.set(false)" aria-hidden="true"></div>
          <div
            class="absolute right-0 top-0 bottom-0 w-[88vw] max-w-sm bg-base-100 shadow-xl flex flex-col"
          >
            <div class="navbar bg-base-100 border-b border-base-200 min-h-14 px-4">
              <span class="flex-1 font-medium">{{ t('nav.menu') }}</span>
              <button
                type="button"
                (click)="menu.set(false)"
                class="btn btn-ghost btn-sm btn-square"
                [attr.aria-label]="t('common.close')"
              >
                <fa-icon [icon]="iconoAspa" />
              </button>
            </div>
            <!-- El cajón NO repite los destinos de la barra de pestañas: inicio, catálogo, carrito y mi
                 cuenta están abajo, a un toque. Aquí queda lo SECUNDARIO —pedidos, favoritos, historial,
                 monedero, afiliados— más el panel de quien lo tenga. -->
            <ul class="menu menu-sm overflow-y-auto p-2 gap-0.5 text-sm">
              @if (usuario()?.esPersonal) {
                <li>
                  <a routerLink="/admin">
                    <fa-icon [icon]="iconoPanel" class="w-4 text-center" /> {{ t('nav.admin') }}
                  </a>
                </li>
              }
              @for (opcion of opcionesDelCajon(); track opcion.destino) {
                <li>
                  <a [routerLink]="opcion.destino">
                    <fa-icon [icon]="opcion.icono" class="w-4 text-center" /> {{ opcion.texto }}
                  </a>
                </li>
              }
            </ul>
            <!-- Sin «flex-1» en la lista: el hueco lo absorbe este separador, que es lo que mantiene el
                 selector de país y el acceso pegados al fondo. -->
            <div class="flex-1"></div>
            <div class="p-3 border-t border-base-200 space-y-2">
              <!-- Aquí el selector está abajo del todo, así que su panel abre HACIA ARRIBA para no
                   salirse de la pantalla; a ancho completo y con el nombre del país, para que se
                   entienda qué es. -->
              <div class="text-[10px] uppercase tracking-wide text-ink-400 px-0.5">
                {{ t('picker.country_currency') }}
              </div>
              <nx-selector-pais-moneda [haciaArriba]="true" [anchoCompleto]="true" />
              @if (usuario()) {
                <button
                  type="button"
                  (click)="cierraSesion.emit()"
                  class="btn btn-outline btn-sm w-full"
                >
                  <fa-icon [icon]="iconoSalir" /> {{ t('nav.signout') }}
                </button>
              } @else {
                <!-- Quien no ha entrado ve las DOS cosas que puede hacer: con el menú sin enlaces, tener
                     solo «iniciar sesión» dejaba sin salida a quien llega por primera vez. -->
                <a routerLink="/login" class="btn btn-primary btn-sm w-full">{{ t('nav.signin') }}</a>
                <a routerLink="/register" class="btn btn-outline btn-sm w-full">
                  {{ t('nav.signup') }}
                </a>
              }
            </div>
          </div>
        </div>
      }

      <!-- El hueco para la barra de pestañas lo reserva el PIE, que va siempre debajo y en móvil lleva
           «pb-24». Reservarlo también aquí dejaba una franja en blanco entre el contenido y el pie. -->
      <main class="flex-1 min-w-0 max-w-screen-2xl w-full mx-auto px-4 lg:px-6 py-6 lg:py-10">
        @if (conMigas()) {
          <nx-migas />
        }
        <div nxTransicionPagina>
          <router-outlet />
        </div>
      </main>

      <nx-pie-sitio
        [boletinEnviado]="boletinEnviado()"
        [yaSuscrito]="yaSuscrito()"
        (suscribeAlBoletin)="suscribeAlBoletin.emit($event)"
        (abreCookies)="abreCookies.emit()"
      />

      <!-- Lo principal, a un toque del pulgar. Solo en móvil: en pantallas grandes manda la barra de
           arriba, que tiene sitio de sobra. -->
      <nx-barra-inferior-movil [autenticado]="!!usuario()" [lineasCesta]="lineasCesta()" />

      <!-- Los acompañantes —guía, chat, asistente, avisos— viven en el marco y no en una página: la
           conversación y la posición sobreviven al navegar, que es justo lo que se les pide. -->
      <ng-content select="[nx-acompanantes]" />
    </div>
  `,
})
export class MarcoEscaparate {
  readonly usuario = input<UsuarioDelMarco | null>(null);
  readonly lineasCesta = input(0);
  readonly avatarOculto = input(false);
  readonly boletinEnviado = input(false);
  readonly yaSuscrito = input(false);

  readonly cierraSesion = output<void>();
  readonly abreCesta = output<void>();
  readonly muestraAvatar = output<void>();
  readonly suscribeAlBoletin = output<string>();
  readonly abreCookies = output<void>();

  protected readonly iconoMarca = faCircleNodes;
  protected readonly iconoCesta = faCartShopping;
  protected readonly iconoPanel = faGauge;
  protected readonly iconoPersona = faUser;
  protected readonly iconoOjo = faEye;
  protected readonly iconoSalir = faRightFromBracket;
  protected readonly iconoEntrar = faSignInAlt;
  protected readonly iconoBarras = faBars;
  protected readonly iconoAspa = faXmark;
  protected readonly t = inject(TraduccionService).t;

  private readonly enrutador = inject(Router);

  private readonly ruta = toSignal(
    this.enrutador.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.enrutador.url },
  );

  /**
   * El cajón del móvil, que se cierra solo al navegar.
   *
   * <p>Es un `linkedSignal` y no un `signal` con un `effect` detrás, que es como estaba. La diferencia
   * importa: un efecto que solo asigna un valor derivado de otro se ejecuta en un orden que no se
   * controla y corre aunque nadie mire el resultado. Aquí la relación se DECLARA —«cuando cambie la
   * ruta, vuelve a cerrado»— y se sigue pudiendo abrir y cerrar a mano entre navegación y navegación.
   *
   * <p>Se cierra porque dejarlo abierto sobre la pantalla nueva es de las cosas que más desorientan en el móvil.
   */
  protected readonly menu = linkedSignal({
    source: this.ruta,
    computation: () => false,
  });

  /** El catálogo completo es interno: solo se ofrece a quien ha iniciado sesión. */
  protected readonly navegacion = computed(() => [
    { destino: '/', texto: this.t('nav.home'), icono: faHouse, exacta: true },
    ...(this.usuario()
      ? [{ destino: '/catalog', texto: this.t('nav.catalog'), icono: faStore, exacta: false }]
      : []),
  ]);

  /** Cuenta → actividad y compras → programa. Cerrar sesión va aparte, al final. */
  protected readonly opcionesDeCuenta = computed(() =>
    this.usuario()
      ? [
          { destino: '/profile', texto: this.t('profile.title'), icono: faIdCard },
          { destino: '/orders', texto: this.t('nav.orders'), icono: faReceipt },
          { destino: '/favorites', texto: this.t('nav.favorites'), icono: faHeart },
          { destino: '/history', texto: this.t('nav.history'), icono: faClockRotateLeft },
          { destino: '/wallet', texto: this.t('nav.wallet'), icono: faWallet },
          { destino: '/affiliate', texto: this.t('platform.affiliate'), icono: faHandshake },
        ]
      : [],
  );

  /** «Mi cuenta» se salta en el cajón: es la cuarta pestaña de la barra de abajo, mismo destino. */
  protected readonly opcionesDelCajon = computed(() =>
    this.opcionesDeCuenta().filter((opcion) => opcion.destino !== '/profile'),
  );

  protected readonly conMigas = computed(() => {
    const camino = this.ruta().split('?')[0];
    return camino !== '/' && !RUTA_DE_FICHA.test(camino);
  });
}
