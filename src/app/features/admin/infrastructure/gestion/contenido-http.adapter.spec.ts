import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { cursoEnBlanco } from '../../domain/gestion/model/contenido';
import { MentorParaGuardar } from '../../domain/gestion/port/contenido.port';
import {
  BoletinHttpAdapter,
  CursosHttpAdapter,
  MentoresHttpAdapter,
} from './contenido-http.adapter';

/**
 * El contenido de la casa: boletín, academia y mentores.
 *
 * <p>Lo que se fija son los respaldos de la traducción, y no son cosmética en ninguno de los tres:
 *
 * <ul>
 *   <li>un curso sin marca de publicación se toma como NO publicado — al revés lo pondría a la vista de
 *       todo el mundo sin que nadie lo hubiera revisado;
 *   <li>una duración VACÍA se manda como ausente, no como cero: «cero minutos» es un dato y «no lo sé»
 *       no, y en una ficha de curso la diferencia se lee;
 *   <li>un mentor sin listas llega con listas vacías, no con nulos que revienten al recorrerlas.
 * </ul>
 */
describe('adaptadores de contenido', () => {
  function monta() {
    TestBed.configureTestingModule({
      providers: [
        BoletinHttpAdapter,
        CursosHttpAdapter,
        MentoresHttpAdapter,
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { apiBase: '', produccion: false, urlPublica: '', entorno: 'prueba' },
        },
      ],
    });
    return {
      boletin: TestBed.inject(BoletinHttpAdapter),
      cursos: TestBed.inject(CursosHttpAdapter),
      mentores: TestBed.inject(MentoresHttpAdapter),
      red: TestBed.inject(HttpTestingController),
    };
  }

  describe('boletín', () => {
    it('el resumen trae suscriptores y campañas', async () => {
      const { boletin, red } = monta();

      const enCurso = boletin.resumen();
      red.expectOne('/api/admin/newsletter').flush({
        subscribers: 1240,
        campaigns: [
          { id: 'c1', subject: 'Novedades', recipients: 1200, status: 'SENT', createdAt: '2026-09-01' },
        ],
      });

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor.suscriptores).toBe(1240);
      expect(resultado.ok && resultado.valor.campanas[0]).toEqual({
        id: 'c1',
        asunto: 'Novedades',
        destinatarios: 1200,
        estado: 'SENT',
        creadaEl: '2026-09-01',
      });
    });

    it('un resumen vacío no revienta al recorrerlo', async () => {
      const { boletin, red } = monta();

      const enCurso = boletin.resumen();
      red.expectOne('/api/admin/newsletter').flush(null);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor).toEqual({ suscriptores: 0, campanas: [] });
    });

    /** El recuento es lo único que dice a cuánta gente le ha llegado: sin él, no hay forma de saberlo. */
    it('enviar devuelve a cuántos destinatarios llegó', async () => {
      const { boletin, red } = monta();

      const enCurso = boletin.envia('Novedades', '<p>Hola</p>');
      const peticion = red.expectOne('/api/admin/newsletter/send');

      expect(peticion.request.body).toEqual({ subject: 'Novedades', bodyHtml: '<p>Hola</p>' });
      peticion.flush({ recipients: 1200 });

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor).toBe(1200);
    });

    it('sin recuento se lee como cero, no como «indefinido»', async () => {
      const { boletin, red } = monta();

      const enCurso = boletin.envia('x', 'y');
      red.expectOne('/api/admin/newsletter/send').flush({});

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor).toBe(0);
    });
  });

  describe('cursos', () => {
    it('traduce el curso al vocabulario del dominio', async () => {
      const { cursos, red } = monta();

      const enCurso = cursos.lista();
      red.expectOne('/api/admin/academy/courses').flush([
        {
          id: 'k1',
          title: 'Cómo importar',
          description: 'Desde cero',
          instructor: 'Ana',
          durationMinutes: 45,
          locale: 'es',
          level: 'BEGINNER',
          published: true,
        },
      ]);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor[0]).toMatchObject({
        id: 'k1',
        titulo: 'Cómo importar',
        instructor: 'Ana',
        duracionMinutos: 45,
        publicado: true,
      });
    });

    /** Darlo por publicado lo pondría a la vista de todos sin que nadie lo hubiera revisado. */
    it('un curso sin marca de publicación NO está publicado', async () => {
      const { cursos, red } = monta();

      const enCurso = cursos.lista();
      red.expectOne('/api/admin/academy/courses').flush([{ id: 'k1' }]);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor[0].publicado).toBe(false);
      expect(resultado.ok && resultado.valor[0].idioma).toBe('es');
      expect(resultado.ok && resultado.valor[0].nivel).toBe('BEGINNER');
      /* Sin duración no se inventa un cero: la ficha distingue «45 min» de «sin indicar». */
      expect(resultado.ok && 'duracionMinutos' in resultado.valor[0]).toBe(false);
    });

    it('al guardar, una duración vacía viaja como ausente y no como cero', async () => {
      const { cursos, red } = monta();

      const enCurso = cursos.crea({ ...cursoEnBlanco(), titulo: 'Nuevo' });
      const peticion = red.expectOne('/api/admin/academy/courses');

      expect(peticion.request.body.title).toBe('Nuevo');
      expect(peticion.request.body.durationMinutes).toBeUndefined();
      peticion.flush({});
      await enCurso;
    });

    it('con duración, viaja como número', async () => {
      const { cursos, red } = monta();

      const enCurso = cursos.crea({ ...cursoEnBlanco(), titulo: 'Nuevo', duracionMinutos: 45 });
      const peticion = red.expectOne('/api/admin/academy/courses');

      expect(peticion.request.body.durationMinutes).toBe(45);
      peticion.flush({});
      await enCurso;
    });

    it('editar y borrar van sobre el curso concreto', async () => {
      const { cursos, red } = monta();

      const editando = cursos.actualiza('k1', cursoEnBlanco());
      const puesta = red.expectOne('/api/admin/academy/courses/k1');
      expect(puesta.request.method).toBe('PUT');
      puesta.flush({});
      await editando;

      const borrando = cursos.borra('k1');
      const borrado = red.expectOne('/api/admin/academy/courses/k1');
      expect(borrado.request.method).toBe('DELETE');
      borrado.flush({});
      expect((await borrando).ok).toBe(true);
    });
  });

  describe('mentores', () => {
    const mentor = (parcial: Partial<MentorParaGuardar> = {}): MentorParaGuardar => ({
      emailUsuario: 'luis@nx036.com',
      titular: 'Importación desde China',
      biografia: 'Diez años',
      zonaHoraria: 'Europe/Madrid',
      tarifaUsdHora: 50,
      especialidades: ['aduanas'],
      idiomas: ['es', 'en'],
      activo: true,
      ...parcial,
    });

    it('traduce el mentor al vocabulario del dominio', async () => {
      const { mentores, red } = monta();

      const enCurso = mentores.lista();
      red.expectOne('/api/admin/mentors').flush([
        {
          id: 'm1',
          userEmail: 'luis@nx036.com',
          name: 'Luis Vega',
          hourlyRateUsd: 50,
          expertise: ['aduanas'],
          languages: ['es'],
          active: true,
          avatarUrl: 'https://cdn/luis.jpg',
        },
      ]);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor[0]).toMatchObject({
        id: 'm1',
        nombre: 'Luis Vega',
        tarifaUsdHora: 50,
        especialidades: ['aduanas'],
        avatarUrl: 'https://cdn/luis.jpg',
      });
    });

    it('un mentor sin listas llega con listas VACÍAS, no con nulos', async () => {
      const { mentores, red } = monta();

      const enCurso = mentores.lista();
      red.expectOne('/api/admin/mentors').flush([{ id: 'm1' }]);

      const resultado = await enCurso;
      /* Un nulo aquí revienta la plantilla al recorrerlo, y el fallo aparece al pintar la lista, lejos
       * de donde se originó. */
      expect(resultado.ok && resultado.valor[0].especialidades).toEqual([]);
      expect(resultado.ok && resultado.valor[0].idiomas).toEqual([]);
      expect(resultado.ok && resultado.valor[0].tarifaUsdHora).toBe(0);
      expect(resultado.ok && resultado.valor[0].activo).toBe(false);
      expect(resultado.ok && 'avatarUrl' in resultado.valor[0]).toBe(false);
    });

    it('crear manda el cuerpo con los nombres del servidor', async () => {
      const { mentores, red } = monta();

      const enCurso = mentores.crea(mentor());
      const peticion = red.expectOne('/api/admin/mentors');

      expect(peticion.request.body).toEqual({
        userEmail: 'luis@nx036.com',
        headline: 'Importación desde China',
        bio: 'Diez años',
        timezone: 'Europe/Madrid',
        hourlyRateUsd: 50,
        expertise: ['aduanas'],
        languages: ['es', 'en'],
        active: true,
      });
      peticion.flush({});
      await enCurso;
    });

    it('editar y borrar van sobre el mentor concreto', async () => {
      const { mentores, red } = monta();

      const editando = mentores.actualiza('m1', mentor({ activo: false }));
      const puesta = red.expectOne('/api/admin/mentors/m1');
      expect(puesta.request.method).toBe('PUT');
      puesta.flush({});
      await editando;

      const borrando = mentores.borra('m1');
      red.expectOne('/api/admin/mentors/m1').flush({});
      expect((await borrando).ok).toBe(true);
    });

    it('un fallo vuelve como error, no como excepción', async () => {
      const { mentores, red } = monta();

      const enCurso = mentores.lista();
      red.expectOne('/api/admin/mentors').error(new ProgressEvent('error'));

      expect((await enCurso).ok).toBe(false);
    });
  });
});
