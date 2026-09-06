import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Component } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import {
  BAJA_DE_CUENTA_PORT,
  FIN_DE_SESION_PORT,
  PORTABILIDAD_PORT,
} from '../../domain/port/perfil.port';
import { DESCARGA_PORT } from '../../domain/port/descarga.port';
import { CuentaStore } from '../../application/state/cuenta.store';
import { ZonaDePeligro } from './zona-de-peligro';

@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

describe('ZonaDePeligro', () => {
  const exporta = vi.fn();
  const entrega = vi.fn();
  const solicita = vi.fn();
  const confirma = vi.fn();
  const termina = vi.fn();

  async function monta() {
    exporta.mockReset().mockResolvedValue(exito({ nombre: 'mis-datos.json', contenido: new Blob(['{}']) }));
    entrega.mockReset();
    solicita.mockReset().mockResolvedValue(exito(undefined));
    confirma.mockReset().mockResolvedValue(exito(undefined));
    termina.mockReset().mockResolvedValue(undefined);
    return render(ZonaDePeligro, {
      providers: [
        provideRouter([{ path: '**', component: Vacia }]),
        { provide: PORTABILIDAD_PORT, useValue: { exporta } },
        { provide: DESCARGA_PORT, useValue: { entrega } },
        { provide: BAJA_DE_CUENTA_PORT, useValue: { solicita, confirma } },
        { provide: FIN_DE_SESION_PORT, useValue: { termina } },
      ],
    });
  }

  /**
   * La política de privacidad promete que la copia se descarga desde el perfil. El endpoint existía y
   * no había pantalla que lo llamara: la promesa estaba escrita y no se podía cumplir.
   */
  it('la descarga de datos está antes que el borrado, y funciona', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('profile.export.action')) }));

    await waitFor(() => expect(entrega).toHaveBeenCalled());
  });

  it('si la copia falla, se avisa y no se entrega nada', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    exporta.mockResolvedValue(fallo(creaError('error-del-servidor', 'No se pudo generar')));
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('profile.export.action')) }));

    await waitFor(() => expect(TestBed.inject(DialogoStore).actual()?.mensaje).toBe('No se pudo generar'));
    expect(entrega).not.toHaveBeenCalled();
  });

  it('cerrar la cuenta pide confirmación antes de mandar el código', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('profile.delete.button')) }));
    expect(solicita).not.toHaveBeenCalled();

    TestBed.inject(DialogoStore).cierra(false);
    await waitFor(() => expect(solicita).not.toHaveBeenCalled());
  });

  it('al confirmar, pide el código y enseña el campo para escribirlo', async () => {
    const usuario = userEvent.setup({ delay: null });
    const vista = await monta();
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('profile.delete.button')) }));
    TestBed.inject(DialogoStore).cierra(true);

    await waitFor(() => {
      vista.fixture.detectChanges();
      expect(screen.getByLabelText(t('profile.delete.code_label'))).toBeInTheDocument();
    });
  });

  /**
   * Cerrar la cuenta NO borra nada: el servidor anonimiza y apunta la fecha. Lo que sí ocurre es que la
   * sesión de este equipo se cierra, porque quien acaba de darse de baja no puede seguir dentro.
   */
  it('con el código correcto cierra la sesión y saca de la pantalla', async () => {
    const usuario = userEvent.setup({ delay: null });
    const vista = await monta();
    const t = TestBed.inject(TraduccionService).t;
    TestBed.inject(CuentaStore).fija(null);

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('profile.delete.button')) }));
    TestBed.inject(DialogoStore).cierra(true);
    await waitFor(() => {
      vista.fixture.detectChanges();
      expect(screen.getByLabelText(t('profile.delete.code_label'))).toBeInTheDocument();
    });

    await usuario.type(screen.getByLabelText(t('profile.delete.code_label')), '123456');
    await usuario.click(screen.getByRole('button', { name: new RegExp(t('profile.delete.confirm_btn')) }));

    await waitFor(() => expect(confirma).toHaveBeenCalledWith('123456'));
    expect(termina).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('un código erróneo se cuenta sin cerrar la sesión', async () => {
    const usuario = userEvent.setup({ delay: null });
    const vista = await monta();
    confirma.mockResolvedValue(fallo(creaError('peticion-invalida', 'Código no válido')));
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('profile.delete.button')) }));
    TestBed.inject(DialogoStore).cierra(true);
    await waitFor(() => {
      vista.fixture.detectChanges();
      expect(screen.getByLabelText(t('profile.delete.code_label'))).toBeInTheDocument();
    });

    await usuario.type(screen.getByLabelText(t('profile.delete.code_label')), '000000');
    await usuario.click(screen.getByRole('button', { name: new RegExp(t('profile.delete.confirm_btn')) }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Código no válido'));
    expect(termina).not.toHaveBeenCalled();
  });
});
