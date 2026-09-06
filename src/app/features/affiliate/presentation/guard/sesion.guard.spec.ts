import { TestBed } from '@angular/core/testing';
import { RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { TokenStore } from '@core/auth/token-store';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { exigeSesion } from './sesion.guard';

describe('exigeSesion (afiliados)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
      ],
    });
  });

  it('deja pasar cuando hay credencial guardada', () => {
    TestBed.inject(TokenStore).guarda('token-de-acceso');

    const resultado = TestBed.runInInjectionContext(() =>
      exigeSesion({} as never, { url: '/affiliate' } as RouterStateSnapshot),
    );

    expect(resultado).toBe(true);
  });

  /** Se guarda de dónde venía: soltar a alguien en la portada se lee como un fallo de navegación. */
  it('sin credencial manda a la entrada recordando adónde iba', () => {
    const resultado = TestBed.runInInjectionContext(() =>
      exigeSesion({} as never, { url: '/affiliate' } as RouterStateSnapshot),
    );

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(String(resultado)).toContain('/login');
    expect(String(resultado)).toContain('volverA');
  });
});
