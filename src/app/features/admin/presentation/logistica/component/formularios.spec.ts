import { TestBed } from '@angular/core/testing';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { COOKIE_IDIOMA } from '@core/preferences/preferencias';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import {
  ALTA_DE_PEDIDOS_PORT,
  BUSCADOR_DE_PRODUCTOS_PORT,
  LECTOR_DE_PEDIDOS_PEGADOS_PORT,
} from '../../../domain/logistica/port/pedidos-admin.port';
import { PAIS_COMODIN, limiteEnBlanco } from '../../../domain/logistica/model/limite-transportista';
import { almacenEnBlanco } from '../../../domain/logistica/model/almacen';
import {
  BuscaProductosParaPedido,
  CreaPedido,
  ImportaPedidos,
} from '../../../application/logistica/use-case/alta-de-pedidos.use-case';
import { LeePedidosPegados } from '../../../application/logistica/use-case/lee-pedidos-pegados.use-case';
import { FormularioDeAlmacen } from './formulario-de-almacen';
import { FormularioDeLimite } from './formulario-de-limite';
import { ModalAltaDePedido } from './modal-alta-de-pedido';
import { ModalImportaPedidos } from './modal-importa-pedidos';

/**
 * Montar una pantalla completa con sus tablas y sus diálogos tarda más que el plazo por defecto, sobre
 * todo en la primera prueba del fichero, que además compila la plantilla. Se amplía para el fichero
 * entero: un plazo corto aquí solo produce fallos que no señalan ningún defecto.
 */
vi.setConfig({ testTimeout: 30_000 });

beforeEach(() => {
  document.cookie = `${COOKIE_IDIOMA}=es; Path=/`;
});

describe('FormularioDeAlmacen', () => {
  it('sin código ni nombre no deja guardar: sin ellos no se identifica en el albarán', async () => {
    await render(FormularioDeAlmacen, { inputs: { datos: almacenEnBlanco() } });

    expect(screen.getByRole('button', { name: /Guardar/i })).toBeDisabled();
  });

  it('con código y nombre ya se puede guardar, y publica lo tecleado', async () => {
    const guarda = vi.fn();
    await render(FormularioDeAlmacen, {
      inputs: { datos: almacenEnBlanco() },
      on: { guarda },
    });

    await userEvent.type(screen.getByLabelText(/Código/i), 'ES-BCN');
    await userEvent.type(screen.getByLabelText(/Nombre/i), 'Barcelona');
    await userEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    expect(guarda).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'ES-BCN', nombre: 'Barcelona' }),
    );
  });

  /**
   * El dominio compara con `.trim()`, y el `required` de Signal Forms da por bueno un texto de solo
   * espacios: sin la regla propia, el formulario dejaría mandar un código que el backend rechaza.
   */
  it('un código de solo espacios no cuenta como relleno', async () => {
    await render(FormularioDeAlmacen, { inputs: { datos: almacenEnBlanco() } });

    await userEvent.type(screen.getByLabelText(/Código/i), '   ');
    await userEvent.type(screen.getByLabelText(/Nombre/i), 'Barcelona');

    expect(screen.getByRole('button', { name: /Guardar/i })).toBeDisabled();
  });

  it('al salir de un campo obligatorio vacío lo dice en el propio campo', async () => {
    await render(FormularioDeAlmacen, { inputs: { datos: almacenEnBlanco() } });

    await userEvent.click(screen.getByLabelText(/Código/i));
    await userEvent.tab();

    expect(await screen.findByText(/obligatorio/i)).toBeInTheDocument();
  });

  /** La fila de la tabla no se toca hasta que el guardado sale bien. */
  it('edita sobre una copia: cancelar no cambia nada de fuera', async () => {
    const datos = { ...almacenEnBlanco(), codigo: 'ES-MAD', nombre: 'Madrid' };
    const cancela = vi.fn();
    await render(FormularioDeAlmacen, { inputs: { datos, editando: true }, on: { cancela } });

    await userEvent.type(screen.getByLabelText(/Código/i), 'X');
    await userEvent.click(screen.getByRole('button', { name: /Cancelar/i }));

    expect(cancela).toHaveBeenCalled();
    expect(datos.codigo).toBe('ES-MAD');
  });
});

describe('FormularioDeLimite', () => {
  /** El par canal+país es la clave: cambiarlos crearía otra fila en vez de modificar esta. */
  it('al EDITAR, canal y país quedan bloqueados', async () => {
    await render(FormularioDeLimite, {
      inputs: {
        limite: { ...limiteEnBlanco(), canal: 'FZZXR', pais: 'ES' },
        esAlta: false,
      },
    });

    expect(screen.getByLabelText(/Canal/i)).toBeDisabled();
    expect(screen.getByLabelText(/Destino/i)).toBeDisabled();
  });

  it('en el ALTA sí se escriben, y el canal sube a mayúsculas', async () => {
    await render(FormularioDeLimite, {
      inputs: { limite: limiteEnBlanco(), esAlta: true },
    });

    const canal = screen.getByLabelText(/Canal/i);
    await userEvent.type(canal, 'fzzxr');

    expect(canal).toHaveValue('FZZXR');
  });

  it('sin canal no deja guardar', async () => {
    await render(FormularioDeLimite, {
      inputs: { limite: limiteEnBlanco(), esAlta: true },
    });

    expect(screen.getByRole('button', { name: /Guardar/i })).toBeDisabled();
  });

  it('desmarcar el comodín vacía el destino para poder escribir uno concreto', async () => {
    const { fixture } = await render(FormularioDeLimite, {
      inputs: { limite: { ...limiteEnBlanco(), canal: 'FZZXR' }, esAlta: true },
    });

    const comodin = screen.getAllByRole('checkbox')[0];
    expect(comodin).toBeChecked();

    await userEvent.click(comodin);
    fixture.detectChanges();

    expect(screen.getByLabelText(/Destino/i)).toHaveValue('');
  });

  /**
   * Un peso por encima de lo que admite el canal emite una guía que el transportista rechaza en el
   * almacén y deja el pedido parado: el formulario lo para antes de que salga.
   */
  it('un peso máximo disparatado no deja guardar', async () => {
    await render(FormularioDeLimite, {
      inputs: { limite: { ...limiteEnBlanco(), canal: 'FZZXR' }, esAlta: true },
    });

    const peso = screen.getByLabelText(/Peso máximo/i);
    await userEvent.clear(peso);
    await userEvent.type(peso, '500000');

    expect(screen.getByRole('button', { name: /Guardar/i })).toBeDisabled();
  });

  /** Un número que se queda a medias no es un cero: no se puede mandar como si lo fuera. */
  it('un número borrado del todo no deja guardar', async () => {
    await render(FormularioDeLimite, {
      inputs: { limite: { ...limiteEnBlanco(), canal: 'FZZXR' }, esAlta: true },
    });

    await userEvent.clear(screen.getByLabelText(/Mínimo facturable/i));

    expect(screen.getByRole('button', { name: /Guardar/i })).toBeDisabled();
  });

  /** El comodín bloquea el destino: bloqueado y vacío NO puede contar como «falta rellenarlo». */
  it('con el comodín marcado el destino vacío no impide guardar', async () => {
    await render(FormularioDeLimite, {
      inputs: { limite: { ...limiteEnBlanco(), canal: 'FZZXR' }, esAlta: true },
    });

    expect(screen.getByLabelText(/Destino/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /Guardar/i })).toBeEnabled();
  });

  it('publica el límite editado al guardar', async () => {
    const guarda = vi.fn();
    await render(FormularioDeLimite, {
      inputs: { limite: { ...limiteEnBlanco(), canal: 'FZZXR' }, esAlta: true },
      on: { guarda },
    });

    await userEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    expect(guarda).toHaveBeenCalledWith(
      expect.objectContaining({ canal: 'FZZXR', pais: PAIS_COMODIN }),
    );
  });
});

describe('ModalAltaDePedido', () => {
  function dobles() {
    return {
      alta: { crea: vi.fn().mockResolvedValue(exito(undefined)), importa: vi.fn(), creaDemostracion: vi.fn() },
      buscador: {
        busca: vi.fn().mockResolvedValue(exito([{ id: 'x', titulo: 'Gorro de lana' }])),
      },
    };
  }

  async function monta() {
    const puertos = dobles();
    const cierra = vi.fn();
    const creado = vi.fn();
    const vista = await render(ModalAltaDePedido, {
      providers: [
        CreaPedido,
        BuscaProductosParaPedido,
        { provide: ALTA_DE_PEDIDOS_PORT, useValue: puertos.alta },
        { provide: BUSCADOR_DE_PRODUCTOS_PORT, useValue: puertos.buscador },
      ],
      on: { cierra, creado },
    });
    return { ...vista, puertos, cierra, creado };
  }

  it('sin líneas avisa de que faltan artículos y no llama al backend', async () => {
    const { puertos } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => expect(TestBed.inject(AvisosStore).avisos().length).toBeGreaterThan(0));
    expect(puertos.alta.crea).not.toHaveBeenCalled();
  });

  it('buscar un producto ofrece sugerencias y añadirlo crea una línea', async () => {
    const { puertos } = await monta();

    await userEvent.type(screen.getByLabelText(/Artículos|Productos/i), 'gorro');
    await waitFor(() => expect(puertos.buscador.busca).toHaveBeenCalled());

    await userEvent.click(await screen.findByRole('button', { name: /Gorro de lana/ }));

    expect(await screen.findByRole('spinbutton', { name: 'Gorro de lana' })).toHaveValue(1);
  });

  /** Añadir dos veces el mismo producto SUMA en vez de repetir la línea. */
  it('añadir dos veces el mismo producto suma una unidad', async () => {
    await monta();

    await userEvent.type(screen.getByLabelText(/Artículos|Productos/i), 'gorro');
    const sugerencia = await screen.findByRole('button', { name: /Gorro de lana/ });
    await userEvent.click(sugerencia);
    await userEvent.click(await screen.findByRole('button', { name: /Gorro de lana/ }));

    expect(await screen.findByRole('spinbutton', { name: 'Gorro de lana' })).toHaveValue(2);
  });

  it('con líneas pero sin dirección avisa de la dirección', async () => {
    const { puertos } = await monta();

    await userEvent.type(screen.getByLabelText(/Artículos|Productos/i), 'gorro');
    await userEvent.click(await screen.findByRole('button', { name: /Gorro de lana/ }));
    await userEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => expect(TestBed.inject(AvisosStore).avisos().length).toBeGreaterThan(0));
    expect(puertos.alta.crea).not.toHaveBeenCalled();
  });

  it('con líneas y dirección manda el alta y cierra', async () => {
    const { puertos, creado, cierra } = await monta();

    await userEvent.type(screen.getByLabelText(/Artículos|Productos/i), 'gorro');
    await userEvent.click(await screen.findByRole('button', { name: /Gorro de lana/ }));
    await userEvent.type(screen.getByLabelText(/Nombre completo/i), 'Ana');
    await userEvent.type(screen.getByLabelText(/línea 1/i), 'C/ Mayor 1');
    await userEvent.type(screen.getByLabelText(/Ciudad/i), 'Madrid');
    await userEvent.type(screen.getByLabelText(/^País/i), 'ES');
    await userEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => expect(puertos.alta.crea).toHaveBeenCalled());
    expect(creado).toHaveBeenCalled();
    expect(cierra).toHaveBeenCalled();
  });
});

describe('ModalImportaPedidos', () => {
  function monta(lector: { interpreta: ReturnType<typeof vi.fn> }, importa = vi.fn()) {
    const importado = vi.fn();
    return render(ModalImportaPedidos, {
      providers: [
        LeePedidosPegados,
        ImportaPedidos,
        { provide: LECTOR_DE_PEDIDOS_PEGADOS_PORT, useValue: lector },
        {
          provide: ALTA_DE_PEDIDOS_PORT,
          useValue: { crea: vi.fn(), importa, creaDemostracion: vi.fn() },
        },
      ],
      on: { importado },
    }).then((vista) => ({ ...vista, importado }));
  }

  it('un volcado mal formado se avisa sin llamar al backend', async () => {
    const importa = vi.fn();
    await monta({ interpreta: vi.fn().mockReturnValue(fallo('formato')) }, importa);

    await userEvent.click(screen.getByRole('button', { name: /Importar/i }));

    await waitFor(() => expect(TestBed.inject(AvisosStore).avisos().length).toBeGreaterThan(0));
    expect(importa).not.toHaveBeenCalled();
  });

  it('cargar el ejemplo rellena el área de texto', async () => {
    await monta({ interpreta: vi.fn() });

    await userEvent.click(screen.getByRole('button', { name: /ejemplo/i }));

    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toContain(
      'shippingAddress',
    );
  });

  /** Con una fila fallida hay que saber CUÁL para corregirla y reintentar solo esa. */
  it('el parte se enseña por fila cuando alguna falla', async () => {
    const importa = vi
      .fn()
      .mockResolvedValue(exito({ importados: 1, fallidos: 1, errores: ['fila 2: sin producto'] }));
    const { importado } = await monta(
      { interpreta: vi.fn().mockReturnValue(exito([])) },
      importa,
    );

    await userEvent.click(screen.getByRole('button', { name: /Importar/i }));

    expect(await screen.findByText(/fila 2: sin producto/)).toBeInTheDocument();
    expect(importado).toHaveBeenCalled();
  });

  it('un fallo del backend se enseña sin dejar un parte a medias', async () => {
    const importa = vi.fn().mockResolvedValue(fallo(creaError('error-del-servidor', 'se cayó')));
    await monta({ interpreta: vi.fn().mockReturnValue(exito([])) }, importa);

    await userEvent.click(screen.getByRole('button', { name: /Importar/i }));

    await waitFor(() =>
      expect(TestBed.inject(AvisosStore).avisos().some((a) => a.mensaje === 'se cayó')).toBe(true),
    );
  });
});
