import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { APARTADOS_DE_CATALOGO } from '../../domain/model/referencia-catalogo';
import { DesarrolladoresPage } from './desarrolladores.page';
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



/**
 * El idioma activo se fija a español ANTES de montar nada.
 *
 * <p>El servicio de preferencias lo deduce de la cookie y, si no la hay, del idioma del navegador. En
 * el entorno de pruebas ese idioma es el inglés, así que sin fijarlo las comprobaciones dependerían de
 * la máquina donde se ejecutan: la misma prueba pasaría aquí y fallaría en otro equipo.
 */
/**
 * Escribir SIN retardo entre teclas.
 *
 * <p>El valor por defecto simula a alguien tecleando, y un formulario de tres campos se come el plazo
 * de la prueba. Aquí no se está midiendo la mecanografía de nadie.
 */
const SIN_RETARDO = { delay: null };

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

describe('DesarrolladoresPage', () => {
  it('pinta cada apartado de la referencia con su ancla', async () => {
    // Las anclas son la navegación de esta página: el índice y los enlaces del pie apuntan a ellas.
    const { container } = await render(DesarrolladoresPage, SIN_DIFERIR);

    // La mitad larga de la referencia va en un `@defer (on idle; hydrate on viewport)` y llega un
    // instante DESPUÉS del montaje. Se espera al ÚLTIMO apartado del bloque —«support»— para tener la
    // certeza de que ya está entero antes de recorrer las anclas.
    await waitFor(() => expect(container.querySelector('#support')).not.toBeNull());

    for (const apartado of APARTADOS_DE_CATALOGO) {
      expect(container.querySelector(`#${apartado.id}`)).not.toBeNull();
    }
    expect(container.querySelector('#quickstart')).not.toBeNull();
    expect(container.querySelector('#webhooks')).not.toBeNull();
  }, 40000);

  it('documenta cada endpoint del catálogo una sola vez', async () => {
    const { container } = await render(DesarrolladoresPage, SIN_DIFERIR);

    // Contar antes de que el bloque diferido termine mediría media página: se espera al último
    // apartado, y solo entonces se cuenta cuántas veces está documentada la dirección.
    await waitFor(() => expect(container.querySelector('#support')).not.toBeNull());

    const rutas = [...container.querySelectorAll('code')].map((c) => c.textContent);
    expect(rutas).toContain('/api/catalog/products');
    expect(rutas.filter((r) => r === '/api/catalog/products')).toHaveLength(1);
  }, 40000);

  it('el aviso de integraciones se puede cerrar', async () => {
    await render(DesarrolladoresPage, SIN_DIFERIR);

    const aviso = await screen.findByRole('dialog');
    await userEvent.click(within(aviso).getByRole('button', { name: t('dev.notice.cta') }));

    expect(screen.queryByRole('dialog')).toBeNull();
  }, 40000);

  it('el buscador del índice filtra por el texto que se lee, no por la clave', async () => {
    await render(DesarrolladoresPage, SIN_DIFERIR);

    await userEvent.click(screen.getByRole('dialog').querySelector('button')!);
    const buscador = screen.getByLabelText(t('docs.search_placeholder'));

    await userEvent.type(buscador, 'webhooks', SIN_RETARDO);

    const indice = screen.getByRole('navigation', { name: t('docs.toc.heading') });
    expect(within(indice).getByText(t('docs.toc.webhooks'))).toBeInTheDocument();
    expect(within(indice).queryByText(t('docs.toc.checkout'))).toBeNull();
  }, 40000);

  it('los ejemplos de código traen sus pestañas por lenguaje', async () => {
    await render(DesarrolladoresPage, SIN_DIFERIR);

    expect(screen.getAllByRole('tab', { name: 'cURL' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('tab', { name: 'Node.js' }).length).toBeGreaterThan(0);
  }, 40000);
});
