import { TestBed } from '@angular/core/testing';
import { PreferenciasService } from '@core/preferences/preferencias';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { Divisa } from '../../../domain/gestion/model/dinero';
import { TIPOS_DE_CAMBIO_PORT, TiposDeCambioPort } from '../../../domain/gestion/port/tipos-de-cambio.port';
import { ImportesStore } from './importes.store';

const TASAS: readonly Divisa[] = [
  { codigo: 'USD', nombre: 'Dólar', simbolo: '$', tasaVsUsd: 1, activa: true, locale: 'en-US' },
  { codigo: 'EUR', nombre: 'Euro', simbolo: '€', tasaVsUsd: 0.92, activa: true, locale: 'es-ES' },
];

function monta(puerto: TiposDeCambioPort): { store: ImportesStore; preferencias: PreferenciasService } {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: TIPOS_DE_CAMBIO_PORT, useValue: puerto }, ImportesStore],
  });
  return { store: TestBed.inject(ImportesStore), preferencias: TestBed.inject(PreferenciasService) };
}

describe('ImportesStore', () => {
  it('convierte a la divisa activa y la escribe con su puntuación', async () => {
    const { store, preferencias } = monta({ vigentes: async () => exito(TASAS) });
    preferencias.cambiaMoneda('EUR');
    await store.carga();

    const texto = store.escribe(100);

    expect(texto).toContain('€');
    expect(texto).toContain('92,00');
  });

  /**
   * Mientras las tasas no han llegado se formatea SIN convertir. Es deliberado: el dato canónico son
   * dólares, y enseñarlos un instante es correcto; dejar la columna vacía o convertir con una tasa
   * inventada, no.
   */
  it('antes de cargar las tasas escribe el importe sin convertir', () => {
    const { store, preferencias } = monta({ vigentes: async () => exito(TASAS) });
    preferencias.cambiaMoneda('EUR');

    expect(store.escribe(100)).toContain('100');
  });

  it('parte de céntimos cuando se le pide', async () => {
    const { store, preferencias } = monta({ vigentes: async () => exito(TASAS) });
    preferencias.cambiaMoneda('USD');
    await store.carga();

    expect(store.escribeCentimos(1999)).toContain('19.99');
  });

  it('sin importe pinta un guion, en las dos formas', () => {
    const { store } = monta({ vigentes: async () => exito(TASAS) });

    expect(store.escribe(null)).toBe('—');
    expect(store.escribe(Number.NaN)).toBe('—');
    expect(store.escribeCentimos(null)).toBe('—');
  });

  it('respeta la divisa de ORIGEN cuando el importe no viene en dólares', async () => {
    const { store, preferencias } = monta({ vigentes: async () => exito(TASAS) });
    preferencias.cambiaMoneda('USD');
    await store.carga();

    // 92 euros al cambio son 100 dólares: si ignorase el origen saldrían 92.
    expect(store.escribe(92, 'EUR')).toContain('100');
  });

  it('solo pide las tasas una vez, aunque varias pantallas llamen a cargar', async () => {
    let peticiones = 0;
    const { store } = monta({
      vigentes: async () => {
        peticiones++;
        return exito(TASAS);
      },
    });

    await store.carga();
    await store.carga();

    expect(peticiones).toBe(1);
  });

  /** Que no se pueda consultar el cambio no puede impedir administrar pedidos. */
  it('un fallo al pedir las tasas no rompe nada: se sigue escribiendo en dólares', async () => {
    const { store, preferencias } = monta({ vigentes: async () => fallo(creaError('sin-conexion')) });
    preferencias.cambiaMoneda('USD');

    await store.carga();

    expect(store.divisas()).toEqual([]);
    expect(store.escribe(50)).toContain('50');
  });
});
