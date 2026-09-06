import {
  conRespaldo,
  etiquetaDeEstado,
  falloDelCampo,
  mensajeDeError,
  textoDelErrorDeCampo,
  textoDelFalloDeAlta,
  textoDelFalloDeCategoria,
  textoDelProblema,
} from './etiquetas';

/** Un `t()` de mentira que solo conoce dos claves: lo demás devuelve la clave, como el de verdad. */
const t = (clave: string) =>
  ({
    'admin.catalog.status.ACTIVE': 'Publicado',
    'comun.repuesto': 'Algo salió mal',
    'dialog.field.required': 'Este campo es obligatorio.',
    'admin.categories.error.slug_format': 'Los slugs usan minúsculas, dígitos y guiones.',
  })[clave] ?? clave;
const tCon = (clave: string, valores: Record<string, string | number>) =>
  `${clave}:${Object.values(valores).join(',')}`;

describe('etiquetas de la presentación del catálogo', () => {
  describe('etiquetaDeEstado', () => {
    it('usa la traducción cuando existe', () => {
      expect(etiquetaDeEstado(t, 'ACTIVE')).toBe('Publicado');
    });

    /** Enseñar la constante en mayúsculas es peor que escribirla para una persona. */
    it('sin traducción, escribe el estado de forma legible', () => {
      expect(etiquetaDeEstado(t, 'AWAITING_PAYMENT')).toBe('Awaiting payment');
    });
  });

  it('cada motivo de categoría tiene su texto', () => {
    expect(textoDelFalloDeCategoria('slug_formato')).toBe('admin.categories.error.slug_format');
    expect(textoDelFalloDeCategoria('nombre_obligatorio')).toBe(
      'admin.categories.error.name_required',
    );
  });

  it('los motivos del alta apuntan al texto de campos obligatorios', () => {
    expect(textoDelFalloDeAlta('sin_precio')).toBe('admin.create_product.required');
  });

  describe('mensajeDeError', () => {
    /** Los textos de error los redacta el SERVIDOR: aquí solo se pintan. */
    it('prefiere el mensaje que redactó el backend', () => {
      expect(mensajeDeError(t, { mensaje: 'Falta la partida' })).toBe('Falta la partida');
    });

    it('sin mensaje cae al texto de repuesto', () => {
      expect(mensajeDeError(t, {}, 'comun.repuesto')).toBe('Algo salió mal');
    });
  });

  describe('textoDelProblema', () => {
    it('siempre dice en qué fila está el problema', () => {
      expect(
        textoDelProblema(t, tCon, { fila: 3, clave: 'admin.catalog.bulk.err_required', campo: 'moq' }),
      ).toBe('admin.catalog.bulk.row:3: admin.catalog.bulk.err_required:moq');
    });

    it('un problema de la lista entera no lleva número de fila', () => {
      expect(textoDelProblema(t, tCon, { fila: 0, clave: 'admin.catalog.bulk.empty' })).toBe(
        'admin.catalog.bulk.empty',
      );
    });
  });

  describe('textoDelErrorDeCampo', () => {
    it('usa la entrada del diccionario del motivo cuando existe', () => {
      expect(textoDelErrorDeCampo(t, { kind: 'required' })).toBe('Este campo es obligatorio.');
    });

    /** Un validador puede traer su propia clave: dice qué pasa en ESE campo, no un genérico. */
    it('la clave que trae el validador gana a la del motivo', () => {
      expect(
        textoDelErrorDeCampo(t, {
          kind: 'pattern',
          message: 'admin.categories.error.slug_format',
        }),
      ).toBe('Los slugs usan minúsculas, dígitos y guiones.');
    });

    /** Mientras la clave no esté en los ocho idiomas manda el respaldo, con el límite escrito. */
    it('sin clave en el diccionario, el respaldo incluye el límite', () => {
      expect(textoDelErrorDeCampo(t, { kind: 'max', max: 5 })).toBe('El valor máximo es 5.');
      expect(textoDelErrorDeCampo(t, { kind: 'maxLength', maxLength: 200 })).toBe(
        'No caben más de 200 caracteres.',
      );
    });

    it('un motivo desconocido cae al error genérico', () => {
      expect(textoDelErrorDeCampo(t, { kind: 'lo-que-sea' })).toBe('common.error');
    });
  });

  describe('falloDelCampo', () => {
    /** Un formulario que nace gritando «obligatorio» en todos los campos no informa de nada. */
    it('un campo sin tocar no avisa aunque tenga errores', () => {
      expect(falloDelCampo(t, { touched: () => false, errors: () => [{ kind: 'required' }] })).toBe(
        '',
      );
    });

    it('tocado y con errores, enseña el primero', () => {
      expect(
        falloDelCampo(t, {
          touched: () => true,
          errors: () => [{ kind: 'required' }, { kind: 'max', max: 5 }],
        }),
      ).toBe('Este campo es obligatorio.');
    });

    it('sin errores devuelve la cadena vacía, que en la plantilla es «no pintes nada»', () => {
      expect(falloDelCampo(t, { touched: () => true, errors: () => [] })).toBe('');
    });
  });

  describe('conRespaldo', () => {
    /** El respaldo es un puente: la clave manda en cuanto el diccionario la tenga. */
    it('la traducción gana al respaldo', () => {
      expect(conRespaldo(t, 'admin.catalog.status.ACTIVE', 'De repuesto')).toBe('Publicado');
    });

    it('sin traducción se enseña el respaldo, no la clave', () => {
      expect(conRespaldo(t, 'clave.que.no.existe', 'De repuesto')).toBe('De repuesto');
    });
  });
});
