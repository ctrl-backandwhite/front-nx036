import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  ConsultaLosServiciosDeAlmacen,
  GuardaLosServiciosDeAlmacen,
} from '../../../application/gestion/use-case/precios.use-case';
import { PRECIOS_PORT } from '../../../domain/gestion/port/precios.port';
import { PreciosServiciosDeAlmacen } from './precios-servicios-de-almacen';

describe('PreciosServiciosDeAlmacen', () => {
  const puerto = { serviciosDeAlmacen: vi.fn(), guardaServiciosDeAlmacen: vi.fn() };
  const avisos = { exito: vi.fn(), error: vi.fn(), muestra: vi.fn() };

  const monta = () =>
    render(PreciosServiciosDeAlmacen, {
      providers: [
        { provide: PRECIOS_PORT, useValue: puerto },
        { provide: AvisosStore, useValue: avisos },
        ConsultaLosServiciosDeAlmacen,
        GuardaLosServiciosDeAlmacen,
      ],
    });

  beforeEach(() => {
    document.cookie = 'nx036-locale=es; Path=/';
    vi.resetAllMocks();
    puerto.serviciosDeAlmacen.mockResolvedValue(exito({ etiquetadoCny: 0, reempaquetadoCny: 0 }));
  });

  it('no pinta la tarjeta si no se pueden leer los importes', async () => {
    puerto.serviciosDeAlmacen.mockResolvedValue(fallo(creaError('sin-conexion', 'x')));
    const vista = await monta();
    await vista.fixture.whenStable();
    expect(screen.queryByLabelText(/Etiquetado/)).toBeNull();
  });

  it('guarda los dos importes juntos y solo si hay cambios', async () => {
    puerto.guardaServiciosDeAlmacen.mockResolvedValue(
      exito({ etiquetadoCny: 0.5, reempaquetadoCny: 2 }),
    );
    const vista = await monta();
    const boton = await screen.findByTestId('almacen-guardar');
    expect((boton as HTMLButtonElement).disabled).toBe(true);

    const etiquetado = screen.getByLabelText(/Etiquetado/);
    await userEvent.clear(etiquetado);
    await userEvent.type(etiquetado, '0.5');
    const reempaquetado = screen.getByLabelText(/Reempaquetado/);
    await userEvent.clear(reempaquetado);
    await userEvent.type(reempaquetado, '2');
    vista.fixture.detectChanges();
    expect((boton as HTMLButtonElement).disabled).toBe(false);

    await userEvent.click(boton);
    await vista.fixture.whenStable();
    expect(puerto.guardaServiciosDeAlmacen).toHaveBeenCalledWith({
      etiquetadoCny: 0.5,
      reempaquetadoCny: 2,
    });
    expect(avisos.exito).toHaveBeenCalled();
    vista.fixture.detectChanges();
    expect((boton as HTMLButtonElement).disabled).toBe(true);
  });

  it('un importe negativo no se puede guardar', async () => {
    const vista = await monta();
    const boton = await screen.findByTestId('almacen-guardar');
    const etiquetado = screen.getByLabelText(/Etiquetado/);
    await userEvent.clear(etiquetado);
    await userEvent.type(etiquetado, '-1');
    vista.fixture.detectChanges();
    expect((boton as HTMLButtonElement).disabled).toBe(true);
    expect(puerto.guardaServiciosDeAlmacen).not.toHaveBeenCalled();
  });

  it('si el guardado falla avisa y deja lo tecleado', async () => {
    puerto.guardaServiciosDeAlmacen.mockResolvedValue(fallo(creaError('sin-conexion', 'caído')));
    const vista = await monta();
    const boton = await screen.findByTestId('almacen-guardar');
    const etiquetado = screen.getByLabelText(/Etiquetado/);
    await userEvent.clear(etiquetado);
    await userEvent.type(etiquetado, '3');
    vista.fixture.detectChanges();
    await userEvent.click(boton);
    await vista.fixture.whenStable();
    expect(avisos.error).toHaveBeenCalled();
    expect((etiquetado as HTMLInputElement).value).toBe('3');
  });
});
