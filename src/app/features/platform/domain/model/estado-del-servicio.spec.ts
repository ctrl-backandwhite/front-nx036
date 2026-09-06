import { claveDeLaInsignia, claveDelTitular, saludSegun } from './estado-del-servicio';

describe('saludSegun', () => {
  it('mientras se comprueba NO se dice que esté degradado', () => {
    // Un parpadeo de alarma cada vez que alguien abre la página es peor que no tener página.
    expect(saludSegun(true, false)).toBe('comprobando');
    expect(saludSegun(true, true)).toBe('comprobando');
  });

  it('si respondió, operativo; si no, degradado', () => {
    expect(saludSegun(false, true)).toBe('operativo');
    expect(saludSegun(false, false)).toBe('degradado');
  });
});

describe('claves del diccionario', () => {
  it('el titular cambia con la salud', () => {
    expect(claveDelTitular('comprobando')).toBe('status.checking');
    expect(claveDelTitular('operativo')).toBe('status.all_ok');
    expect(claveDelTitular('degradado')).toBe('status.degraded');
  });

  it('la insignia de cada componente también', () => {
    expect(claveDeLaInsignia('comprobando')).toBe('status.checking');
    expect(claveDeLaInsignia('operativo')).toBe('status.operational');
    expect(claveDeLaInsignia('degradado')).toBe('status.issues');
  });
});
