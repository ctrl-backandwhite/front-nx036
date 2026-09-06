import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { UsuarioGestionado } from '../../../domain/gestion/model/usuarios';
import { Pagina } from '../../../domain/gestion/model/pagina';
import {
  USUARIOS_EN_LOTE_PORT,
  USUARIOS_PORT,
} from '../../../domain/gestion/port/usuarios.port';
import {
  ActivaUsuario,
  ActuaSobreUsuarios,
  BloqueaUsuario,
  BuscaUsuarios,
  CambiaElRol,
  CambiaElRolEnLote,
  DaDeBajaUsuario,
  DesbloqueaUsuario,
  EditaUsuario,
  InvitaUsuario,
  ReiniciaLaContrasena,
} from '../../../application/gestion/use-case/usuarios.use-case';
import { UsuariosPage } from './usuarios.page';

/**
 * El plazo de cada prueba, ampliado.
 *
 * <p>NO es que la pantalla sea lenta: los fallos que aparecían eran «Test timed out in 5000ms» en
 * pruebas DISTINTAS en cada pasada, y en solitario todas pasan. La causa es la máquina —varios equipos
 * compilando el mismo proyecto a la vez—, y un plazo que depende de la carga convierte una batería
 * correcta en una moneda al aire. Las consultas caras ya se cambiaron por otras baratas; esto es lo que
 * queda, y es lo mismo que hicieron los demás equipos del panel.
 */
vi.setConfig({ testTimeout: 30_000 });

// Los botones y las casillas se buscan por su ETIQUETA, no por su papel con nombre. No es estilo:
// cuando una consulta por papel no encuentra lo que busca, antes de fallar calcula el nombre accesible
// de CADA elemento del documento, y en una pantalla llena de iconos eso cuesta segundos. Como el dato
// llega por una promesa, el primer intento SIEMPRE falla; ese único intento se come el plazo y la
// prueba vence sin haber mirado el DOM por segunda vez. Buscar por etiqueta es una consulta por
// atributo: barata cuando acierta y barata cuando falla.

/**
 * Las pruebas corren en ESPAÑOL: el idioma sale de la cookie de preferencias y, sin ella, el navegador
 * de pruebas pide inglés. Fijarlo aquí deja las comprobaciones contra el diccionario real, en vez de un
 * doble que las volvería ciegas a una clave que faltara.
 */
function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

const usuario = (parcial: Partial<UsuarioGestionado> = {}): UsuarioGestionado => ({
  id: 'u1',
  email: 'ana@marca.com',
  rol: 'USER',
  activo: true,
  nombreVisible: 'Ana Ruiz',
  pais: 'ES',
  accesosFallidos: 0,
  bloqueadoHasta: null,
  ultimoAcceso: null,
  creadoEl: '2026-05-10T12:00:00Z',
  ...parcial,
});

const pagina = (elementos: readonly UsuarioGestionado[]): Pagina<UsuarioGestionado> => ({
  elementos,
  total: elementos.length,
  paginas: 1,
  pagina: 0,
});

describe('UsuariosPage', () => {
  const puerto = {
    busca: vi.fn(),
    cambiaRol: vi.fn(),
    bloquea: vi.fn(),
    desbloquea: vi.fn(),
    activa: vi.fn(),
    edita: vi.fn(),
    reiniciaContrasena: vi.fn(),
    borra: vi.fn(),
    invita: vi.fn(),
  };
  const enLote = {
    activa: vi.fn(),
    bloquea: vi.fn(),
    desbloquea: vi.fn(),
    cambiaRol: vi.fn(),
    borra: vi.fn(),
  };
  const avisos = { exito: vi.fn(), error: vi.fn(), muestra: vi.fn() };
  const dialogo = { confirma: vi.fn() };

  const monta = () =>
    render(UsuariosPage, {
      providers: [
        { provide: USUARIOS_PORT, useValue: puerto },
        { provide: USUARIOS_EN_LOTE_PORT, useValue: enLote },
        { provide: AvisosStore, useValue: avisos },
        { provide: DialogoStore, useValue: dialogo },
        BuscaUsuarios,
        CambiaElRol,
        BloqueaUsuario,
        DesbloqueaUsuario,
        ActivaUsuario,
        EditaUsuario,
        ReiniciaLaContrasena,
        DaDeBajaUsuario,
        InvitaUsuario,
        ActuaSobreUsuarios,
        CambiaElRolEnLote,
      ],
    });

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
    puerto.busca.mockResolvedValue(exito(pagina([usuario()])));
    dialogo.confirma.mockResolvedValue(true);
  });

  it('enseña cada cuenta con su correo, su nombre y su país de registro', async () => {
    await monta();

    expect(await screen.findByText('ana@marca.com')).toBeInTheDocument();
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
    expect(screen.getByText('ES')).toBeInTheDocument();
  });

  /** Sin cuentas, la tabla lo dice; no se queda en blanco haciendo creer que aún está cargando. */
  it('sin resultados avisa de que ninguna cuenta coincide', async () => {
    puerto.busca.mockResolvedValue(exito(pagina([])));

    await monta();

    expect(
      await screen.findByText('Ningún resultado coincide con los filtros'),
    ).toBeInTheDocument();
  });

  it('si la lectura falla lo dice en vez de dejar la tabla muda', async () => {
    puerto.busca.mockResolvedValue(fallo(creaError('sin-conexion', 'No hay red')));

    await monta();

    await waitFor(() => expect(avisos.error).toHaveBeenCalledWith('No hay red'));
  });

  /**
   * Una cuenta bloqueada HACE UN MES no está bloqueada ahora. La marca se queda escrita al caducar, así
   * que pintar la insignia por «tiene valor el campo» la dejaba puesta para siempre.
   */
  it('la insignia de bloqueo solo sale mientras el bloqueo sigue vivo', async () => {
    const pasado = new Date(Date.now() - 60_000).toISOString();
    puerto.busca.mockResolvedValue(exito(pagina([usuario({ bloqueadoHasta: pasado })])));

    await monta();
    await screen.findByText('ana@marca.com');

    expect(screen.queryByText('Bloqueado')).not.toBeInTheDocument();
  });

  it('con el bloqueo vigente sale la insignia y se ofrece desbloquear', async () => {
    const futuro = new Date(Date.now() + 3_600_000).toISOString();
    puerto.busca.mockResolvedValue(exito(pagina([usuario({ bloqueadoHasta: futuro })])));

    await monta();

    expect(await screen.findByText('Bloqueado')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Desbloquear · ana@marca.com'),
    ).toBeInTheDocument();
  });

  it('bloquear una cuenta la manda al backend y relee el listado', async () => {
    puerto.bloquea.mockResolvedValue(exito(undefined));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByLabelText('Bloquear · ana@marca.com'));

    await waitFor(() => expect(puerto.bloquea).toHaveBeenCalledWith('u1', 60));
    expect(puerto.busca).toHaveBeenCalledTimes(2);
  });

  it('un fallo al bloquear enseña el mensaje del servidor y no relee', async () => {
    puerto.bloquea.mockResolvedValue(fallo(creaError('conflicto', 'Ya está bloqueada')));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByLabelText('Bloquear · ana@marca.com'));

    await waitFor(() => expect(avisos.error).toHaveBeenCalledWith('Ya está bloqueada'));
    expect(puerto.busca).toHaveBeenCalledTimes(1);
  });

  /**
   * El papel NO cambia al soltar el desplegable: entre veinticinco filas, un clic desviado convertiría a
   * un cliente en administrador sin que nadie se enterara.
   */
  it('cambiar el papel pide confirmación antes de mandar nada', async () => {
    await monta();
    await screen.findByText('ana@marca.com');

    await userEvent.selectOptions(
      screen.getByLabelText('Rol · ana@marca.com'),
      'ADMIN',
    );

    expect(puerto.cambiaRol).not.toHaveBeenCalled();
    const ventana = await screen.findByRole('dialog');
    expect(within(ventana).getByText(/Administrador/)).toBeInTheDocument();
  });

  it('al confirmar el cambio de papel se manda el nuevo rol', async () => {
    puerto.cambiaRol.mockResolvedValue(exito(undefined));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.selectOptions(
      screen.getByLabelText('Rol · ana@marca.com'),
      'ADMIN',
    );
    const ventana = await screen.findByRole('dialog');
    await userEvent.click(within(ventana).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(puerto.cambiaRol).toHaveBeenCalledWith('u1', 'ADMIN'));
  });

  /**
   * DAR DE BAJA NO BORRA: el backend anonimiza la cuenta y le pone marca de fecha. Lo que se comprueba
   * aquí es que se confirma antes y que el aviso nombra a quién afecta.
   */
  it('dar de baja confirma primero y luego nombra la cuenta afectada', async () => {
    puerto.borra.mockResolvedValue(exito(undefined));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(
      screen.getByLabelText('Eliminar usuario · ana@marca.com'),
    );

    await waitFor(() => expect(puerto.borra).toHaveBeenCalledWith('u1'));
    expect(dialogo.confirma).toHaveBeenCalled();
    expect(avisos.exito).toHaveBeenCalledWith('ana@marca.com ha sido eliminado.');
  });

  it('si quien administra se arrepiente, no se da de baja nada', async () => {
    dialogo.confirma.mockResolvedValue(false);

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(
      screen.getByLabelText('Eliminar usuario · ana@marca.com'),
    );

    await waitFor(() => expect(dialogo.confirma).toHaveBeenCalled());
    expect(puerto.borra).not.toHaveBeenCalled();
  });

  it('el restablecimiento de contraseña avisa a quién se le mandó el correo', async () => {
    puerto.reiniciaContrasena.mockResolvedValue(exito(undefined));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(
      screen.getByLabelText('Restablecer contraseña · ana@marca.com'),
    );

    await waitFor(() => expect(puerto.reiniciaContrasena).toHaveBeenCalledWith('u1'));
    expect(avisos.exito).toHaveBeenCalledWith('Correo de restablecimiento enviado.');
  });

  it('un fallo al restablecer se explica con el mensaje del servidor', async () => {
    puerto.reiniciaContrasena.mockResolvedValue(
      fallo(creaError('error-del-servidor', 'El correo rebotó')),
    );

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(
      screen.getByLabelText('Restablecer contraseña · ana@marca.com'),
    );

    await waitFor(() => expect(avisos.error).toHaveBeenCalledWith('El correo rebotó'));
  });

  /** Invitar a «asdf» no llega a salir: la forma del correo se comprueba antes de gastar una petición. */
  it('la invitación no se puede enviar mientras el correo no tenga forma de correo', async () => {
    await monta();
    await userEvent.click(await screen.findByRole('button', { name: /Invitar usuario/ }));

    const ventana = await screen.findByRole('dialog');
    const enviar = within(ventana).getByRole('button', { name: /Enviar invitación/ });
    expect(enviar).toBeDisabled();

    await userEvent.type(within(ventana).getByLabelText('Email'), 'nueva@marca.com');
    expect(enviar).toBeEnabled();
  });

  it('al invitar con un correo válido se manda y se avisa a quién', async () => {
    puerto.invita.mockResolvedValue(exito(undefined));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: /Invitar usuario/ }));
    const ventana = await screen.findByRole('dialog');
    await userEvent.type(within(ventana).getByLabelText('Email'), 'nueva@marca.com');
    await userEvent.click(within(ventana).getByRole('button', { name: /Enviar invitación/ }));

    await waitFor(() => expect(puerto.invita).toHaveBeenCalledWith('nueva@marca.com', undefined));
    expect(avisos.exito).toHaveBeenCalledWith('Invitación enviada a nueva@marca.com.');
  });

  /** Un campo vaciado viaja como NULO: «no tiene empresa» no es lo mismo que «su empresa se llama “”». */
  it('la edición manda los campos vacíos como nulos', async () => {
    puerto.edita.mockResolvedValue(exito(undefined));
    puerto.busca.mockResolvedValue(
      exito(pagina([usuario({ nombreVisible: 'Ana Ruiz', empresa: 'Marca SL' })])),
    );

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(
      screen.getByLabelText('Editar usuario · ana@marca.com'),
    );

    const ventana = await screen.findByRole('dialog');
    await userEvent.clear(within(ventana).getByLabelText('Empresa'));
    await userEvent.click(within(ventana).getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(puerto.edita).toHaveBeenCalledWith('u1', {
        nombreVisible: 'Ana Ruiz',
        empresa: null,
        pais: 'ES',
        idioma: 'es',
        activo: true,
      }),
    );
  });

  it('un fallo al guardar la edición deja la ventana abierta con el motivo', async () => {
    puerto.edita.mockResolvedValue(fallo(creaError('peticion-invalida', 'País desconocido')));

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(
      screen.getByLabelText('Editar usuario · ana@marca.com'),
    );
    const ventana = await screen.findByRole('dialog');
    await userEvent.click(within(ventana).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(avisos.error).toHaveBeenCalledWith('País desconocido'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  /**
   * El parte de un lote enseña SIEMPRE las dos cifras: el backend no aborta cuando uno falla, y decir
   * solo «hecho» escondería que la mitad no se hizo.
   */
  it('una acción en lote cuenta los aciertos y los fallos', async () => {
    enLote.activa.mockResolvedValue(
      exito({ correctos: 1, fallidos: 1, errores: ['u2: ya estaba activa'] }),
    );

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByLabelText('ana@marca.com'));
    await userEvent.click(screen.getByRole('button', { name: /^Activar$/ }));

    await waitFor(() => expect(enLote.activa).toHaveBeenCalledWith(['u1']));
    expect(avisos.muestra).toHaveBeenCalledWith({
      tipo: 'warning',
      mensaje: 'Hechas: 1 · Fallidas: 1\nu2: ya estaba activa',
    });
  });

  it('el lote destructivo se confirma antes de salir', async () => {
    dialogo.confirma.mockResolvedValue(false);

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByLabelText('ana@marca.com'));
    await userEvent.click(screen.getByRole('button', { name: /^Eliminar usuario$/ }));

    await waitFor(() => expect(dialogo.confirma).toHaveBeenCalled());
    expect(enLote.borra).not.toHaveBeenCalled();
  });

  it('la casilla de la cabecera marca las cuentas de la página que se está mirando', async () => {
    enLote.desbloquea.mockResolvedValue(exito({ correctos: 2, fallidos: 0, errores: [] }));
    puerto.busca.mockResolvedValue(
      exito(pagina([usuario(), usuario({ id: 'u2', email: 'luis@marca.com' })])),
    );

    await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByLabelText('Seleccionar todo'));
    await userEvent.click(screen.getByRole('button', { name: /^Desbloquear$/ }));

    await waitFor(() => expect(enLote.desbloquea).toHaveBeenCalledWith(['u1', 'u2']));
  });

  /** Filtrar estando en la página 7 pedía la página 7 de un resultado que ya solo tenía dos. */
  it('al buscar se vuelve a la primera página', async () => {
    puerto.busca.mockResolvedValue(exito({ elementos: [usuario()], total: 60, paginas: 3, pagina: 0 }));

    const vista = await monta();
    await screen.findByText('ana@marca.com');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() =>
      expect(puerto.busca).toHaveBeenCalledWith(expect.objectContaining({ pagina: 1 })),
    );

    vista.fixture.componentInstance['texto'].set('ana');

    await waitFor(() =>
      expect(puerto.busca).toHaveBeenLastCalledWith(
        expect.objectContaining({ pagina: 0, texto: 'ana' }),
      ),
    );
  });
});
