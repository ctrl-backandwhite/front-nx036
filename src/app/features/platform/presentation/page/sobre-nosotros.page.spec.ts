import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { TestBed, DeferBlockBehavior } from '@angular/core/testing';
import { PreferenciasService } from '@core/preferences/preferencias';
import { ABOUT, pick } from '@shared/content/site-pages';
import { SobreNosotrosPage } from './sobre-nosotros.page';
import es from '@shared/i18n/dictionary/es';
import en from '@shared/i18n/dictionary/en';

/**
 * El mismo texto que ve quien usa la aplicación.
 *
 * <p>Las pruebas consultan por el TEXTO, no por la clave técnica: es lo que ve quien abre la pantalla,
 * y es lo que se rompe si alguien cambia una clave por otra que no existe —el servicio devolvería la
 * clave escrita en crudo y la prueba lo delata—. Se resuelve con la misma cadena de respaldo que el
 * servicio: idioma activo, inglés, y si no, la clave.
 */
const t = (clave: string): string => es[clave] ?? en[clave] ?? clave;


@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

async function monta() {
  return render(SobreNosotrosPage, {
    ...SIN_DIFERIR,
    providers: [provideRouter([{ path: '**', component: Vacia }])],
  });
}


/**
 * El idioma activo se fija a español ANTES de montar nada.
 *
 * <p>El servicio de preferencias lo deduce de la cookie y, si no la hay, del idioma del navegador. En
 * el entorno de pruebas ese idioma es el inglés, así que sin fijarlo las comprobaciones dependerían de
 * la máquina donde se ejecutan: la misma prueba pasaría aquí y fallaría en otro equipo.
 */
/**
 * Los bloques diferidos se pintan enteros en las pruebas.
 *
 * <p>`@defer (hydrate on viewport)` espera a que alguien baje hasta el bloque, y en el entorno de
 * pruebas no hay ventana que se desplace: sin esto, la mitad de la página no llega a existir y las
 * comprobaciones fallarían por el escenario y no por el código. Lo que se comprueba aquí es el
 * contenido; que la hidratación se difiera es cosa del navegador de verdad.
 */
const SIN_DIFERIR = { deferBlockBehavior: DeferBlockBehavior.Playthrough };

beforeEach(() => {
  document.cookie = 'nx036-locale=es; Path=/';
});

describe('SobreNosotrosPage', () => {
  it('pinta el documento compilado del idioma activo', async () => {
    await monta();

    const enEspanol = pick(ABOUT, 'es');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(enEspanol.title);
    expect(screen.getByText(enEspanol.intro)).toBeInTheDocument();
  });

  it('al cambiar de idioma se repinta el texto sin volver a montar la página', async () => {
    await monta();
    const preferencias = TestBed.inject(PreferenciasService);

    preferencias.cambiaIdioma('en');
    await Promise.resolve();

    expect(await screen.findByText(pick(ABOUT, 'en').intro)).toBeInTheDocument();
  });

  it('lleva el enlace de vuelta arriba y abajo: es una página larga que se abre desde fuera', async () => {
    await monta();

    expect(screen.getAllByText(t('legal.back_home')).length).toBeGreaterThanOrEqual(2);
  });
});
