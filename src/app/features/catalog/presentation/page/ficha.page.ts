import {
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { EtiquetasService } from '@core/seo/etiquetas.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { Migas } from '@ds/component/migas/migas';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { FichaDeProducto } from '../../domain/model/producto';
import {
  fotoParaCompartir,
  enEsteOrden,
  galeriaVisible,
  posicionEnLaGaleria,
} from '../../domain/model/galeria';
import { AbreLaFicha } from '../../application/use-case/abre-la-ficha.use-case';
import { MigaDeCategoria } from '../../application/use-case/miga-de-categoria.use-case';
import { AnadeALaCesta, esMotivoDeRechazo } from '../../application/use-case/anade-a-la-cesta.use-case';
import { AlternaFavorito } from '../../application/use-case/alterna-favorito.use-case';
import { RECUPERADOR_DE_SESION } from '@core/auth/recuperador-de-sesion.port';
import { SesionActual } from '@core/auth/sesion-actual';
import { PaseDeGaleria } from '../pase-de-galeria';
import { SeleccionDeLaFicha } from '../seleccion-de-la-ficha';
import { AccionesDeAdmin } from '../acciones-de-admin';
import { GaleriaFicha } from '../component/galeria-ficha';
import { PanelDeCompra } from '../component/panel-de-compra';
import { TarjetaVendedor } from '../component/tarjeta-vendedor';
import { PestanasFicha } from '../component/pestanas-ficha';
import { SeccionesFicha } from '../component/secciones-ficha';
import { FotosDeVariante } from '../component/admin/fotos-de-variante';
import { ColorElegido } from '../component/selector-color';
import { CambioDeTalla } from '../component/tabla-tallas';

/** Cuánto se queda encendida la confirmación de «añadido». */
const CONFIRMACION_MS = 2000;

/**
 * La ficha de producto.
 *
 * <p>En el front anterior esto eran DOS pantallas en una: la ficha pública y el editor en línea del
 * administrador, con dieciocho estados y once mutaciones en un fichero de 2.137 líneas. Aquí queda
 * repartido: las reglas de selección y de precio son del dominio; lo elegido vive en
 * `SeleccionDeLaFicha`; la columna de compra y las secciones de abajo son componentes propios; y TODO
 * lo de administración está en `component/admin/` bajo `@defer`, de modo que su código no viaja al
 * navegador de quien compra. Esta clase solo ORQUESTA.
 */
@Component({
  selector: 'nx-ficha',
  providers: [PaseDeGaleria, SeleccionDeLaFicha, AccionesDeAdmin],
  imports: [
    FaIconComponent,
    Migas,
    GaleriaFicha,
    PanelDeCompra,
    TarjetaVendedor,
    PestanasFicha,
    SeccionesFicha,
    FotosDeVariante,
  ],
  template: `
    @if (cargando()) {
      <div class="grid lg:grid-cols-[1fr_22rem] gap-8" aria-busy="true">
        <div class="space-y-3">
          <div class="aspect-square w-full skeleton"></div>
          <div class="grid grid-cols-6 gap-2">
            @for (hueco of huecos; track hueco) {
              <div class="aspect-square skeleton"></div>
            }
          </div>
        </div>
        <div class="space-y-3">
          <div class="h-8 w-3/4 skeleton"></div>
          <div class="h-12 w-1/2 skeleton"></div>
          <div class="h-24 w-full skeleton"></div>
        </div>
      </div>
    } @else if (ficha(); as producto) {
      <!-- «Volver» usa el HISTORIAL y no un enlace al catálogo: así se recupera dónde estaba la lista
           en vez de empezarla otra vez desde arriba. Cuando la ficha se abre desde un correo no hay
           historial de la tienda detrás, y entonces lleva al inicio. -->
      <button
        type="button"
        (click)="vuelve()"
        class="inline-flex items-center gap-2 mb-3 text-sm font-medium text-primary hover:underline"
      >
        <fa-icon [icon]="iconos.atras" class="text-[12px]" />
        {{ t('common.back') }}
      </button>

      <div class="hidden sm:block"><nx-migas [migas]="migas()" /></div>

      <section
        class="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10 lg:items-start animate-fade-up"
      >
        <div class="order-4 lg:order-0">
          <!-- Zona donde el administrador suelta una foto de variante para copiarla a la galería. Son
               cuatro atributos: lo que hace falta para procesarla se trae a demanda al soltarla. -->
          <div
            class="relative rounded-xl transition-colors"
            [class]="arrastrandoFoto() ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''"
            (dragover)="admiteFoto($event)"
            (dragleave)="arrastrandoFoto.set(false)"
            (drop)="sueltaFoto($event, producto)"
          >
            <nx-galeria-ficha
              [fotos]="galeria()"
              [urlDelVideo]="producto.urlDeVideo"
              [titulo]="producto.titulo"
              [fotoDeVariante]="seleccion.fotoDelColor() ?? undefined"
              [pasePasando]="pase.corriendo()"
              [puedeEditar]="sesion.esAdministrador()"
              [activa]="fotoActiva()"
              (activaChange)="eligeFoto($event)"
              (interactua)="pase.cancela()"
              (borraImagen)="admin.borraImagen($event, () => quitaFotos([$event]))"
              (borraSeleccion)="admin.borraSeleccion($event.imagenes, $event.video ? producto.id : null, quitaFotos, quitaVideo)"
              (borraVideo)="admin.borraVideo(producto.id, quitaVideo)"
              (reordena)="admin.reordena(producto.id, $event, () => reordenaFotos($event))"
            />
          </div>

          @if (sesion.esAdministrador()) {
            @defer (on idle) {
              <nx-fotos-de-variante [ficha]="producto" />
            }
          }
        </div>

        <nx-panel-de-compra
          [ficha]="producto"
          [trabajando]="anadiendo()"
          [anadido]="anadido()"
          [aviso]="textoDelImpedimento()"
          (anade)="anade()"
          (compraAhora)="compraAhora()"
          (marcaFavorito)="marcaFavorito(producto.id)"
          (eligeColor)="eligeColor($event)"
          (cambia)="cambiaTalla($event)"
          (borraVariante)="admin.borraVariante($event, refrescaEnSilencio)"
          (filtraPorGrupo)="filtraPorGrupo()"
          (recarga)="recarga()"
          (actualizada)="aplica($event)"
          (borrada)="alCatalogo()"
        />
      </section>

      <nx-tarjeta-vendedor />
      <nx-pestanas-ficha />
      <nx-secciones-ficha [ficha]="producto" />
    } @else {
      <div class="card max-w-xl mx-auto">
        <div class="card-body items-center text-center">
          <fa-icon [icon]="iconos.error" class="text-3xl text-warning" />
          <h2 class="card-title mt-2">{{ t(claveDelError()) }}</h2>
          <p class="text-sm opacity-70">
            <code class="font-mono text-[12px]">{{ slug() }}</code>
          </p>
          <button type="button" (click)="vuelve()" class="btn btn-outline btn-sm mt-2">
            {{ t('common.back') }}
          </button>
        </div>
      </div>
    }
  `,
})
export class FichaPage {
  /** Llega de la ruta como entrada, sin tener que inyectar el enrutador ni suscribirse a nada. */
  readonly slug = input.required<string>();

  private readonly abre = inject(AbreLaFicha);
  private readonly miga = inject(MigaDeCategoria);
  private readonly anadeALaCesta = inject(AnadeALaCesta);
  private readonly alterna = inject(AlternaFavorito);
  private readonly avisos = inject(AvisosStore);
  private readonly dialogo = inject(DialogoStore);
  private readonly enrutador = inject(Router);
  private readonly preferencias = inject(PreferenciasService);
  private readonly traduccion = inject(TraduccionService);
  private readonly etiquetas = inject(EtiquetasService);

  protected readonly seleccion = inject(SeleccionDeLaFicha);
  protected readonly pase = inject(PaseDeGaleria);
  protected readonly admin = inject(AccionesDeAdmin);
  protected readonly sesion = inject(SesionActual);
  protected readonly t = this.traduccion.t;

  protected readonly iconos = { atras: faArrowLeft, error: faCircleExclamation };
  protected readonly huecos = [0, 1, 2, 3, 4, 5];

  protected readonly fotoActiva = signal(0);
  protected readonly anadiendo = signal(false);
  protected readonly anadido = signal(false);
  protected readonly arrastrandoFoto = signal(false);
  private readonly noEncontrada = signal(false);

  private readonly datos = resource({
    // La MONEDA entra en la lectura igual que el idioma: los importes de la ficha —el destacado, el de
    // cada variante y los tramos por cantidad— los calcula el backend, así que cambiar de país obliga a
    // volver a pedirla. Sin la moneda aquí, la ficha seguía con los precios de la divisa anterior.
    params: () => ({
      slug: this.slug(),
      idioma: this.preferencias.idioma(),
      moneda: this.preferencias.moneda(),
    }),
    loader: async ({ params }) => {
      const resultado = await this.abre.ejecuta(params.slug);
      this.noEncontrada.set(!resultado.ok && resultado.error.tipo === 'no-encontrado');
      return resultado.ok ? resultado.valor : null;
    },
  });

  /**
   * La ficha que se PINTA, que no es exactamente la que llegó del servidor.
   *
   * <p>Es un `linkedSignal` y no un `computed` para poder retocarla en el sitio. Cada gesto de
   * administración —borrar una foto, cambiar un importe en yuanes— terminaba llamando a `reload()`, o
   * sea volviendo a pedir la ficha ENTERA: se repintaban la galería, las variantes, las reseñas y el
   * desglose, se perdía la foto que estabas mirando y la página daba un salto. Para cambiar un número.
   *
   * <p>Ahora el resultado del gesto se aplica AQUÍ y solo se repinta lo que cambió. Sigue siendo un
   * `linkedSignal` sobre el recurso, así que cambiar de producto, de idioma o de moneda lo reemplaza
   * entero, que es lo que debe pasar: lo local es un retoque entre lecturas, no una copia paralela.
   */
  protected readonly ficha = linkedSignal(() => this.datos.value() ?? null);

  /**
   * Aplica lo que devuelve un gesto de administración sin volver a pedir nada.
   *
   * <p>El backend contesta a estas ediciones con la ficha ya recalculada —el `PUT` de retoque rápido
   * devuelve `ProductDetailView`—, así que hay con qué pintar: lo que faltaba era usarlo en vez de
   * tirarlo. Si no viene nada, se recarga como antes: es el camino seguro para el gesto que aún no
   * sepa devolver su resultado.
   */
  /**
   * Quita fotos de la ficha SIN volver a pedirla.
   *
   * <p>Borrar una imagen terminaba en `reload()`: se repintaba la ficha entera —galería, variantes,
   * reseñas, desglose— y la vista saltaba al principio, para quitar una miniatura. Como el borrado no
   * cambia nada más del producto, basta con sacarla de la lista que ya se tiene.
   *
   * <p>Recibe las que SE BORRARON de verdad, no las que se pidió borrar: si alguna falla, esa se queda
   * donde está y la pantalla sigue diciendo la verdad.
   */
  protected readonly quitaFotos = (borradas: readonly string[]): void => {
    if (borradas.length === 0) {
      return;
    }
    const fuera = new Set(borradas);
    this.ficha.update((actual) =>
      actual ? { ...actual, imagenes: actual.imagenes.filter((i) => !fuera.has(i.id)) } : actual,
    );
  };

  /**
   * Quita el vídeo de la ficha SIN volver a pedirla.
   *
   * <p>Mismo caso que borrar una foto: el gesto no cambia nada más del producto, así que recargar la
   * ficha entera para hacer desaparecer un recuadro repintaba galería, variantes, reseñas y desglose,
   * y devolvía la vista al principio.
   */
  protected readonly quitaVideo = (): void => {
    this.ficha.update((actual) => (actual ? { ...actual, urlDeVideo: undefined } : actual));
  };

  /**
   * Aplica el nuevo orden de la galería SIN volver a pedir la ficha.
   *
   * <p>Arrastrar una miniatura y ver saltar la página entera es lo contrario de lo que se espera de
   * un gesto de arrastre: el resultado tiene que quedarse donde lo has soltado. Reordenar además deja
   * la PRIMERA como imagen principal, y con la recarga esa consecuencia se veía después del salto.
   *
   * <p>Se reordena con los identificadores que el servidor aceptó.
   */
  protected readonly reordenaFotos = (idsEnOrden: readonly string[]): void => {
    this.ficha.update((actual) =>
      actual ? { ...actual, imagenes: enEsteOrden(actual.imagenes, idsEnOrden) } : actual,
    );
  };

  protected readonly aplica = (actualizada: FichaDeProducto | null): void => {
    if (actualizada) {
      this.ficha.set(actualizada);
    } else {
      this.datos.reload();
    }
  };
  protected readonly cargando = computed(() => this.datos.isLoading());
  protected readonly claveDelError = computed(() =>
    this.noEncontrada() ? 'product.not_found' : 'product.load_error',
  );
  protected readonly galeria = computed(() => galeriaVisible(this.ficha()?.imagenes ?? []));
  /**
   * La cadena de categorías del producto. Se pide aparte porque el detalle solo trae el identificador.
   *
   * <p>Es un `resource` y no una llamada suelta para que se cancele sola al cambiar de producto: sin
   * eso, abrir tres fichas seguidas dejaba tres peticiones en vuelo y ganaba la que respondiera la
   * última, que no tiene por qué ser la de la ficha que se está mirando.
   */
  private readonly cadenaDeCategoria = resource({
    params: () => ({ id: this.ficha()?.categoriaId, idioma: this.preferencias.idioma() }),
    loader: async ({ params }) => {
      if (!params.id) {
        return [];
      }
      const resultado = await this.miga.ejecuta(params.id, params.idioma);
      // Si falla, la miga se queda en «Inicio › Catálogo». Enseñar un error aquí sería desproporcionado:
      // es una ayuda para situarse, no contenido del producto.
      return resultado.ok ? resultado.valor : [];
    },
  });

  /**
   * La miga de pan: dónde está el producto, NO cómo se llama.
   *
   * <p>El último escalón era el título del producto, que ya está dos líneas más abajo en grande y en
   * este catálogo ocupa tres renglones. Repetirlo gastaba la única línea capaz de decir de qué
   * categoría viene, que es justo lo que hace falta para volver a una lista de productos parecidos.
   *
   * <p>Cada escalón LLEVA ENLACE, incluida la hoja: la gracia de saber la categoría es poder ir a ella.
   */
  protected readonly migas = computed(() => [
    { etiqueta: this.t('breadcrumb.catalog'), destino: '/catalog' },
    ...(this.cadenaDeCategoria.value() ?? []).map((categoria) => ({
      etiqueta: categoria.nombre,
      destino: '/catalog',
      parametros: { categoryId: categoria.id },
    })),
  ]);
  protected readonly textoDelImpedimento = computed(() =>
    this.mensajeDe(this.seleccion.impedimento()),
  );

  /** Se pasa por referencia a los gestos de administración, que recargan la ficha al terminar. */
  protected readonly recarga = (): void => {
    this.datos.reload();
  };

  /**
   * Vuelve a pedir la ficha y la aplica SIN pasar por el estado de carga.
   *
   * <p>Para los gestos que cambian varias partes a la vez —borrar un color se lleva por delante sus
   * variantes, sus fotos y puede mover el precio— y que no devuelven la ficha ya recalculada. Rehacer
   * a mano todo eso en el navegador sería mantener una segunda copia de las reglas del backend.
   *
   * <p>La diferencia con `recarga()` es la que se ve: `reload()` deja el recurso en «cargando», la
   * pantalla se vacía y vuelve a montarse desde arriba, con su salto. Aquí se pide lo mismo y se
   * cambia solo el dato, así que se repinta lo que cambió y la vista se queda donde estaba.
   *
   * <p>Si la lectura falla no se toca nada: es mejor una ficha un instante desactualizada que una
   * pantalla en blanco por un fallo de red al refrescar.
   */
  protected readonly refrescaEnSilencio = async (): Promise<void> => {
    const resultado = await this.abre.ejecuta(this.slug());
    if (resultado.ok && resultado.valor) {
      this.ficha.set(resultado.valor);
    }
  };

  constructor() {
    void inject(RECUPERADOR_DE_SESION)
      .asegura()
      .then(() => this.alterna.carga());

    effect(() => {
      const ficha = this.ficha();
      untracked(() => this.estrena(ficha));
    });
  }

  protected eligeFoto(indice: number): void {
    this.pase.cancela();
    this.seleccion.olvidaLaFotoDelColor();
    this.fotoActiva.set(indice);
  }

  /**
   * Al elegir un color la foto grande pasa a la suya. Si ya está entre las miniaturas se salta a ella;
   * si no, se enseña como principal SIN meterla en la tira: la galería es del producto, y una foto de
   * variante en medio confunde sobre lo que se está comprando.
   */
  protected eligeColor(elegido: ColorElegido): void {
    this.pase.cancela();
    this.seleccion.eligeColor(elegido.etiqueta);
    if (!elegido.foto) {
      return;
    }
    const posicion = posicionEnLaGaleria(this.galeria(), elegido.foto);
    if (posicion >= 0) {
      this.fotoActiva.set(posicion);
      this.seleccion.olvidaLaFotoDelColor();
    } else {
      this.seleccion.fijaFotoDelColor(elegido.foto);
    }
  }

  protected cambiaTalla(cambio: CambioDeTalla): void {
    this.seleccion.fijaUnidadesDeTalla(cambio.talla, cambio.cantidad);
  }

  protected async anade(): Promise<boolean> {
    const ficha = this.ficha();
    const impedimento = this.seleccion.impedimento();
    if (impedimento) {
      // NO se lanza aviso flotante: lo que falta ya está escrito bajo los botones, en el sitio donde
      // se mira antes de pulsar y sin que haya que pulsar para enterarse. Salían los dos a la vez —el
      // texto y el aviso rojo en la esquina— diciendo exactamente lo mismo, y dos mensajes idénticos
      // no informan el doble: hacen dudar de si son dos problemas distintos.
      return false;
    }
    if (!ficha) {
      // Esto sí es un fallo de verdad y no una condición que quien compra pueda arreglar: la ficha no
      // está cargada. Sin aviso quedaría un botón que no hace nada.
      this.avisos.error(this.mensajeDe(impedimento));
      return false;
    }
    this.anadiendo.set(true);
    try {
      const unidades = await this.mete(ficha);
      // Se confirma lo que la cesta se ha QUEDADO, no lo que se pidió. Llegó a verse «Añadido 1× … al
      // carrito» junto a un panel que decía que estaba vacío: confirmar una compra que no existe es
      // peor que no confirmarla, porque quien se lo cree se va sin comprar.
      if (unidades === 0) {
        this.avisos.error(this.t('cart.add_failed'));
        return false;
      }
      this.avisos.exito(
        this.traduccion.tCon('cart.added', { qty: String(unidades), title: ficha.titulo }),
      );
      this.seleccion.limpiaCantidades();
      this.anadido.set(true);
      setTimeout(() => this.anadido.set(false), CONFIRMACION_MS);
      return true;
    } finally {
      this.anadiendo.set(false);
    }
  }

  /**
   * «Comprar ahora»: con sesión, directo al pago. SIN sesión NO se fuerza el acceso aquí —desconcierta
   * a quien solo está llenando la cesta—: se lleva al carrito, y el acceso aparecerá al pagar.
   */
  protected async compraAhora(): Promise<void> {
    if (await this.anade()) {
      void this.enrutador.navigate([this.sesion.haySesion() ? '/checkout' : '/cart']);
    }
  }

  protected async marcaFavorito(idDelProducto: string): Promise<void> {
    const resultado = await this.alterna.ejecuta(idDelProducto);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
    }
  }

  protected filtraPorGrupo(): void {
    void this.enrutador.navigate(['/catalog'], {
      queryParams: { grupo: this.ficha()?.arancel.grupo },
    });
  }

  protected vuelve(): void {
    if (typeof history !== 'undefined' && history.length > 1) {
      history.back();
      return;
    }
    void this.enrutador.navigate(['/']);
  }

  protected alCatalogo(): void {
    void this.enrutador.navigate(['/catalog']);
  }

  protected admiteFoto(evento: DragEvent): void {
    if (!this.sesion.esAdministrador()) {
      return;
    }
    evento.preventDefault();
    this.arrastrandoFoto.set(true);
  }

  protected sueltaFoto(evento: DragEvent, ficha: FichaDeProducto): void {
    this.arrastrandoFoto.set(false);
    const direccion = evento.dataTransfer?.getData('text/uri-list');
    if (!this.sesion.esAdministrador() || !direccion) {
      return;
    }
    evento.preventDefault();
    void this.admin.copiaFotoDeVariante(ficha.id, direccion, this.refrescaEnSilencio);
  }

  /** Mete en la cesta lo elegido y devuelve cuántas unidades ACEPTÓ de verdad. */
  private async mete(ficha: FichaDeProducto): Promise<number> {
    let unidades = 0;
    for (const linea of this.seleccion.lineasAAnadir()) {
      const resultado = await this.anadeALaCesta.conVariante(ficha, linea.variante, linea.cantidad);
      if (resultado.ok) {
        unidades += linea.cantidad;
      } else if (esMotivoDeRechazo(resultado.error)) {
        this.avisos.error(this.t('product.variant_out_of_stock'));
      }
    }
    return unidades;
  }

  /** Todo lo que hay que rehacer cuando llega otra ficha (o la misma, recargada). */
  private estrena(ficha: FichaDeProducto | null): void {
    this.seleccion.empieza(ficha);
    this.fotoActiva.set(0);
    if (!ficha) {
      return;
    }
    this.escribeLasEtiquetas(ficha);
    // Cada ficha estrena su pase: enseña las primeras fotos sin que nadie tenga que pulsar nada.
    this.pase.arranca(this.galeria().length, (indice) => this.fotoActiva.set(indice));
    this.avisaDelPedidoMinimo(ficha);
  }

  private mensajeDe(impedimento: string | null): string {
    switch (impedimento) {
      case 'falta-elegir-variante':
        return this.t('product.select_variant');
      case 'variante-sin-existencias':
        return this.t('product.variant_out_of_stock');
      case 'falta-elegir-talla':
        return this.t('product.pick_size');
      case 'pedido-minimo':
        return this.traduccion.tCon('product.moq_remaining', {
          moq: String(this.ficha()?.moq ?? 1),
          left: String(this.seleccion.unidadesQueFaltan()),
        });
      default:
        return '';
    }
  }

  /**
   * Título, descripción y etiquetas de compartir de ESTA ficha. Es lo que hace que compartir un
   * producto por mensajería enseñe el producto y no la portada genérica.
   *
   * <p>Pasa por `EtiquetasService` y no escribe `Title`/`Meta` a mano, que es como estaba. No es
   * ordenar por ordenar: escribiéndolas aquí faltaban la dirección canónica, el `og:url` y las
   * etiquetas de Twitter —sin `twitter:card` la vista previa sale como tarjeta pequeña aunque haya
   * foto—, y sobre todo faltaba el DOMINIO. Una `og:image` relativa no le sirve de nada a un robot que
   * lee la página desde fuera, y al generar el HTML no hay navegador del que deducir el dominio: solo
   * lo sabe la configuración del entorno, que es justo lo que el servicio tiene inyectado.
   *
   * <p>Y lo que se escribe aquí IMPORTA aunque la pasarela vuelva a escribirlo: `seo-ficha.js` solo
   * cubre lo que pasa por ella. El HTML prerenderizado se abre también desde el propio sitio al
   * navegar, y ahí no hay pasarela que valga.
   */
  private escribeLasEtiquetas(ficha: FichaDeProducto): void {
    this.etiquetas.aplica({
      titulo: ficha.titulo,
      descripcion: ficha.descripcion ?? '',
      imagen: fotoParaCompartir(ficha.imagenes),
      ruta: `/catalog/${ficha.slug}`,
      tipo: 'product',
    });
  }

  /**
   * El pedido mínimo se avisa AL ABRIR, una sola vez por producto: descubrirlo al intentar comprar,
   * con las tallas ya elegidas, obliga a rehacer la selección entera.
   */
  private avisaDelPedidoMinimo(ficha: FichaDeProducto): void {
    if (ficha.moq > 1) {
      void this.dialogo.alerta(
        this.traduccion.tCon('product.moq_notice_body', { moq: String(ficha.moq) }),
        this.t('product.moq_notice_title'),
        'info',
      );
    }
  }
}
