import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleNodes } from '@fortawesome/free-solid-svg-icons';
import {
  faDiscord,
  faGithub,
  faLinkedin,
  faXTwitter,
} from '@fortawesome/free-brands-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AltaBoletin } from '@ds/component/boletin/alta-boletin';
import { CONTENEDOR_DE_PAGINA } from './contenedor-de-pagina';

/**
 * Las columnas del pie.
 *
 * <p>PLANES y DESARROLLADORES están fuera a propósito, igual que del menú de la cabecera: las dos
 * funciones se habilitarán más adelante y hasta entonces anunciarlas lleva a pedir algo que todavía no
 * se puede dar. Las rutas siguen respondiendo si se escriben a mano; lo que se retira es el enlace.
 */
const COLUMNAS = [
  {
    titulo: 'footer.col.platform',
    enlaces: [{ texto: 'footer.link.catalog', destino: '/catalog' }],
  },
  {
    titulo: 'footer.col.company',
    enlaces: [
      { texto: 'footer.link.about', destino: '/about' },
      { texto: 'footer.link.privacy', destino: '/legal/privacy' },
      { texto: 'footer.link.terms', destino: '/legal/terms' },
      { texto: 'footer.link.cookies', destino: '/legal/cookies' },
      { texto: 'footer.link.notice', destino: '/legal/notice' },
      { texto: 'footer.link.withdrawal', destino: '/legal/withdrawal' },
      { texto: 'footer.link.contact', destino: '/contact' },
    ],
  },
] as const;

const REDES = [
  { icono: faGithub, nombre: 'GitHub', direccion: 'https://github.com/nx036' },
  { icono: faXTwitter, nombre: 'X', direccion: 'https://x.com/nx036' },
  { icono: faLinkedin, nombre: 'LinkedIn', direccion: 'https://linkedin.com/company/nx036' },
  { icono: faDiscord, nombre: 'Discord', direccion: 'https://discord.gg/nx036' },
] as const;

/**
 * El pie del sitio.
 *
 * <p>El pie GRANDE —marca, columnas de enlaces y alta en el boletín— es de escritorio. En el móvil la
 * tienda se usa como una aplicación, y una aplicación no tiene pie: lo que se navega está en la barra
 * de abajo. Dejarlo suponía que, al terminar de deslizar productos, aparecieran columnas de enlaces
 * institucionales y un formulario de boletín, que es lo contrario de lo que hace falta ahí.
 *
 * <p>Lo que NO se puede ocultar son los avisos legales: siguen abajo, en la franja compacta, porque
 * tienen que ser alcanzables desde cualquier página.
 */
@Component({
  selector: 'nx-pie-sitio',
  imports: [RouterLink, FaIconComponent, AltaBoletin],
  template: `
    <!-- DIVERGENCIA DELIBERADA del front anterior, pedida por el titular el 6-sep-2026.
         Allí las cuatro columnas se apelotonan a la izquierda —ocupan 834 px de 1440— y el resto del
         pie queda vacío. Aquí se reparten a lo ancho con un tope, para que en una pantalla muy ancha
         no acaben tan separadas que dejen de leerse como un grupo. El contenido es el mismo.

         El tope y el relleno lateral vienen de CONTENEDOR_DE_PAGINA, el MISMO que usa el cuerpo de la
         página: escritos aparte se separaron, y el recuadro gris quedaba 195 px más estrecho que las
         tarjetas que tiene justo encima. -->
    <footer
      class="hidden md:flex footer sm:footer-horizontal bg-base-200 text-base-content/80 border-t border-base-300 py-10 mt-12
             justify-between gap-8"
      [class]="contenedor"
    >
      <aside class="max-w-xs">
        <a routerLink="/" class="inline-flex items-center gap-2 font-medium text-[15px]">
          <fa-icon [icon]="iconoMarca" class="text-primary" />
          <!-- La marca es «NX036» en toda la plataforma, sin la forma societaria. -->
          NX036
        </a>
        <p class="text-[12px] opacity-70 mt-2 leading-relaxed">{{ t('footer.pitch') }}</p>
      </aside>
      @for (columna of columnas; track columna.titulo) {
        <nav>
          <h6 class="footer-title text-[11px]">{{ t(columna.titulo) }}</h6>
          @for (enlace of columna.enlaces; track enlace.texto) {
            <a [routerLink]="enlace.destino" class="link link-hover text-[13px]">
              {{ t(enlace.texto) }}
            </a>
          }
        </nav>
      }
      <nav class="max-w-xs">
        <h6 class="footer-title text-[11px]">{{ t('newsletter.footer.title') }}</h6>
        <p class="text-[12px] opacity-70 mb-2">{{ t('newsletter.footer.pitch') }}</p>
        <nx-alta-boletin
          [enviado]="boletinEnviado()"
          [yaSuscrito]="yaSuscrito()"
          [compacto]="true"
          (suscribe)="suscribeAlBoletin.emit($event)"
        />
      </nav>
    </footer>

    <!-- «pb-24 md:pb-4»: en el móvil, el hueco de la barra de pestañas. Sin él, la última línea del pie
         —donde viven los avisos legales— queda debajo de la barra y no se puede tocar. -->
    <footer
      class="footer footer-center bg-base-100 text-base-content/70 border-t border-base-200 px-4 py-4 pb-24 md:pb-4 text-[12px]"
    >
      <aside>
        <!-- Los avisos legales, SOLO en móvil: en el escritorio ya están en la columna «Empresa». Aquí
             se repiten porque ese pie no se pinta en el móvil, y estos enlaces no son decoración: quien
             compra desde el teléfono tiene el mismo derecho a leerlos desde cualquier página. -->
        <nav class="md:hidden flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mb-2">
          <a routerLink="/legal/privacy" class="link link-hover">{{ t('footer.link.privacy') }}</a>
          <span class="opacity-40">·</span>
          <a routerLink="/legal/terms" class="link link-hover">{{ t('footer.link.terms') }}</a>
          <span class="opacity-40">·</span>
          <a routerLink="/legal/withdrawal" class="link link-hover">
            {{ t('footer.link.withdrawal') }}
          </a>
          <span class="opacity-40">·</span>
          <a routerLink="/about" class="link link-hover">{{ t('footer.link.about') }}</a>
        </nav>
        <!-- El pie del móvil se queda en DOS líneas. No es por ahorrar espacio: en una tienda que se usa
             con el pulgar, el final de la pantalla está justo encima de la barra de pestañas y es sitio
             caro. Las redes no llevan a comprar y la versión solo le sirve a quien da soporte; las
             preferencias de cookies SÍ se quedan, porque la política promete que retirar el
             consentimiento sea tan fácil como darlo y en el móvil no hay otro sitio desde donde hacerlo. -->
        <p class="flex flex-wrap items-center justify-center gap-3">
          <span>© 2026 NX036. <span class="hidden md:inline">{{ t('footer.tagline') }}</span></span>
          <span class="hidden md:inline opacity-40">·</span>
          <span class="hidden md:inline-flex items-center gap-3">
            @for (red of redes; track red.nombre) {
              <a
                [href]="red.direccion"
                target="_blank"
                rel="noreferrer"
                [attr.aria-label]="red.nombre"
                [title]="red.nombre"
                class="hover:text-primary"
              >
                <fa-icon [icon]="red.icono" />
              </a>
            }
          </span>
          <span class="opacity-40">·</span>
          <button type="button" (click)="abreCookies.emit()" class="link link-hover">
            {{ t('footer.link.cookie_prefs') }}
          </button>
          <span class="hidden md:inline opacity-40">·</span>
          <span class="hidden md:inline">{{ version() }}</span>
        </p>
      </aside>
    </footer>
  `,
})
export class PieSitio {
  /** El ancho del contenido, el mismo que el cuerpo de la página. */
  protected readonly contenedor = CONTENEDOR_DE_PAGINA;

  /** Cierto cuando el alta ya se ha mandado: entonces se enseña la confirmación en vez del formulario. */
  readonly boletinEnviado = input(false);
  /** Cierto si el correo ya estaba dado de alta. Cambia el texto, no el resultado. */
  readonly yaSuscrito = input(false);
  readonly version = input('v0.1.0');

  /** El correo del alta. Mandarlo al backend es de quien monta el pie, no del pie. */
  readonly suscribeAlBoletin = output<string>();
  /** Volver a abrir las preferencias de cookies. */
  readonly abreCookies = output<void>();

  protected readonly columnas = COLUMNAS;
  protected readonly redes = REDES;
  protected readonly iconoMarca = faCircleNodes;
  protected readonly t = inject(TraduccionService).t;
}
