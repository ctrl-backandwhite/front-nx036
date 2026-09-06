import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { SOCIOS_PORT } from '../../../domain/gestion/port/socios.port';
import { ClienteOauth } from '../../../domain/gestion/model/socios';
import {
  BorraElCliente, ConsultaSocios, CreaElCliente, PruebaLosWebhooks, RotaElSecreto,
} from '../../../application/gestion/use-case/socios.use-case';
import { SociosPage } from './socios.page';
import { instalaObservadorDeVisibilidad } from '../pruebas/visibilidad';

/**
 * El DOM simulado de las pruebas NO trae `IntersectionObserver`, que es lo que usa `@defer (on
 * viewport)` para saber cuándo se llega a un bloque. Sin el doble, montar la pantalla revienta con
 * «IntersectionObserver is not defined» y el fallo parece del componente cuando es del entorno.
 */
instalaObservadorDeVisibilidad();

const cliente = (parcial: Partial<ClienteOauth> = {}): ClienteOauth => ({
  id: '1',
  identificador: 'acme-prod',
  nombre: 'Acme Inc.',
  concesiones: 'client_credentials',
  permisos: 'catalog.read orders.write',
  ...parcial,
});

/**
 * Estas pantallas montan tablas enteras y el teclado se simula tecla a tecla: con el resto de equipos
 * compilando a la vez, los cinco segundos por defecto de Vitest se agotan y la prueba falla por el
 * reloj, no por el código. Se les da holgura para que lo que falle sea siempre el comportamiento.
 */
vi.setConfig({ testTimeout: 30_000 });

function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

/**
 * `Playthrough` pinta los bloques `@defer` como si ya se hubiera llegado a ellos. Sin esto, lo que va
 * bajo el pliegue se queda en su hueco reservado —en una prueba nadie se desplaza por la página— y las
 * aserciones fallarían con «no se encuentra el elemento».
 */
describe('SociosPage', () => {

  const puerto = {
    clientes: vi.fn(), aplicaciones: vi.fn(), entregas: vi.fn(), crea: vi.fn(),
    rotaSecreto: vi.fn(), borra: vi.fn(), pruebaWebhooks: vi.fn(),
  };
  const dialogo = { confirma: vi.fn(), alerta: vi.fn(), pregunta: vi.fn() };
  const avisos = { exito: vi.fn(), error: vi.fn(), muestra: vi.fn() };

  const monta = () =>
    render(SociosPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
      providers: [
        { provide: SOCIOS_PORT, useValue: puerto },
        { provide: DialogoStore, useValue: dialogo },
        { provide: AvisosStore, useValue: avisos },
        ConsultaSocios, CreaElCliente, RotaElSecreto, BorraElCliente, PruebaLosWebhooks,
      ],
    });

  beforeEach(() => {
    enEspanol();
    vi.resetAllMocks();
    puerto.clientes.mockResolvedValue(exito([cliente()]));
    puerto.aplicaciones.mockResolvedValue(exito([]));
    puerto.entregas.mockResolvedValue(exito([]));
    dialogo.alerta.mockResolvedValue(true);
  });

  it('enseña cada cliente con su identificador y sus permisos traducidos', async () => {
    await monta();

    expect(await screen.findByText('acme-prod')).toBeInTheDocument();
    expect(screen.getByText('Acme Inc.')).toBeInTheDocument();
    expect(screen.getByText('Servidor a servidor')).toBeInTheDocument();
    expect(screen.getByText('Leer catálogo · Crear/actualizar pedidos')).toBeInTheDocument();
  });

  /** Un nombre que en realidad es un identificador técnico no le dice nada a nadie. */
  it('si el nombre es un identificador se cae al alias, que al menos se reconoce', async () => {
    puerto.clientes.mockResolvedValue(
      exito([cliente({ nombre: '2f1c4a6e-1111-2222-3333-444455556666' })]),
    );

    await monta();

    expect(await screen.findAllByText('acme-prod')).toHaveLength(2);
    expect(screen.queryByText('2f1c4a6e-1111-2222-3333-444455556666')).not.toBeInTheDocument();
  });

  /** El secreto no está: el backend solo lo devuelve al crear y al rotar, así que no hay nada que ver. */
  it('el secreto nunca se enseña en la tabla', async () => {
    await monta();
    await screen.findByText('acme-prod');

    expect(screen.getByText('••••••••')).toBeInTheDocument();
  });

  it('rotar el secreto se pregunta antes, porque invalida el anterior', async () => {
    dialogo.confirma.mockResolvedValue(false);

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Rotar secret' }));

    expect(dialogo.confirma).toHaveBeenCalledWith(
      '¿Generar un nuevo secret para acme-prod? El anterior dejará de funcionar al instante.',
    );
    expect(puerto.rotaSecreto).not.toHaveBeenCalled();
  });

  /** El nuevo secreto es la ÚNICA vez que va a verse: sale en un diálogo que hay que cerrar a mano. */
  it('al rotar, el secreto nuevo se enseña en ese mismo instante', async () => {
    dialogo.confirma.mockResolvedValue(true);
    puerto.rotaSecreto.mockResolvedValue(
      exito({ identificador: 'acme-prod', secreto: 's3cr3t0', mensaje: 'Cópialo ya' }),
    );

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Rotar secret' }));

    expect(dialogo.alerta).toHaveBeenCalledWith(
      expect.stringContaining('s3cr3t0'),
      'Rotar secret',
      'success',
    );
  });

  it('un fallo al rotar se cuenta con el mensaje del servidor', async () => {
    dialogo.confirma.mockResolvedValue(true);
    puerto.rotaSecreto.mockResolvedValue(fallo(creaError('conflicto', 'Cliente bloqueado')));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Rotar secret' }));

    expect(avisos.error).toHaveBeenCalledWith('Cliente bloqueado');
    expect(dialogo.alerta).not.toHaveBeenCalled();
  });

  it('borrar un cliente se confirma y, si se acepta, se borra', async () => {
    dialogo.confirma.mockResolvedValue(true);
    puerto.borra.mockResolvedValue(exito(undefined));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar cliente' }));

    expect(puerto.borra).toHaveBeenCalledWith('acme-prod');
    expect(avisos.exito).toHaveBeenCalledWith('acme-prod eliminado.');
  });

  it('dar de alta un cliente enseña el secreto recién emitido', async () => {
    puerto.crea.mockResolvedValue(exito({ identificador: 'nuevo-1', secreto: 'abc123' }));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Crear cliente' }));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Acme');
    const botones = screen.getAllByRole('button', { name: 'Crear cliente' });
    await userEvent.click(botones[botones.length - 1]);

    expect(puerto.crea).toHaveBeenCalledWith({
      nombre: 'Acme',
      permisos: ['catalog.read', 'orders.write'],
    });
    expect(dialogo.alerta).toHaveBeenCalledWith(
      expect.stringContaining('abc123'),
      'Crear cliente',
      'success',
    );
  });

  it('sin aplicaciones ni entregas lo dice en vez de dejar las tablas en blanco', async () => {
    await monta();

    expect(
      await screen.findByText('Aún no hay partner apps. Registra una desde la API.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Sin webhooks salientes registrados.')).toBeInTheDocument();
  });

  /**
   * Se comprueba la ESTRUCTURA y no el texto: el rótulo depende de qué diccionario haya llegado a
   * cargarse en la pasada —en el banco de pruebas cae al inglés—, y afirmarlo estaría probando la
   * traducción en vez de la pantalla. Lo que importa aquí es que las tres tablas siguen en pie y
   * vacías, no muertas.
   */
  it('un fallo al leer las tres tablas no tumba la pantalla', async () => {
    puerto.clientes.mockResolvedValue(fallo(creaError('sin-conexion')));
    puerto.aplicaciones.mockResolvedValue(fallo(creaError('sin-conexion')));
    puerto.entregas.mockResolvedValue(fallo(creaError('sin-conexion')));

    const { container } = await monta();

    await waitFor(() => expect(container.querySelectorAll('table')).toHaveLength(3));
    expect(container.querySelector('h1')).toBeInTheDocument();
    // Ninguna fila de datos: las tres tablas quedan con su cabecera y su aviso de vacío.
    expect(container.querySelectorAll('tbody tr').length).toBeLessThanOrEqual(3);
  });

  it('probar los webhooks dispara la prueba y avisa si el servidor la rechaza', async () => {
    puerto.pruebaWebhooks.mockResolvedValue(fallo(creaError('error-del-servidor')));

    await monta();
    await userEvent.click(await screen.findByRole('button', { name: 'Probar webhooks' }));

    expect(puerto.pruebaWebhooks).toHaveBeenCalled();
    expect(avisos.error).toHaveBeenCalledWith('No se pudo enviar el webhook de prueba.');
  });
});
