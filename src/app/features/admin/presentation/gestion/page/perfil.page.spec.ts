import { signal } from '@angular/core';
import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { DatosDeSesion, SesionActual } from '@core/auth/sesion-actual';
import { Usuario } from '@features/auth/domain/model/usuario';
import {
  PERFIL_PORT, SEGUNDO_FACTOR_PORT, SESIONES_PORT,
} from '../../../domain/gestion/port/perfil.port';
import { SesionAbierta } from '../../../domain/gestion/model/perfil';
import {
  CambiaLaContrasena, ConsultaElPerfil, ConsultaElSegundoFactor, ConsultaLasSesiones,
  DesactivaElSegundoFactor, GuardaElPerfil, IniciaElSegundoFactor, RevocaLaSesion,
  VerificaElSegundoFactor,
} from '../../../application/gestion/use-case/perfil.use-case';
import { PerfilPage } from './perfil.page';
import { instalaObservadorDeVisibilidad } from '../pruebas/visibilidad';

/**
 * El DOM simulado de las pruebas NO trae `IntersectionObserver`, que es lo que usa `@defer (on
 * viewport)` para saber cuándo se llega a un bloque. Sin el doble, montar la pantalla revienta con
 * «IntersectionObserver is not defined» y el fallo parece del componente cuando es del entorno.
 */
instalaObservadorDeVisibilidad();

/**
 * El dibujante del código QR se dobla para poder COMPROBAR que se le llama a él y no a un servicio de
 * imágenes de fuera: la dirección `otpauth` lleva dentro la semilla del segundo factor.
 */
const qr = vi.hoisted(() => ({ toDataURL: vi.fn() }));
vi.mock('qrcode', () => ({ default: qr }));

/**
 * La página monta cuatro bloques con sus formularios, así que es un árbol grande. Las consultas se hacen
 * por TEXTO y no por papel accesible: `getByRole` con filtro de nombre recorre el árbol entero calculando
 * papeles y nombres, y a esta escala tarda segundos. El plazo ampliado es la red de seguridad.
 */
const PLAZO_MS = 20000;

/** Doce caracteres es el mínimo que exige la política; se teclea justo eso para no alargar la prueba. */
const CLAVE_NUEVA = 'ClaveNueva1!';
const CLAVE_ACTUAL = 'LaDeSiempre1';

const boton = { selector: 'button' } as const;

const cuenta = (parcial: Partial<Usuario> = {}): Usuario => ({
  id: 'u1',
  email: 'ana@nx036.test',
  rol: 'ADMIN',
  activo: true,
  nombreVisible: 'Ana Ruiz',
  empresa: 'NX036',
  pais: 'ES',
  idioma: 'es',
  creadoEl: '2026-01-15T09:00:00Z',
  permisos: [],
  ...parcial,
});

const sesionAbierta = (parcial: Partial<SesionAbierta> = {}): SesionAbierta => ({
  id: 's1',
  dispositivo: 'Chrome · Linux',
  ip: '10.0.0.7',
  creadaEl: '2026-09-01T09:00:00Z',
  vistaEl: '2026-09-01T09:00:00Z',
  actual: false,
  ...parcial,
});

/** Las pruebas se corren en español: sin la cookie, el navegador de las pruebas pediría inglés. */
function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

/** El portapapeles denegado, que es lo que pasa en contexto no seguro o sin permiso. */
function conPortapapelesDenegado(): void {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: () => Promise.reject(new Error('sin permiso')) },
    configurable: true,
  });
}

describe('PerfilPage', () => {

  const perfil = { lee: vi.fn(), actualiza: vi.fn(), cambiaContrasena: vi.fn() };
  const factor = { estado: vi.fn(), inicia: vi.fn(), verifica: vi.fn(), desactiva: vi.fn() };
  const sesiones = { lista: vi.fn(), revoca: vi.fn() };
  const dialogo = { alerta: vi.fn(), confirma: vi.fn() };

  /**
   * Quién mira sale del NÚCLEO, no del contexto «auth»: es lo mínimo —quién es, su papel, su país— y es
   * lo que la pantalla puede pintar antes de que llegue la ficha completa del backend.
   */
  const enSesion = signal<DatosDeSesion | null>(null);
  const sesionActual = {
    datos: enSesion,
    publica: (datos: DatosDeSesion | null) => enSesion.set(datos),
  };

  const monta = () =>
    render(PerfilPage, {
      // Seguridad, sesiones y contraseña van en `@defer`: sin esto los bloques nunca se pintan en las
      // pruebas y las comprobaciones fallarían diciendo que no encuentran el elemento.
      deferBlockBehavior: DeferBlockBehavior.Playthrough,
      providers: [
        { provide: PERFIL_PORT, useValue: perfil },
        { provide: SEGUNDO_FACTOR_PORT, useValue: factor },
        { provide: SESIONES_PORT, useValue: sesiones },
        { provide: DialogoStore, useValue: dialogo },
        { provide: SesionActual, useValue: sesionActual },
        ConsultaElPerfil, GuardaElPerfil, CambiaLaContrasena, ConsultaElSegundoFactor,
        IniciaElSegundoFactor, VerificaElSegundoFactor, DesactivaElSegundoFactor,
        ConsultaLasSesiones, RevocaLaSesion,
      ],
    });

  /** Abre el alta del segundo factor y llega hasta la ventana de los códigos de respaldo. */
  async function hastaLosCodigos(): Promise<void> {
    await userEvent.click(await screen.findByRole('switch'));
    await userEvent.type(await screen.findByLabelText(/c[oó]digo de 6 d[ií]gitos/), '123456');
    await userEvent.click(screen.getByText('Activar', boton));
  }

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
    enSesion.set({ id: 'u1', rol: 'ADMIN', nombreVisible: 'Ana Ruiz', pais: 'ES' });
    qr.toDataURL.mockResolvedValue('data:image/png;base64,QR');
    perfil.lee.mockResolvedValue(exito(cuenta()));
    perfil.actualiza.mockResolvedValue(exito(cuenta()));
    perfil.cambiaContrasena.mockResolvedValue(exito(undefined));
    factor.estado.mockResolvedValue(exito(false));
    factor.inicia.mockResolvedValue(
      exito({ secreto: 'ABC123', urlOtpauth: 'otpauth://totp/NX036:ana?secret=ABC123' }),
    );
    factor.verifica.mockResolvedValue(exito(['aaa-111', 'bbb-222']));
    factor.desactiva.mockResolvedValue(exito(undefined));
    sesiones.lista.mockResolvedValue(exito([]));
    sesiones.revoca.mockResolvedValue(exito(undefined));
    dialogo.alerta.mockResolvedValue(true);
  });

  it('enseña quién es la cuenta, con su papel y su país escritos en palabras', async () => {
    await monta();

    // El correo sale dos veces —bajo el nombre y como campo—, así que se piden todas las apariciones.
    expect(await screen.findAllByText('ana@nx036.test')).not.toHaveLength(0);
    expect(screen.getAllByText('Ana Ruiz').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Administrador').length).toBeGreaterThan(0);
    expect(screen.getByText('España')).toBeInTheDocument();
  }, PLAZO_MS);

  /**
   * La regresión que motivó el arreglo: lo tecleado sobrevivía a «Cancelar», reaparecía al volver a
   * editar y el siguiente «Guardar» lo persistía sin que nadie lo hubiera pedido.
   */
  it('lo tecleado no sobrevive a «Cancelar»', async () => {
    await monta();

    await userEvent.click(await screen.findByText('Editar', boton));
    const nombre = screen.getByLabelText('Nombre');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Descartado');
    await userEvent.click(screen.getByText('Cancelar', boton));
    await userEvent.click(await screen.findByText('Editar', boton));

    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana Ruiz');
    expect(perfil.actualiza).not.toHaveBeenCalled();
  }, PLAZO_MS);

  it('guarda lo que hay en la cuenta y vuelve al modo lectura', async () => {
    await monta();

    await userEvent.click(await screen.findByText('Editar', boton));
    const nombre = screen.getByLabelText('Nombre');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Ana R.');
    await userEvent.click(screen.getByText('Guardar cambios', boton));

    await waitFor(() =>
      expect(perfil.actualiza).toHaveBeenCalledWith({
        nombreVisible: 'Ana R.', empresa: 'NX036', pais: 'ES',
      }),
    );
    expect(await screen.findByText('Editar', boton)).toBeInTheDocument();
    // La ficha se relee: la sesión republica el nombre y el país, pero la empresa solo vive en la ficha.
    await waitFor(() => expect(perfil.lee).toHaveBeenCalledTimes(2));
  }, PLAZO_MS);

  /** Sin ficha, la pantalla no puede quedarse en blanco: enseña lo que ya sabe de la sesión. */
  it('si no se puede leer la ficha, sigue enseñando lo que sabe la sesión', async () => {
    perfil.lee.mockResolvedValue(fallo(creaError('sin-conexion')));
    await monta();

    expect(await screen.findAllByText('Ana Ruiz')).not.toHaveLength(0);
    expect(screen.getAllByText('Administrador').length).toBeGreaterThan(0);
  }, PLAZO_MS);

  it('si el backend rechaza el perfil, se enseña SU motivo y no un texto genérico', async () => {
    perfil.actualiza.mockResolvedValue(fallo(creaError('conflicto', 'Ese país no está soportado')));
    await monta();

    await userEvent.click(await screen.findByText('Editar', boton));
    await userEvent.click(screen.getByText('Guardar cambios', boton));

    await waitFor(() =>
      expect(dialogo.alerta).toHaveBeenCalledWith('Ese país no está soportado', undefined, 'error'),
    );
  }, PLAZO_MS);

  it('el código QR se dibuja en el navegador: la dirección otpauth no sale del dispositivo', async () => {
    await monta();

    await userEvent.click(await screen.findByRole('switch'));

    await waitFor(() =>
      expect(qr.toDataURL).toHaveBeenCalledWith('otpauth://totp/NX036:ana?secret=ABC123', {
        width: 240, margin: 2,
      }),
    );
  }, PLAZO_MS);

  it('tras verificar enseña los códigos de respaldo y olvida el secreto', async () => {
    await monta();

    await hastaLosCodigos();

    expect(await screen.findByText(/aaa-111/)).toBeInTheDocument();
    expect(screen.queryByText('ABC123')).toBeNull();
  }, PLAZO_MS);

  /**
   * Sin este aviso, quien copia sus códigos cree que los tiene, cierra la ventana y se queda sin la
   * única vía de entrada el día que pierda el teléfono.
   */
  it('si el portapapeles falla, avisa en vez de callarse', async () => {
    conPortapapelesDenegado();
    await monta();

    await hastaLosCodigos();
    await userEvent.click(await screen.findByText('Copiar', boton));

    await waitFor(() =>
      expect(dialogo.alerta).toHaveBeenCalledWith(
        'Ocurrió un error inesperado. Inténtalo de nuevo en un momento.', undefined, 'error',
      ),
    );
  }, PLAZO_MS);

  it('quitar el segundo factor no se puede sin la contraseña', async () => {
    factor.estado.mockResolvedValue(exito(true));
    await monta();

    await userEvent.click(await screen.findByRole('switch'));
    // «Contraseña actual» también es la etiqueta del formulario de cambio de contraseña, que está en la
    // misma página: se busca DENTRO de la ventana para no coger la casilla equivocada.
    const ventana = within(await screen.findByRole('dialog'));
    const confirmar = ventana.getByText('Desactivar', boton);
    expect(confirmar).toBeDisabled();

    await userEvent.type(ventana.getByLabelText('Contraseña actual'), 'mi-clave-de-siempre');
    await userEvent.click(confirmar);

    await waitFor(() => expect(factor.desactiva).toHaveBeenCalledWith('mi-clave-de-siempre'));
  }, PLAZO_MS);

  it('enseña las sesiones abiertas y marca la de este dispositivo', async () => {
    sesiones.lista.mockResolvedValue(
      exito([sesionAbierta({}), sesionAbierta({ id: 's2', dispositivo: 'iPhone', actual: true })]),
    );
    await monta();

    expect(await screen.findByText('Chrome · Linux')).toBeInTheDocument();
    expect(screen.getByText('este dispositivo')).toBeInTheDocument();
    // La sesión actual no se puede cerrar a sí misma: solo hay un botón de revocar, el de la otra.
    expect(screen.getAllByText('Revocar', boton)).toHaveLength(1);
  }, PLAZO_MS);

  /** El respaldo del aviso no puede ser «Revocar»: al fallar decía la etiqueta del botón y nada más. */
  it('si no se puede revocar una sesión, el aviso cuenta el motivo', async () => {
    sesiones.lista.mockResolvedValue(exito([sesionAbierta({})]));
    sesiones.revoca.mockResolvedValue(fallo(creaError('sin-permiso', 'La sesión ya estaba cerrada')));
    await monta();

    await userEvent.click(await screen.findByText('Revocar', boton));

    await waitFor(() =>
      expect(dialogo.alerta).toHaveBeenCalledWith('La sesión ya estaba cerrada', undefined, 'error'),
    );
  }, PLAZO_MS);

  it('dos contraseñas que no coinciden ni salen a la red', async () => {
    await monta();

    await userEvent.type(await screen.findByLabelText('Contraseña actual'), CLAVE_ACTUAL);
    await userEvent.type(screen.getByLabelText(/Contraseña nueva/), CLAVE_NUEVA);
    await userEvent.type(screen.getByLabelText('Repetir contraseña'), 'OtraDistinta');
    await userEvent.click(screen.getByText('Cambiar contraseña', boton));

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(perfil.cambiaContrasena).not.toHaveBeenCalled();
  }, PLAZO_MS);

  it('cambiar la contraseña bien lo confirma y vacía el formulario', async () => {
    await monta();

    await userEvent.type(await screen.findByLabelText('Contraseña actual'), CLAVE_ACTUAL);
    await userEvent.type(screen.getByLabelText(/Contraseña nueva/), CLAVE_NUEVA);
    await userEvent.type(screen.getByLabelText('Repetir contraseña'), CLAVE_NUEVA);
    await userEvent.click(screen.getByText('Cambiar contraseña', boton));

    expect(await screen.findByText('Contraseña actualizada')).toBeInTheDocument();
    expect(perfil.cambiaContrasena).toHaveBeenCalledWith(CLAVE_ACTUAL, CLAVE_NUEVA);
    expect(screen.getByLabelText('Contraseña actual')).toHaveValue('');
  }, PLAZO_MS);

  it('un rechazo del backend al cambiar la contraseña se enseña con su motivo', async () => {
    perfil.cambiaContrasena.mockResolvedValue(
      fallo(creaError('peticion-invalida', 'La contraseña actual no es correcta')),
    );
    await monta();

    await userEvent.type(await screen.findByLabelText('Contraseña actual'), CLAVE_ACTUAL);
    await userEvent.type(screen.getByLabelText(/Contraseña nueva/), CLAVE_NUEVA);
    await userEvent.type(screen.getByLabelText('Repetir contraseña'), CLAVE_NUEVA);
    await userEvent.click(screen.getByText('Cambiar contraseña', boton));

    expect(await screen.findByText('La contraseña actual no es correcta')).toBeInTheDocument();
  }, PLAZO_MS);
});
