import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { MarcoAdmin } from './marco-admin';
import { SECCIONES_ADMIN, seccionesPara } from './navegacion-admin';

/**
 * Estas pruebas montan el marco entero —con el selector de treinta regiones dentro— y con la
 * instrumentación de cobertura encima cinco segundos se quedan cortos. El plazo largo evita que
 * caduquen por lentitud y se confunda con un fallo.
 */
const ESPERA_LARGA = 20000;

@Component({ selector: 'nx-vacia', template: '<p>Pantalla del panel</p>' })
class Vacia {}

const ADMINISTRADORA = { nombre: 'Ana', correo: 'ana@nx036.test', papel: 'ADMIN' as const };
const SOPORTE = { nombre: 'Leo', correo: 'leo@nx036.test', papel: 'OPERATOR' as const };

async function panel(entradas: Record<string, unknown> = {}) {
  return render(MarcoAdmin, {
    providers: [provideRouter([{ path: '**', component: Vacia }])],
    inputs: entradas,
  });
}

describe('seccionesPara', () => {
  /** Enseñarle a quien da soporte lo que el backend le va a cerrar es ofrecerle puertas que rebotan. */
  it('quien da soporte solo ve lo suyo', () => {
    const destinos = seccionesPara('OPERATOR').flatMap((s) => s.opciones.map((o) => o.destino));

    expect(destinos).toEqual([
      '/admin/orders',
      '/admin/operator/earnings',
      '/admin/profile',
    ]);
  });

  it('la administración lo ve todo menos lo exclusivo de clientes', () => {
    const opciones = seccionesPara('ADMIN').flatMap((s) => s.opciones);

    expect(opciones.some((o) => o.destino === '/admin/users')).toBe(true);
    expect(opciones.some((o) => o.destino === '/admin/affiliate')).toBe(false);
  });

  /** Un título de sección sobre el vacío queda peor que no pintar la sección. */
  it('no deja secciones sin ninguna opción visible', () => {
    for (const seccion of seccionesPara('OPERATOR')) {
      expect(seccion.opciones.length).toBeGreaterThan(0);
    }
  });

  it('cada destino aparece una sola vez en todo el mapa', () => {
    const destinos = SECCIONES_ADMIN.flatMap((s) => s.opciones.map((o) => o.destino));

    expect(new Set(destinos).size).toBe(destinos.length);
  });
});

describe('MarcoAdmin', () => {
  it('coloca la pantalla que toque dentro del marco', async () => {
    const vista = await panel({ usuario: ADMINISTRADORA });
    await TestBed.inject(Router).navigateByUrl('/admin/orders');
    vista.fixture.detectChanges();

    expect(screen.getByText('Pantalla del panel')).toBeInTheDocument();
  }, ESPERA_LARGA);

  it('la barra lateral enseña solo las opciones del papel', async () => {
    const { container } = await panel({ usuario: SOPORTE });
    const t = TestBed.inject(TraduccionService).t;
    const lateral = within(container.querySelector('aside') as HTMLElement);

    expect(lateral.getByRole('link', { name: new RegExp(t('admin.nav.orders')) })).toBeInTheDocument();
    expect(lateral.queryByRole('link', { name: new RegExp(t('admin.nav.users')) })).toBeNull();
  }, ESPERA_LARGA);

  it('identifica a quien mira con su papel y sus iniciales', async () => {
    await panel({ usuario: ADMINISTRADORA });

    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByText('AN')).toBeInTheDocument();
    expect(screen.getByText('ana@nx036.test')).toBeInTheDocument();
  }, ESPERA_LARGA);

  it('cierra la sesión y abre la cesta cuando se le pide', async () => {
    const usuario = userEvent.setup({ delay: null });
    let cierres = 0;
    let cestas = 0;
    await render(MarcoAdmin, {
      providers: [provideRouter([{ path: '**', component: Vacia }])],
      inputs: { usuario: ADMINISTRADORA, lineasCesta: 12 },
      on: { cierraSesion: () => cierres++, abreCesta: () => cestas++ },
    });
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('admin.signout')) }));
    await usuario.click(screen.getByRole('button', { name: t('nav.cart') }));

    expect(cierres).toBe(1);
    expect(cestas).toBe(1);
    // Más de nueve deja de ser un número que se lea de un vistazo.
    expect(screen.getByText('9+')).toBeInTheDocument();
  }, ESPERA_LARGA);

  /** En el móvil el cajón tapa la pantalla entera: dejarlo abierto sobre la nueva desorienta. */
  it('el cajón lateral se cierra al navegar', async () => {
    const usuario = userEvent.setup({ delay: null });
    const vista = await panel({ usuario: ADMINISTRADORA });
    const t = TestBed.inject(TraduccionService).t;
    const lateral = vista.container.querySelector('aside');

    await usuario.click(screen.getByRole('button', { name: t('admin.nav.open_menu') }));
    expect(lateral).toHaveClass('translate-x-0');

    await TestBed.inject(Router).navigateByUrl('/admin/orders');
    vista.fixture.detectChanges();

    expect(lateral).toHaveClass('-translate-x-full');
  }, ESPERA_LARGA);
});
