import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Component } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { Direccion } from '../../domain/model/direccion';
import { AYUDA_DE_DIRECCION_PORT, DIRECCIONES_PORT } from '../../domain/port/direcciones.port';
import { DireccionesDelPerfil } from './direcciones-del-perfil';

@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

function direccion(id: string, etiqueta: string): Direccion {
  return {
    id,
    etiqueta,
    nombreCompleto: 'Ana Pérez',
    linea1: 'Calle Mayor 1',
    ciudad: 'Madrid',
    pais: 'ES',
    porDefecto: false,
    creadaEl: '2026-01-01T00:00:00Z',
  };
}

describe('DireccionesDelPerfil', () => {
  const lista = vi.fn();
  const elimina = vi.fn();

  async function monta(direcciones: Direccion[]) {
    lista.mockReset().mockResolvedValue(exito(direcciones));
    elimina.mockReset().mockResolvedValue(exito(undefined));
    const vista = await render(DireccionesDelPerfil, {
      providers: [
        provideRouter([{ path: '**', component: Vacia }]),
        {
          provide: DIRECCIONES_PORT,
          useValue: { lista, crea: vi.fn(), actualiza: vi.fn(), elimina },
        },
        {
          provide: AYUDA_DE_DIRECCION_PORT,
          useValue: {
            provincias: vi.fn().mockResolvedValue(exito([])),
            formatoPostal: vi.fn().mockResolvedValue(fallo(creaError('no-encontrado'))),
          },
        },
      ],
    });
    await waitFor(() => expect(lista).toHaveBeenCalled());
    vista.fixture.detectChanges();
    return vista;
  }

  it('sin direcciones lo dice', async () => {
    await monta([]);
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByText(t('profile.addresses.empty'))).toBeInTheDocument();
  });

  /** Quien tenga muchas las gestiona en la página dedicada: aquí solo caben las primeras. */
  it('enseña cuatro y enlaza al resto', async () => {
    await monta(['a', 'b', 'c', 'd', 'e', 'f'].map((id) => direccion(id, `Etiqueta ${id}`)));
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByText('Etiqueta d')).toBeInTheDocument();
    expect(screen.queryByText('Etiqueta e')).toBeNull();
    expect(screen.getByRole('link', { name: new RegExp(`\\+2 ${t('common.more')}`) })).toHaveAttribute(
      'href',
      '/addresses',
    );
  });

  it('abrir el alta enseña la ventana con el formulario vacío', async () => {
    const usuario = userEvent.setup({ delay: null });
    const vista = await monta([]);
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('profile.addresses.add')) }));
    vista.fixture.detectChanges();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: t('checkout.full_name') })).toHaveValue('');
  });

  it('editar abre la MISMA ventana con los datos de esa dirección', async () => {
    const usuario = userEvent.setup({ delay: null });
    const vista = await monta([direccion('dir-1', 'Casa')]);
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('common.edit')) }));
    vista.fixture.detectChanges();

    expect(screen.getByRole('textbox', { name: t('checkout.full_name') })).toHaveValue('Ana Pérez');
  });

  /** Sin este aviso, la tarjeta seguía ahí y parecía que el toque no se había registrado. */
  it('si borrar falla, se cuenta el motivo', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta([direccion('dir-1', 'Casa')]);
    elimina.mockResolvedValue(fallo(creaError('conflicto', 'Está en uso')));
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('common.delete')) }));
    TestBed.inject(DialogoStore).cierra(true);

    await waitFor(() => expect(TestBed.inject(DialogoStore).actual()?.mensaje).toBe('Está en uso'));
  });
});
