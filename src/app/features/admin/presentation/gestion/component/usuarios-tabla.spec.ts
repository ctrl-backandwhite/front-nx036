import { render } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Rol } from '@features/auth/domain/model/usuario';
import { ROLES, UsuarioGestionado } from '../../../domain/gestion/model/usuarios';
import { CambioDeRol, UsuariosTabla } from './usuarios-tabla';

/**
 * El desplegable de ROL de cada cuenta.
 *
 * <p>Esto se escribe después de que el panel de PRODUCCIÓN enseñara a todas las cuentas como
 * «Administrador» —clientes incluidos— mientras en la base de datos eran USER. Un panel que miente
 * sobre quién manda es de lo peor que puede pasar en una pantalla de administración: quien lo mira no
 * tiene forma de saber que lo que ve es falso.
 *
 * <p>La causa era una sola línea: el `select` llevaba `[value]`, que el navegador aplica ANTES de que
 * existan sus opciones. Al no encontrar a cuál corresponde se queda en la PRIMERA de la lista, y la
 * lista empieza por 'ADMIN'.
 */
describe('UsuariosTabla · el rol que se enseña', () => {
  const opcionesDeRol = ROLES.map((r) => ({ valor: r, etiqueta: r }));

  function usuario(id: string, email: string, rol: Rol): UsuarioGestionado {
    return { id, email, rol, activo: true, accesosFallidos: 0 };
  }

  async function monta(usuarios: readonly UsuarioGestionado[]) {
    const cambios: CambioDeRol[] = [];
    const vista = await render(UsuariosTabla, {
      inputs: { usuarios, roles: opcionesDeRol },
      on: { cambiaRol: (c: CambioDeRol) => cambios.push(c) },
    });
    const selects = [...vista.container.querySelectorAll<HTMLSelectElement>('select')];
    return { vista, cambios, selects };
  }

  /** La comprobación que faltaba: cada fila tiene que enseñar EL SUYO, no el primero de la lista. */
  it('cada cuenta enseña su propio rol', async () => {
    const { selects } = await monta([
      usuario('1', 'cliente@nx036.com', 'USER'),
      usuario('2', 'jefe@nx036.com', 'ADMIN'),
      usuario('3', 'socio@nx036.com', 'PARTNER'),
    ]);

    expect(selects.map((s) => s.value)).toEqual(['USER', 'ADMIN', 'PARTNER']);
  });

  /**
   * Y en el caso exacto que se vio: 'ADMIN' es la PRIMERA de la lista, así que un fallo de este tipo
   * se disfraza justo aquí —un cliente pintado como administrador—.
   */
  it('un cliente no se pinta como administrador', async () => {
    const { selects } = await monta([usuario('1', 'cliente@nx036.com', 'USER')]);

    expect(ROLES[0], 'si ADMIN deja de ser el primero, esta prueba pierde su gracia').toBe('ADMIN');
    expect(selects[0].value).not.toBe('ADMIN');
  });

  /**
   * La otra mitad del mismo defecto, y la que hacía parecer que el rol no se podía editar: en la fila
   * de un cliente que se veía como «Administrador», elegir «Cliente» daba un valor IGUAL al que la
   * cuenta ya tenía, así que no se emitía nada y no pasaba nada.
   */
  it('cambiar el rol de un cliente a otro sí se emite', async () => {
    const { selects, cambios } = await monta([usuario('1', 'cliente@nx036.com', 'USER')]);

    await userEvent.selectOptions(selects[0], 'ADMIN');

    expect(cambios).toHaveLength(1);
    expect(cambios[0].rol).toBe('ADMIN');
    expect(cambios[0].usuario.email).toBe('cliente@nx036.com');
  });

  /** Elegir el que ya tiene no es un cambio: abrir la confirmación ahí sería ruido. */
  it('elegir el rol que ya tiene no emite nada', async () => {
    const { selects, cambios } = await monta([usuario('1', 'jefe@nx036.com', 'ADMIN')]);

    await userEvent.selectOptions(selects[0], 'ADMIN');

    expect(cambios).toEqual([]);
  });
});
