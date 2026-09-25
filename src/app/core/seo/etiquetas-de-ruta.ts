import { Injector, Service, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { EtiquetasService } from './etiquetas.service';

/**
 * Lo que una ruta declara sobre sí misma para los buscadores.
 *
 * <p>Son CLAVES de traducción, no textos: la misma página tiene que describirse en los ocho idiomas, y
 * escribir el texto en la ruta lo dejaría en español para todo el mundo.
 */
export interface SeoDeRuta {
  readonly titulo: string;
  readonly descripcion: string;
}

/**
 * Pone título y descripción a las páginas que no se los ponen ellas mismas.
 *
 * <p><b>Por qué existe.</b> Hasta el 25-sep-2026 solo tres pantallas escribían sus etiquetas —la
 * portada, la ficha de producto y los documentos legales—. Todas las demás se servían con el título de
 * relleno del `index.html`, `.:: NX036 ::.`, y sin una sola línea de descripción: eso es lo que veía
 * Google en «Sobre nosotros», en «Contacto» y en el catálogo, y lo que aparecía al pegar el enlace en
 * WhatsApp. Un sitio entero anunciándose con un marcador de posición.
 *
 * <p>Se resuelve en la ruta y no página a página a propósito: así una pantalla nueva solo tiene que
 * declarar dos claves en su ruta para quedar bien descrita, y olvidarse de hacerlo se ve en un sitio
 * —el fichero de rutas— en lugar de no verse en ninguno.
 *
 * <p><b>Es opcional y no pisa a nadie.</b> Solo actúa si la ruta activa trae `data.seo`; las tres
 * pantallas que ya calculan sus etiquetas con datos del servidor —el título de la ficha es el del
 * producto— no lo declaran y siguen mandando ellas.
 */
@Service()
export class EtiquetasDeRuta {
  private readonly router = inject(Router);
  private readonly raiz = inject(ActivatedRoute);
  private readonly etiquetas = inject(EtiquetasService);
  private readonly traduccion = inject(TraduccionService);
  private readonly injector = inject(Injector);

  /** Lo declarado por la ruta activa. Nulo mientras no haya ninguna que lo declare. */
  private readonly actual = signal<{ seo: SeoDeRuta; ruta: string } | null>(null);

  /**
   * Empieza a vigilar la navegación. Lo llama el armazón una sola vez, al arrancar.
   *
   * <p>Es un método y no el constructor a propósito: un servicio que se engancha al router por el
   * mero hecho de existir obliga a inyectarlo sin usarlo, y una dependencia que no se lee la borra
   * cualquiera —o el compilador— sin ver que con ella se va el título de media web.
   */
  vigila(): void {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      const seo = this.declaradoPorLaRutaActiva();
      this.actual.set(seo ? { seo, ruta: (e as NavigationEnd).urlAfterRedirects } : null);
    });

    // En un EFECTO y no al navegar: el texto depende del idioma, y quien cambia de idioma sin cambiar
    // de página se quedaba con el título del anterior. Leer `t` aquí es lo que engancha la dependencia.
    //
    // Con el inyector explícito: `vigila()` se llama desde el constructor del armazón y hoy hereda su
    // contexto de inyección, pero es una herencia implícita que se pierde en cuanto alguien lo llame
    // desde otro sitio o tras un `await`, y entonces `effect` revienta en tiempo de ejecución.
    effect(() => {
      const actual = this.actual();
      if (!actual) {
        return;
      }
      const t = this.traduccion.t;
      this.etiquetas.aplica({
        titulo: t(actual.seo.titulo),
        descripcion: t(actual.seo.descripcion),
        ruta: actual.ruta,
        tipo: 'website',
      });
    }, { injector: this.injector });
  }

  /**
   * El `seo` de la hoja del árbol de rutas activo.
   *
   * <p>Se baja hasta la última hija porque las páginas cuelgan de rutas con layout: lo declarado está
   * en la hoja, y quedarse en la raíz devolvería siempre nada. Si una hoja no lo declara, se hereda lo
   * del padre más cercano que sí lo haga, que es lo que permite describir de una vez un grupo entero.
   */
  private declaradoPorLaRutaActiva(): SeoDeRuta | undefined {
    let nodo: ActivatedRoute | null = this.raiz;
    let encontrado: SeoDeRuta | undefined;
    while (nodo) {
      const seo = nodo.snapshot.data['seo'] as SeoDeRuta | undefined;
      if (seo) {
        encontrado = seo;
      }
      nodo = nodo.firstChild;
    }
    return encontrado;
  }
}
