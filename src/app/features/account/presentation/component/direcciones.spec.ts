import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { DatosDeDireccion, Direccion } from '../../domain/model/direccion';
import { AYUDA_DE_DIRECCION_PORT, DIRECCIONES_PORT } from '../../domain/port/direcciones.port';
import { TarjetaDeDireccion } from './tarjeta-de-direccion';
import { CamposDeDireccion } from './campos-de-direccion';
import { FormularioDeDireccion } from './formulario-de-direccion';
import { APLICACION_DE_ACCOUNT } from '../../account.providers';

const CASA: Direccion = {
  id: 'dir-1',
  etiqueta: 'Casa',
  nombreCompleto: 'Ana Pérez',
  telefono: '+34600123456',
  linea1: 'Calle Mayor 1',
  linea2: '3º B',
  ciudad: 'Madrid',
  provincia: 'M',
  codigoPostal: '28001',
  pais: 'ES',
  porDefecto: true,
  creadaEl: '2026-01-01T00:00:00Z',
};

/** El puerto de apoyo del formulario: provincias y formato postal. Por defecto, nada que ofrecer. */
function ayudaDoble(provincias: unknown[] = [], formato: unknown = null) {
  return {
    provincias: vi.fn().mockResolvedValue(exito(provincias)),
    formatoPostal: vi
      .fn()
      .mockResolvedValue(formato ? exito(formato) : fallo(creaError('no-encontrado'))),
  };
}

describe('TarjetaDeDireccion', () => {
  it('pinta la etiqueta, la calle y la localidad en una sola línea cada una', async () => {
    await render(TarjetaDeDireccion, { inputs: { direccion: CASA } });

    expect(screen.getByText('Casa')).toBeInTheDocument();
    expect(screen.getByText('Calle Mayor 1, 3º B')).toBeInTheDocument();
    expect(screen.getByText('Madrid, M 28001')).toBeInTheDocument();
  });

  it('sin etiqueta se encabeza con el nombre de quien recibe', async () => {
    await render(TarjetaDeDireccion, { inputs: { direccion: { ...CASA, etiqueta: undefined } } });

    expect(screen.getAllByText('Ana Pérez').length).toBeGreaterThan(0);
  });

  it('la que está por defecto se distingue', async () => {
    const vista = await render(TarjetaDeDireccion, { inputs: { direccion: CASA } });
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByText(t('checkout.default'))).toBeInTheDocument();

    vista.fixture.componentRef.setInput('direccion', { ...CASA, porDefecto: false });
    vista.fixture.detectChanges();
    expect(screen.queryByText(t('checkout.default'))).toBeNull();
  });

  /** Borrar es destructivo y la tarjeta es pequeña: un toque accidental se la llevaría por delante. */
  it('no borra sin confirmar antes', async () => {
    const usuario = userEvent.setup({ delay: null });
    const borradas: string[] = [];
    await render(TarjetaDeDireccion, {
      inputs: { direccion: CASA },
      on: { borra: (id: string) => borradas.push(id) },
    });
    const t = TestBed.inject(TraduccionService).t;
    const dialogo = TestBed.inject(DialogoStore);

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('common.delete')) }));
    expect(borradas).toEqual([]);

    dialogo.cierra(false);
    await waitFor(() => expect(borradas).toEqual([]));

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('common.delete')) }));
    dialogo.cierra(true);
    await waitFor(() => expect(borradas).toEqual(['dir-1']));
  });

  it('editar avisa con la dirección entera, no solo con su identificador', async () => {
    const usuario = userEvent.setup({ delay: null });
    const editadas: Direccion[] = [];
    await render(TarjetaDeDireccion, {
      inputs: { direccion: CASA },
      on: { edita: (d: Direccion) => editadas.push(d) },
    });
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: new RegExp(t('common.edit')) }));

    expect(editadas).toEqual([CASA]);
  });
});

describe('CamposDeDireccion', () => {
  const VACIA = {
    etiqueta: '',
    nombreCompleto: '',
    telefono: '',
    linea1: '',
    linea2: '',
    ciudad: '',
    provincia: '',
    codigoPostal: '',
    pais: '',
    porDefecto: false,
  };

  it('no pide provincias mientras no haya país elegido', async () => {
    const ayuda = ayudaDoble();
    await render(CamposDeDireccion, {
      inputs: { datos: VACIA },
      providers: [...APLICACION_DE_ACCOUNT, { provide: AYUDA_DE_DIRECCION_PORT, useValue: ayuda }],
    });

    expect(ayuda.provincias).not.toHaveBeenCalled();
  });

  it('con país elegido pide sus provincias y el formato de su código postal', async () => {
    const ayuda = ayudaDoble([{ codigo: 'CA', nombre: 'California' }], {
      requerido: true,
      patron: '\\d{5}',
      ejemplo: '90210',
    });
    await render(CamposDeDireccion, {
      inputs: { datos: { ...VACIA, pais: 'US' } },
      providers: [...APLICACION_DE_ACCOUNT, { provide: AYUDA_DE_DIRECCION_PORT, useValue: ayuda }],
    });

    await waitFor(() => expect(ayuda.provincias).toHaveBeenCalledWith('US'));
    expect(ayuda.formatoPostal).toHaveBeenCalledWith('US');
  });

  /** Con el campo vacío aún se está escribiendo: el aviso llega solo cuando hay algo que no cuadra. */
  it('avisa del código postal solo cuando no encaja con el formato del país', async () => {
    const ayuda = ayudaDoble([], { requerido: true, patron: '\\d{5}', ejemplo: '28001' });
    const vista = await render(CamposDeDireccion, {
      inputs: { datos: { ...VACIA, pais: 'ES' } },
      providers: [...APLICACION_DE_ACCOUNT, { provide: AYUDA_DE_DIRECCION_PORT, useValue: ayuda }],
    });
    const t = TestBed.inject(TraduccionService).t;

    await waitFor(() => expect(ayuda.formatoPostal).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();

    vista.fixture.componentRef.setInput('datos', { ...VACIA, pais: 'ES', codigoPostal: '28' });
    vista.fixture.detectChanges();
    expect(screen.getByRole('alert').textContent).toContain(
      t('address.postal_invalid').replace('{example}', '28001'),
    );
  });

  /**
   * Antes el formulario no decía nada: quien se dejaba la ciudad veía el botón de guardar apagado sin
   * saber por qué. Ahora lo dice el campo, y solo cuando ya se ha pasado por él.
   */
  it('dice qué campo obligatorio falta en cuanto se sale de él', async () => {
    const usuario = userEvent.setup({ delay: null });
    await render(CamposDeDireccion, {
      inputs: { datos: VACIA },
      providers: [
        ...APLICACION_DE_ACCOUNT,
        { provide: AYUDA_DE_DIRECCION_PORT, useValue: ayudaDoble() },
      ],
    });
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.queryByRole('alert')).toBeNull();

    await usuario.click(screen.getByRole('textbox', { name: t('checkout.city') }));
    await usuario.tab();

    expect(screen.getByRole('alert')).toHaveTextContent(t('dialog.field.required'));
  });

  /** Arrastrar el texto libre del país anterior como si fuera código dejaría el impuesto mal calculado. */
  it('al cambiar de país limpia la provincia', async () => {
    const usuario = userEvent.setup({ delay: null });
    const cambios: DatosDeDireccion[] = [];
    const vista = await render(CamposDeDireccion, {
      inputs: { datos: { ...VACIA, pais: 'ES', provincia: 'Madrid' } },
      providers: [
        ...APLICACION_DE_ACCOUNT,
        { provide: AYUDA_DE_DIRECCION_PORT, useValue: ayudaDoble() },
      ],
    });
    // «datos» es un modelo: se escucha por su propia referencia, no por una salida con otro nombre.
    vista.fixture.componentRef.instance.datos.subscribe((d) => cambios.push(d));
    const t = TestBed.inject(TraduccionService).t;

    await usuario.selectOptions(
      screen.getByRole('combobox', { name: t('checkout.country_iso') }),
      'FR',
    );

    expect(cambios.at(-1)).toMatchObject({ pais: 'FR', provincia: '' });
  });
});

describe('FormularioDeDireccion', () => {
  const crea = vi.fn();
  const actualiza = vi.fn();
  const lista = vi.fn();

  function monta(direccion: Direccion | null = null) {
    return render(FormularioDeDireccion, {
      inputs: { direccion },
      providers: [
        ...APLICACION_DE_ACCOUNT,
        provideRouter([]),
        { provide: DIRECCIONES_PORT, useValue: { lista, crea, actualiza, elimina: vi.fn() } },
        { provide: AYUDA_DE_DIRECCION_PORT, useValue: ayudaDoble() },
      ],
    });
  }

  beforeEach(() => {
    crea.mockReset().mockResolvedValue(exito({ ...CASA }));
    actualiza.mockReset().mockResolvedValue(exito({ ...CASA }));
    lista.mockReset().mockResolvedValue(exito([CASA]));
  });

  it('en modo alta el botón no se puede pulsar hasta que la dirección está completa', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    const guardar = screen.getByRole('button', { name: t('profile.save_address') });
    expect(guardar).toBeDisabled();

    await usuario.type(screen.getByRole('textbox', { name: t('checkout.full_name') }), 'Ana');
    await usuario.type(screen.getByRole('textbox', { name: t('checkout.line1') }), 'Calle');
    await usuario.type(screen.getByRole('textbox', { name: t('checkout.city') }), 'Madrid');
    await usuario.selectOptions(
      screen.getByRole('combobox', { name: t('checkout.country_iso') }),
      'ES',
    );

    expect(guardar).toBeEnabled();
  });

  it('en modo edición parte de los datos guardados y termina actualizando', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta(CASA);
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByRole('textbox', { name: t('checkout.full_name') })).toHaveValue('Ana Pérez');

    await usuario.click(screen.getByRole('button', { name: t('profile.update') }));

    await waitFor(() =>
      expect(actualiza).toHaveBeenCalledWith(
        'dir-1',
        expect.objectContaining({ etiqueta: 'Casa' }),
      ),
    );
    expect(crea).not.toHaveBeenCalled();
  });

  /**
   * El formulario se deja ABIERTO con lo tecleado: cerrarlo obligaría a escribir la dirección entera
   * otra vez solo por un código postal que no cuadraba.
   */
  it('si el servidor rechaza, enseña el motivo y no cierra', async () => {
    const usuario = userEvent.setup({ delay: null });
    actualiza.mockResolvedValue(fallo(creaError('peticion-invalida', 'Código postal no válido')));
    const cerrado: unknown[] = [];
    const vista = await monta(CASA);
    const t = TestBed.inject(TraduccionService).t;
    vista.fixture.componentRef.instance.cierra.subscribe(() => cerrado.push(true));

    await usuario.click(screen.getByRole('button', { name: t('profile.update') }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Código postal no válido'),
    );
    expect(cerrado).toEqual([]);
  });
});
