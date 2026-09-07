import { DOCUMENT, Service, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { APP_CONFIG } from '../config/app-config';

/**
 * Las etiquetas que leen los buscadores y las aplicaciones de mensajería al compartir un enlace.
 *
 * <p>Es la razón por la que estas páginas se prerenderizan. Sin ellas, quien manda la ficha de un
 * producto por WhatsApp o por LinkedIn ve el título genérico del sitio y ninguna foto — y ese fue
 * exactamente el motivo por el que se montó el renderizado en servidor en el front anterior.
 *
 * <p>Las direcciones tienen que ser ABSOLUTAS: una ruta relativa no le sirve de nada a quien lee la
 * página desde fuera. Por eso salen de la configuración del entorno, que es lo único que sabe en qué
 * dominio vive esta compilación — al generar el HTML no hay navegador del que deducirlo.
 */
export interface EtiquetasDePagina {
  readonly titulo: string;
  readonly descripcion: string;
  /** Ruta de la imagen, absoluta o relativa a la raíz del sitio. */
  readonly imagen?: string;
  /** Ruta de la propia página, sin dominio. Con ella se arma la canónica. */
  readonly ruta?: string;
  readonly tipo?: 'website' | 'product' | 'article';
}

@Service()
export class EtiquetasService {
  private readonly meta = inject(Meta);
  private readonly titulo = inject(Title);
  private readonly config = inject(APP_CONFIG);
  private readonly documento = inject(DOCUMENT);

  private static readonly SITIO = 'NX036';

  aplica(etiquetas: EtiquetasDePagina): void {
    const titulo = `${etiquetas.titulo} — ${EtiquetasService.SITIO}`;
    const url = this.absoluta(etiquetas.ruta ?? '/');
    const imagen = etiquetas.imagen ? this.absoluta(etiquetas.imagen) : undefined;

    this.titulo.setTitle(titulo);
    this.canonica(url);

    // `updateTag` reemplaza si ya existe, en lugar de acumular. Importa al navegar entre fichas: sin
    // eso, la página acabaría con una etiqueta por producto visitado y quien la lee se queda con la
    // primera.
    this.meta.updateTag({ name: 'description', content: etiquetas.descripcion });
    this.meta.updateTag({ property: 'og:title', content: titulo });
    this.meta.updateTag({ property: 'og:description', content: etiquetas.descripcion });
    this.meta.updateTag({ property: 'og:type', content: etiquetas.tipo ?? 'website' });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:site_name', content: EtiquetasService.SITIO });
    this.meta.updateTag({ name: 'twitter:card', content: imagen ? 'summary_large_image' : 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: titulo });
    this.meta.updateTag({ name: 'twitter:description', content: etiquetas.descripcion });

    if (imagen) {
      this.meta.updateTag({ property: 'og:image', content: imagen });
      this.meta.updateTag({ name: 'twitter:image', content: imagen });
    } else {
      // Sin foto es mejor no dejar la de la página anterior: se comparte un enlace con la imagen de
      // otro producto, que es peor que no llevar ninguna.
      this.meta.removeTag('property="og:image"');
      this.meta.removeTag('name="twitter:image"');
    }
  }

  /**
   * La dirección canónica de esta página.
   *
   * <p>No la pone `Meta`, que solo sabe de `<meta>`: es un `<link rel="canonical">`, así que se maneja
   * el elemento a mano. Se REUTILIZA el que ya haya en vez de añadir otro, por la misma razón que el
   * título: al navegar de una ficha a otra, añadir dejaría el documento con una canónica por producto
   * visitado y quien la lee se queda con la primera, que apunta al producto equivocado.
   *
   * <p>Si el entorno no declara su dominio, la dirección saldría relativa y una canónica relativa no
   * le sirve de nada a quien lee la página desde fuera: en ese caso es mejor no escribir ninguna que
   * escribir una que miente.
   */
  private canonica(url: string): void {
    const existente = this.documento.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!/^https?:\/\//i.test(url)) {
      existente?.remove();
      return;
    }
    if (existente) {
      existente.href = url;
      return;
    }
    const enlace = this.documento.createElement('link');
    enlace.rel = 'canonical';
    enlace.href = url;
    this.documento.head.appendChild(enlace);
  }

  private absoluta(ruta: string): string {
    if (/^https?:\/\//i.test(ruta)) {
      return ruta;
    }
    const base = (this.config.urlPublica ?? '').replace(/\/+$/, '');
    return `${base}${ruta.startsWith('/') ? '' : '/'}${ruta}`;
  }
}
