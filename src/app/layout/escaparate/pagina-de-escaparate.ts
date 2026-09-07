import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { MarcoEscaparate, UsuarioDelMarco } from './marco-escaparate';
import { SesionActual } from '@core/auth/sesion-actual';
import { CarritoStore } from '@features/cart/application/state/carrito.store';
import { ANADIR_AL_CARRITO_PORT } from '@features/cart/domain/port/carrito-compartido.port';
import { CierraSesion } from '@features/auth/application/use-case/cierra-sesion.use-case';
import { ALTA_EN_EL_BOLETIN } from '@core/newsletter/alta-en-el-boletin.port';
import { DecideSobreCookies } from '@core/cookies/decide-sobre-cookies';
import { CampanaDeAvisos } from '@features/notifications/presentation/component/campana-de-avisos';
import { GuiaDeBienvenida } from '@features/catalog/presentation/component/guia-de-bienvenida';
import { VistaRapida } from '@features/catalog/presentation/component/vista-rapida';
import { AsistenciaFlotante } from '@features/support/presentation/component/asistencia-flotante';
import { AvatarStore } from '@features/support/application/state/avatar.store';
import { LineaDeCesta, SugerenciaParaLaCesta } from '@features/support/domain/model/cesta';

/**
 * El anfitrión del marco del escaparate.
 *
 * <p>Hace falta porque el marco es, a propósito, una pieza tonta: sabe pintar la cabecera, el pie y la
 * barra del móvil, pero no sabe quién ha entrado ni qué lleva la cesta — se lo tienen que dar. Eso es lo
 * que lo hace reutilizable y probable sin montar media aplicación.
 *
 * <p>Alguien tiene que cablearlo, y ese alguien no puede ser un contexto: la cabecera enseña a la vez la
 * sesión («auth»), la cesta («cart») y los avisos («notifications»), y ningún contexto puede meterse en
 * las tripas de otro. Por eso vive en `layout`, que junto a la raíz de composición es la única capa
 * autorizada a ver el mapa entero.
 *
 * <p>Esto faltaba: el marco estaba escrito y probado, pero no lo montaba ninguna ruta, así que la
 * aplicación se servía SIN cabecera, sin pie y sin cajón de cesta. No lo delataba ninguna prueba —cada
 * pieza pasaba la suya— ni el lint ni la compilación: solo se vio midiendo el HTML que llega.
 *
 * <p>Y quedaba la mitad: el marco se montaba AUTOCERRADO —`<nx-marco-escaparate ... />`—, de modo que
 * sus dos huecos de contenido no recibían nada. La campana de avisos y los acompañantes existían,
 * estaban probados y no se pintaban en ninguna parte. Un hueco vacío no da error: se queda callado.
 */
@Component({
  selector: 'nx-pagina-de-escaparate',
  imports: [
    MarcoEscaparate,
    CampanaDeAvisos,
    GuiaDeBienvenida,
    VistaRapida,
    AsistenciaFlotante,
  ],
  template: `
    <nx-marco-escaparate
      [usuario]="usuario()"
      [lineasCesta]="lineasCesta()"
      [boletinEnviado]="boletinEnviado()"
      [yaSuscrito]="yaSuscrito()"
      (cierraSesion)="sal()"
      (abreCesta)="abreLaCesta()"
      (suscribeAlBoletin)="suscribeAlBoletin($event)"
      (abreCookies)="revisaLasCookies()"
    >
      <!--
        Los envoltorios llevan el atributo del hueco y la clase «contents», que no pinta caja: así no
        cuentan como hijo del «flex» de la cabecera. Es la forma de poder condicionar lo de dentro con
        un bloque de control: el bloque NO hereda el atributo del hueco, así que marcarlo a él dejaría
        el contenido fuera y otra vez sin pintar, esta vez sin nada que lo delatara.
      -->
      <div nx-campana class="contents">
        <!-- Solo con sesión: sin ella el buzón responde 401 y la campana pediría en balde cada minuto. -->
        @if (usuario()) {
          <nx-campana-de-avisos />
        }
      </div>

      <div nx-acompanantes class="contents">
        <!--
          La guía de «cómo se calcula el precio final». Va en el marco y no en una página porque sale
          una sola vez, en la primera visita, y quien llega puede aterrizar en cualquier ruta: la
          portada, una ficha compartida, el catálogo. Ella decide sola si toca abrirse; la entrada
          «abrir» es únicamente para cuando la pide el asistente.
        -->
        <nx-guia-de-bienvenida [abrir]="avatar.guiaAbierta()" (cerrada)="avatar.cierraLaGuia()" />

        <!--
          El asistente y el chat. En el marco porque la conversación y la posición sobreviven al
          navegar, que es justo lo que se les pide. Lo que no pueden saber por sí mismos —qué lleva la
          cesta— se lo damos aquí, y lo que no pueden hacer solos —añadir a la cesta, abrir una ficha,
          pedir la guía— lo resolvemos aquí: son de otros contextos y ellos no pueden verlos.
        -->
        <nx-asistencia-flotante
          [lineasDeLaCesta]="lineasParaElAsistente()"
          [enElPago]="enElPago()"
          [anadiendo]="anadiendo()"
          (anadeALaCesta)="anade($event)"
          (abreFichaRapida)="fichaRapida.set($event)"
          (pideLaGuia)="avatar.abreLaGuia()"
        />

        <!--
          La ficha rápida. No se abre sola: la piden el asistente o el chat, que están aquí al lado.
          Con el «slug» a nulo no pinta nada, así que puede quedarse montada.
        -->
        <nx-vista-rapida [slug]="fichaRapida()" (cierra)="fichaRapida.set(null)" />
      </div>
    </nx-marco-escaparate>
  `,
})
export class PaginaDeEscaparate {
  private readonly sesion = inject(SesionActual);
  private readonly carrito = inject(CarritoStore);
  private readonly anadirALaCesta = inject(ANADIR_AL_CARRITO_PORT);
  private readonly cerrar = inject(CierraSesion);
  private readonly router = inject(Router);
  private readonly boletin = inject(ALTA_EN_EL_BOLETIN);
  private readonly cookies = inject(DecideSobreCookies);

  protected readonly avatar = inject(AvatarStore);

  /* El resultado del alta en el boletín del PIE.
   *
   * <p>Se ata aquí porque el marco solo reemite la salida hacia arriba, y arriba no la recogía nadie:
   * el campo se limpiaba, quien lo usaba veía que «algo había pasado» y al backend no llegaba nada. Un
   * formulario que finge es peor que uno que falla, porque nadie lo denuncia. */
  protected readonly boletinEnviado = signal(false);
  protected readonly yaSuscrito = signal(false);

  /** La ficha que el asistente ha pedido enseñar por encima. Nulo = cerrada. */
  protected readonly fichaRapida = signal<string | null>(null);

  /** Qué sugerencia se está añadiendo, para que su botón enseñe la espera y no se pulse dos veces. */
  protected readonly anadiendo = signal<string | null>(null);

  private readonly ruta = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** En el pago el asistente cambia de discurso: es el último momento para añadir algo sin coste. */
  protected readonly enElPago = computed(() => this.ruta().split('?')[0].startsWith('/checkout'));

  protected async suscribeAlBoletin(correo: string): Promise<void> {
    const resultado = await this.boletin.suscribe(correo);
    /* Se da por enviado también cuando falla, igual que el front anterior: es un alta en un boletín, no
     * una compra. Enseñar un error aquí invita a reintentar sin que haya nada que arreglar. */
    this.yaSuscrito.set(resultado.ok ? resultado.valor.yaEstaba : false);
    this.boletinEnviado.set(true);
  }

  protected readonly usuario = computed<UsuarioDelMarco | null>(() => {
    const datos = this.sesion.datos();
    return datos ? { nombre: datos.nombreVisible, esPersonal: this.sesion.esPersonalInterno() } : null;
  });

  protected readonly lineasCesta = computed(() => this.carrito.lineas().length);

  /**
   * La cesta traducida al modelo pequeño del asistente.
   *
   * <p>Se traduce aquí y no allí a propósito: el asistente quiere tres campos por línea, no el carrito
   * con sus precios y sus reglas de mínimos. Depender del modelo grande lo ataría a cada cambio de la
   * cesta.
   */
  protected readonly lineasParaElAsistente = computed<readonly LineaDeCesta[]>(() =>
    this.carrito.lineas().map((linea) => ({
      idProducto: linea.productId,
      idVariante: linea.variantId,
      cantidad: linea.cantidad,
    })),
  );

  protected async sal(): Promise<void> {
    await this.cerrar.ejecuta();
    await this.router.navigateByUrl('/');
  }

  /**
   * El icono de la cesta ABRE EL CAJÓN, no navega.
   *
   * <p>Antes llevaba a `/cart`, que es una página correcta, y por eso no se leía como un fallo: era
   * simplemente otra cosa. El cajón deja seguir donde se estaba —una ficha, el listado— que es justo
   * para lo que sirve.
   */
  protected abreLaCesta(): void {
    this.carrito.abreCajon();
  }

  /**
   * El enlace «Cookies» del pie RETIRA el consentimiento y vuelve a preguntar.
   *
   * <p>El pie emitía esta señal y arriba no la recogía nadie: pulsar «Cookies» no hacía nada. Y no es
   * un adorno — retirar el consentimiento tiene que ser tan fácil como darlo (art. 7.3 del RGPD), así
   * que esta es la única puerta para cambiar de opinión.
   */
  protected revisaLasCookies(): void {
    this.cookies.retira();
  }

  /** Añade lo que sugiere el asistente. La sugerencia no trae precio: se resuelve al añadir. */
  protected async anade(sugerencia: SugerenciaParaLaCesta): Promise<void> {
    if (this.anadiendo()) {
      return;
    }
    this.anadiendo.set(sugerencia.slug);
    try {
      await this.anadirALaCesta.anade({
        id: sugerencia.id,
        slug: sugerencia.slug,
        titulo: sugerencia.titulo,
        imagen: sugerencia.imagen,
      });
    } finally {
      this.anadiendo.set(null);
    }
  }
}
