# Inventario del porte React → Angular

**Qué es esto.** El censo completo del frontend React (`../frontend/src`) y el mapa de a quién le toca
cada fichero, para poder repartir el trabajo entre varios equipos sin que dos hagan lo mismo ni quede
nada sin dueño. No propone código: cuenta lo que hay.

**Cómo se han sacado los números.** Contando ficheros y líneas con `find` y `wc -l` sobre el árbol real,
no a ojo. Los endpoints salen de leer cada llamada `api.get/post/put/patch/delete` de `src/api/*.ts` y
de todo lo que llama al backend fuera de esa carpeta. Los ficheros `*.test.ts` y `*.test.tsx` **no**
cuentan como páginas ni como componentes, pero sí se cuentan aparte, porque también hay que portarlos.

**Las cifras de cabecera.**

| | Sin pruebas | Pruebas | Total |
|---|---|---|---|
| Ficheros `.ts` / `.tsx` en `src/` | 213 | 142 | 355 |
| Líneas | 62 207 | 44 331 | 106 538 |
| Páginas (`src/pages/**`) | 75 | 64 | 139 |
| Componentes (`src/components/*.tsx`) | 64 | 39 | 103 |
| Módulos de API (`src/api/*.ts`) | 19 | 17 | 36 |

**Los doce contextos acotados** son los que ya existen como carpeta en
`front-nx036/src/app/features/`: `auth`, `catalog`, `cart`, `checkout`, `orders`, `wallet`, `account`,
`affiliate`, `notifications`, `platform`, `support`, `admin`. A ellos se añaden cuatro destinos que no
son contextos sino capas compartidas, y que por eso se portan antes que nada:

| Destino | Qué va ahí |
|---|---|
| `core/` | Lo transversal que toca al navegador o a la red: cliente HTTP, testigos de sesión, CAPTCHA, preferencias por petición, saneado de HTML, arranque. |
| `shared/` | Lo puro y sin efectos: traducciones, países, prefijos telefónicos, textos legales, formato y validación. Se puede llamar desde el dominio. |
| `design-system/` | Piezas visuales reutilizables **sin negocio**: diálogo, avisos, migas de pan, filtros, buscador, transiciones. |
| `layout` | Los marcos de página (`src/layouts/*`), la tabla de rutas y la raíz de la aplicación. |

**Cómo se lee la columna «Contexto».** Es el destino, no el origen. Que un fichero viva hoy en
`pages/admin/` no lo hace del contexto `admin`: `AdminSupportPage` va a `support`, y varias páginas de
`pages/storefront/platform/` van a `notifications`, `affiliate` o `support`. Al revés también pasa.

**Índice.** 1 páginas · 2 componentes · 3 módulos de API y endpoints · 4 estado y hooks ·
5 utilidades · 6 recuento por contexto · 7 riesgos · 8 orden de ataque.

---

## 1. Páginas (`src/pages/**`)

**75 ficheros** sin contar pruebas (hay 64 ficheros `*.test.tsx` de páginas). La columna «Ruta web» sale de `frontend/src/routes.ts`; un guion significa que el fichero vive en `pages/` pero no es una ruta (es un modal o un trozo reutilizado por otra página). Los *alias* son redirecciones 302 que resuelve `routes/alias.tsx`.


### 1.1 Panel de administración — `pages/admin/`

| Fichero | Ruta web | Contexto | Líneas | APIs que consume |
|---|---|---|---|---|
| `pages/admin/AdminAcademyPage.tsx` | `/admin/academy` (alias `/academy`) | `admin` | 124 | `admin` |
| `pages/admin/AdminAffiliatesPage.tsx` | `/admin/affiliates` | `admin` | 376 | `admin` |
| `pages/admin/AdminBillingPage.tsx` | `/admin/billing` (alias `/admin/facturacion`) | `admin` | 270 | `admin` |
| `pages/admin/AdminCarrierLimitsPage.tsx` | `/admin/carrier-limits` | `admin` | 341 | `carrierLimits` |
| `pages/admin/AdminCatalogPage.tsx` | `/admin/catalog` (alias `/admin/productos`, `/admin/products`) | `admin` | 749 | `admin`, `catalog` |
| `pages/admin/AdminCategoriesPage.tsx` | `/admin/categories` (alias `/admin/categorias`) | `admin` | 392 | `admin` |
| `pages/admin/AdminCompliancePage.tsx` | `/admin/compliance` | `admin` | 245 | `compliance` |
| `pages/admin/AdminCurrenciesPage.tsx` | `/admin/currencies` | `admin` | 171 | `admin` |
| `pages/admin/AdminDashboardPage.tsx` | `/admin` (alias `/admin/dashboard`, `/platform`) | `admin` | 155 | `admin` |
| `pages/admin/AdminDeclarationGroupsPage.tsx` | `/admin/declaration-groups` | `admin` | 170 | `admin` |
| `pages/admin/AdminLanguagesPage.tsx` | `/admin/languages` | `admin` | 198 | `admin` |
| `pages/admin/AdminLegalPage.tsx` | `/admin/legal` | `admin` | 208 | `legal` |
| `pages/admin/AdminMentorsPage.tsx` | `/admin/mentors` (alias `/mentors`) | `admin` | 132 | `admin` |
| `pages/admin/AdminNewsletterPage.tsx` | `/admin/newsletter` | `admin` | 104 | `admin` |
| `pages/admin/AdminOperatorsPage.tsx` | `/admin/operators` | `admin` | 73 | `operator` |
| `pages/admin/AdminOrderDetailPage.tsx` | `/admin/orders/:id` | `admin` | 453 | `admin`, `client`, `orders` |
| `pages/admin/AdminOrderModals.tsx` | — (modales de `AdminOrdersPage`) | `admin` | 197 | `admin`, `catalog` |
| `pages/admin/AdminOrdersPage.tsx` | `/admin/orders` (alias `/admin/ordenes`) | `admin` | 373 | `admin` |
| `pages/admin/AdminPartnersPage.tsx` | `/admin/partners` | `admin` | 279 | `admin` |
| `pages/admin/AdminPricingPage.tsx` | `/admin/pricing` (alias `/admin/precios`) | `admin` | 373 | `admin`, `catalog` |
| `pages/admin/AdminProductDetailPage.tsx` | `/admin/catalog/:id` | `admin` | 1027 | `admin`, `catalog`, `client` |
| `pages/admin/AdminProductGroupsPage.tsx` | `/admin/product-groups` | `admin` | 169 | `admin`, `catalog` |
| `pages/admin/AdminProfilePage.tsx` | `/admin/profile` | `admin` | 438 | `admin`, `client`, `profile` |
| `pages/admin/AdminPromotionsPage.tsx` | `/admin/promotions` | `admin` | 295 | `admin`, `catalog` |
| `pages/admin/AdminPurchasesPage.tsx` | `/admin/purchases` | `admin` | 468 | `purchases` |
| `pages/admin/AdminStyleguidePage.tsx` | `/admin/styleguide` | `admin` | 198 | — |
| `pages/admin/AdminSuppliersPage.tsx` | `/admin/suppliers` (alias `/admin/proveedores`) | `admin` | 402 | `admin` |
| `pages/admin/AdminSupportPage.tsx` | **sin ruta** — huérfana: `/admin/support` monta `platform/SupportPage` | `support` | 109 | `platform` |
| `pages/admin/AdminTaxesPage.tsx` | `/admin/taxes` | `admin` | 266 | `admin` |
| `pages/admin/AdminUsersPage.tsx` | `/admin/users` (alias `/admin/usuarios`) | `admin` | 376 | `admin` |
| `pages/admin/AdminWalletDetailPage.tsx` | `/admin/wallets/:userId` | `admin` | 234 | `admin` |
| `pages/admin/AdminWalletsPage.tsx` | `/admin/wallets` | `admin` | 294 | `admin` |
| `pages/admin/AdminWarehousesPage.tsx` | `/admin/warehouses` (alias `/warehouses`) | `admin` | 205 | `platform` |
| `pages/admin/OperatorEarningsPage.tsx` | `/admin/operator/earnings` | `admin` | 135 | `operator` |
| `pages/admin/ProductExportModal.tsx` | — (modal de `AdminCatalogPage`) | `admin` | 221 | `admin`, `client` |
| `pages/admin/ProductJsonEditorModal.tsx` | — (modal de `AdminProductDetailPage`) | `admin` | 86 | `admin` |

### 1.2 Acceso — `pages/auth/`

| Fichero | Ruta web | Contexto | Líneas | APIs que consume |
|---|---|---|---|---|
| `pages/auth/ActivatePage.tsx` | `/activate` | `auth` | 137 | — |
| `pages/auth/AuthCallbackPage.tsx` | `/auth/callback` | `auth` | 80 | — |
| `pages/auth/LoginPage.tsx` | `/login` | `auth` | 340 | `client`, `platform` |
| `pages/auth/PasswordResetPage.tsx` | `/password-reset` | `auth` | 157 | `client` |
| `pages/auth/RegisterPage.tsx` | `/register` | `auth` | 383 | `client`, `orders` |

### 1.3 Escaparate — `pages/storefront/` y raíz

| Fichero | Ruta web | Contexto | Líneas | APIs que consume |
|---|---|---|---|---|
| `pages/NotFoundPage.tsx` | `*` (vía `routes/ruta-inexistente.tsx`) y 404 de `/legal/:doc` | `platform` | 59 | — |
| `pages/storefront/AboutPage.tsx` | `/about` | `platform` | 8 | — |
| `pages/storefront/ConnectStorePage.tsx` | `/connect` (alias `/conectar`) | `platform` | 64 | — |
| `pages/storefront/ContactPage.tsx` | `/contact` | `support` | 100 | `client` |
| `pages/storefront/DevelopersPage.tsx` | `/developers` | `platform` | 1143 | — |
| `pages/storefront/DocView.tsx` | — (la usan `AboutPage` y `LegalPage`) | `platform` | 39 | — |
| `pages/storefront/FavoritesPage.tsx` | `/favorites` | `catalog` | 73 | `catalog` |
| `pages/storefront/HistoryPage.tsx` | `/history` | `catalog` | 77 | `catalog` |
| `pages/storefront/HomePage.tsx` | `/` | `catalog` | 241 | `catalog`, `client`, `platform` |
| `pages/storefront/LegalPage.tsx` | `/legal/:doc` (vía `routes/legal.tsx`; alias `/legal`) | `platform` | 56 | `legal` |
| `pages/storefront/NewsletterUnsubscribePage.tsx` | `/newsletter/unsubscribe` | `notifications` | 41 | `affiliate` |
| `pages/storefront/PlansPage.tsx` | `/pricing` (alias `/precios` `/prices` `/planes` `/plans`) | `account` | 110 | `billing` |
| `pages/storefront/ProductDetailPage.tsx` | `/catalog/:slug` (vía `routes/ficha.tsx`) · `/admin/browse/:slug` | `catalog` | 2137 | `admin`, `catalog`, `client`, `platform` |
| `pages/storefront/ProductListPage.tsx` | `/catalog` · `/admin/browse` | `catalog` | 574 | `catalog` |
| `pages/storefront/StatusPage.tsx` | `/status` | `platform` | 67 | `orders` |
| `pages/storefront/cart/CartPage.tsx` | `/cart` | `cart` | 292 | — |
| `pages/storefront/cart/CheckoutPage.tsx` | `/checkout` | `checkout` | 903 | `addresses`, `affiliate`, `billing`, `client`, `orders`, `wallet` |
| `pages/storefront/cart/CheckoutReturnPage.tsx` | `/checkout/return` | `checkout` | 102 | `client` |
| `pages/storefront/orders/OrderDetailPage.tsx` | `/orders/:id` | `orders` | 218 | `client`, `orders` |
| `pages/storefront/orders/OrdersPage.tsx` | `/orders` | `orders` | 260 | `orders` |
| `pages/storefront/platform/AffiliatePage.tsx` | `/affiliate` · `/admin/affiliate` | `affiliate` | 393 | `affiliate` |
| `pages/storefront/platform/IntelligencePage.tsx` | `/admin/intelligence` (alias `/intelligence`) | `platform` | 190 | `platform` |
| `pages/storefront/platform/NotificationsPage.tsx` | `/notifications` · `/admin/notifications` | `notifications` | 440 | `admin`, `platform` |
| `pages/storefront/platform/OdmPage.tsx` | `/admin/odm` (alias `/odm`) | `platform` | 187 | `platform` |
| `pages/storefront/platform/PodPage.tsx` | `/admin/pod` (alias `/pod`) | `platform` | 263 | `platform` |
| `pages/storefront/platform/ShopsPage.tsx` | `/admin/shops` (alias `/shops`) | `platform` | 163 | `platform` |
| `pages/storefront/platform/SourcingPage.tsx` | `/admin/sourcing` (alias `/sourcing`) | `platform` | 216 | `platform` |
| `pages/storefront/platform/SupportPage.tsx` | `/admin/support` (alias `/support`) | `support` | 124 | `platform` |
| `pages/storefront/profile/AddressesPage.tsx` | `/addresses` | `account` | 219 | `addresses` |
| `pages/storefront/profile/ProfilePage.tsx` | `/profile` (alias `/admin/perfil`) | `account` | 628 | `addresses`, `client`, `profile` |
| `pages/storefront/wallet/PaypalReturnPage.tsx` | `/wallet/paypal-return` | `wallet` | 86 | `wallet` |
| `pages/storefront/wallet/RechargePage.tsx` | `/wallet/recharge` | `wallet` | 299 | `wallet` |
| `pages/storefront/wallet/RechargeReturnPage.tsx` | `/wallet/recharge/return` | `wallet` | 89 | `wallet` |
| `pages/storefront/wallet/WalletPage.tsx` | `/wallet` | `wallet` | 136 | `affiliate`, `wallet` |

**Total páginas: 75 ficheros, 21400 líneas.**


---


## 2. Componentes (`src/components/*.tsx`)

**64 ficheros** sin contar pruebas (hay 39 ficheros `*.test.tsx` de componentes). La clasificación decide a dónde va cada pieza en el proyecto Angular:

- `design-system` → `src/app/design-system/component/` (visual, sin negocio).
- un contexto (`catalog`, `admin`, …) → `src/app/features/<contexto>/presentation/`.
- `layout` → marco de página, junto a `src/layouts/*`.


| Componente | Líneas | Clasificación | Dónde se usa |
|---|---|---|---|
| `AddCardForm.tsx` | 93 | `account` | `AddCardModal`, `PaymentMethodsSection` |
| `AddCardModal.tsx` | 60 | `account` | `PlanSelectorSection` |
| `AddressCard.tsx` | 56 | `account` | `profile/ProfilePage` |
| `AddressFields.tsx` | 112 | `account` | `AddressFormModal`, `cart/CheckoutPage`, `profile/AddressesPage` |
| `AddressFormModal.tsx` | 118 | `account` | `profile/ProfilePage` |
| `MySubscriptionSection.tsx` | 144 | `account` | `profile/ProfilePage` |
| `PaymentMethodsSection.tsx` | 223 | `account` | `profile/ProfilePage` |
| `PlanSelectorSection.tsx` | 148 | `account` | `profile/ProfilePage` |
| `RegionSelect.tsx` | 48 | `account` | `AddressFields` |
| `AdminGlobalSearch.tsx` | 110 | `admin` | `AdminLayout` |
| `CatalogBulkTools.tsx` | 776 | `admin` | `AdminCatalogPage`, `AdminCategoriesPage` |
| `CreateProductModal.tsx` | 507 | `admin` | `AdminCatalogPage` |
| `DashboardSeriesCharts.tsx` | 71 | `admin` | `AdminDashboardPage` |
| `VariantsManager.tsx` | 221 | `admin` | `AdminProductDetailPage` |
| `ReferralCapture.tsx` | 36 | `affiliate` | `root` |
| `PasswordRequirements.tsx` | 47 | `auth` | `auth/RegisterPage` |
| `ProtectedRoute.tsx` | 47 | `auth` | `routes/admin`, `routes/privado` |
| `CartDrawer.tsx` | 278 | `cart` | `root` |
| `CartSync.tsx` | 37 | `cart` | `root` |
| `SavedCartSync.tsx` | 33 | `cart` | `root` |
| `HeroProductBackdrop.tsx` | 58 | `catalog` | `HomePage` |
| `HomeSections.tsx` | 208 | `catalog` | `HomePage` |
| `MarginEstimate.tsx` | 106 | `catalog` | `ProductDetailPage` |
| `PriceHistoryChart.tsx` | 80 | `catalog` | `ProductDetailPage` |
| `PriceTag.tsx` | 57 | `catalog` | `ProductCard`, `ProductQuickView`, `ProductDetailPage` |
| `ProductCard.tsx` | 247 | `catalog` | `HomeSections`, `FavoritesPage`, `HistoryPage`, `ProductListPage` |
| `ProductComplianceInfo.tsx` | 116 | `catalog` | `ProductDetailPage` |
| `ProductQuickView.tsx` | 189 | `catalog` | `AssistantAvatar`, `ChatWidget` |
| `PromotionBanner.tsx` | 169 | `catalog` | `HomePage` |
| `WelcomeGuide.tsx` | 385 | `catalog` | `StorefrontLayout` |
| `CustomsDutyInfo.tsx` | 91 | `checkout` | `cart/CheckoutPage` |
| `ShippingCountriesBanner.tsx` | 68 | `checkout` | `HomePage` |
| `ShippingOptions.tsx` | 165 | `checkout` | `cart/CheckoutPage` |
| `ShippingPrefetch.tsx` | 72 | `checkout` | `StorefrontLayout` |
| `Breadcrumbs.tsx` | 70 | `design-system` | `StorefrontLayout`, `ProductDetailPage` |
| `Captcha.tsx` | 68 | `design-system` | `auth/RegisterPage` |
| `CartSplash.tsx` | 29 | `design-system` | `root` |
| `CountrySelect.tsx` | 48 | `design-system` | `AddressFields`, `PhoneInput`, `profile/ProfilePage` |
| `CurrencyLanguagePicker.tsx` | 131 | `design-system` | `AdminLayout`, `StorefrontLayout` |
| `Dialog.tsx` | 221 | `design-system` | `root` |
| `ErrorBoundary.tsx` | 109 | `design-system` | `Motion`, `HomePage`, `ProductDetailPage`, `root` |
| `FilterBar.tsx` | 247 | `design-system` | `AdminBillingPage`, `AdminCatalogPage`, `AdminCurrenciesPage`, `AdminOrdersPage`, `AdminSuppliersPage`, `AdminUsersPage`, `AdminWalletsPage`, `ProductListPage`, `orders/OrdersPage` |
| `GuiaPuntos.tsx` | 17 | `design-system` | `AdminProductDetailPage`, `ProductDetailPage`, `cart/CheckoutPage` |
| `ImageLightbox.tsx` | 46 | `design-system` | `AdminOrderDetailPage` |
| `Motion.tsx` | 127 | `design-system` | `AdminLayout`, `StorefrontLayout`, `AdminDashboardPage`, `HomePage`, `ProductDetailPage`, `routes/no-encontrado`, `routes/transicion` |
| `PhoneInput.tsx` | 99 | `design-system` | `AddressFields`, `profile/ProfilePage` |
| `Placeholder.tsx` | 92 | `design-system` | `CartDrawer`, `ImageLightbox`, `ProductCard`, `platform/PodPage` |
| `ScrollToTop.tsx` | 91 | `design-system` | `root` |
| `ScrollToTopButton.tsx` | 30 | `design-system` | `AdminCatalogPage`, `ProductListPage` |
| `SearchInput.tsx` | 54 | `design-system` | `AdminBillingPage`, `AdminCatalogPage`, `AdminCategoriesPage`, `AdminCurrenciesPage`, `AdminOrdersPage`, `AdminSuppliersPage`, `AdminUsersPage`, `AdminWalletsPage`, `ProductListPage`, `orders/OrdersPage` |
| `ThemeSwitcher.tsx` | 24 | `design-system` | `AdminLayout`, `StorefrontLayout` |
| `Toaster.tsx` | 57 | `design-system` | `root` |
| `BarraInferiorMovil.tsx` | 77 | `layout` | `StorefrontLayout` |
| `SiteFooter.tsx` | 187 | `layout` | `StorefrontLayout` |
| `NewsletterSection.tsx` | 47 | `notifications` | `HomePage` |
| `NotificationsBell.tsx` | 41 | `notifications` | `StorefrontLayout` |
| `NotificationsDropdown.tsx` | 149 | `notifications` | `AdminLayout` |
| `TrackingTimeline.tsx` | 197 | `orders` | `AdminOrderDetailPage`, `orders/OrderDetailPage` |
| `CookieConsent.tsx` | 102 | `platform` | `root` |
| `CookieTable.tsx` | 47 | `platform` | `LegalPage` |
| `AssistantAvatar.tsx` | 468 | `support` | `StorefrontLayout` |
| `AssistantCharacter.tsx` | 154 | `support` | `AssistantAvatar` |
| `ChatWidget.tsx` | 264 | `support` | `StorefrontLayout` |
| `SupportThread.tsx` | 58 | `support` | `AdminSupportPage`, `platform/SupportPage` |

**Total componentes: 64 ficheros, 8527 líneas.**


### 2.1 Resumen por clasificación

| Clasificación | Componentes | Líneas |
|---|---|---|
| `admin` | 5 | 1685 |
| `catalog` | 10 | 1615 |
| `design-system` | 18 | 1560 |
| `account` | 9 | 1002 |
| `support` | 4 | 944 |
| `checkout` | 4 | 396 |
| `cart` | 3 | 348 |
| `layout` | 2 | 264 |
| `notifications` | 3 | 237 |
| `orders` | 1 | 197 |
| `platform` | 2 | 149 |
| `auth` | 2 | 94 |
| `affiliate` | 1 | 36 |
| **Total** | **64** | **8527** |

---


## 3. Módulos de API (`src/api/*.ts`) — base de los PUERTOS

**19 ficheros** sin contar pruebas (hay 17 ficheros `*.test.ts`). Todas las rutas van bajo el prefijo `/api` que pone `client.ts` (`baseURL = API_BASE + '/api'`). `${…}` marca un parámetro de ruta.


| Módulo | Líneas | Contexto | Nº endpoints |
|---|---|---|---|
| `api/addresses.ts` | 37 | `account` | 4 |
| `api/admin.ts` | 680 | `admin` | 143 |
| `api/affiliate.ts` | 106 | `affiliate` | 10 |
| `api/billing.ts` | 150 | `account` | 13 |
| `api/carrierLimits.ts` | 49 | `admin` | 3 |
| `api/cart.ts` | 32 | `cart` | 5 |
| `api/catalog.ts` | 577 | `catalog` | 28 |
| `api/chat.ts` | 31 | `support` | 1 |
| `api/client.ts` | 173 | `core` | 0 |
| `api/compliance.ts` | 98 | `admin` | 9 |
| `api/legal.ts` | 78 | `platform` | 4 |
| `api/operator.ts` | 64 | `admin` | 5 |
| `api/orders.ts` | 372 | `orders` | 10 |
| `api/platform.ts` | 165 | `platform` | 69 |
| `api/profile.ts` | 36 | `account` | 5 |
| `api/purchases.ts` | 92 | `admin` | 11 |
| `api/savedCart.ts` | 18 | `cart` | 4 |
| `api/suggestions.ts` | 37 | `cart` | 1 |
| `api/wallet.ts` | 88 | `wallet` | 6 |
| **Total** | **2883** | | **331** |

### 3.1 Endpoints, uno por uno


#### `api/addresses.ts` → `account` (37 líneas, 4 endpoints)

| Método | Ruta |
|---|---|
| `GET` | `/me/addresses` |
| `POST` | `/me/addresses` |
| `PUT` | `/me/addresses/${id}` |
| `DELETE` | `/me/addresses/${id}` |

#### `api/billing.ts` → `account` (150 líneas, 13 endpoints)

| Método | Ruta |
|---|---|
| `GET` | `/billing/plans` |
| `GET` | `/me/billing/config` |
| `GET` | `/me/billing/invoices` |
| `POST` | `/me/orders/${orderId}/pay-saved-card` |
| `POST` | `/me/orders/${orderId}/pay-saved-card/${paymentId}/confirm` |
| `GET` | `/me/payment-methods` |
| `POST` | `/me/payment-methods/${encodeURIComponent(id)}/default` |
| `POST` | `/me/payment-methods/${encodeURIComponent(ref)}/delete-code` |
| `DELETE` | `/me/payment-methods/${encodeURIComponent(ref)}?code=${encodeURIComponent(code)}` |
| `POST` | `/me/payment-methods/paypal` |
| `POST` | `/me/payment-methods/setup-intent` |
| `GET` | `/me/subscription` |
| `POST` | `/me/subscription/cancel` |

#### `api/profile.ts` → `account` (36 líneas, 5 endpoints)

| Método | Ruta |
|---|---|
| `PUT` | `/me` |
| `GET` | `/me/data-export` |
| `POST` | `/me/delete/confirm` |
| `POST` | `/me/delete/request` |
| `POST` | `/me/password` |

#### `api/admin.ts` → `admin` (680 líneas, 143 endpoints)

| Método | Ruta |
|---|---|
| `GET` | `/admin/academy/courses` |
| `POST` | `/admin/academy/courses` |
| `PUT` | `/admin/academy/courses/${id}` |
| `DELETE` | `/admin/academy/courses/${id}` |
| `GET` | `/admin/affiliates/${id}` |
| `POST` | `/admin/affiliates/${id}/payout` |
| `POST` | `/admin/affiliates/${id}/status` |
| `POST` | `/admin/affiliates/approve-due` |
| `POST` | `/admin/affiliates/commissions/${commissionId}/review` |
| `GET` | `/admin/affiliates/config` |
| `PUT` | `/admin/affiliates/config` |
| `POST` | `/admin/affiliates/payouts/${id}/reject` |
| `GET` | `/admin/affiliates/payouts/pending` |
| `POST` | `/admin/affiliates/reindex` |
| `GET` | `/admin/billing/plans` |
| `PUT` | `/admin/billing/plans/${code}` |
| `GET` | `/admin/billing/subscriptions` |
| `GET` | `/admin/catalog/bus/anuncios-fallidos` |
| `POST` | `/admin/catalog/bus/anuncios-fallidos/reintentar` |
| `GET` | `/admin/catalog/categories` |
| `POST` | `/admin/catalog/categories` |
| `PUT` | `/admin/catalog/categories/${id}` |
| `DELETE` | `/admin/catalog/categories/${id}` |
| `PUT` | `/admin/catalog/categories/${id}/toggle` |
| `PUT` | `/admin/catalog/categories/bulk-active` |
| `POST` | `/admin/catalog/categories/reindex` |
| `DELETE` | `/admin/catalog/products/${id}` |
| `POST` | `/admin/catalog/products/${id}/duplicate` |
| `GET` | `/admin/catalog/products/${id}/export` |
| `POST` | `/admin/catalog/products/${productId}/images` |
| `PUT` | `/admin/catalog/products/${productId}/images/order` |
| `GET` | `/admin/catalog/products/${productId}/variants` |
| `POST` | `/admin/catalog/products/${productId}/variants` |
| `DELETE` | `/admin/catalog/products/${productId}/video` |
| `PUT` | `/admin/catalog/products/bulk-status` |
| `POST` | `/admin/catalog/products/create` |
| `GET` | `/admin/catalog/products/export` |
| `GET` | `/admin/catalog/products/export/count` |
| `DELETE` | `/admin/catalog/products/images/${imageId}` |
| `PUT` | `/admin/catalog/products/subsidy` |
| `PUT` | `/admin/catalog/products/surcharge` |
| `PUT` | `/admin/catalog/suppliers/${id}` |
| `DELETE` | `/admin/catalog/suppliers/${id}` |
| `POST` | `/admin/catalog/suppliers/${id}/trustpass` |
| `POST` | `/admin/catalog/suppliers/${id}/verify` |
| `POST` | `/admin/catalog/suppliers/bulk-delete` |
| `PUT` | `/admin/catalog/suppliers/bulk-verify` |
| `POST` | `/admin/catalog/suppliers/create` |
| `POST` | `/admin/catalog/suppliers/reindex` |
| `DELETE` | `/admin/catalog/variant-values/${id}` |
| `PUT` | `/admin/catalog/variant-values/${id}/image` |
| `PUT` | `/admin/catalog/variant-values/${id}/label` |
| `PUT` | `/admin/catalog/variants/${id}` |
| `DELETE` | `/admin/catalog/variants/${id}` |
| `PUT` | `/admin/catalog/variants/${id}/price` |
| `POST` | `/admin/contact/reply` |
| `PUT` | `/admin/currency/${code}` |
| `PUT` | `/admin/currency/${code}/active` |
| `GET` | `/admin/currency/all` |
| `PUT` | `/admin/currency/bulk-active` |
| `GET` | `/admin/dashboard/metrics` |
| `GET` | `/admin/dashboard/recent-orders` |
| `GET` | `/admin/declaration-groups` |
| `PUT` | `/admin/declaration-groups/${id}` |
| `POST` | `/admin/declaration-groups/${id}/approve` |
| `POST` | `/admin/declaration-groups/${id}/unapprove` |
| `POST` | `/admin/declaration-groups/sync` |
| `GET` | `/admin/languages` |
| `POST` | `/admin/languages` |
| `DELETE` | `/admin/languages/${id}` |
| `GET` | `/admin/mentors` |
| `POST` | `/admin/mentors` |
| `PUT` | `/admin/mentors/${id}` |
| `DELETE` | `/admin/mentors/${id}` |
| `POST` | `/admin/notifications/send` |
| `POST` | `/admin/orders` |
| `GET` | `/admin/orders/${id}` |
| `POST` | `/admin/orders/${id}/cancel` |
| `POST` | `/admin/orders/${id}/deliver` |
| `POST` | `/admin/orders/${id}/forward` |
| `POST` | `/admin/orders/${id}/refund` |
| `POST` | `/admin/orders/${id}/ship` |
| `POST` | `/admin/orders/${id}/sync-tracking` |
| `GET` | `/admin/orders/${id}/tracking` |
| `POST` | `/admin/orders/bulk-cancel` |
| `POST` | `/admin/orders/bulk-deliver` |
| `POST` | `/admin/orders/bulk-forward` |
| `POST` | `/admin/orders/bulk-refund` |
| `POST` | `/admin/orders/bulk-ship` |
| `POST` | `/admin/orders/demo` |
| `POST` | `/admin/orders/reindex` |
| `GET` | `/admin/partners/apps` |
| `GET` | `/admin/partners/oauth-clients` |
| `DELETE` | `/admin/partners/oauth-clients/${id}` |
| `GET` | `/admin/partners/webhooks` |
| `POST` | `/admin/partners/webhooks/test` |
| `GET` | `/admin/pricing/rules` |
| `POST` | `/admin/pricing/rules` |
| `PUT` | `/admin/pricing/rules/${id}` |
| `DELETE` | `/admin/pricing/rules/${id}` |
| `PUT` | `/admin/pricing/rules/${id}/toggle` |
| `POST` | `/admin/pricing/rules/bulk-delete` |
| `PUT` | `/admin/pricing/rules/bulk-toggle` |
| `GET` | `/admin/product-groups` |
| `POST` | `/admin/product-groups` |
| `PUT` | `/admin/product-groups/${id}` |
| `DELETE` | `/admin/product-groups/${id}` |
| `POST` | `/admin/product-groups/${id}/members` |
| `DELETE` | `/admin/product-groups/${id}/members/${productId}` |
| `GET` | `/admin/promotions` |
| `POST` | `/admin/promotions` |
| `PUT` | `/admin/promotions/${id}` |
| `DELETE` | `/admin/promotions/${id}` |
| `POST` | `/admin/promotions/${id}/announce` |
| `POST` | `/admin/promotions/${id}/toggle` |
| `GET` | `/admin/regions` |
| `PUT` | `/admin/regions/${country}/${code}` |
| `DELETE` | `/admin/regions/${country}/${code}` |
| `GET` | `/admin/tax-rates` |
| `PUT` | `/admin/tax-rates/${country}` |
| `DELETE` | `/admin/tax-rates/${country}` |
| `PUT` | `/admin/users/${id}` |
| `DELETE` | `/admin/users/${id}` |
| `POST` | `/admin/users/${id}/activate` |
| `POST` | `/admin/users/${id}/lock` |
| `POST` | `/admin/users/${id}/reset-password` |
| `PUT` | `/admin/users/${id}/role` |
| `POST` | `/admin/users/${id}/unlock` |
| `POST` | `/admin/users/bulk-activate` |
| `POST` | `/admin/users/bulk-delete` |
| `POST` | `/admin/users/bulk-lock` |
| `PUT` | `/admin/users/bulk-role` |
| `POST` | `/admin/users/bulk-unlock` |
| `POST` | `/admin/users/invite` |
| `POST` | `/admin/wallets/reindex` |
| `GET` | `/admin/webhooks/subscriptions` |
| `POST` | `/admin/webhooks/subscriptions` |
| `PUT` | `/admin/webhooks/subscriptions/${id}` |
| `DELETE` | `/admin/webhooks/subscriptions/${id}` |
| `GET` | `/admin/webhooks/subscriptions/${id}/deliveries` |
| `POST` | `/admin/webhooks/subscriptions/${id}/rotate-secret` |
| `POST` | `/admin/webhooks/subscriptions/${id}/test` |
| `POST` | `/me/password` |

#### `api/carrierLimits.ts` → `admin` (49 líneas, 3 endpoints)

| Método | Ruta |
|---|---|
| `GET` | `/admin/carrier-limits` |
| `PUT` | `/admin/carrier-limits/${encodeURIComponent(channel)}/${encodeURIComponent(country)}` |
| `DELETE` | `/admin/carrier-limits/${encodeURIComponent(channel)}/${encodeURIComponent(country)}` |

#### `api/compliance.ts` → `admin` (98 líneas, 9 endpoints)

| Método | Ruta |
|---|---|
| `GET` | `/admin/compliance/categories/${categoryId}/warnings` |
| `PUT` | `/admin/compliance/categories/${categoryId}/warnings` |
| `GET` | `/admin/compliance/categories/${categoryId}/warnings/effective` |
| `GET` | `/admin/compliance/operator-roles` |
| `GET` | `/admin/compliance/responsible-person` |
| `PUT` | `/admin/compliance/responsible-person` |
| `GET` | `/admin/compliance/status` |
| `DELETE` | `/admin/compliance/warnings/${warningId}` |
| `GET` | `/compliance/responsible-person` |

#### `api/operator.ts` → `admin` (64 líneas, 5 endpoints)

| Método | Ruta |
|---|---|
| `GET` | `/admin/operator/earnings` |
| `GET` | `/admin/operator/history` |
| `GET` | `/admin/operators/history` |
| `POST` | `/admin/operators/reindex` |
| `GET` | `/admin/operators/report` |

#### `api/purchases.ts` → `admin` (92 líneas, 11 endpoints)

| Método | Ruta |
|---|---|
| `GET` | `/admin/purchases` |
| `POST` | `/admin/purchases/${id}/bought` |
| `POST` | `/admin/purchases/${id}/cancel` |
| `POST` | `/admin/purchases/${id}/packed` |
| `POST` | `/admin/purchases/${id}/received` |
| `POST` | `/admin/purchases/${id}/reexport` |
| `POST` | `/admin/purchases/${id}/shipped` |
| `GET` | `/admin/purchases/at-risk` |
| `GET` | `/admin/purchases/order/${orderId}` |
| `POST` | `/admin/purchases/pack-sheet` |
| `GET` | `/admin/purchases/pack-sheet/preview` |

#### `api/affiliate.ts` → `affiliate` (106 líneas, 10 endpoints)

| Método | Ruta |
|---|---|
| `GET` | `/me/affiliate` |
| `POST` | `/me/affiliate/bind` |
| `POST` | `/me/affiliate/codes` |
| `POST` | `/me/affiliate/codes/${codeId}/toggle` |
| `POST` | `/me/affiliate/join` |
| `GET` | `/me/affiliate/payout-profile` |
| `PUT` | `/me/affiliate/payout-profile` |
| `GET` | `/me/email-preferences` |
| `PUT` | `/me/email-preferences` |
| `POST` | `/newsletter/unsubscribe` |

#### `api/cart.ts` → `cart` (32 líneas, 5 endpoints)

| Método | Ruta |
|---|---|
| `GET` | `/me/cart` |
| `PUT` | `/me/cart` |
| `DELETE` | `/me/cart` |
| `DELETE` | `/me/cart/${productId}` |
| `POST` | `/me/cart/merge` |

#### `api/savedCart.ts` → `cart` (18 líneas, 4 endpoints)

| Método | Ruta |
|---|---|
| `GET` | `/me/saved-cart` |
| `PUT` | `/me/saved-cart` |
| `DELETE` | `/me/saved-cart/${productId}` |
| `POST` | `/me/saved-cart/merge` |

#### `api/suggestions.ts` → `cart` (37 líneas, 1 endpoints)

| Método | Ruta |
|---|---|
| `POST` | `/catalog/cart-suggestions` |

#### `api/catalog.ts` → `catalog` (577 líneas, 28 endpoints)

| Método | Ruta |
|---|---|
| `GET` | `/admin/catalog/products` |
| `DELETE` | `/admin/catalog/products/${productId}/price-tiers/${minQty}` |
| `PUT` | `/admin/catalog/products/${productId}/source-url?lang=${lang}` |
| `PUT` | `/admin/catalog/products/${productId}/status` |
| `PUT` | `/admin/catalog/products/${productId}?lang=${lang}` |
| `GET` | `/catalog/bestsellers` |
| `GET` | `/catalog/categories` |
| `GET` | `/catalog/categories/tree` |
| `GET` | `/catalog/home/sections` |
| `GET` | `/catalog/products` |
| `GET` | `/catalog/products/${id}/related` |
| `GET` | `/catalog/products/${productId}/margin-estimate` |
| `GET` | `/catalog/products/${productId}/price-history` |
| `GET` | `/catalog/products/${productId}/reviews` |
| `POST` | `/catalog/products/${productId}/reviews` |
| `GET` | `/catalog/products/${slug}` |
| `POST` | `/catalog/products/import-url` |
| `POST` | `/catalog/products/search-by-image` |
| `GET` | `/catalog/promotions/live` |
| `GET` | `/catalog/suppliers` |
| `GET` | `/catalog/welcome/examples` |
| `POST` | `/catalog/welcome/simulate` |
| `GET` | `/me/favorites` |
| `POST` | `/me/favorites/${productId}` |
| `DELETE` | `/me/favorites/${productId}` |
| `GET` | `/me/favorites/ids` |
| `GET` | `/me/product-views` |
| `POST` | `/me/product-views/${productId}` |

#### `api/client.ts` → `core` (173 líneas)

No expone endpoints de negocio: es el cliente HTTP compartido. Lo que hace, y que en Angular hay que reproducir en `core/http/`:

- `baseURL` = `VITE_API_BASE_URL` + `/api`.
- **Petición**: `Authorization: Bearer` (solo si el destino es nuestro backend), `X-Currency`, `X-Country` (país de registro; el invitado no lo manda), `Accept-Language` y `X-Lang`.
- **CAPTCHA**: resuelve el reto ALTCHA e inyecta `X-Altcha` en los POST a `/auth/register`, `/auth/password-reset/request`, `/auth/activate/resend`, `/newsletter/subscribe` y `/contact`.
- **Respuesta**: si llega HTML donde se esperaba JSON, lo convierte en error.
- **401**: renueva una sola vez con `POST /api/auth/refresh` (single-flight) y reintenta; si no puede, limpia los testigos y manda a `/login`.


#### `api/orders.ts` → `orders` (372 líneas, 10 endpoints)

| Método | Ruta |
|---|---|
| `POST` | `/catalog/cart-quote` |
| `GET` | `/me/orders` |
| `GET` | `/me/orders/${id}` |
| `POST` | `/me/orders/${id}/cancel` |
| `GET` | `/me/orders/${id}/tracking` |
| `POST` | `/me/orders/checkout` |
| `GET` | `/shipping/countries` |
| `GET` | `/shipping/postal-format` |
| `POST` | `/shipping/quote` |
| `GET` | `/shipping/regions` |

#### `api/legal.ts` → `platform` (78 líneas, 4 endpoints)

| Método | Ruta |
|---|---|
| `GET` | `/admin/legal` |
| `GET` | `/admin/legal/${docType}/${lang}` |
| `PUT` | `/admin/legal/${docType}/${lang}` |
| `GET` | `/legal/${docType}` |

#### `api/platform.ts` → `platform` (165 líneas, 69 endpoints)

| Método | Ruta |
|---|---|
| `GET` | `/academy/courses` |
| `GET` | `/academy/courses/${slug}` |
| `GET` | `/admin/odm/projects` |
| `PUT` | `/admin/odm/projects/${id}/status` |
| `GET` | `/admin/tickets` |
| `GET` | `/admin/tickets/${id}/replies` |
| `POST` | `/admin/tickets/${id}/replies` |
| `PUT` | `/admin/tickets/${id}/resolve` |
| `GET` | `/admin/warehouses` |
| `POST` | `/admin/warehouses` |
| `PUT` | `/admin/warehouses/${id}` |
| `DELETE` | `/admin/warehouses/${id}` |
| `GET` | `/catalog/products/${productId}/warehouse-stock` |
| `POST` | `/me/academy/enroll/${courseId}` |
| `GET` | `/me/academy/enrollments` |
| `PUT` | `/me/academy/enrollments/${id}/progress` |
| `GET` | `/me/affiliate` |
| `GET` | `/me/intelligence/ad-trends` |
| `GET` | `/me/intelligence/alerts` |
| `POST` | `/me/intelligence/alerts` |
| `DELETE` | `/me/intelligence/alerts/${id}` |
| `GET` | `/me/intelligence/sales-trends` |
| `GET` | `/me/intelligence/winning-products` |
| `GET` | `/me/mentors/bookings` |
| `POST` | `/me/mentors/bookings` |
| `GET` | `/me/notifications` |
| `DELETE` | `/me/notifications/${id}` |
| `POST` | `/me/notifications/${id}/archive` |
| `DELETE` | `/me/notifications/${id}/permanent` |
| `POST` | `/me/notifications/${id}/read` |
| `POST` | `/me/notifications/${id}/restore` |
| `POST` | `/me/notifications/${id}/status` |
| `POST` | `/me/notifications/${id}/unarchive` |
| `POST` | `/me/notifications/read-all` |
| `GET` | `/me/notifications/unread-count` |
| `GET` | `/me/odm/projects` |
| `POST` | `/me/odm/projects` |
| `GET` | `/me/odm/projects/${id}` |
| `PUT` | `/me/odm/projects/${id}` |
| `DELETE` | `/me/odm/projects/${id}` |
| `GET` | `/me/pod/designs` |
| `POST` | `/me/pod/designs` |
| `PUT` | `/me/pod/designs/${id}` |
| `DELETE` | `/me/pod/designs/${id}` |
| `GET` | `/me/shops` |
| `POST` | `/me/shops` |
| `DELETE` | `/me/shops/${id}` |
| `GET` | `/me/shops/${id}/listings` |
| `POST` | `/me/shops/${id}/listings/${productId}` |
| `POST` | `/me/shops/${id}/sync` |
| `GET` | `/me/shops/platforms` |
| `GET` | `/me/sourcing/agents` |
| `GET` | `/me/sourcing/agents/${id}` |
| `GET` | `/me/sourcing/requests` |
| `POST` | `/me/sourcing/requests` |
| `DELETE` | `/me/sourcing/requests/${id}` |
| `POST` | `/me/sourcing/requests/${id}/cancel` |
| `GET` | `/me/sourcing/requests/${id}/quotes` |
| `POST` | `/me/sourcing/requests/${id}/select-quote/${qid}` |
| `GET` | `/me/tickets` |
| `POST` | `/me/tickets` |
| `GET` | `/me/tickets/${id}/replies` |
| `POST` | `/me/tickets/${id}/replies` |
| `GET` | `/mentors` |
| `GET` | `/mentors/${id}` |
| `GET` | `/pod/blank-products` |
| `POST` | `/shipping/calculator` |
| `POST` | `/shipping/carbon-footprint` |
| `GET` | `/warehouses` |

#### `api/chat.ts` → `support` (31 líneas, 1 endpoints)

| Método | Ruta |
|---|---|
| `POST` | `/chat` |

#### `api/wallet.ts` → `wallet` (88 líneas, 6 endpoints)

| Método | Ruta |
|---|---|
| `GET` | `/me/wallet` |
| `POST` | `/me/wallet/confirm-mock?paymentId=${paymentId}` |
| `POST` | `/me/wallet/paypal/capture?paymentId=${paymentId}` |
| `POST` | `/me/wallet/recharge` |
| `POST` | `/me/wallet/recharge/${paymentId}/confirm` |
| `GET` | `/me/wallet/recharge/options` |

### 3.2 Endpoints llamados FUERA de `src/api/` (deuda a recoger en los puertos)

Estas llamadas se escribieron directamente en la página, el componente o el almacén. Al portar hay que subirlas a un puerto de su contexto: si se quedan en la pantalla, el lint de fronteras del proyecto Angular no las deja pasar.


| Origen | Método | Ruta | Contexto destino |
|---|---|---|---|
| `MySubscriptionSection` | `GET` | `/me/billing/invoices/${encodeURIComponent(number)}/invoice.pdf` | `account` |
| `NotificationsBell` | `GET` | `/me/notifications/unread-count` | `notifications` |
| `NotificationsDropdown` | `GET` | `/me/notifications` | `notifications` |
| `NotificationsDropdown` | `POST` | `/me/notifications/read-all` | `notifications` |
| `AdminOrderDetailPage` | `GET` | `/admin/orders/${o.id}/invoice.pdf` | `admin` |
| `AdminProductDetailPage` | `GET` | `/admin/catalog/products/${id}` | `admin` |
| `AdminProductDetailPage` | `GET` | `/admin/catalog/products/${id}/variants` | `admin` |
| `AdminProductDetailPage` | `POST` | `/admin/catalog/products/${id}/duplicate` | `admin` |
| `AdminProductDetailPage` | `PUT` | `/admin/catalog/products/${id}` | `admin` |
| `AdminProfilePage` | `GET` | `/me/2fa/status` | `admin` |
| `AdminProfilePage` | `GET` | `/me/sessions` | `admin` |
| `AdminProfilePage` | `POST` | `/me/2fa/disable` | `admin` |
| `AdminProfilePage` | `POST` | `/me/2fa/verify` | `admin` |
| `AdminProfilePage` | `POST` | `/me/sessions/${id}/revoke` | `admin` |
| `auth/PasswordResetPage` | `POST` | `/auth/password-reset/confirm` | `auth` |
| `auth/PasswordResetPage` | `POST` | `/auth/password-reset/request` | `auth` |
| `auth/RegisterPage` | `GET` | `/currency/rates` | `auth` |
| `auth/RegisterPage` | `GET` | `/geo` | `auth` |
| `ContactPage` | `POST` | `/contact` | `support` |
| `HomePage` | `GET` | `/currency/rates` | `catalog` |
| `HomePage` | `GET` | `/languages` | `catalog` |
| `ProductDetailPage` | `PUT` | `/admin/catalog/products/${p!.id}` | `catalog` |
| `cart/CheckoutPage` | `POST` | `/me/orders/${o.id}/payment-intent` | `checkout` |
| `cart/CheckoutPage` | `POST` | `/me/orders/${o.id}/payments/${res.data.id}/confirm` | `checkout` |
| `cart/CheckoutPage` | `POST` | `/me/orders/${paymentResult.orderId}/payments/${paymentResult.id}/confirm-mock` | `checkout` |
| `cart/CheckoutReturnPage` | `POST` | `/me/orders/${orderId}/payments/${paymentId}/confirm` | `checkout` |
| `orders/OrderDetailPage` | `GET` | `/me/orders/${orderId}/invoice.pdf` | `orders` |
| `profile/ProfilePage` | `GET` | `/me/2fa/status` | `account` |
| `profile/ProfilePage` | `GET` | `/me/sessions` | `account` |
| `profile/ProfilePage` | `POST` | `/me/2fa/disable` | `account` |
| `profile/ProfilePage` | `POST` | `/me/2fa/verify` | `account` |
| `profile/ProfilePage` | `POST` | `/me/sessions/${id}/revoke` | `account` |
| `store/auth` | `GET` | `/me` | `auth` |
| `store/auth` | `POST` | `/auth/activate` | `auth` |
| `store/auth` | `POST` | `/auth/activate/resend` | `auth` |
| `store/auth` | `POST` | `/auth/login` | `auth` |
| `store/auth` | `POST` | `/auth/logout` | `auth` |
| `store/auth` | `PUT` | `/me` | `auth` |
| `store/currency` | `GET` | `/currency/rates` | `core` |

Además, fuera del cliente `api`:

- `lib/captcha.ts` → `GET /api/captcha/challenge` (axios crudo, para no crear un ciclo de imports).
- `api/client.ts` → `POST /api/auth/refresh` (axios crudo, para no recursar por el interceptor).
- `pages/auth/LoginPage.tsx` y `pages/auth/RegisterPage.tsx` → navegación del navegador a `${API_BASE}/oauth2/authorization/{proveedor}` (Google). No es una llamada AJAX: es una redirección.
- `pages/admin/ProductExportModal.tsx` → `fetch(GET /api/admin/catalog/products/export/ndjson)` en streaming, con `Authorization` a mano.
- `lib/apiServidor.ts` → cualquier ruta, pero contra la red interna (`NEXADROP_API_INTERNA`, por defecto `http://backend:18082`), con 4 s de plazo. Es el camino del renderizado en servidor.


---


## 4. Estado y hooks


### 4.1 Almacenes (`src/store/*`) — 10 ficheros (8 con prueba)

Todos son almacenes de **zustand**. En Angular pasan a `signal()` dentro de `application/` del contexto, o a `core/` si son transversales.


| Fichero | Líneas | Qué guarda | ¿Se persiste? | Destino |
|---|---|---|---|---|
| `store/auth.ts` | 199 | Sesión: usuario actual, entrar, salir, registrar, activar. Guarda el par de testigos vía `lib/authToken`. | Sí — `localStorage`: `nx-access-token`, `nx-refresh-token` (en `lib/authToken`) y `nx036-country` (país de registro, que el cliente HTTP manda como `X-Country`). | `auth` |
| `store/avatar.ts` | 115 | Estado del asistente flotante: activo / mini / oculto, su posición arrastrable y si la voz está encendida. | Sí — `localStorage`: `nx036.avatar.state`, `nx036.avatar.pos`, `nx036.avatar.voice`, `nx036.welcome.v1`. | `support` |
| `store/cart.ts` | 337 | Carrito activo y la lista de «guardar para más tarde»: líneas, cantidades, precio unitario congelado y su divisa de origen. Adopta la cesta de la cuenta al iniciar sesión. | Sí — `localStorage` mediante el middleware `persist` de zustand. Con sesión, la fuente de verdad pasa a ser el backend. | `cart` |
| `store/cookieConsent.ts` | 114 | Consentimiento de cookies: régimen del país (RGPD / UK / LGPD / CCPA), categorías aceptadas y si ya se decidió. | Sí — `localStorage`: `nx-cookie-consent` (con versión y fecha). | `platform` |
| `store/currency.ts` | 228 | Divisas disponibles, la elegida, el cambio del día, y `format()`/`convert()` para pintar importes. | Sí — cookie de preferencia (la lee el servidor) + `localStorage`: `nx036-currency` y una marca de «elegida a mano». | `core` |
| `store/dialog.ts` | 207 | Diálogos centrales que sustituyen a `alert`/`confirm`/`prompt`, más un modo formulario de varios campos. | No. | `design-system` |
| `store/locale.ts` | 129 | Idioma activo y la función `t()` de traducción sobre `i18n/translations.ts`. | Sí — cookie de preferencia + `localStorage`: `nx036-locale`. | `core` |
| `store/preferencias.tsx` | 46 | **No es un almacén de zustand: es un contexto de React.** Aísla idioma, divisa y tema *por petición* durante el renderizado en servidor, para que dos visitas simultáneas no se pisen. | No (lee de la cookie que resuelve `lib/preferencias`). | `core` |
| `store/theme.ts` | 92 | Tema claro / oscuro (`nx036-pastel` / `nx036-pastel-dark`), con migración desde los nombres antiguos. | Sí — cookie de preferencia + `localStorage`: `nx036-theme`. | `core` |
| `store/toast.ts` | 49 | Cola de avisos efímeros (éxito, error, info, aviso) con tiempo de vida. | No. | `design-system` |

**Total almacenes: 10 ficheros, 1516 líneas.**


### 4.2 Hooks (`src/hooks/*`) — 9 ficheros (2 con prueba)


| Fichero | Líneas | Qué hace | Destino |
|---|---|---|---|
| `hooks/useAddToCart.ts` | 99 | Añadir al carrito con las mismas reglas desde cualquier sitio (tarjeta, ficha, asistente): resuelve el precio contra la ficha, avisa si no hay existencias y lanza el efecto de vuelo. | `cart` |
| `hooks/useBackOrHome.ts` | 33 | El botón «atrás» de una pantalla a la que también se llega desde fuera del sitio: vuelve al historial si lo hay, y al inicio si la pestaña se abrió nueva. | `core` |
| `hooks/useCancelOrder.ts` | 46 | Flujo completo de cancelación de pedido: confirmación, elección del destino del reembolso (billetera o método original) y refresco de las consultas. | `orders` |
| `hooks/useCartQuote.ts` | 81 | Re-cotiza el carrito con el precio ACTUAL del backend (margen + cambio del día) porque el carrito congela el precio al añadir. Incluye el formateo de peso. | `cart` |
| `hooks/useDesplazandose.ts` | 33 | Dice si la página se está desplazando ahora mismo, para apartar lo que flota (asistente, chat). Vuelve a falso 250 ms después del último empujón. | `design-system` |
| `hooks/useFavorites.ts` | 45 | Conjunto de identificadores favoritos, cargado una sola vez y compartido por todas las tarjetas, con alternado optimista. | `catalog` |
| `hooks/useGalleryAutoplay.ts` | 118 | Pase automático de la galería de la ficha: máximo 8 fotos, 1 s de espera inicial y 5 s por foto (mayor que el fundido de 2 s del CSS). | `catalog` |
| `hooks/useSavedForLater.ts` | 42 | Acciones de «guardar para más tarde»: mueve líneas entre carrito y guardados, optimista en local y sincronizado si hay sesión. | `cart` |
| `hooks/useTrasHidratar.ts` | 18 | Dice si la página ya está viva en el navegador. Es la llave para no pintar en el primer render nada que el servidor no pueda saber (cesta, almacenamiento, tamaño de ventana). | `core` |

**Total hooks: 9 ficheros, 515 líneas.**


---


## 5. Utilidades (`src/lib/*.ts`) — 12 ficheros (10 con prueba)

`core/` es lo transversal que toca al navegador o a la red; `shared/` es puro (sin Angular, sin efectos): se puede llamar desde el dominio sin romper la regla de dependencia.


| Fichero | Líneas | Qué hace | Destino |
|---|---|---|---|
| `lib/apiError.ts` | 6 | Elige el mensaje de error que se enseña. La traducción la hace el BACKEND (cabecera `X-Lang`); aquí solo se escoge `response.data.message` o uno genérico. | `core/` |
| `lib/apiServidor.ts` | 57 | Cómo llega el servidor al backend durante el renderizado en servidor: dirección absoluta de la red interna (`NEXADROP_API_INTERNA`) y 4 s de plazo. | `core/` |
| `lib/authToken.ts` | 43 | Guarda y lee el par de testigos (acceso + refresco) en `localStorage`, tolerando que esté bloqueado. | `core/` |
| `lib/captcha.ts` | 49 | Resuelve el reto ALTCHA (prueba de trabajo, SHA-256 con `crypto.subtle`) contra `GET /api/captcha/challenge`. | `core/` |
| `lib/flyToCart.ts` | 87 | Efecto de «volar al carrito»: clona la imagen y la anima hasta el icono del carrito visible. DOM puro, sin estado de React, y respeta «reducir movimiento». | `core/` |
| `lib/fragmentosCaducados.ts` | 77 | Recupera la página cuando un despliegue deja sus fragmentos de JavaScript obsoletos. Recarga UNA vez, con doble cerrojo (memoria + `sessionStorage`) para no entrar en bucle. | `core/` |
| `lib/preferencias.ts` | 187 | Idioma, divisa y tema en COOKIE, que es lo único que el servidor puede leer al renderizar. Todo valor se comprueba contra una lista cerrada antes de usarse. | `core/` |
| `lib/sanitize.ts` | 19 | Limpia el HTML de las descripciones de proveedor con la variante ISOMÓRFICA de DOMPurify. Sin ella, al renderizar en servidor la protección desaparecía justo donde más daño hace. | `core/` |
| `lib/voz.ts` | 55 | Voz del asistente con la síntesis del propio navegador. Hace falta un clic previo: ningún navegador deja hablar a una página antes de que se interactúe con ella. | `core/` |
| `lib/cookieRegion.ts` | 31 | Régimen de privacidad por país: EEE + Suiza → RGPD, GB → UK, BR → LGPD, US → CCPA. Decide si el consentimiento es opt-in u opt-out. | `shared/` |
| `lib/country.ts` | 25 | Nombre completo del país a partir del ISO-2 con `Intl.DisplayNames`, y localización de ubicaciones de seguimiento («Shenzhen, CN» → «Shenzhen, China»). | `shared/` |
| `lib/dutySimulator.ts` | 164 | Las cuentas del simulador de la guía de bienvenida: arancel por partida, envío por bulto y tope por pedido. Cifras de ejemplo; el importe real lo calcula el servidor. | `shared/` |

**Total utilidades: 12 ficheros, 800 líneas** — 580 a `core/` y 220 a `shared/`.


---


## 6. Recuento final por contexto

Esta es la tabla del reparto. Cada uno de los **213 ficheros** de `src/` (sin pruebas) aparece en **una y sola una** fila: la suma cuadra con el total del proyecto y ninguno queda fuera ni contado dos veces. Las **142 pruebas** se reparten por el contexto del fichero que prueban.


### 6.1 Los doce contextos acotados

| # | Contexto | Páginas | Componentes | Módulos API | Estado y hooks | Ficheros | Líneas | Pruebas |
|---|---|---|---|---|---|---|---|---|
| 1 | **`admin`** | 35 | 5 | 5 | 0 | 45 | **12865** | 41 |
| 2 | **`catalog`** | 5 | 10 | 1 | 2 | 18 | **5457** | 15 |
| 3 | **`platform`** | 12 | 2 | 2 | 1 | 17 | **2961** | 10 |
| 4 | **`account`** | 3 | 9 | 3 | 0 | 15 | **2182** | 13 |
| 5 | **`support`** | 3 | 4 | 1 | 1 | 9 | **1423** | 5 |
| 6 | **`checkout`** | 2 | 4 | 0 | 0 | 6 | **1401** | 5 |
| 7 | **`auth`** | 5 | 2 | 0 | 1 | 8 | **1390** | 6 |
| 8 | **`cart`** | 1 | 3 | 3 | 4 | 11 | **1286** | 7 |
| 9 | **`orders`** | 2 | 1 | 1 | 1 | 5 | **1093** | 4 |
| 10 | **`notifications`** | 2 | 3 | 0 | 0 | 5 | **718** | 3 |
| 11 | **`wallet`** | 4 | 0 | 1 | 0 | 5 | **698** | 5 |
| 12 | **`affiliate`** | 1 | 1 | 1 | 0 | 3 | **535** | 2 |
| | **Subtotal** | **75** | **44** | **18** | **10** | **147** | **32009** | **116** |

### 6.2 Capas transversales (no son de nadie: se portan primero)

| Capa | Ficheros | Líneas | Pruebas |
|---|---|---|---|
| `shared/` — traducciones, países, contenido legal, formato puro | 10 | **25349** | 3 |
| `core/` — HTTP, testigos, CAPTCHA, preferencias, saneado, arranque | 21 | **1494** | 12 |
| `design-system/` — diálogo, avisos, migas, filtros, movimiento | 21 | **1849** | 9 |
| `layout` — marcos de página, tabla de rutas y raíz de la aplicación | 14 | **1506** | 2 |
| **Subtotal** | **66** | **30198** | **26** |

### 6.3 Total del proyecto

| | Ficheros | Líneas | Pruebas |
|---|---|---|---|
| Los doce contextos | 147 | 32009 | 116 |
| Capas transversales | 66 | 30198 | 26 |
| **TOTAL `frontend/src`** | **213** | **62207** | **142** |


> Comprobación: 147+66 = **213 ficheros** y 32009+30198 = **62207 líneas**, que es exactamente lo que devuelve
> `find src -name '*.ts' -o -name '*.tsx' | grep -v '.test.'`. Las pruebas suman **142** ficheros y 44 331 líneas más, que no entran en el recuento anterior.


### 6.4 Aviso sobre `shared/`

`shared/` pesa 25349 líneas, pero **23194 son el diccionario de los ocho idiomas** (`i18n/translations.ts`) y 1223 los textos legales de respaldo. Es prosa, no lógica: se copia tal cual y no debe contarse como esfuerzo de porte. Descontando esos dos ficheros, `shared/` son 932 líneas reales.


### 6.5 Peso relativo de cada contexto


Por el motivo anterior, el peso de verdad de cada contexto se lee mejor así:


| Contexto | Líneas | Peso relativo |
|---|---|---|
| `admin` | 12865 | ████████████████████ 40.2 % |
| `catalog` | 5457 | █████████ 17.0 % |
| `platform` | 2961 | █████ 9.3 % |
| `account` | 2182 | ███ 6.8 % |
| `support` | 1423 | ██ 4.4 % |
| `checkout` | 1401 | ██ 4.4 % |
| `auth` | 1390 | ██ 4.3 % |
| `cart` | 1286 | ██ 4.0 % |
| `orders` | 1093 | ██ 3.4 % |
| `notifications` | 718 | █ 2.2 % |
| `wallet` | 698 | █ 2.2 % |
| `affiliate` | 535 | █ 1.7 % |

---


## 7. Riesgos del porte

Los quince puntos donde el porte se puede torcer, en orden de gravedad. No es la lista de ficheros grandes: es la de los que **no se traducen línea a línea** porque dependen de algo que en Angular no existe o funciona de otra manera.


| # | Fichero | Contexto | Líneas | Por qué es difícil |
|---|---|---|---|---|
| 1 | `pages/storefront/ProductDetailPage.tsx` | `catalog` | 2137 | El fichero más grande del proyecto, y además **dos pantallas en una**: la ficha pública y el editor en línea del administrador viven en el mismo componente (18 `useState`, 11 mutaciones, 5 consultas). Dentro hay galería con pase automático, portal de React para la lupa, arrastrar y soltar para reordenar fotos y para pasar una imagen de variante a la galería, `dangerouslySetInnerHTML` con saneado, y edición de importes en yuanes con doble clic. Hay que **partirlo en dos** al portarlo (ficha en `catalog`, editor en `admin`) o no cabrá en el límite de 400 líneas que marca el lint. |
| 2 | `pages/storefront/cart/CheckoutPage.tsx` | `checkout` | 903 | Cadena de pago completa con **Stripe Elements de React** (`@stripe/react-stripe-js`), que no existe en Angular: hay que rehacerlo sobre `@stripe/stripe-js` montando los elementos a mano y controlando el ciclo de vida. Encima orquesta dirección, opciones de envío recotizadas en servidor, aranceles, billetera, tarjeta guardada y PayPal, con tres confirmaciones distintas (`payment-intent`, `payments/:id/confirm`, `confirm-mock`). Un fallo aquí se paga en dinero. |
| 3 | `pages/admin/AdminProductDetailPage.tsx` | `admin` | 1027 | Mil líneas de editor con arrastrar y soltar de imágenes y de variantes, edición en línea de precios por variante y por tramo, y el editor JSON masivo. El arrastrar y soltar de HTML5 se traslada, pero cada gesto dispara una mutación distinta y el orden en que llegan importa. |
| 4 | `components/CatalogBulkTools.tsx` | `admin` | 776 | 776 líneas de carga masiva: valida un JSON enorme campo a campo, explica cada error en ocho idiomas y sube por lotes. La lógica de validación es negocio puro y **debe salir del componente** hacia `admin/domain` — si se copia tal cual, es el primer sitio donde el lint de fronteras va a fallar. |
| 5 | `pages/storefront/DevelopersPage.tsx` | `platform` | 1143 | 1143 líneas de documentación de la API con ejemplos en cuatro lenguajes por endpoint. No tiene lógica, pero es un muro de plantillas con literales anidados: portarlo a mano es puro trabajo mecánico y propenso a erratas. Conviene sacar los ejemplos a un fichero de datos de `shared/`. |
| 6 | `components/AssistantAvatar.tsx` | `support` | 468 | 468 líneas de asistente flotante: arrastrable con eventos de puntero, con posición guardada, personaje SVG animado con **framer-motion** (sin equivalente directo en Angular; se rehace con animaciones CSS o la API de animaciones web), voz por `speechSynthesis` y sugerencias de carrito. Además cruza tres contextos: pide a `chat`, a `suggestions` y al carrito. |
| 7 | `components/Motion.tsx` | `design-system` | 127 | Es el envoltorio de transición entre páginas de TODA la aplicación (lo usan los dos marcos y varias páginas) y depende de cómo React Router monta y desmonta las rutas. En Angular el equivalente son las animaciones de router, que se declaran en otro sitio y con otro modelo: **hay que rediseñarlo, no traducirlo**, y es bloqueante porque cuelga de él el aspecto de cada navegación. |
| 8 | `api/client.ts` | `core` | 173 | 173 líneas que son el contrato de red entero: cabeceras `X-Currency` / `X-Country` / `X-Lang`, CAPTCHA invisible en cinco rutas públicas, detección de HTML donde se esperaba JSON, y renovación de testigo **single-flight** con reintento y expulsión a `/login`. En Angular son varios `HttpInterceptor` encadenados y el orden entre ellos cambia el comportamiento. Se porta el primero y lo usa todo el mundo. |
| 9 | `store/cart.ts` | `cart` | 337 | 337 líneas con la parte más delicada del estado: precio unitario congelado con su divisa de origen, carrito de invitado en `localStorage` que al iniciar sesión se **fusiona sumando cantidades** con el de la cuenta, y la segunda lista de «guardar para más tarde». El `persist` de zustand se sustituye por almacenamiento propio: si la hidratación se hace mal, se pierden carritos. |
| 10 | `src/i18n/translations.ts` | `shared` | 23194 | 23 194 líneas de diccionario en ocho idiomas. No es difícil, es **grande**: hay que moverlo tal cual, excluirlo del escaneo de Tailwind (`@source not`, ya previsto en las normas del proyecto) y no dejar que ningún otro trabajo dependa de tocarlo. La regla del proyecto es que toda corrección va a los ocho idiomas, no solo al español. |
| 11 | `src/routes.ts + routes/*.tsx` | `layout` | 395 | El mapa de rutas usa carga en servidor por ruta (`clientLoader`, `meta`) para que la ficha viaje con su título, su descripción y su foto ya escritos — es el motivo por el que se montó el renderizado en servidor. En Angular eso es SSR con `resolve` y `Meta`/`Title`, y **la equivalencia no es línea a línea**. Si se porta mal, compartir un producto por mensajería vuelve a enseñar la portada genérica. |
| 12 | `components/Dialog.tsx + store/dialog.ts` | `design-system` | 428 | 428 líneas entre los dos: sustituyen a `alert`/`confirm`/`prompt` con un modal que devuelve una promesa, y hay un modo formulario de varios campos con validación. Lo llaman decenas de pantallas con `await dialog.confirm(...)` desde funciones que no son componentes; en Angular hace falta un servicio que haga lo mismo **antes** de portar nada que lo use. |
| 13 | `store/preferencias.tsx + lib/preferencias.ts` | `core` | 233 | El aislamiento por petición durante el renderizado en servidor: idioma, divisa y tema viajan en cookie porque los almacenes son variables de módulo y en el servidor las comparten todas las visitas a la vez. Es un fallo que **no se ve en desarrollo** y aparece en producción como «alguien recibió la página en el idioma de otro». En Angular hay que resolverlo con `REQUEST` / `TransferState`. |
| 14 | `components/PaymentMethodsSection.tsx + AddCardForm/AddCardModal/PlanSelectorSection` | `account` | 524 | 524 líneas repartidas en cuatro ficheros que se apoyan en `<Elements>` de Stripe para React y en portales para el modal. Mismo problema que el checkout, pero además el orden de montaje importa: `AddCardForm` **solo funciona dentro** de `<Elements>`, y esa restricción se pierde al traducir. |
| 15 | `pages/admin/ProductExportModal.tsx` | `admin` | 221 | Descarga en flujo con `fetch` y `Authorization` puesto a mano, y el guardado del fichero tiene que dispararse **en el mismo gesto** del usuario: si se hace después de un `await`, el navegador lo bloquea. Es una trampa ya documentada en el propio fichero y muy fácil de perder al portar. |

### 7.1 Dependencias de React sin equivalente directo

| Librería | Dónde | Qué hacer en Angular |
|---|---|---|
| `framer-motion` | `AssistantCharacter`, `Motion` | Rehacer con animaciones CSS o la API de animaciones web. |
| `@stripe/react-stripe-js` | checkout, billetera y los cuatro componentes de tarjeta | Montar Stripe Elements a mano sobre `@stripe/stripe-js`. |
| `@tanstack/react-query` | casi todas las páginas | `resource()` de Angular, o TanStack Query para Angular si se quiere el mismo modelo de caché. |
| `zustand` (+ `persist`) | los diez almacenes | `signal()` en `application/`, con almacenamiento propio en `core/storage` (ya existe el puerto). |
| `react-hook-form` / `zod` | **no se usan**: están en `package.json` pero ningún fichero los importa | No portar nada. Los formularios están escritos a mano con `useState`. |
| `createPortal` | 6 ficheros (lupa, modales de dirección y de tarjeta) | `cdk-overlay` de Angular CDK. |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | Angular no tiene límites de error por árbol: se cubre con `ErrorHandler` global más un componente de respaldo por ruta. |
| `dangerouslySetInnerHTML` | `root.tsx`, ficha pública, ficha de admin, boletín | `[innerHTML]` con el mismo saneado de DOMPurify — **no** confiar en el saneador de Angular para el HTML de proveedor. |

### 7.2 Cabos sueltos encontrados al inventariar

- **`pages/admin/AdminSupportPage.tsx` (109 líneas) no está enrutada.** `/admin/support` monta `pages/storefront/platform/SupportPage.tsx`. Antes de portarla, decidir si se recupera o se borra.
- **`api/platform.ts` es un cajón de sastre**: 69 endpoints de notificaciones, tiques, almacenes, academia, mentores, tiendas, aprovisionamiento, inteligencia, ODM y POD. Al convertirlo en puertos hay que **partirlo**, o el contexto `platform` acaba siendo un `ApiPort` con cuarenta métodos, que es justo lo que prohíben las normas del proyecto.
- **El boletín vive en `api/affiliate.ts`** (`/newsletter/subscribe`, `/newsletter/unsubscribe`, `/me/email-preferences`) pero lo consumen `NewsletterSection` y `NewsletterUnsubscribePage`, que aquí van a `notifications`. Sacar un puerto de boletín propio.
- **`api/orders.ts` lleva el envío** (`/shipping/quote`, `/shipping/countries`, `/shipping/regions`, `/shipping/postal-format`), que es de `checkout`. Otro puerto a separar.
- **`api/suggestions.ts` es del carrito pero solo lo usa el asistente** (`support`). Es la dependencia cruzada más fina del proyecto: conviene fijarla como puerto de `cart` desde el principio.
- **No hay ningún componente huérfano**, pero dos entran por caminos que un `grep` de imports no ve: `PriceHistoryChart` y `MarginEstimate` se cargan con `import()` diferido desde la ficha de producto (equivalente Angular: `loadComponent`). Y otros cinco (`AddCardForm`, `AddCardModal`, `AssistantCharacter`, `ProductQuickView`, `RegionSelect`) los importa otro componente, no una página.
- **`PriceHistoryChart` y `DashboardSeriesCharts` dibujan SVG a mano**, sin librería de gráficos. Es una buena noticia: se portan sin arrastrar ninguna dependencia.


---


## 8. Orden de ataque sugerido

El reparto por contexto no dice por dónde empezar. Esto sí:


1. **Primero, y por una sola persona:** `core/` (el cliente HTTP con sus interceptores, preferencias por petición, testigos, CAPTCHA) y `design-system/` (diálogo, avisos, migas, filtros, buscador, movimiento). Todo lo demás depende de estas dos capas; hasta que no estén, cualquier equipo que arranque va a inventarse la suya.
2. **`shared/`** se puede mover en paralelo, casi sin pensar: son datos.
3. **Después, en paralelo:** `auth` → `catalog` → `cart` → `checkout` → `orders`, que es el camino de la compra y el que más se rompe si falta un eslabón.
4. **`admin` es el contexto más grande** (36 páginas). Se puede repartir entre dos equipos sin solaparse: catálogo y precios por un lado; pedidos, compras, usuarios y billeteras por otro.
5. **`platform` y `support` al final**: son los que menos bloquean y los que más van a cambiar.


---

*Inventario generado el 6 de septiembre de 2026 contando el árbol real de `frontend/src`.*
