import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { mentorEnBlanco } from '../../../domain/gestion/model/contenido';
import {
  BOLETIN_PORT, BoletinPort, MENTORES_PORT, MentorParaGuardar, MentoresPort,
} from '../../../domain/gestion/port/contenido.port';
import { EnviaElBoletin, GuardaElMentor } from './contenido.use-case';

describe('EnviaElBoletin', () => {
  let enviados: { asunto: string; cuerpo: string }[];
  let puerto: BoletinPort;

  beforeEach(() => {
    enviados = [];
    puerto = {
      resumen: async () => exito({ suscriptores: 0, campanas: [] }),
      envia: async (asunto, cuerpo) => (enviados.push({ asunto, cuerpo }), exito(120)),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: BOLETIN_PORT, useValue: puerto }, EnviaElBoletin],
    });
  });

  it('manda el asunto y el cuerpo recortados y devuelve a cuántos llegó', async () => {
    const resultado = await TestBed.inject(EnviaElBoletin).ejecuta('  Rebajas  ', '  <p>Hola</p>  ');

    expect(resultado).toEqual({ ok: true, valor: 120 });
    expect(enviados).toEqual([{ asunto: 'Rebajas', cuerpo: '<p>Hola</p>' }]);
  });

  /** Sale un correo por suscriptor y no hay vuelta atrás: un envío en blanco no puede salir nunca. */
  it('no manda nada si falta el asunto o el cuerpo', async () => {
    const caso = TestBed.inject(EnviaElBoletin);

    expect((await caso.ejecuta('  ', 'cuerpo')).ok).toBe(false);
    expect((await caso.ejecuta('asunto', '  ')).ok).toBe(false);
    expect(enviados).toEqual([]);
  });
});

describe('GuardaElMentor', () => {
  let guardados: MentorParaGuardar[];
  let actualizados: string[];
  let puerto: MentoresPort;

  beforeEach(() => {
    guardados = [];
    actualizados = [];
    puerto = {
      lista: async () => exito([]),
      crea: async (m) => (guardados.push(m), exito(undefined)),
      actualiza: async (id, m) => (actualizados.push(id), guardados.push(m), exito(undefined)),
      borra: async () => exito(undefined),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: MENTORES_PORT, useValue: puerto }, GuardaElMentor],
    });
  });

  /** Las listas se teclean separadas por comas —es lo natural— y se parten al salir del formulario. */
  it('parte las especialidades y los idiomas antes de mandarlos', async () => {
    await TestBed.inject(GuardaElMentor).ejecuta({
      ...mentorEnBlanco(),
      emailUsuario: 'a@b.com',
      titular: 'Experta en anuncios',
      especialidades: ' paid-ads , branding ',
      idiomas: 'es,en',
      tarifaUsdHora: '45',
    });

    expect(guardados[0].especialidades).toEqual(['paid-ads', 'branding']);
    expect(guardados[0].idiomas).toEqual(['es', 'en']);
    expect(guardados[0].tarifaUsdHora).toBe(45);
  });

  it('sin tarifa escrita manda cero, no un valor que no es número', async () => {
    await TestBed.inject(GuardaElMentor).ejecuta({
      ...mentorEnBlanco(), emailUsuario: 'a@b.com', titular: 'Experta',
    });

    expect(guardados[0].tarifaUsdHora).toBe(0);
  });

  it('actualiza cuando el mentor ya existe', async () => {
    await TestBed.inject(GuardaElMentor).ejecuta({
      ...mentorEnBlanco(), id: 'm1', titular: 'Experta',
    });

    expect(actualizados).toEqual(['m1']);
  });

  it('no guarda un mentor nuevo sin titular ni sin cuenta', async () => {
    const caso = TestBed.inject(GuardaElMentor);

    expect((await caso.ejecuta({ ...mentorEnBlanco(), emailUsuario: 'a@b.com' })).ok).toBe(false);
    expect((await caso.ejecuta({ ...mentorEnBlanco(), titular: 'Experta' })).ok).toBe(false);
    expect(guardados).toEqual([]);
  });

  it('propaga el fallo del puerto', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: MENTORES_PORT, useValue: { ...puerto, crea: async () => fallo(creaError('conflicto')) } },
        GuardaElMentor,
      ],
    });

    const resultado = await TestBed.inject(GuardaElMentor).ejecuta({
      ...mentorEnBlanco(), emailUsuario: 'a@b.com', titular: 'Experta',
    });

    expect(resultado.ok).toBe(false);
  });
});
