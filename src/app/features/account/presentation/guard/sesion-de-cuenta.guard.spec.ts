import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { TokenStore } from '@core/auth/token-store';
import { USUARIO_ACTUAL_PORT } from '@features/auth/domain/port/autenticacion.port';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { exigeSesion } from './sesion-de-cuenta.guard';
import { APLICACION_DE_ACCOUNT } from '../../account.providers';

@Component({ selector: 'nx-privada', template: '<p>Zona privada</p>' })
class Privada {}

@Component({ selector: 'nx-acceso', template: '<p>Acceso</p>' })
class Acceso {}

const TITULAR = {
  id: 'u-1',
  email: 'ana@nx036.test',
  rol: 'USER' as const,
  activo: true,
  creadoEl: '2026-01-01T00:00:00Z',
  permisos: [],
};

async function navega(a: string, consulta: ReturnType<typeof vi.fn>, conTestigo: boolean) {
  const vista = await render(Privada, {
    providers: [
      ...APLICACION_DE_ACCOUNT,
      provideRouter([
        { path: 'login', component: Acceso },
        { path: 'profile', component: Privada, canActivate: [exigeSesion] },
      ]),
      { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
      { provide: USUARIO_ACTUAL_PORT, useValue: { consulta, actualiza: vi.fn() } },
    ],
  });
  if (conTestigo) {
    TestBed.inject(TokenStore).guarda('testigo');
  }
  await TestBed.inject(Router).navigateByUrl(a);
  vista.fixture.detectChanges();
  return TestBed.inject(Router);
}

describe('exigeSesion', () => {
  it('con sesión deja entrar', async () => {
    const consulta = vi.fn().mockResolvedValue(exito(TITULAR));

    const router = await navega('/profile', consulta, true);

    expect(router.url).toBe('/profile');
  });

  /** Se guarda de dónde venía para devolverle ahí después de entrar, en vez de soltarle en la portada. */
  it('sin sesión manda a la pantalla de acceso apuntando de dónde venía', async () => {
    const consulta = vi.fn();

    const router = await navega('/profile', consulta, false);

    expect(router.url).toBe('/login?volverA=%2Fprofile');
    // Sin credencial guardada no se pregunta al backend: sería un rechazo seguro en cada visita anónima.
    expect(consulta).not.toHaveBeenCalled();
  });

  it('con credencial caducada tampoco deja entrar', async () => {
    const consulta = vi.fn().mockResolvedValue(fallo(creaError('no-autenticado')));

    const router = await navega('/profile', consulta, true);

    expect(router.url).toContain('/login');
  });

  /**
   * Solo se pregunta UNA vez: al arrancar en frío la cuenta no está resuelta, pero después el guardián
   * ya sabe quién mira y no repite la llamada en cada navegación.
   */
  it('no vuelve a preguntar en la siguiente navegación', async () => {
    const consulta = vi.fn().mockResolvedValue(exito(TITULAR));

    const router = await navega('/profile', consulta, true);
    await router.navigateByUrl('/login');
    await router.navigateByUrl('/profile');

    expect(consulta).toHaveBeenCalledTimes(1);
  });
});
