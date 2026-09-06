import {
  BorradorDeMentor, Mentor, cursoEnBlanco, envioValido, mentorAFormulario, mentorEnBlanco,
  mentorValido, separaPorComas,
} from './contenido';

describe('envioValido', () => {
  it('exige asunto, cuerpo y al menos un suscriptor', () => {
    expect(envioValido('Hola', '<p>Qué tal</p>', 10)).toBe(true);
    expect(envioValido('  ', '<p>Qué tal</p>', 10)).toBe(false);
    expect(envioValido('Hola', '   ', 10)).toBe(false);
    // Sin nadie a quien mandárselo, el envío no es que falle: es que no tiene sentido.
    expect(envioValido('Hola', '<p>Qué tal</p>', 0)).toBe(false);
  });
});

describe('cursoEnBlanco', () => {
  it('arranca en español, para principiantes y publicado', () => {
    const nuevo = cursoEnBlanco();

    expect(nuevo.idioma).toBe('es');
    expect(nuevo.nivel).toBe('BEGINNER');
    expect(nuevo.publicado).toBe(true);
    expect(nuevo.id).toBeUndefined();
  });
});

describe('separaPorComas', () => {
  it('parte, recorta y descarta los huecos', () => {
    expect(separaPorComas(' paid-ads , branding ,, ')).toEqual(['paid-ads', 'branding']);
  });

  it('sin nada escrito devuelve una lista vacía', () => {
    expect(separaPorComas('   ')).toEqual([]);
  });
});

describe('mentorAFormulario', () => {
  it('convierte las listas en texto separado por comas, que es como se teclean', () => {
    const mentor: Mentor = {
      id: 'm1', emailUsuario: 'a@b.com', nombre: 'Ana', titular: 'Experta', biografia: '',
      zonaHoraria: 'Europe/Madrid', tarifaUsdHora: 45, especialidades: ['ads', 'seo'],
      idiomas: ['es', 'en'], activo: true,
    };

    const formulario = mentorAFormulario(mentor);

    expect(formulario.especialidades).toBe('ads, seo');
    expect(formulario.idiomas).toBe('es, en');
    expect(formulario.tarifaUsdHora).toBe('45');
  });
});

describe('mentorValido', () => {
  function borrador(cambios: Partial<BorradorDeMentor> = {}): BorradorDeMentor {
    return { ...mentorEnBlanco(), ...cambios };
  }

  it('un mentor nuevo necesita titular y cuenta', () => {
    expect(mentorValido(borrador({ titular: 'Experta', emailUsuario: 'a@b.com' }))).toBe(true);
    expect(mentorValido(borrador({ titular: 'Experta' }))).toBe(false);
  });

  /** Un mentor ya creado va atado a su cuenta: cambiarla sería crear otro mentor. */
  it('uno ya creado solo necesita titular', () => {
    expect(mentorValido(borrador({ id: 'm1', titular: 'Experta' }))).toBe(true);
  });

  it('sin titular no vale nunca', () => {
    expect(mentorValido(borrador({ id: 'm1', titular: '  ' }))).toBe(false);
  });
});
