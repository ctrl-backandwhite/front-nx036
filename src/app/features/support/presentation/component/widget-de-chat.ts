import { Component, ElementRef, computed, effect, inject, output, signal, viewChild } from '@angular/core';
import { FormField, form, maxLength, validate } from '@angular/forms/signals';
import { NgOptimizedImage } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faComments,
  faPaperPlane,
  faUpRightAndDownLeftFromCenter,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { esNavegador } from '@core/platform/plataforma';
import { ConversacionStore } from '../../application/state/conversacion.store';
import { PreguntaAlAsistente } from '../../application/use-case/pregunta-al-asistente.use-case';

/** Lo que acepta el motor por pregunta. Estaba escrito en el `maxlength` del HTML. */
const TOPE_DEL_MENSAJE = 1000;

/**
 * El chat del escaparate.
 *
 * <p>Sin sesión NO se pinta nada: el motor exige estar identificado —igual que la búsqueda y el
 * listado—, y un botón que solo puede devolver un rechazo es peor que no tener botón. Quién ha entrado
 * lo dice el marco de la página, que es quien lo sabe; este contexto no entra en las tripas del de
 * acceso para averiguarlo.
 *
 * <p>MOBILE FIRST: el panel nunca pasa del ancho de la ventana (`max-w`) y su alto descuenta también
 * `--hueco-barra`, que es lo que mide la barra de pestañas del móvil. Sin ese descuento, el panel se
 * salía por arriba y se comía la cabecera; en pantallas grandes esa variable vale cero.
 */
@Component({
  selector: 'nx-widget-de-chat',
  imports: [RouterLink, FaIconComponent, FormField, NgOptimizedImage],
  template: `
    @if (!abierto()) {
      <button type="button" [attr.aria-label]="t('chat.open')" (click)="abre()"
              class="fixed bottom-28 right-6 z-40 h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary
                     text-primary-content shadow-lg hover:brightness-110
                     focus:outline-none focus:ring-2 focus:ring-primary">
        <fa-icon [icon]="iconos.chat" />
      </button>
    } @else {
      <div role="dialog" [attr.aria-label]="t('chat.title')"
           class="fixed bottom-6 right-6 z-40 flex flex-col overflow-hidden rounded-xl border
                  border-base-300 bg-base-100 shadow-2xl
                  max-h-[calc(100vh-2.5rem-var(--hueco-barra,0px))] max-w-[calc(100vw-1.5rem)]"
           [class]="conversacion.medida()">
        <header class="flex items-center justify-between border-b border-base-300 px-4 py-3">
          <span class="text-sm font-semibold">{{ t('chat.title') }}</span>
          <span class="flex items-center gap-3">
            <button type="button" [attr.aria-label]="t('chat.size')" [title]="t('chat.size')"
                    class="opacity-60 hover:opacity-100" (click)="conversacion.cambiaDeTamano()">
              <fa-icon [icon]="iconos.tamano" class="text-[12px]" />
            </button>
            <button type="button" [attr.aria-label]="t('chat.close')"
                    class="opacity-60 hover:opacity-100" (click)="abierto.set(false)">
              <fa-icon [icon]="iconos.cerrar" />
            </button>
          </span>
        </header>

        <div class="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          @if (conversacion.turnos().length === 0) {
            <p class="text-[13px] opacity-60">{{ t('chat.hint') }}</p>
          }
          @for (turno of conversacion.turnos(); track turno.id) {
            <div [class.text-right]="turno.de === 'yo'" [class.text-left]="turno.de !== 'yo'">
              <p class="inline-block max-w-[85%] rounded-lg px-3 py-2 text-[13px] whitespace-pre-wrap"
                 [class.bg-primary]="turno.de === 'yo'"
                 [class.text-primary-content]="turno.de === 'yo'"
                 [class.bg-base-200]="turno.de !== 'yo'">
                {{ turno.texto }}
              </p>

              @if (turno.busqueda && turno.busqueda.total > 0) {
                <p class="mt-2">
                  <a [routerLink]="['/catalog']" [queryParams]="{ q: turno.busqueda.consulta }"
                     class="text-[12px] font-medium text-primary hover:underline">
                    {{ t('chat.see_in_catalog') }} ({{ turno.busqueda.total }})
                  </a>
                </p>
              }

              @if (turno.productos?.length) {
                <ul class="mt-2 space-y-1">
                  @for (producto of turno.productos; track producto.slug) {
                    <li>
                      <!--
                        Sigue siendo un enlace de verdad —se puede abrir en otra pestaña y se comparte—
                        pero el clic normal abre la ficha rápida AQUÍ, sin sacar a nadie de la página
                        que está mirando. El panel NO se cierra al abrirla: quien pregunta acaba de
                        pedir esos productos y los quiere a la vista. Cerrarlo lo decide la persona.
                      -->
                      <a [routerLink]="['/catalog', producto.slug]"
                         (click)="abreLaFicha($event, producto.slug)"
                         class="flex items-center gap-2 rounded-lg border border-base-300 p-2 hover:bg-base-200">
                        @if (producto.imagen; as imagen) {
                          <!--
                            Con medidas explícitas y sin prioridad: son miniaturas de una lista que
                            solo existe dentro de un panel ya abierto, así que ni compiten con lo
                            primero que se ve ni deben reservar ancho de banda al arranque.
                          -->
                          <img [ngSrc]="imagen" alt="" width="40" height="40"
                               class="h-10 w-10 rounded object-cover" />
                        }
                        <span class="line-clamp-2 text-left text-[12px]">{{ producto.titulo ?? producto.slug }}</span>
                      </a>
                    </li>
                  }
                </ul>
              }
            </div>
          }
          @if (conversacion.enviando()) {
            <p role="status" class="text-[13px] opacity-60">{{ t('chat.thinking') }}</p>
          }
          <div #final></div>
        </div>

        <form class="flex items-center gap-2 border-t border-base-300 px-3 py-2" (submit)="envia($event)">
          <label for="chat-campo" class="sr-only">{{ t('chat.placeholder') }}</label>
          <input id="chat-campo" class="input input-sm input-bordered flex-1"
                 [placeholder]="t('chat.placeholder')"
                 [formField]="formulario.borrador" />
          <button type="submit" class="btn btn-sm btn-primary" [attr.aria-label]="t('chat.send')"
                  [disabled]="!sePuedeEnviar()">
            <fa-icon [icon]="iconos.enviar" />
          </button>
        </form>

        <p class="px-3 pb-2 text-[11px] leading-tight opacity-60">{{ t('chat.disclaimer') }}</p>
      </div>
    }
  `,
})
export class WidgetDeChat {
  private readonly traduccion = inject(TraduccionService);
  private readonly preferencias = inject(PreferenciasService);
  private readonly pregunta = inject(PreguntaAlAsistente);
  private readonly router = inject(Router);

  protected readonly conversacion = inject(ConversacionStore);
  protected readonly t = this.traduccion.t;

  /**
   * La ficha rápida vive en el contexto del catálogo, así que aquí solo se dice QUÉ producto se quiere
   * ver y lo abre quien monta el marco de la página. Es lo que permite no cruzar la frontera entre
   * contextos por un componente visual.
   */
  readonly abreFichaRapida = output<string>();

  protected readonly abierto = signal(false);

  /**
   * Lo que se está escribiendo. Va por Signal Forms como el resto de formularios del proyecto: el tope
   * de mil caracteres y el «no se manda vacío» eran un atributo del HTML y una comprobación repetida en
   * el botón; ahora son DOS reglas declaradas juntas, y la del tope devuelve el `maxlength` al campo,
   * así que el navegador sigue impidiendo teclear de más igual que antes.
   *
   * <p>Se envía con Intro porque es un `<form>` con un único campo y su botón de envío: eso lo da el
   * navegador y no hay que programarlo.
   */
  protected readonly modelo = signal({ borrador: '' });
  protected readonly formulario = form(this.modelo, (ruta) => {
    maxLength(ruta.borrador, TOPE_DEL_MENSAJE, { message: () => this.t('dialog.field.maxlength') });
    // Se mira el texto YA RECORTADO: un mensaje de solo espacios está tan vacío como uno sin nada.
    validate(ruta.borrador, ({ value }) =>
      value().trim() === '' ? { kind: 'vacio', message: this.t('dialog.field.required') } : null,
    );
  });

  /** Un único sitio al que preguntar si la pregunta se puede mandar. */
  protected readonly sePuedeEnviar = computed(
    () => !this.conversacion.enviando() && !this.formulario().invalid(),
  );

  protected readonly iconos = {
    chat: faComments,
    cerrar: faXmark,
    enviar: faPaperPlane,
    tamano: faUpRightAndDownLeftFromCenter,
  };

  private readonly final = viewChild<ElementRef<HTMLElement>>('final');

  constructor() {
    // Al abrirse y con cada turno nuevo, la vista baja al final: si no, la respuesta aparece fuera de
    // pantalla y parece que no ha pasado nada.
    effect(() => {
      this.conversacion.turnos();
      if (this.abierto()) {
        this.final()?.nativeElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  protected abre(): void {
    this.abierto.set(true);
    // Lo guardado se lee DESPUÉS del primer pintado, nunca durante: en navegación privada el
    // almacenamiento lanza al tocarlo y tumbaría la pantalla entera antes de pintar nada.
    if (esNavegador()) {
      this.conversacion.hidrata();
    }
  }

  protected abreLaFicha(evento: Event, slug: string): void {
    evento.preventDefault();
    this.abreFichaRapida.emit(slug);
  }

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    if (!this.sePuedeEnviar()) {
      return;
    }
    const mensaje = this.modelo().borrador;
    this.modelo.set({ borrador: '' });
    // Vaciar el campo sin olvidar que se había tocado lo dejaría en rojo pidiendo texto justo después
    // de mandar la pregunta.
    this.formulario().reset();
    const { busqueda } = await this.pregunta.ejecuta(
      mensaje,
      String(this.preferencias.idioma()),
      this.t,
    );

    // Si ya se está mirando el catálogo, la rejilla de detrás se actualiza sola con lo que acaba de
    // buscar el asistente: es la misma búsqueda, enseñada donde se ve entera y con su precio. Fuera del
    // catálogo NO se navega: sacar a alguien de la ficha que está leyendo, sin pedirlo, es peor que
    // ofrecerle un enlace.
    if (busqueda && this.router.url.split('?')[0] === '/catalog') {
      await this.router.navigate(['/catalog'], {
        queryParams: { q: busqueda.consulta },
        replaceUrl: true,
      });
    }
  }
}
