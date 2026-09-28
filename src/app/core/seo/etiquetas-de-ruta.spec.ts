import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { provideLocationMocks } from '@angular/common/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PreferenciasService } from '@core/preferences/preferencias';
import { APP_CONFIG } from '@core/config/app-config';
import { EtiquetasDeRuta } from './etiquetas-de-ruta';

@Component({ template: 'x' })
class Pagina {}

/**
 * El título y la descripción de las páginas que no se los ponen ellas mismas.
 *
 * <p>Qué se rompía antes de esto: de toda la web solo tres pantallas escribían sus etiquetas. Las
 * demás —«Sobre nosotros», «Contacto», precios, acceso, alta— se servían con el título de relleno del
 * `index.html`, `.:: NX036 ::.`, y sin una línea de descripción. Eso es lo que enseñaban Google y
 * WhatsApp de casi todo el sitio, y no había ningún error que lo delatara.
 */
describe('EtiquetasDeRuta', () => {
  function montaCon(rutas: Parameters<typeof provideRouter>[0]): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(rutas),
        provideLocationMocks(),
        { provide: APP_CONFIG, useValue: { urlPublica: 'https://nx036.com' } },
      ],
    });
    TestBed.inject(EtiquetasDeRuta).vigila();
  }

  beforeEach(() => {
    document.title = '.:: NX036 ::.';
    // El documento es el MISMO para todas las pruebas del fichero: un `noindex` dejado por la
    // anterior haría pasar a la siguiente sin que el código lo pusiera.
    document.querySelector('meta[name="robots"]')?.remove();
  });

  it('pone el título y la descripción que declara la ruta', async () => {
    montaCon([
      {
        path: 'about',
        component: Pagina,
        data: { seo: { titulo: 'seo.about.title', descripcion: 'seo.about.desc' } },
      },
    ]);

    await TestBed.inject(Router).navigate(['/about']);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(TestBed.inject(Title).getTitle()).toContain('NX036');
    expect(TestBed.inject(Title).getTitle()).not.toBe('.:: NX036 ::.');
    expect(descripcion()).not.toBe('');
  });

  /**
   * EL control. La portada, la ficha y los legales calculan sus etiquetas con datos del servidor —el
   * título de la ficha es el del producto—, así que no declaran `seo` y tienen que seguir mandando
   * ellas. Si esto pisara, la ficha de un producto se compartiría con un título genérico.
   */
  it('no toca las páginas que no lo declaran', async () => {
    montaCon([{ path: 'ficha', component: Pagina }]);

    await TestBed.inject(Router).navigate(['/ficha']);

    expect(TestBed.inject(Title).getTitle()).toBe('.:: NX036 ::.');
  });

  /** El texto depende del idioma: cambiarlo sin cambiar de página dejaba el título del anterior. */
  it('reescribe las etiquetas al cambiar de idioma', async () => {
    montaCon([
      {
        path: 'about',
        component: Pagina,
        data: { seo: { titulo: 'seo.about.title', descripcion: 'seo.about.desc' } },
      },
    ]);
    await TestBed.inject(Router).navigate(['/about']);
    const enEspanol = TestBed.inject(Title).getTitle();

    TestBed.inject(PreferenciasService).cambiaIdioma('en');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(TestBed.inject(Title).getTitle()).not.toBe('.:: NX036 ::.');
    expect(enEspanol).not.toBe('');
  });

  /**
   * Lo que se descubrió el 28-sep-2026 al cotejar lo que anuncia el sitio con lo que de verdad está
   * abierto: una veintena de direcciones que exigen sesión —el listado, los favoritos, el perfil, la
   * cesta, el panel entero— respondían 200 a cualquiera y, como su HTML lo monta el navegador, lo
   * que un buscador leía en TODAS era el `index.html` de relleno. Es decir: veinte páginas distintas
   * compitiendo entre sí con el título y la descripción de la portada, y ninguna abrible sin cuenta.
   */
  it('deja fuera de los buscadores lo que declara ser privado', async () => {
    montaCon([{ path: 'cart', component: Pagina, data: { privada: true } }]);

    await TestBed.inject(Router).navigate(['/cart']);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(robots()).toBe('noindex, follow');
  });

  /** `follow` y no `nofollow`: la página no se lista, pero lo que cuelga de ella sigue descubierto. */
  it('marca privada también la que sí trae texto propio', async () => {
    montaCon([
      {
        path: 'login',
        component: Pagina,
        data: { seo: { titulo: 'seo.login.title', descripcion: 'seo.login.desc' }, privada: true },
      },
    ]);

    await TestBed.inject(Router).navigate(['/login']);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(robots()).toBe('noindex, follow');
    expect(descripcion()).not.toBe('');
  });

  /**
   * Se declara UNA vez en el padre —`/admin`, y con él los trece atajos de la raíz que redirigen
   * allí— y vale para todo lo que cuelgue. Es lo que evita que una sección nueva del panel nazca
   * indexable porque a alguien se le olvidara repetir la marca.
   */
  it('hereda la marca de privado hacia las hijas', async () => {
    montaCon([
      {
        path: 'admin',
        data: { privada: true },
        children: [{ path: 'usuarios', component: Pagina }],
      },
    ]);

    await TestBed.inject(Router).navigate(['/admin/usuarios']);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(robots()).toBe('noindex, follow');
  });

  /**
   * Y al revés: quien navega de una pantalla cerrada a una pública con la aplicación ya cargada se
   * llevaba el `noindex` puesto. La etiqueta se QUITA, no se reescribe a `index`.
   */
  it('quita la marca al volver a una página pública', async () => {
    montaCon([
      { path: 'cart', component: Pagina, data: { privada: true } },
      {
        path: 'about',
        component: Pagina,
        data: { seo: { titulo: 'seo.about.title', descripcion: 'seo.about.desc' } },
      },
    ]);
    await TestBed.inject(Router).navigate(['/cart']);
    await TestBed.inject(ApplicationRef).whenStable();
    expect(robots()).toBe('noindex, follow');

    await TestBed.inject(Router).navigate(['/about']);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(robots()).toBeNull();
  });

  function robots(): string | null {
    return document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null;
  }

  function descripcion(): string {
    return document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
  }
});
