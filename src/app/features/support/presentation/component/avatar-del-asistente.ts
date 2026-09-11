import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faEyeSlash,
  faMinus,
  faRotateRight,
  faVolumeHigh,
  faVolumeXmark,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { Plataforma } from '@core/platform/plataforma';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { LineaDeCesta, SugerenciaParaLaCesta, unidadesEnLaCesta } from '../../domain/model/cesta';
import {
  EstadoDelAsistente,
  UMBRAL_DE_ARRASTRE,
  acotaPosicion,
  animoDe,
  queToca,
} from '../../domain/model/asistente';
import { AvatarStore } from '../../application/state/avatar.store';
import { SugiereParaLaCesta } from '../../application/use-case/sugiere-para-la-cesta.use-case';
import { DiceEnAlto } from '../../application/use-case/dice-en-alto.use-case';
import { Desplazandose } from '../desplazandose';
import { PersonajeDelAsistente } from './personaje-del-asistente';
import { GloboDeSugerencias } from './globo-de-sugerencias';

/** Cuánto dura la cara de alegría. A propósito poco: una fiesta permanente deja de significar nada. */
const ALEGRIA_MS = 4000;
/** Cuánto se queda el saludo en pantalla. */
const SALUDO_MS = 7000;

/**
 * El asistente que acompaña la navegación.
 *
 * <p>Habla en momentos concretos —de momento, cuando cambia la cesta— y nunca por hablar. Y no se
 * apaga: se APARTA. Encogido sigue a mano; oculto se recupera desde el menú de la cuenta, y por eso al
 * ocultarlo se dice dónde volver a encontrarlo: la opción estaba ahí desde el principio, pero nadie
 * puede adivinarlo y sin ese aviso ocultarlo parece definitivo.
 *
 * <p>QUÉ LLEVA LA CESTA entra como entrada y AÑADIR sale como salida. La cesta es otro contexto acotado
 * y el asistente no puede entrar en sus tripas; lo que necesita son tres campos por línea, así que los
 * recibe de quien monta el marco de la página, que sí ve el mapa entero. Lo mismo con la ficha rápida y
 * con la guía de bienvenida, que son del catálogo.
 *
 * <p>Mientras la página se desplaza, el asistente se aparta: se atenúa, encoge un poco y deja de recibir
 * toques. No es un adorno — se plantaba sobre el precio y el botón de las filas del catálogo que iban
 * pasando por debajo. Se aparta en vez de esconderse del todo porque desaparecer y reaparecer de golpe
 * se lee como un fallo.
 */
@Component({
  selector: 'nx-avatar-del-asistente',
  imports: [FaIconComponent, PersonajeDelAsistente, GloboDeSugerencias],
  template: `
    @if (avatar.visible()) {
      <div
        [class]="disposicion()"
        [class.pointer-events-none]="apartado()"
        [class.scale-90]="apartado()"
        [class.opacity-30]="apartado()"
        [style.right.px]="avatar.guiaPendiente() ? null : avatar.posicion().derecha"
        [style.bottom]="avatar.guiaPendiente() ? null : anclaInferior()"
        data-testid="avatar"
      >
        <!--
          La guía de cómo comprar sin sorpresas. La ofrece el asistente en vez de abrirse sola sobre
          alguien que acaba de llegar: se pregunta antes de ocupar la pantalla, y quien dice que no no
          la vuelve a ver. Para presentarla, el asistente se pone en medio: lo que va a decir merece
          atención y en una esquina se lee como un aviso más.
        -->
        @if (avatar.guiaPendiente() && avatar.estado() === 'activo') {
          <div role="status" class="order-2 w-[20rem] max-w-[calc(100vw-2rem)] rounded-xl border
                                    border-base-300 bg-base-100 p-4 shadow-2xl">
            <p class="text-[12px]">{{ t('avatar.guide_offer') }}</p>
            <div class="mt-2 flex gap-2">
              <button type="button" class="btn btn-primary btn-xs flex-1 text-[11px]" (click)="abreGuia()">
                {{ t('avatar.guide_yes') }}
              </button>
              <button type="button" class="btn btn-ghost btn-xs text-[11px]"
                      (click)="avatar.descartaLaGuia()">
                {{ t('avatar.guide_no') }}
              </button>
            </div>
          </div>
        }

        @if (avatar.saludando() && avatar.estado() === 'activo' && !globo() && !avatar.guiaPendiente()) {
          <div role="status" class="max-w-[15rem] rounded-xl rounded-br-sm border border-base-300
                                    bg-base-100 px-3 py-2 text-[12px] shadow-xl">
            {{ t('avatar.greeting') }}
          </div>
        }

        @if (globo() && sugiere.items().length > 0 && avatar.estado() === 'activo' && !avatar.guiaPendiente()) {
          <nx-globo-de-sugerencias
            [sugerencias]="sugiere.items()"
            [hueco]="sugiere.hueco()"
            [anadiendo]="anadiendo()"
            (cierra)="globo.set(false)"
            (anade)="anadeALaCesta.emit($event)"
            (abreFichaRapida)="abreFichaRapida.emit($event)"
          />
        }

        <div [class]="avatar.guiaPendiente() ? 'order-1 flex items-center gap-1' : 'flex items-center gap-1'">
          @if (avatar.estado() === 'activo') {
            <span class="flex items-center gap-1 rounded-full bg-base-100 px-1.5 py-1 shadow">
              <!--
                El botón de la voz solo existe donde el navegador sabe hablar. Y encenderla ES la
                interacción que los navegadores exigen antes de dejar sonar a una página.
              -->
              @if (hayVoz()) {
                <button type="button" class="opacity-60 hover:opacity-100"
                        [class.text-primary]="avatar.voz()"
                        [attr.aria-pressed]="avatar.voz()"
                        [attr.aria-label]="t(avatar.voz() ? 'avatar.voice_off' : 'avatar.voice_on')"
                        [title]="t(avatar.voz() ? 'avatar.voice_off' : 'avatar.voice_on')"
                        (click)="alternaLaVoz()">
                  <fa-icon [icon]="avatar.voz() ? iconos.vozAlta : iconos.vozMuda" class="text-[11px]" />
                </button>
              }
              <!-- Repetir: cada cosa se dice una sola vez, así que para volver a oírla se pide. -->
              @if (hayVoz() && avatar.voz()) {
                <button type="button" class="opacity-60 hover:opacity-100"
                        [attr.aria-label]="t('avatar.repeat')" [title]="t('avatar.repeat')"
                        (click)="repite()">
                  <fa-icon [icon]="iconos.repetir" class="text-[11px]" />
                </button>
              }
              <button type="button" class="opacity-60 hover:opacity-100"
                      [attr.aria-label]="t('avatar.minimize')" [title]="t('avatar.minimize')"
                      (click)="cambiaEstado('mini')">
                <fa-icon [icon]="iconos.encoger" class="text-[11px]" />
              </button>
              <button type="button" class="opacity-60 hover:opacity-100"
                      [attr.aria-label]="t('avatar.hide')" [title]="t('avatar.hide')"
                      (click)="cambiaEstado('oculto')">
                <fa-icon [icon]="iconos.ocultar" class="text-[11px]" />
              </button>
            </span>
          }

          <button type="button"
                  class="cursor-grab touch-none rounded-full bg-base-100 p-1 shadow-lg active:cursor-grabbing"
                  [attr.aria-label]="t(avatar.estado() === 'mini' ? 'avatar.open' : 'avatar.drag')"
                  [title]="t('avatar.drag')"
                  (pointerdown)="alPulsar($event)"
                  (pointermove)="alMover($event)"
                  (pointerup)="alSoltar()">
            <nx-personaje-del-asistente [animo]="animo()" [mini]="avatar.estado() === 'mini'" />
          </button>
        </div>
      </div>
    }
  `,
})
export class AvatarDelAsistente {
  private readonly plataforma = inject(Plataforma);
  private readonly traduccion = inject(TraduccionService);
  private readonly preferencias = inject(PreferenciasService);
  private readonly avisos = inject(AvisosStore);
  private readonly diceEnAlto = inject(DiceEnAlto);
  private readonly desplazandose = inject(Desplazandose);

  protected readonly avatar = inject(AvatarStore);
  protected readonly sugiere = inject(SugiereParaLaCesta);
  protected readonly t = this.traduccion.t;

  /** Lo que hay en la cesta ahora mismo. Lo entrega el marco de la página; ver la nota de la clase. */
  readonly lineasDeLaCesta = input<readonly LineaDeCesta[]>([]);
  /** Cierto en la pantalla de pago, donde más vale la pena sugerir. */
  readonly enElPago = input(false);
  /** El que se está añadiendo, para apagar solo su botón. */
  readonly anadiendo = input<string | null>(null);

  readonly anadeALaCesta = output<SugerenciaParaLaCesta>();
  readonly abreFichaRapida = output<string>();
  readonly pideLaGuia = output<void>();

  protected readonly globo = signal(false);
  protected readonly contento = signal(false);
  protected readonly arrastrando = signal(false);

  protected readonly iconos = {
    encoger: faMinus,
    ocultar: faEyeSlash,
    vozAlta: faVolumeHigh,
    vozMuda: faVolumeXmark,
    repetir: faRotateRight,
  };

  /** Lo que había en la cesta antes: distingue «han añadido» de un simple repintado. */
  private unidadesPrevias: number | null = null;
  private arrastre: { x: number; y: number; movido: boolean } | null = null;
  private relojDeAlegria: ReturnType<typeof setTimeout> | null = null;

  protected readonly animo = () =>
    animoDe({
      estado: this.avatar.estado(),
      arrastrando: this.arrastrando(),
      consultando: this.sugiere.consultando(),
      contento: this.contento(),
    });

  protected readonly apartado = () => this.desplazandose.activo() && !this.avatar.guiaPendiente();

  protected readonly disposicion = () =>
    this.avatar.guiaPendiente()
      ? 'fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/20 p-4 transition-[opacity,transform] duration-200'
      : 'fixed z-40 flex flex-col items-end gap-2 transition-[opacity,transform] duration-200';

  /**
   * `--hueco-barra` sube el asistente lo que mida la barra de pestañas del móvil, y vale cero en
   * pantallas grandes. Entra en el cálculo aquí y no en la hoja de estilos porque esta posición es un
   * estilo en línea —el asistente se arrastra— y una regla externa no puede con él.
   */
  protected readonly anclaInferior = () =>
    `calc(${this.avatar.posicion().abajo}px + var(--hueco-barra, 0px))`;

  protected readonly hayVoz = () => this.diceEnAlto.hayVoz();

  constructor() {
    if (this.plataforma.esNavegador) {
      // Lo guardado se lee DESPUÉS del primer pintado: en navegación privada lanza al tocarlo.
      this.avatar.hidrata();
      if (this.avatar.saludando()) {
        setTimeout(() => this.avatar.dejaDeSaludar(), SALUDO_MS);
      }
    }

    // El disparo: la cesta ha cambiado. CUALQUIER cambio cuenta, no solo añadir — lo que conviene
    // comprar depende de lo que YA se lleva: al quitar algo cambia la partida arancelaria compartida y
    // el hueco del paquete, así que seguir enseñando lo de antes es hablar de una cesta que ya no
    // existe. Con la cesta vacía no hay nada que sugerir: se calla y limpia lo que tenía.
    effect(() => {
      const unidades = unidadesEnLaCesta(this.lineasDeLaCesta());
      const previas = this.unidadesPrevias;
      this.unidadesPrevias = unidades;

      if (unidades === 0) {
        this.sugiere.olvida();
        this.globo.set(false);
        return;
      }
      // En el primer pintado no se dispara: la cesta de una sesión anterior no es una novedad.
      if (previas === null || unidades === previas) {
        return;
      }
      if (untracked(() => this.avatar.estado()) === 'activo') {
        void this.consulta();
      }
    });

    // En el pago es donde más vale la pena: quien está a punto de pagar todavía puede añadir algo que
    // viaje en el mismo paquete y en la misma línea de aduana. Un minuto después, ya no.
    effect(() => {
      if (this.enElPago() && this.lineasDeLaCesta().length > 0) {
        void untracked(() => this.consulta());
      }
    });

    // Lee en alto lo que acaba de decir, en el idioma en el que se está navegando. Solo si la voz está
    // encendida: nadie quiere que una tienda le hable sin haberlo pedido.
    effect(() => {
      const encendida = this.avatar.voz() && this.avatar.estado() === 'activo';
      if (!encendida) {
        this.diceEnAlto.calla();
        return;
      }
      this.diceEnAlto.ejecuta(this.queToca(), String(this.preferencias.idioma()), this.t);
    });
  }

  protected async consulta(): Promise<void> {
    const hay = await this.sugiere.ejecuta(
      this.lineasDeLaCesta(),
      String(this.preferencias.idioma()),
    );
    this.globo.set(hay);
    if (hay) {
      this.alegrate();
    }
  }

  protected alternaLaVoz(): void {
    if (this.avatar.alternaLaVoz()) {
      // La frase de prueba confirma que se oye: encenderla y que no suene nada parece que no funciona.
      this.diceEnAlto.ejecuta(
        { clave: 'avatar.voice_ready' },
        String(this.preferencias.idioma()),
        this.t,
        true,
      );
      return;
    }
    this.diceEnAlto.calla();
  }

  protected repite(): void {
    this.diceEnAlto.ejecuta(this.queToca(), String(this.preferencias.idioma()), this.t, true);
  }

  protected abreGuia(): void {
    this.avatar.cierraLaGuia();
    this.pideLaGuia.emit();
  }

  protected cambiaEstado(estado: EstadoDelAsistente): void {
    this.avatar.cambiaEstado(estado);
    this.globo.set(false);
    if (estado === 'oculto') {
      this.avisos.muestra({ tipo: 'info', mensaje: this.t('avatar.hidden_hint') });
    }
    // Al despertarlo enseña lo que tenga, sin que haya que pulsarlo otra vez: si lo abres es porque
    // quieres saber qué te iba a decir. Y si no tiene nada guardado pero hay cesta, lo consulta.
    if (estado === 'activo') {
      if (this.sugiere.items().length > 0) {
        this.globo.set(true);
      } else if (this.lineasDeLaCesta().length > 0) {
        void this.consulta();
      }
    }
  }

  protected alPulsar(evento: PointerEvent): void {
    this.arrastre = { x: evento.clientX, y: evento.clientY, movido: false };
    (evento.target as HTMLElement).setPointerCapture?.(evento.pointerId);
  }

  protected alMover(evento: PointerEvent): void {
    const desde = this.arrastre;
    if (!desde) {
      return;
    }
    const dx = desde.x - evento.clientX;
    const dy = desde.y - evento.clientY;
    if (
      !desde.movido &&
      Math.abs(dx) < UMBRAL_DE_ARRASTRE &&
      Math.abs(dy) < UMBRAL_DE_ARRASTRE
    ) {
      return;
    }
    desde.movido = true;
    this.arrastrando.set(true);
    const actual = this.avatar.posicion();
    this.avatar.mueve(
      acotaPosicion(
        { derecha: actual.derecha + dx, abajo: actual.abajo + dy },
        window.innerWidth,
        window.innerHeight,
      ),
    );
    this.arrastre = { x: evento.clientX, y: evento.clientY, movido: true };
  }

  protected alSoltar(): void {
    const desde = this.arrastre;
    this.arrastre = null;
    this.arrastrando.set(false);
    if (desde?.movido) {
      // Se guarda al soltar y no al mover: guardar en cada píxel serían decenas de escrituras.
      this.avatar.guardaLaPosicion();
      return;
    }
    // No se arrastró: fue una pulsación. Encogido despierta; activo enseña lo último que encontró.
    if (this.avatar.estado() === 'mini') {
      this.cambiaEstado('activo');
      return;
    }
    if (this.sugiere.items().length > 0) {
      this.globo.set(!this.globo());
      return;
    }
    // Sin nada guardado pero CON cesta, se pregunta ahora.
    //
    // Las sugerencias solo se pedían cuando la cesta cambiaba durante la visita, y en el primer
    // pintado se calla a propósito —la cesta de una sesión anterior no es una novedad que merezca
    // abrir un globo sobre quien acaba de llegar—. El efecto secundario era que quien volvía con algo
    // ya en la cesta pulsaba el avatar y NO PASABA NADA: ni globo, ni consulta, ni aviso. Parecía
    // roto, y desde fuera lo estaba.
    //
    // Una pulsación es una petición explícita, así que aquí no hay riesgo de interrumpir a nadie: si
    // lo pides, se consulta y se enseña lo que haya.
    if (this.lineasDeLaCesta().length > 0 && !this.sugiere.consultando()) {
      void this.consulta();
    }
  }

  private queToca() {
    return queToca({
      guiaPendiente: this.avatar.guiaPendiente(),
      saludando: this.avatar.saludando(),
      globoAbierto: this.globo(),
      sugerencias: this.sugiere.items(),
    });
  }

  private alegrate(): void {
    this.contento.set(true);
    if (this.relojDeAlegria) {
      clearTimeout(this.relojDeAlegria);
    }
    this.relojDeAlegria = setTimeout(() => this.contento.set(false), ALEGRIA_MS);
  }
}
