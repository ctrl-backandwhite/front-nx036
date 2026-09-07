// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const boundaries = require('eslint-plugin-boundaries');

/** Los contextos acotados de la aplicación. Al añadir uno, se añade aquí y las reglas lo cubren solas. */
const CONTEXTOS = [
  'account', 'admin', 'affiliate', 'auth', 'cart', 'catalog',
  'checkout', 'notifications', 'orders', 'platform', 'support', 'wallet',
];

/**
 * La regla de dependencia de la arquitectura hexagonal se verifica AQUÍ, no en una revisión de código:
 * si una capa importa de otra que tiene prohibida, el lint falla y el build de integración continua
 * con él. Una arquitectura que solo vive en un documento se erosiona en la primera semana con prisa.
 *
 * El hexágono, de dentro afuera:
 *
 *   domain          Modelos, reglas y PUERTOS (interfaces). No conoce Angular, ni HTTP, ni el navegador.
 *   application     Casos de uso y estado con signals. Habla con el dominio a través de sus puertos.
 *   infrastructure  ADAPTADORES: implementan los puertos contra el backend, el almacenamiento, Stripe...
 *   presentation    Componentes y páginas. Solo conocen casos de uso y modelos.
 *   composition     La raíz de composición: el ÚNICO sitio que ata cada puerto con su adaptador.
 *
 * La prohibición que de verdad sostiene el diseño es `presentation ✗ infrastructure`: una pantalla no
 * puede llamar al backend por su cuenta. Si pudiera, el hexágono sería decorativo — la lógica se
 * escaparía a las plantillas y cambiar de proveedor obligaría a tocar la interfaz de usuario.
 */
module.exports = defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.angular/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'nx', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'nx', style: 'kebab-case' },
      ],

      // El tipo `any` desactiva justo la barrera que sostiene el contrato entre capas.
      '@typescript-eslint/no-explicit-any': 'error',

      /*
       * Un argumento que no se usa se marca, SALVO que empiece por guion bajo.
       *
       * <p>La excepción hace falta para los dobles de prueba. Un doble tiene que declarar la firma
       * ENTERA del método al que sustituye —si no, TypeScript no sabe qué tipo tienen los argumentos
       * recogidos y `mock.calls[0][0]` deja de comprobarse—, y sin embargo casi ninguno los usa por
       * dentro. Sin esta excepción, la salida era escribir dobles sin tipar, que es peor: la prueba
       * seguiría compilando el día que el método cambie de argumentos.
       *
       * <p>El guion bajo es la marca explícita de «esto sobra a propósito», que es justo lo que
       * distingue un argumento decorativo de uno que se ha olvidado usar.
       */
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      // Nada de decoradores heredados ni de APIs retiradas: el proyecto nace en Angular 22 y no
      // arrastra el estilo de las versiones anteriores.
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-output-emitter-ref': 'error',
      '@angular-eslint/no-input-rename': 'error',
      '@angular-eslint/no-output-native': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/no-attribute-decorator': 'error',
      '@angular-eslint/no-host-metadata-property': 'off',

      // Una clase con demasiadas responsabilidades se detecta antes por su tamaño que leyéndola.
      // (Principio de responsabilidad única: si un componente no cabe, es que hace dos cosas.)
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 12],

      /* El CSS del proyecto está CENTRALIZADO en `src/styles/`. Un componente no declara estilo propio:
       * ni `styles`, ni `styleUrl`, ni `styleUrls`.
       *
       * El motivo es que el diseño se hereda de un sistema de utilidades (Tailwind + daisyUI) con un
       * tema —NX036— del que salen todos los colores, radios y sombras. En cuanto una pantalla escribe
       * su propio CSS, esa regla deja de pasar por el tema: no cambia al cambiar de tema claro a oscuro,
       * no se ve al buscar de dónde sale un color, y la siguiente pantalla la copia. El estilo repetido
       * se convierte en una utilidad de `src/styles/`, que es donde se puede corregir UNA vez. */
      'no-restricted-syntax': [
        'error',
        {
          selector: "Decorator[expression.callee.name='Component'] Property[key.name='styles']",
          message: 'El CSS va centralizado en src/styles/, no dentro del componente.',
        },
        {
          selector: "Decorator[expression.callee.name='Component'] Property[key.name='styleUrl']",
          message: 'El CSS va centralizado en src/styles/, no dentro del componente.',
        },
        {
          selector: "Decorator[expression.callee.name='Component'] Property[key.name='styleUrls']",
          message: 'El CSS va centralizado en src/styles/, no dentro del componente.',
        },
      ],
    },
  },

  // ── La regla de dependencia ────────────────────────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      // Cada patrón captura el CONTEXTO en `${contexto}`: es lo que permite después distinguir «el
      // dominio de mi propio contexto» de «el dominio del contexto de al lado».
      'boundaries/elements': [
        { type: 'composition', pattern: 'src/app/composition' },
        { type: 'core', pattern: 'src/app/core' },
        { type: 'shared', pattern: 'src/app/shared' },
        { type: 'ds', pattern: 'src/app/design-system' },
        { type: 'layout', pattern: 'src/app/layout' },
        {
          type: 'domain',
         
          pattern: 'src/app/features/*/domain',
          capture: ['contexto'],
        },
        {
          type: 'application',
         
          pattern: 'src/app/features/*/application',
          capture: ['contexto'],
        },
        {
          type: 'infrastructure',
         
          pattern: 'src/app/features/*/infrastructure',
          capture: ['contexto'],
        },
        {
          type: 'presentation',
         
          pattern: 'src/app/features/*/presentation',
          capture: ['contexto'],
        },
      ],
      'boundaries/ignore': ['**/*.spec.ts', 'src/test-setup.ts'],

      /* Sin esto la regla no vigila NADA y no se nota: el resolvedor por defecto solo entiende
       * JavaScript, así que toda importación de un `.ts` —o cualquiera escrita con un alias como
       * `@core/...`— se clasificaba como «destino desconocido» y la política ni se llegaba a evaluar.
       * El lint pasaba en verde con violaciones flagrantes delante. Se descubrió metiendo dos a
       * propósito y viendo que no saltaban. */
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            /* Las capas de DENTRO de un contexto solo se ven entre ellas: la plantilla
             * `{{from.element.capture.contexto}}` exige que el destino sea del MISMO contexto acotado.
             * Sin ella, «catalog» podría llamar al caso de uso de «cart» y los dos dejarían de poder
             * evolucionar por separado, que es justo lo que se compra con esta arquitectura. */
            {
              from: { element: { type: 'domain' } },
              allow: {
                to: {
                  element: {
                    type: 'domain',
                    capture: { contexto: '{{from.element.capture.contexto}}' },
                  },
                },
              },
            },
            {
              from: { element: { type: 'application' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['application', 'domain'] },
                    capture: { contexto: '{{from.element.capture.contexto}}' },
                  },
                },
              },
            },
            {
              from: { element: { type: 'infrastructure' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['infrastructure', 'domain'] },
                    capture: { contexto: '{{from.element.capture.contexto}}' },
                  },
                },
              },
            },
            /* Una pantalla NO puede importar un adaptador: `infrastructure` no está en esta lista, y esa
             * ausencia es la que sostiene el diseño entero. Pide un caso de uso y ya está. */
            {
              from: { element: { type: 'presentation' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['presentation', 'application', 'domain'] },
                    capture: { contexto: '{{from.element.capture.contexto}}' },
                  },
                },
              },
            },

            /* El DOMINIO de otro contexto sí es visible: los modelos y los puertos son su contrato
             * público. Lo que queda dentro —casos de uso, adaptadores, pantallas— no lo es. */
            {
              from: {
                element: {
                  types: { anyOf: ['application', 'infrastructure', 'presentation'] },
                },
              },
              allow: { to: { element: { type: 'domain' } } },
            },

            // Lo transversal lo puede usar cualquiera, con la escala de siempre: cuanto más adentro del
            // hexágono, menos cosas se ven.
            {
              from: { element: { type: 'domain' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            {
              from: {
                element: {
                  types: { anyOf: ['application', 'infrastructure'] },
                },
              },
              allow: { to: { element: { types: { anyOf: ['shared', 'core'] } } } },
            },
            {
              from: { element: { type: 'presentation' } },
              allow: { to: { element: { types: { anyOf: ['ds', 'shared', 'core'] } } } },
            },
            {
              from: { element: { type: 'ds' } },
              allow: { to: { element: { types: { anyOf: ['ds', 'shared', 'core'] } } } },
            },
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            {
              from: { element: { type: 'core' } },
              allow: { to: { element: { types: { anyOf: ['core', 'shared'] } } } },
            },

            // Los marcos de página y la raíz de composición ven el mapa entero: ensamblar es su trabajo.
            {
              from: { element: { types: { anyOf: ['layout', 'composition'] } } },
              allow: { to: { element: { type: '*' } } },
            },
          ],
        },
      ],
    },
  },


  /* ── Aislamiento entre contextos acotados ────────────────────────────────────────────────────
   *
   * La regla de CAPAS la vigila `boundaries` (arriba). Lo que no consigue vigilar es que un contexto no
   * se meta en las tripas de OTRO: se intentó con su selector de capturas y se comprobó que no
   * restringe —«catalog» podía importar el caso de uso de «cart» y el lint pasaba en verde—, así que la
   * prohibición se escribe aquí, explícita, contexto por contexto.
   *
   * Lo permitido entre contextos es el DOMINIO ajeno: los modelos y los puertos son su contrato
   * público. Los casos de uso, los adaptadores y las pantallas no lo son. Si hace falta algo de eso, es
   * que ese algo era compartido y su sitio es `shared`, `core` o el sistema de diseño.
   */
  ...CONTEXTOS.map((propio) => ({
    files: [`src/app/features/${propio}/**/*.ts`],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: CONTEXTOS.filter((otro) => otro !== propio).flatMap((otro) => [
            {
              group: [
                `@features/${otro}/application/*`,
                `@features/${otro}/application/**`,
                `@features/${otro}/infrastructure/*`,
                `@features/${otro}/infrastructure/**`,
                `@features/${otro}/presentation/*`,
                `@features/${otro}/presentation/**`,
                `@features/${otro}/*.providers`,
                `**/${otro}/application/**`,
                `**/${otro}/infrastructure/**`,
                `**/${otro}/presentation/**`,
              ],
              message:
                `El contexto «${propio}» no puede entrar en las tripas de «${otro}». De otro contexto ` +
                'solo se ve su dominio (modelos y puertos). Si necesitas más, ese algo era compartido: ' +
                'su sitio es shared/, core/ o design-system/.',
            },
          ]),
        },
      ],
    },
  })),

  {
    // Datos, no código: un diccionario de ocho idiomas mide lo que mide y partirlo no lo mejora.
    files: ['src/app/shared/i18n/**/*.ts', 'src/app/shared/data/**/*.ts', 'src/app/shared/content/**/*.ts'],
    rules: { 'max-lines': 'off' },
  },

  {
    files: ['**/*.spec.ts'],
    rules: {
      'max-lines': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
