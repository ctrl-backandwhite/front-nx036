import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { LEGAL_PORT } from '../../../domain/gestion/port/legal.port';
import { DocumentoLegal, versionDeHoy } from '../../../domain/gestion/model/legal';
import {
  ConsultaDocumentosLegales, ConsultaElDocumento, GuardaElBorradorLegal, PublicaLosTextosLegales,
} from '../../../application/gestion/use-case/legal.use-case';
import { LegalPage } from './legal.page';
import { instalaObservadorDeVisibilidad } from '../pruebas/visibilidad';

/**
 * El DOM simulado de las pruebas NO trae `IntersectionObserver`, que es lo que usa `@defer (on
 * viewport)` para saber cuándo se llega a un bloque. Sin el doble, montar la pantalla revienta con
 * «IntersectionObserver is not defined» y el fallo parece del componente cuando es del entorno.
 */
instalaObservadorDeVisibilidad();

const documento = (parcial: Partial<DocumentoLegal>): DocumentoLegal => ({
  clase: 'privacy',
  idioma: 'es',
  titulo: 'Privacidad publicada',
  cuerpo: JSON.stringify({ intro: 'Lo publicado', sections: [] }),
  version: '2026-01-01',
  publicado: true,
  tieneBorrador: false,
  tituloBorrador: null,
  cuerpoBorrador: null,
  ...parcial,
});

function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

/**
 * El corredor de pruebas es compartido y va con mucha carga: montar una pantalla entera cuesta
 * segundos, y el plazo de cinco que trae Vitest por defecto se agota sin que falle ninguna
 * comprobación. Se amplía el plazo del bloque, no las comprobaciones.
 */
const PLAZO_MS = 30_000;

describe('LegalPage', { timeout: PLAZO_MS }, () => {
  const puerto = { lista: vi.fn(), documento: vi.fn(), guarda: vi.fn(), publica: vi.fn() };
  const dialogo = { confirma: vi.fn(), alerta: vi.fn() };

  const monta = () =>
    render(LegalPage, {
      // `Playthrough` pinta los bloques `@defer` como si ya se hubiera llegado a ellos: en las
      // pruebas nadie se desplaza por la página.
      deferBlockBehavior: DeferBlockBehavior.Playthrough,
      providers: [
        { provide: LEGAL_PORT, useValue: puerto },
        { provide: DialogoStore, useValue: dialogo },
        ConsultaDocumentosLegales, ConsultaElDocumento, GuardaElBorradorLegal,
        PublicaLosTextosLegales,
      ],
    });

  /** Sin retardo entre pulsaciones: el valor por defecto añade un turno del bucle por tecla. */
  let usuario: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    usuario = userEvent.setup({ delay: null });
    enEspanol();
    vi.resetAllMocks();
    puerto.lista.mockResolvedValue(exito([]));
    puerto.documento.mockResolvedValue(exito(documento({})));
    puerto.guarda.mockResolvedValue(exito(undefined));
    puerto.publica.mockResolvedValue(exito({ version: '2026-09-06', avisados: 12 }));
    dialogo.confirma.mockResolvedValue(true);
    dialogo.alerta.mockResolvedValue(true);
  });

  /** Editar lo publicado haría que el segundo guardado perdiera el primero. */
  it('se edita sobre el borrador cuando lo hay, no sobre lo publicado', async () => {
    puerto.documento.mockResolvedValue(
      exito(
        documento({
          tieneBorrador: true,
          tituloBorrador: 'Privacidad en revisión',
          cuerpoBorrador: JSON.stringify({ intro: 'Texto a medias', sections: [] }),
        }),
      ),
    );

    await monta();

    expect(await screen.findByLabelText('Título')).toHaveValue('Privacidad en revisión');
    expect(screen.getByLabelText('Introducción')).toHaveValue('Texto a medias');
  });

  it('el documento que aún no existe en ese idioma no es un error: se ofrece crearlo', async () => {
    puerto.documento.mockResolvedValue(fallo(creaError('no-encontrado')));

    await monta();

    expect(
      await screen.findByText(/Este documento no existe todavía en este idioma/),
    ).toBeInTheDocument();
  });

  it('guardar el borrador no publica nada y lo dice', async () => {
    await monta();
    await usuario.type(await screen.findByLabelText('Título'), '!');
    await usuario.click(screen.getByRole('button', { name: 'Guardar borrador' }));

    await waitFor(() =>
      expect(dialogo.alerta).toHaveBeenCalledWith(
        expect.stringContaining('El escaparate sigue mostrando la versión publicada'), undefined, 'success',
      ),
    );
    expect(puerto.guarda).toHaveBeenCalledWith(
      'privacy', 'es', 'Privacidad publicada!', expect.any(String),
    );
  });

  /**
   * Publicar manda un correo a toda la base de usuarios y publica el último borrador GUARDADO: sin este
   * aviso, retocar el texto y pulsar publicar manda el correo con la versión vieja y tira los cambios.
   */
  it('con cambios sin guardar, la confirmación de publicar lo advierte', async () => {
    await monta();
    await usuario.type(await screen.findByLabelText('Título'), '!');
    await usuario.click(screen.getByRole('button', { name: 'Publicar y avisar' }));

    await waitFor(() => expect(puerto.publica).toHaveBeenCalledWith(versionDeHoy()));
    expect(dialogo.confirma).toHaveBeenCalledWith(expect.stringContaining('sin guardar'));
  });

  it('sin cambios pendientes, la confirmación no mete ese aviso', async () => {
    await monta();
    await usuario.click(await screen.findByRole('button', { name: 'Publicar y avisar' }));

    await waitFor(() =>
      expect(dialogo.confirma).toHaveBeenCalledWith(expect.not.stringContaining('sin guardar')),
    );
  });

  it('si se dice que no, no se publica nada', async () => {
    dialogo.confirma.mockResolvedValue(false);

    await monta();
    await usuario.click(await screen.findByRole('button', { name: 'Publicar y avisar' }));

    await waitFor(() => expect(dialogo.confirma).toHaveBeenCalled());
    expect(puerto.publica).not.toHaveBeenCalled();
  });

  it('un rechazo al publicar se enseña', async () => {
    puerto.publica.mockResolvedValue(fallo(creaError('sin-permiso', 'No puedes publicar')));

    await monta();
    await usuario.click(await screen.findByRole('button', { name: 'Publicar y avisar' }));

    await waitFor(() =>
      expect(dialogo.alerta).toHaveBeenCalledWith('No puedes publicar', undefined, 'error'),
    );
  });
});
