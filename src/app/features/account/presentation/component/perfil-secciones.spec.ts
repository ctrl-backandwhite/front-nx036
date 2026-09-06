import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { USUARIO_ACTUAL_PORT } from '@features/auth/domain/port/autenticacion.port';
import { Usuario } from '@features/auth/domain/model/usuario';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { CuentaStore } from '../../application/state/cuenta.store';
import { PERFIL_PORT } from '../../domain/port/perfil.port';
import {
  CODIGO_QR_PORT,
  DOBLE_FACTOR_PORT,
  SESIONES_ACTIVAS_PORT,
} from '../../domain/port/seguridad.port';
import { DatosPersonales } from './datos-personales';
import { CambioDeContrasena } from './cambio-de-contrasena';
import { DobleFactor } from './doble-factor';
import { SesionesActivas } from './sesiones-activas';
import { APLICACION_DE_ACCOUNT } from '../../account.providers';

function titular(cambios: Partial<Usuario> = {}): Usuario {
  return {
    id: 'u-1',
    email: 'ana@nx036.test',
    rol: 'USER',
    activo: true,
    nombre: 'Ana',
    primerApellido: 'Pérez',
    pais: 'ES',
    idioma: 'es',
    creadoEl: '2026-01-01T00:00:00Z',
    permisos: [],
    ...cambios,
  };
}

describe('DatosPersonales', () => {
  const actualiza = vi.fn();
  const consulta = vi.fn();

  async function monta(usuario: Usuario) {
    actualiza.mockReset().mockResolvedValue(exito(undefined));
    consulta.mockReset().mockResolvedValue(exito(usuario));
    // Con credencial guardada: sin ella, releer el titular tras guardar se salta la llamada a
    // propósito —es lo que evita un rechazo seguro en cada arranque anónimo— y la prueba no vería nada.
    const almacen = {
      lee: (clave: string) => (clave === 'nx-access-token' ? 'testigo' : null),
      guarda: vi.fn(),
      borra: vi.fn(),
    };
    const vista = await render(DatosPersonales, {
      providers: [
        ...APLICACION_DE_ACCOUNT,
        provideRouter([]),
        { provide: ALMACEN_LOCAL, useValue: almacen },
        { provide: PERFIL_PORT, useValue: { actualiza, cambiaContrasena: vi.fn() } },
        { provide: USUARIO_ACTUAL_PORT, useValue: { consulta, actualiza: vi.fn() } },
      ],
    });
    TestBed.inject(CuentaStore).fija(usuario);
    vista.fixture.detectChanges();
    return vista;
  }

  it('siembra el formulario con los datos del titular', async () => {
    await monta(titular());
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByLabelText(t('profile.first_name'))).toHaveValue('Ana');
    expect(screen.getByLabelText(t('profile.email'))).toHaveValue('ana@nx036.test');
  });

  /**
   * La opción marcada la pone la directiva del formulario a partir del valor del campo. Antes se
   * repetía con un `[selected]` por opción: dos sitios diciendo lo mismo y uno de ellos podía mentir.
   */
  it('el desplegable de idioma parte del idioma de la cuenta', async () => {
    await monta(titular({ idioma: 'fr' }));
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByLabelText(t('profile.language'))).toHaveValue('fr');
  });

  /** Sin nombre no hay destinatario en el albarán ni titular en la factura. */
  it('sin nombre no se puede guardar, y se dice cuál falta', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta(titular());
    const t = TestBed.inject(TraduccionService).t;

    await usuario.clear(screen.getByLabelText(t('profile.first_name')));
    await usuario.tab();

    expect(screen.getByRole('button', { name: t('profile.save') })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(t('dialog.field.required'));
  });

  it('el correo no se edita: cambiarlo es cambiar de identidad', async () => {
    await monta(titular());
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByLabelText(t('profile.email'))).toBeDisabled();
  });

  /**
   * El país es el de REGISTRO y fija el margen. Si el cliente pudiera cambiarlo, cambiaría su propio
   * precio: por eso solo lo edita quien administra.
   */
  it('un cliente NO puede cambiar el país de la cuenta', async () => {
    await monta(titular({ rol: 'USER' }));
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.queryByRole('combobox', { name: t('profile.country') })).toBeNull();
  });

  it('quien administra sí puede', async () => {
    await monta(titular({ rol: 'ADMIN' }));
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByRole('combobox', { name: t('profile.country') })).toBeInTheDocument();
  });

  it('al guardar bien lo dice, y vuelve a leer el titular', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta(titular());
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: t('profile.save') }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(t('profile.saved')));
    expect(consulta).toHaveBeenCalled();
  });

  /**
   * Sin este aviso, un rechazo del servidor dejaba la pantalla exactamente igual que antes de pulsar y
   * el cliente se iba creyendo que había guardado.
   */
  it('un rechazo del servidor se enseña con su motivo', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta(titular());
    actualiza.mockResolvedValue(fallo(creaError('peticion-invalida', 'Teléfono no válido')));
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: t('profile.save') }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Teléfono no válido'));
  });
});

describe('CambioDeContrasena', () => {
  const cambiaContrasena = vi.fn();

  async function monta() {
    cambiaContrasena.mockReset().mockResolvedValue(exito(undefined));
    return render(CambioDeContrasena, {
      providers: [
        ...APLICACION_DE_ACCOUNT,
        { provide: PERFIL_PORT, useValue: { actualiza: vi.fn(), cambiaContrasena } },
      ],
    });
  }

  it('el botón está apagado mientras la contraseña no cumple la política', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    const boton = screen.getByRole('button', { name: t('profile.change_password') });
    expect(boton).toBeDisabled();

    await usuario.type(screen.getByLabelText(t('profile.current_password')), 'vieja');
    await usuario.type(screen.getByLabelText(t('profile.new_password')), 'Abcdef1!');
    await usuario.type(screen.getByLabelText(t('profile.confirm_password')), 'Abcdef1!');

    expect(boton).toBeEnabled();
  });

  it('avisa en cuanto la repetición deja de coincidir', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    await usuario.type(screen.getByLabelText(t('profile.new_password')), 'Abcdef1!');
    await usuario.type(screen.getByLabelText(t('profile.confirm_password')), 'Abcdef2!');

    expect(screen.getByRole('alert')).toHaveTextContent(t('profile.passwords_mismatch'));
  });

  /** El aviso llega al salir del campo, no antes: acusar de vacío a quien aún no ha escrito es mentir. */
  it('la contraseña actual es obligatoria y lo dice al salir del campo', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.queryByRole('alert')).toBeNull();

    await usuario.click(screen.getByLabelText(t('profile.current_password')));
    await usuario.tab();

    expect(screen.getByRole('alert')).toHaveTextContent(t('dialog.field.required'));
  });

  it('al cambiarla, lo confirma y vacía los tres campos', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    await usuario.type(screen.getByLabelText(t('profile.current_password')), 'vieja');
    await usuario.type(screen.getByLabelText(t('profile.new_password')), 'Abcdef1!');
    await usuario.type(screen.getByLabelText(t('profile.confirm_password')), 'Abcdef1!');
    await usuario.click(screen.getByRole('button', { name: t('profile.change_password') }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(t('profile.password_updated')),
    );
    expect(screen.getByLabelText(t('profile.new_password'))).toHaveValue('');
  });

  it('si el servidor rechaza la contraseña actual, se enseña su motivo', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    cambiaContrasena.mockResolvedValue(
      fallo(creaError('peticion-invalida', 'La actual no es correcta')),
    );
    const t = TestBed.inject(TraduccionService).t;

    await usuario.type(screen.getByLabelText(t('profile.current_password')), 'mala');
    await usuario.type(screen.getByLabelText(t('profile.new_password')), 'Abcdef1!');
    await usuario.type(screen.getByLabelText(t('profile.confirm_password')), 'Abcdef1!');
    await usuario.click(screen.getByRole('button', { name: t('profile.change_password') }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('La actual no es correcta'),
    );
  });
});

describe('DobleFactor', () => {
  const estaActivo = vi.fn();
  const inicia = vi.fn();
  const verifica = vi.fn();
  const desactiva = vi.fn();
  const dibuja = vi.fn();

  async function monta(activo = false) {
    estaActivo.mockReset().mockResolvedValue(exito(activo));
    inicia.mockReset().mockResolvedValue(exito({ secreto: 'ABC123', urlOtpauth: 'otpauth://x' }));
    verifica.mockReset().mockResolvedValue(exito(['aaa', 'bbb']));
    desactiva.mockReset().mockResolvedValue(exito(undefined));
    dibuja.mockReset().mockResolvedValue('data:image/png;base64,xx');
    const vista = await render(DobleFactor, {
      providers: [
        ...APLICACION_DE_ACCOUNT,
        { provide: DOBLE_FACTOR_PORT, useValue: { estaActivo, inicia, verifica, desactiva } },
        { provide: SESIONES_ACTIVAS_PORT, useValue: { lista: vi.fn(), revoca: vi.fn() } },
        { provide: CODIGO_QR_PORT, useValue: { dibuja } },
      ],
    });
    await waitFor(() => expect(estaActivo).toHaveBeenCalled());
    vista.fixture.detectChanges();
    return vista;
  }

  it('refleja si la cuenta ya tiene el segundo factor', async () => {
    await monta(true);
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByRole('switch', { name: t('admin.profile.2fa.disable') })).toBeChecked();
  });

  /**
   * El código se dibuja en el propio navegador: la dirección lleva dentro la semilla, y mandarla a un
   * servicio externo —como se hacía— regala el segundo factor de la cuenta.
   */
  it('al activarlo enseña el código QR dibujado aquí y su secreto', async () => {
    const usuario = userEvent.setup({ delay: null });
    const vista = await monta(false);
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('switch', { name: t('admin.profile.2fa.enable') }));
    await waitFor(() => expect(dibuja).toHaveBeenCalledWith('otpauth://x'));
    vista.fixture.detectChanges();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });

  it('el botón de verificar no se enciende hasta los seis dígitos', async () => {
    const usuario = userEvent.setup({ delay: null });
    const vista = await monta(false);
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('switch', { name: t('admin.profile.2fa.enable') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeInTheDocument());
    vista.fixture.detectChanges();

    const verificar = screen.getByRole('button', { name: t('admin.profile.2fa.enable') });
    expect(verificar).toBeDisabled();

    await usuario.type(screen.getByLabelText(t('admin.profile.2fa.otp_label')), '123456');
    expect(verificar).toBeEnabled();

    await usuario.click(verificar);
    await waitFor(() => expect(verifica).toHaveBeenCalledWith('123456'));
  });

  it('quitarlo exige la contraseña', async () => {
    const usuario = userEvent.setup({ delay: null });
    const vista = await monta(true);
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('switch', { name: t('admin.profile.2fa.disable') }));
    vista.fixture.detectChanges();

    const quitar = screen.getByRole('button', { name: t('admin.profile.2fa.disable') });
    expect(quitar).toBeDisabled();

    await usuario.type(screen.getByLabelText(t('profile.current_password')), 'secreta');
    await usuario.click(quitar);

    await waitFor(() => expect(desactiva).toHaveBeenCalledWith('secreta'));
  });

  it('si el servidor no da la semilla, se avisa y no se abre nada', async () => {
    const usuario = userEvent.setup({ delay: null });
    const vista = await monta(false);
    inicia.mockResolvedValue(fallo(creaError('error-del-servidor', 'No se pudo')));
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('switch', { name: t('admin.profile.2fa.enable') }));
    await waitFor(() => expect(TestBed.inject(DialogoStore).actual()).not.toBeNull());
    vista.fixture.detectChanges();

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('SesionesActivas', () => {
  const lista = vi.fn();
  const revoca = vi.fn();

  const AHORA = new Date().toISOString();

  async function monta(sesiones: unknown[]) {
    lista.mockReset().mockResolvedValue(exito(sesiones));
    revoca.mockReset().mockResolvedValue(exito(undefined));
    const vista = await render(SesionesActivas, {
      providers: [
        ...APLICACION_DE_ACCOUNT,
        { provide: SESIONES_ACTIVAS_PORT, useValue: { lista, revoca } },
      ],
    });
    await waitFor(() => expect(lista).toHaveBeenCalled());
    vista.fixture.detectChanges();
    return vista;
  }

  it('sin dispositivos lo dice en vez de dejar un hueco', async () => {
    await monta([]);
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByText(t('admin.profile.sessions.empty'))).toBeInTheDocument();
  });

  /** La sesión desde la que se mira no puede cerrarse a sí misma: para eso está el botón de salir. */
  it('la sesión actual se marca y no ofrece cerrarla', async () => {
    await monta([
      { id: 's-1', dispositivo: 'iPhone 15', creadaEl: AHORA, ultimoUsoEl: AHORA, actual: true },
    ]);
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByText(t('admin.profile.sessions.current'))).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: new RegExp(t('admin.profile.sessions.revoke')) }),
    ).toBeNull();
  });

  it('las demás se pueden echar y la lista se vuelve a leer', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta([
      {
        id: 's-2',
        dispositivo: 'Chrome en Windows',
        creadaEl: AHORA,
        ultimoUsoEl: AHORA,
        actual: false,
      },
    ]);
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(
      screen.getByRole('button', { name: new RegExp(t('admin.profile.sessions.revoke')) }),
    );

    await waitFor(() => expect(revoca).toHaveBeenCalledWith('s-2'));
    expect(lista).toHaveBeenCalledTimes(2);
  });
});
