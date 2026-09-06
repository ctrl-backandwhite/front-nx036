import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { MarcoEscaparate } from './marco-escaparate';

/**
 * Estas pruebas montan el marco entero —con el selector de treinta regiones dentro— y con la
 * instrumentación de cobertura encima cinco segundos se quedan cortos. El plazo largo evita que
 * caduquen por lentitud y se confunda con un fallo.
 */
const ESPERA_LARGA = 20000;

@Component({ selector: 'nx-vacia', template: '<p>Contenido de la pantalla</p>' })
class Vacia {}

async function marco(entradas: Record<string, unknown> = {}) {
  return render(MarcoEscaparate, {
    providers: [provideRouter([{ path: '**', component: Vacia }])],
    inputs: entradas,
  });
}

describe('MarcoEscaparate', () => {
  it('coloca la pantalla que toque dentro del marco', async () => {
    const vista = await marco();
    await TestBed.inject(Router).navigateByUrl('/catalog');
    vista.fixture.detectChanges();

    expect(screen.getByText('Contenido de la pantalla')).toBeInTheDocument();
  }, ESPERA_LARGA);

  /** El catálogo completo es interno: ofrecerlo sin sesión lleva a una puerta cerrada. */
  it('sin sesión no ofrece el catálogo ni el panel', async () => {
    const { container, fixture } = await marco();
    const t = TestBed.inject(TraduccionService).t;
    // Se busca DENTRO de la barra de arriba: el pie y la barra de pestañas también enlazan al catálogo,
    // y a ellos el marco no les quita el enlace.
    const barra = within(container.querySelector('.navbar-center') as HTMLElement);

    expect(barra.queryByRole('link', { name: new RegExp(t('nav.catalog')) })).toBeNull();
    expect(barra.getByRole('link', { name: new RegExp(t('nav.home')) })).toBeInTheDocument();

    fixture.componentRef.setInput('usuario', { nombre: 'Ana', esPersonal: false });
    fixture.detectChanges();
    expect(barra.getByRole('link', { name: new RegExp(t('nav.catalog')) })).toBeInTheDocument();
  }, ESPERA_LARGA);

  it('solo el personal interno ve el acceso al panel', async () => {
    const { fixture } = await marco({ usuario: { nombre: 'Ana', esPersonal: false } });
    const t = TestBed.inject(TraduccionService).t;
    expect(screen.queryByRole('link', { name: new RegExp(t('nav.admin')) })).toBeNull();

    fixture.componentRef.setInput('usuario', { nombre: 'Ana', esPersonal: true });
    fixture.detectChanges();
    expect(screen.getAllByRole('link', { name: new RegExp(t('nav.admin')) }).length).toBeGreaterThan(0);
  }, ESPERA_LARGA);

  it('avisa de que se quiere abrir la cesta y enseña su contador', async () => {
    const usuario = userEvent.setup({ delay: null });
    let aperturas = 0;
    await render(MarcoEscaparate, {
      providers: [provideRouter([{ path: '**', component: Vacia }])],
      inputs: { lineasCesta: 2 },
      on: { abreCesta: () => aperturas++ },
    });
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: t('nav.cart') }));

    expect(aperturas).toBe(1);
    // El contador se pinta dos veces a propósito: en la barra de arriba y en la de pestañas del móvil,
    // y cada una se enseña en una anchura distinta.
    expect(screen.getAllByText('2')).toHaveLength(2);
  }, ESPERA_LARGA);

  it('cierra la sesión desde el menú de cuenta', async () => {
    const usuario = userEvent.setup({ delay: null });
    let cierres = 0;
    await render(MarcoEscaparate, {
      providers: [provideRouter([{ path: '**', component: Vacia }])],
      inputs: { usuario: { nombre: 'Ana', esPersonal: false } },
      on: { cierraSesion: () => cierres++ },
    });
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('nav.signout')) }));

    expect(cierres).toBe(1);
  }, ESPERA_LARGA);

  /** Dejar el cajón abierto sobre la pantalla nueva es de las cosas que más desorientan en el móvil. */
  it('el cajón del móvil se cierra al navegar', async () => {
    const usuario = userEvent.setup({ delay: null });
    const vista = await marco({ usuario: { nombre: 'Ana', esPersonal: false } });
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: t('nav.menu') }));
    expect(screen.getByText(t('nav.menu'))).toBeInTheDocument();

    await TestBed.inject(Router).navigateByUrl('/orders');
    vista.fixture.detectChanges();

    expect(screen.queryByRole('button', { name: t('common.close') })).toBeNull();
  }, ESPERA_LARGA);

  /** En la portada y en las fichas las migas sobran: la ficha pinta las suyas con el título real. */
  it('no pinta migas en la portada ni en una ficha', async () => {
    const vista = await marco();
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull();

    await TestBed.inject(Router).navigateByUrl('/catalog/3f2504e0-4f89-11d3-9a0c-0305e82c3301');
    vista.fixture.detectChanges();
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull();

    await TestBed.inject(Router).navigateByUrl('/orders');
    vista.fixture.detectChanges();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  }, ESPERA_LARGA);
});
