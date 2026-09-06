import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TestBed } from '@angular/core/testing';
import { NoEncontradaPage } from './no-encontrada.page';
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
 * El texto de una clave como expresión, para cuando el elemento lleva algo más alrededor.
 *
 * <p>Se ESCAPA antes: hay textos con paréntesis, puntos suspensivos o interrogaciones, y esos
 * caracteres significan otra cosa dentro de una expresión regular. Sin escaparlos, la prueba pasaría
 * o fallaría por motivos que no tienen nada que ver con lo que se está comprobando.
 */
const rx = (clave: string): RegExp => new RegExp(t(clave).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

async function monta() {
  return render(NoEncontradaPage, {
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
beforeEach(() => {
  document.cookie = 'nx036-locale=es; Path=/';
});

describe('NoEncontradaPage', () => {
  it('enseña el código y el mensaje de la ruta que no existe', async () => {
    await monta();

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('ofrece TRES salidas, y cada una sirve a alguien distinto', async () => {
    await monta();

    // Volver atrás sirve a quien pinchó un enlace roto dentro del sitio; el inicio a quien llega de
    // fuera; el catálogo a quien buscaba un producto que ya no está, que es de dónde vienen casi
    // todos los 404 de una tienda.
    expect(screen.getByRole('button', { name: rx('errors.back') })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: rx('errors.home') })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: rx('errors.browse_catalog') })).toHaveAttribute(
      'href',
      '/catalog',
    );
  });

  it('el botón de atrás usa el historial del navegador', async () => {
    await monta();
    const atras = vi.spyOn(TestBed.inject(Location), 'back');

    await userEvent.click(screen.getByRole('button', { name: rx('errors.back') }));

    expect(atras).toHaveBeenCalled();
  });

  it('el número grande es decorativo para quien usa lector de pantalla', async () => {
    const { container } = await monta();

    expect(container.querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe('404');
  });
});
