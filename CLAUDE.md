# front-nx036 — normas del proyecto

Réplica en Angular 22 del escaparate y el panel que hoy sirve el frontend React (`../frontend`).
Mismo backend, mismo diseño, misma funcionalidad. Lo que cambia es la tecnología y, sobre todo, la
**arquitectura**: aquí el negocio no vive en las pantallas.

Estas normas mandan sobre cualquier costumbre general. Si algo choca, gana lo escrito aquí.

---

## 1. Arquitectura hexagonal — la regla de dependencia

El código se organiza por **contexto acotado**, y cada contexto tiene su hexágono:

```
src/app/
├── core/                    Transversal: HTTP, errores, almacenamiento, configuración, registro.
├── shared/                  Tipos y datos puros: traducciones, países, formato. Sin Angular.
├── design-system/           Piezas visuales reutilizables SIN negocio: botón, diálogo, aviso, tabla.
├── features/<contexto>/
│   ├── domain/              Modelos, reglas y PUERTOS (interfaces). No conoce Angular ni la red.
│   ├── application/         Casos de uso y estado con signals. Habla por los puertos.
│   ├── infrastructure/      ADAPTADORES: implementan los puertos contra el backend, Stripe, el navegador.
│   └── presentation/        Componentes y páginas. Solo conocen casos de uso y modelos.
└── composition/             Raíz de composición: el ÚNICO sitio que ata cada puerto con su adaptador.
```

Quién puede importar a quién:

| Desde | Puede importar |
|---|---|
| `domain` | `domain`, `shared` |
| `application` | `application`, `domain`, `shared`, `core` |
| `infrastructure` | `infrastructure`, `domain`, `shared`, `core` |
| `presentation` | `presentation`, `application`, `domain`, `design-system`, `shared`, `core` |
| `composition` | todo |

**`presentation` NO puede importar `infrastructure`.** Es la prohibición que sostiene el diseño: una
pantalla no llama al backend, pide un caso de uso. Si pudiera, el hexágono sería decorativo.

Esto **no es una convención, es lint**: `eslint-plugin-boundaries` lo verifica y `npm run lint` falla.
Antes de dar nada por terminado, `npm run lint` tiene que estar en verde.

### Puertos y adaptadores en Angular

El puerto es una **interfaz** en `domain/port/` más un `InjectionToken` para poder inyectarlo:

```ts
// features/catalog/domain/port/catalog.port.ts
export interface CatalogPort {
  buscar(criterio: CriterioBusqueda): Promise<Result<PaginaProductos, AppError>>;
}
export const CATALOG_PORT = new InjectionToken<CatalogPort>('CatalogPort');
```

El adaptador vive en `infrastructure/` y **no se declara `providedIn: 'root'`**: se registra en
`composition/`, que es donde se decide qué implementación entra. Así, cambiar de proveedor —o poner un
doble en una prueba— es una línea en un sitio, no una búsqueda por todo el código.

---

## 2. SOLID, aplicado a lo que de verdad se escribe aquí

- **Responsabilidad única.** Un componente pinta; un caso de uso decide; un adaptador traduce. Un
  componente que además calcula precios o llama al backend hace tres cosas. El lint avisa a las 400
  líneas: pasarse casi siempre significa que había dos componentes.
- **Abierto/cerrado.** Añadir una pasarela de pago o un idioma se hace añadiendo un adaptador o un
  fichero de datos, no editando un `switch` repartido por las pantallas.
- **Sustitución de Liskov.** Todo adaptador cumple el contrato del puerto ENTERO, incluido cómo falla:
  devuelve `Result` con su `AppError`, no lanza excepciones que el caso de uso no espera.
- **Segregación de interfaces.** Puertos pequeños y por capacidad (`CatalogPort`, `FavoritesPort`), no
  un `ApiPort` con cuarenta métodos del que cada pantalla usa dos.
- **Inversión de dependencias.** El dominio define el puerto; la infraestructura se adapta a él. Nunca
  al revés: si un modelo de dominio tiene la forma de la respuesta del backend, está invertido.

---

## 3. Mobile first — OBLIGATORIO

**Toda pantalla se escribe primero para el móvil y se amplía hacia arriba.** No es una preferencia de
estilo: es requisito del proyecto.

- Las clases **sin prefijo son las del móvil**; el escritorio se añade con `sm:`, `md:`, `lg:`, `xl:`.
  ✅ `class="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-6"`
  ❌ `class="grid grid-cols-3 max-md:grid-cols-1"` — eso es escritorio primero.
- En CSS, las consultas de medio se escriben con `min-width`, nunca con `max-width`.
- Se diseña para la pantalla estrecha: una columna, objetivos táctiles de 44 px como mínimo, nada que
  dependa de pasar el ratón por encima, y el contenido importante sin desplazamiento horizontal.
- Al portar una pantalla del React, si el original estaba escrito al revés (`max-width`), **se invierte
  al portarla**, cuidando que el resultado se vea igual en las dos anchuras.

La única excepción son los bloques de `styles.css` heredados tal cual del React, que se conservan
porque el encargo es que el diseño no cambie ni un pixel. Todo lo demás, mobile first.

---

## 4. El CSS está centralizado

Todo el estilo vive en **`src/styles.css`**. Ningún componente declara `styles`, `styleUrl` ni
`styleUrls`: el lint lo impide y el generador de la CLI ni siquiera crea el fichero.

El motivo: el diseño sale de un sistema de utilidades (Tailwind 4 + daisyUI 5) sobre el tema NX036. En
cuanto una pantalla escribe su propio CSS, esa regla deja de pasar por el tema: no cambia con el tema
oscuro, no aparece al buscar de dónde sale un color, y la siguiente pantalla la copia. Lo que se repite
se convierte en una utilidad de `styles.css`, que es donde se corrige **una** vez.

`styles.css` es copia fiel del `index.css` del React, con sus correcciones de contraste ganadas a base
de incidencias. Al tocarlo, tocar también el del otro front: son el mismo diseño en dos tecnologías.

Ojo con el escaneo: los ficheros de datos (`shared/i18n`, `shared/data`, `shared/content`) están
excluidos con `@source not`. Son prosa en ocho idiomas y Tailwind confundía palabras sueltas con
utilidades: la hoja pasaba de 58 kB a 105 kB de reglas muertas.

---

## 5. Angular 22: lo que se usa y lo que no

Nada de API retirada ni de estilo de versiones anteriores. En concreto:

- **Signals para todo el estado.** `signal()`, `computed()`, `linkedSignal()`, `resource()` y
  `httpResource()`. Nada de `BehaviorSubject` para estado de pantalla.
- **Sin zone.js.** El proyecto es `zoneless`. Nada de `NgZone`, `zone.run()` ni `ChangeDetectorRef.detectChanges()`.
- **Componentes independientes.** Sin `NgModule`. No se escribe `standalone: true` (ya es lo normal).
- **Sin `ChangeDetectionStrategy.OnPush` explícito**: es el comportamiento por defecto en la v22.
- `input()`, `output()`, `model()`, `viewChild()`, `contentChild()` — **nunca** los decoradores
  `@Input`, `@Output`, `@ViewChild`, `@HostBinding` ni `@HostListener` (las asociaciones del anfitrión
  van en `host: {...}`).
- `inject()` en lugar de inyección por constructor.
- Flujo de control nativo en plantillas: `@if`, `@for`, `@switch`, `@defer`. Nunca `*ngIf`/`*ngFor`.
- Nada de `ngClass` ni `ngStyle`: asociaciones `[class.x]` y `[style.x]`.
- **Formularios: Signal Forms, SIEMPRE.** `form()` de `@angular/forms/signals` con la directiva
  `FormField`. No es una preferencia entre tres opciones: es la única.

  Y no basta con evitar `ngModel`. **Cablear un campo a mano —`[value]="x()"` más
  `(input)="x.set(...)"`— tampoco vale**, aunque use signals por dentro. Con eso se pierde justo lo que
  hace falta cuando un formulario crece: si un campo se ha tocado, si está sucio, la validación
  declarativa, la validación cruzada entre campos, y un único sitio donde preguntar si se puede enviar.
  Cada pantalla acaba resolviendo eso por su cuenta, y con doscientos campos son doscientas formas
  distintas de resolverlo.

  El patrón, tal como está en `features/auth/presentation/page/acceso.page.ts`:

  ```ts
  protected readonly modelo = signal({ email: '', contrasena: '' });
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.email);
    email(ruta.email);
    required(ruta.contrasena);
  });
  ```
  ```html
  <input [formField]="formulario.email" />
  @if (formulario.email().errors().length) { … }
  <button [disabled]="formulario().invalid()">Enviar</button>
  ```
- Imágenes estáticas con `NgOptimizedImage`.
- `@Service` para los servicios de raíz nuevos, en vez de `@Injectable({providedIn:'root'})`.

**Ninguna librería ni método obsoleto.** Antes de meter una dependencia, comprobar que declara Angular
22 en sus `peerDependencies`; si no, se escribe un adaptador propio en `infrastructure/` (es lo que se
hizo con Stripe y con las animaciones).

---

## 6. Renderizado: prerenderizado, sin servidor

El React apagó el renderizado en servidor el 6-sep-2026 porque el escaparate iba lento: el HTML salía
con `no-store`, no se cacheaba en el borde y cada navegación viajaba hasta Alemania.

Aquí **no hay servidor Node**. `outputMode: static`: el HTML de las páginas públicas se genera en el
build y lo sirve nginx como fichero estático, que Cloudflare cachea en el nodo más cercano. Encima, el
navegador **hidrata** ese HTML (`provideClientHydration` con hidratación incremental), así que se
recuperan las etiquetas de compartir que se perdieron al apagar el SSR, sin pagar coste por petición.

Regla práctica: lo público se prerenderiza (`RenderMode.Prerender`); lo que exige sesión —cuenta, cesta,
panel— se marca `RenderMode.Client`, porque su HTML depende de quién mira.

**Al construir hace falta `NEXADROP_API_INTERNA`**, apuntando a un backend accesible desde donde se
compila. Sin ella, el prerenderizado corre en Node con rutas relativas que no apuntan a ningún host,
las peticiones fallan **en silencio** y las páginas se escriben con sus marcadores de carga. No falla el
build: sale una web que parece prerenderizada y no lo está. Medido en la portada: con la variable,
3.995 caracteres de texto y 24 precios; sin ella, 1.035 y ninguno. Es el mismo fallo que tuvo el front
anterior con su renderizado en servidor.

**Y hace falta `NEXADROP_PRERENDER_TOKEN`** para que quepan más de quince fichas. El backend limita el
escaparate público a 100 peticiones por minuto y por IP —su defensa contra el volcado del catálogo— y
prerenderizar es, visto desde ahí, exactamente un volcado: sin testigo caben unas quince y el resto se
escriben con una página de error dentro, sin que nada falle. Con él, esas peticiones caen en la regla
`build.prerender` del backend (1.200/min).

El valor tiene que ser **el mismo** que `RATELIMIT_BUILD_TOKEN` en el backend contra el que se compila.
En local los dos viven en `infra/docker/.env`, y `npm run verifica:build` lee de ahí la clave (no
interpreta el fichero: es formato Compose y lleva valores con espacios sin comillas). Para la imagen se
pasa como argumento de construcción; está documentado en el `Dockerfile` y en el README de
`nexadrop-deploy`.

### El CSS crítico en línea va APAGADO, y no es un descuido

`optimization.styles.inlineCritical` está a `false` en las cuatro configuraciones que compilan de
verdad (`production`, `des`, `pre`, `pro`). `angular.json` es JSON y no admite comentarios, así que el
motivo se escribe aquí: es la clase de ajuste que alguien vuelve a encender por parecer una mejora.

Lo que hace esa optimización es extraer las reglas del primer pliegue, incrustarlas en el `<head>` y
cargar el resto **de forma diferida** con el truco de `media="print"` más un `<noscript>`. En una
aplicación cuyo diseño entero sale de utilidades —Tailwind más daisyUI sobre el tema NX036— el
«primer pliegue» no es un subconjunto pequeño ni estable: el extractor se dejaba fuera reglas que sí
se ven, y entre que se pintaba el HTML prerenderizado y llegaba la hoja completa había un parpadeo
con la maqueta rota. Se ve sobre todo en la portada, que es justo la primera impresión.

Con la hoja como un `<link rel="stylesheet">` normal, el navegador la trata como recurso bloqueante,
Cloudflare la sirve desde el borde ya cacheada y con hash en el nombre, y no hay ningún estado
intermedio que enseñar. Se paga en teoría un poco de primer pintado; en la práctica se cambia un
parpadeo visible por una espera que no se nota.

Es el mismo fallo, con otra cara, que el de los iconos que se pintaban gigantes en el primer render:
CSS que llega después del HTML que lo necesita.

---

## 7. Rendimiento: no se replica lo lento

Este porte **no es una copia literal**. El diseño y el comportamiento se heredan tal cual, pero donde
el original va lento y Angular 22 trae una forma de ir más rápido, se usa. Las siguientes no son
sugerencias:

- **Diferir lo que no se ve.** Todo bloque por debajo del pliegue —pie de página, chat, asistente,
  carruseles del final, secciones secundarias de la portada— va en `@defer` con su disparador:
  `@defer (on viewport)` para lo que aparece al bajar, `(on interaction)` para lo que espera un gesto,
  `(on idle)` para lo accesorio.
- **En las páginas prerenderizadas hay que declarar SIEMPRE LOS DOS disparadores**, el normal y el de
  hidratación: `@defer (on viewport; hydrate on viewport)`. Escribir solo `hydrate on viewport` deja el
  contenido INVISIBLE para quien llega navegando desde otra pantalla, porque entonces no hay HTML del
  servidor que hidratar y el bloque se queda sin nada que lo dispare. No es un defecto de pruebas: es
  contenido que no aparece en producción, y sin ruido de ningún tipo. Se detectó con seis bloques ya
  escritos así.
- **Carga en diferido por contexto**, que ya está montada: nadie que entre a mirar el catálogo se
  descarga el panel de administración.
- **Precarga selectiva**: una ruta que se visita mucho se marca con `data: { precarga: true }` y su
  código se adelanta de fondo **dos segundos después** del arranque, nunca antes. Precargarlo todo
  compite con lo que la persona está mirando ahora.
- **Imágenes con `NgOptimizedImage`**, y la principal de cada pantalla con `priority`. Es lo que decide
  el tiempo hasta que se ve algo útil en una ficha de producto.
- **Nada de repetir peticiones tras hidratar**: las que se hicieron al generar el HTML viajan dentro del
  documento y el navegador las reaprovecha.
- **Una sola petición por pantalla siempre que se pueda.** Si una vista necesita tres llamadas, mira si
  el backend ya ofrece una que las cubra; si no, dilo, pero no encadenes tres esperas.
- **`httpResource` con parámetros reactivos** en vez de suscribirse y volver a pedir a mano: la
  petición se repite sola cuando cambia el filtro, y se cancela sola cuando deja de hacer falta.
- **Sin `zone.js`**: no se repinta la aplicación entera porque haya terminado un temporizador. Repinta
  lo que depende del signal que ha cambiado, y nada más.
- **Listas con `track`** por identificador estable en todo `@for`. Un `track` por índice reconstruye la
  lista entera al reordenar.

Al abrir un cambio, la pregunta no es solo «¿hace lo mismo que el React?», sino **«¿lo hace en menos
tiempo o en menos bytes?»**. Si la respuesta es que va peor, hay que decirlo, no callarlo.

Referencias medidas hasta ahora: el arranque bajó de 1,72 MB a 447 kB al partir el diccionario de los
ocho idiomas, y la hoja de estilos de 105 kB a 58 kB al dejar los ficheros de datos fuera del escaneo.

---

### Certificar rendimiento: con optimización, o no vale

La configuración `local` trae `optimization: false` y mapas de origen, porque es la de trabajar. El
front anterior corre en local con su build de **producción**. Medir bytes de uno contra otro no compara
dos aplicaciones: compara dos configuraciones de compilación —26 MB contra 7,1 MB— y el resultado no
significa nada. Para certificar rendimiento hay que construir así:

```
NEXADROP_API_INTERNA=http://localhost:18082 ng build --configuration local \
  --optimization --source-map=false --output-hashing=all
```

Mismo entorno y mismo backend que `local`, pero comprimido como saldría a producción.

---

## 8. Pruebas

Norma del proyecto: **90 % de cobertura en el front**. Cada desarrollo llega con sus pruebas.

- Vitest (el que trae la CLI) con `@testing-library/angular`.
- El dominio y los casos de uso se prueban **sin Angular**: son funciones y clases puras, con un doble
  del puerto. Si para probar una regla de negocio hace falta montar un componente, la regla está en el
  sitio equivocado.
- Los componentes se prueban por lo que ve quien usa la aplicación (texto, papel accesible), no por sus
  detalles internos.

`npm test` en verde y `npm run lint` en verde antes de dar nada por terminado.

---

## 9. Idioma

Código y comentarios **en español**, como el resto del repositorio: los comentarios explican **por qué**,
no repiten lo que el código ya dice. Los identificadores del dominio conservan el vocabulario del negocio.
