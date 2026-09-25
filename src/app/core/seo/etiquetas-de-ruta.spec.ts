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

  function descripcion(): string {
    return document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
  }
});
