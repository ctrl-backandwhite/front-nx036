import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { PASOS_DE_CONEXION } from '../../domain/model/contenido-de-conexion';
import { ConectaTuTiendaPage } from './conecta-tu-tienda.page';


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

describe('ConectaTuTiendaPage', () => {
  it('arranca en Shopify con sus cuatro pasos', async () => {
    await render(ConectaTuTiendaPage, SIN_DIFERIR);

    for (const paso of PASOS_DE_CONEXION['shopify']) {
      expect(screen.getByText(paso.titulo)).toBeInTheDocument();
    }
  });

  it('cambiar de pestaña enseña los pasos de la otra plataforma', async () => {
    await render(ConectaTuTiendaPage, SIN_DIFERIR);

    await userEvent.click(screen.getByRole('tab', { name: /WooCommerce/ }));

    expect(screen.getByText(PASOS_DE_CONEXION['woocommerce'][1].titulo)).toBeInTheDocument();
    expect(screen.queryByText(PASOS_DE_CONEXION['shopify'][1].titulo)).toBeNull();
  });

  it('las pestañas dicen cuál está seleccionada', async () => {
    await render(ConectaTuTiendaPage, SIN_DIFERIR);

    expect(screen.getByRole('tab', { name: /Shopify/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /WooCommerce/ })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('enseña las tres notas del pie con sus direcciones de la API', async () => {
    await render(ConectaTuTiendaPage, SIN_DIFERIR);

    // Las notas viven en un `@defer (on idle; hydrate on viewport)`: llegan un instante DESPUÉS del
    // montaje, cuando el navegador queda ocioso. `findByText` espera a que aparezcan; `getByText` mira
    // el DOM tal como está en ese momento y no las encuentra.
    expect(await screen.findByText('Autenticación')).toBeInTheDocument();
    expect(await screen.findByText('Precios en vivo')).toBeInTheDocument();
    expect(await screen.findByText('/api/v1/partner/catalog')).toBeInTheDocument();
  });
});
