import { HttpErrorResponse } from '@angular/common/http';
import { mapeaError } from './mapea-error';

/**
 * La frontera entre HTTP y el resto de la aplicación.
 *
 * <p>De aquí para dentro nadie vuelve a mirar un código de estado: todas las pantallas deciden qué
 * enseñar mirando `tipo`. Si esta traducción se equivoca, el síntoma aparece muy lejos y no se parece a
 * la causa — una sesión caducada tratada como «error del servidor» pinta un «vuelve a intentarlo» donde
 * hacía falta mandar a la pantalla de acceso.
 */
describe('mapeaError', () => {
  function deHttp(status: number, cuerpo: unknown = {}) {
    return mapeaError(new HttpErrorResponse({ status, error: cuerpo }));
  }

  it('sin respuesta es falta de conexión, no un error del servidor', () => {
    /* El 0 de Angular significa que la petición no llegó a ninguna parte: sin red, servidor caído o
     * petición cancelada. Contarlo como fallo del servidor haría que la aplicación reintentara contra
     * algo con lo que no puede hablar. */
    expect(deHttp(0).tipo).toBe('sin-conexion');
  });

  it.each([
    [400, 'peticion-invalida'],
    [422, 'peticion-invalida'],
    [401, 'no-autenticado'],
    [403, 'sin-permiso'],
    [404, 'no-encontrado'],
    [409, 'conflicto'],
    [429, 'demasiadas-peticiones'],
    [500, 'error-del-servidor'],
    [503, 'error-del-servidor'],
    [418, 'desconocido'],
  ])('el %i se traduce como «%s»', (estado, tipo) => {
    expect(deHttp(estado).tipo).toBe(tipo);
  });

  /**
   * El texto sale del CUERPO porque lo localiza el backend con la cabecera `X-Lang`. Si el front tuviera
   * su propio diccionario de errores, habría dos textos distintos para el mismo fallo según quién lo
   * pintara, y solo uno de los dos se actualizaría.
   */
  it('el mensaje es el del backend, ya traducido', () => {
    expect(deHttp(409, { message: 'Ese correo ya tiene cuenta' }).mensaje).toBe(
      'Ese correo ya tiene cuenta',
    );
  });

  it('sin mensaje deja la cadena vacía, no un «undefined» que acabaría en pantalla', () => {
    expect(deHttp(500).mensaje).toBe('');
  });

  it('conserva el código, los errores por campo y el detalle', () => {
    const error = deHttp(400, {
      message: 'Revisa el formulario',
      code: 'VALIDACION',
      errors: { email: 'no vale' },
      details: { linea: 'p1' },
    });

    /* El código sirve para REACCIONAR (enseñar el campo del segundo factor, señalar la línea caducada),
     * no para pintar. Perderlo deja a la pantalla informando sin poder hacer nada. */
    expect(error.codigo).toBe('VALIDACION');
    expect(error.estado).toBe(400);
    expect(error.porCampo).toEqual({ email: 'no vale' });
    expect(error.detalles).toEqual({ linea: 'p1' });
  });

  it('un cuerpo nulo no rompe nada', () => {
    expect(mapeaError(new HttpErrorResponse({ status: 500, error: null })).tipo).toBe(
      'error-del-servidor',
    );
  });

  it('lo que no es un fallo de HTTP se marca como desconocido, conservando su mensaje', () => {
    expect(mapeaError(new Error('se rompió al leer'))).toEqual({
      tipo: 'desconocido',
      mensaje: 'se rompió al leer',
    });
  });

  it('y lo que no es ni siquiera un Error tampoco lanza', () => {
    expect(mapeaError('vaya').tipo).toBe('desconocido');
  });
});
