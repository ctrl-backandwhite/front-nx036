// Contenido de las páginas institucionales/legales (Sobre nosotros, Privacidad, Términos) en los 8
// idiomas soportados. Se mantiene aquí (fuera de translations.ts) porque son bloques largos de texto;
// las páginas eligen el idioma activo con `pick()` y hacen fallback a español si falta.

export interface DocSection {
  h: string
  p: string[]
}
export interface DocContent {
  title: string
  updated?: string
  intro: string
  sections: DocSection[]
}

/** Elige el contenido del idioma activo; fallback a español, luego inglés. */
export function pick<T>(map: Record<string, T>, locale: string | undefined): T {
  const l = (locale || 'es').split('-')[0]
  return map[l] ?? map['es'] ?? map['en']
}


// ======================================================================================= SOBRE NOSOTROS
export const ABOUT: Record<string, DocContent> = {
  es: {
    title: 'Sobre nosotros',
    intro: 'NX036 es una plataforma de comercio transfronterizo con dos vías de venta. Por un lado, damos a vendedores, dropshippers y tiendas acceso directo a proveedores verificados para revender, integrando su tienda vía Shopify, WooCommerce o nuestra API. Por otro, vendemos productos directamente a consumidores finales desde nuestra propia web. Eliminamos intermediarios y capas de margen para que importar bestsellers, sincronizar tu catálogo y cumplir pedidos sea sencillo.',
    sections: [
      { h: 'Nuestra misión', p: ['Democratizar el acceso al abastecimiento global. Que cualquier vendedor —pequeño o grande— pueda vender productos ganadores con precios supplier-direct, inventario en tiempo real y logística automatizada, sin necesidad de contactos ni volúmenes mínimos.'] },
      { h: 'Qué hacemos', p: ['Seleccionamos catálogos de proveedores fiables, traducimos las fichas a 8 idiomas, calculamos precios, impuestos y envío por país, y reenviamos automáticamente cada pedido al proveedor con seguimiento end-to-end. Tú te centras en vender; nosotros nos encargamos del resto.'] },
      { h: 'Cómo funciona', p: ['Conectas tu tienda (Shopify, WooCommerce) o integras vía nuestra API. Eliges productos del catálogo, se publican en tu tienda y, cuando un cliente compra, el pedido se abastece con el proveedor y te devolvemos el número de seguimiento.'] },
      { h: 'Qué ofrece la plataforma', p: [
        'Catálogo multiproveedor con miles de productos verificados, fichas traducidas automáticamente a 8 idiomas y precios calculados por país (con impuestos y envío incluidos) en múltiples divisas.',
        'Cumplimiento automatizado: cada pedido se reenvía al proveedor y recibes seguimiento de principio a fin. Integraciones nativas con Shopify y WooCommerce, además de una API para conectar cualquier sistema.',
        'Wallet para gestionar saldo y recargas, programa de afiliados con comisiones, planes flexibles (incluido un mes de prueba gratis) y facturación con IVA por país. Todo desde un único panel.',
      ] },
      { h: 'Para quién es NX036', p: [
        'Para revendedores: desde dropshippers que empiezan y quieren vender productos ganadores sin mantener stock, hasta marcas y tiendas que buscan abastecimiento directo del proveedor, catálogo multi-idioma y logística sin fricción para escalar a nuevos mercados con márgenes sanos.',
        'Para compradores finales: cualquier persona que quiera comprar directamente en nuestra web, con precios competitivos, envío internacional y seguimiento de cada pedido.',
      ] },
      { h: 'Soporte y confianza', p: ['Proveedores verificados con indicadores de entrega, pagos protegidos, datos tratados conforme al RGPD y un equipo de soporte que responde en 24–48 h. La plataforma está disponible en 8 idiomas y varias divisas para que operes en tu mercado con comodidad.'] },
      { h: 'Nuestros valores', p: ['Transparencia en precios y comisiones, proveedores verificados con KPIs de entrega, y una plataforma segura y multi-idioma pensada para escalar contigo.'] },
      { h: 'Contacto', p: ['¿Quieres saber más o integrarte con nosotros? Escríbenos desde la página de contacto y nuestro equipo te responderá.'] },
    ],
  },
  en: {
    title: 'About us',
    intro: 'NX036 is a cross-border commerce platform with two ways to sell. On one side, we give sellers, dropshippers and stores direct access to vetted suppliers to resell — connecting their store via Shopify, WooCommerce or our API. On the other, we sell products directly to end customers from our own website. We remove middlemen and margin layers so importing bestsellers, syncing your catalog and fulfilling orders is simple.',
    sections: [
      { h: 'Our mission', p: ['Democratize access to global sourcing. Any seller — small or large — should be able to sell winning products at supplier-direct prices, with real-time inventory and automated logistics, with no contacts or minimum volumes required.'] },
      { h: 'What we do', p: ['We curate catalogs from reliable suppliers, translate listings into 8 languages, compute per-country prices, taxes and shipping, and automatically forward every order to the supplier with end-to-end tracking. You focus on selling; we handle the rest.'] },
      { h: 'How it works', p: ['Connect your store (Shopify, WooCommerce) or integrate via our API. Pick products from the catalog, publish them to your store, and when a customer buys, the order is fulfilled with the supplier and we return the tracking number.'] },
      { h: 'What the platform offers', p: [
        'A multi-supplier catalog with thousands of vetted products, listings auto-translated into 8 languages, and per-country prices (taxes and shipping included) in multiple currencies.',
        'Automated fulfillment: every order is forwarded to the supplier and you get end-to-end tracking. Native Shopify and WooCommerce integrations, plus an API to connect any system.',
        'A wallet to manage balance and top-ups, an affiliate program with commissions, flexible plans (including a one-month free trial), and per-country VAT invoicing — all from a single dashboard.',
      ] },
      { h: 'Who NX036 is for', p: [
        'For resellers: from first-time dropshippers who want to sell winning products with no stock, to brands and stores looking for supplier-direct sourcing, a multi-language catalog and frictionless logistics to scale into new markets with healthy margins.',
        'For end shoppers: anyone who wants to buy directly on our website, with competitive prices, international shipping and tracking on every order.',
      ] },
      { h: 'Support and trust', p: ['Vetted suppliers with delivery metrics, protected payments, GDPR-compliant data handling, and a support team that replies within 24–48 h. The platform is available in 8 languages and several currencies so you can operate comfortably in your market.'] },
      { h: 'Our values', p: ['Transparent prices and fees, vetted suppliers with delivery KPIs, and a secure, multi-language platform built to scale with you.'] },
      { h: 'Contact', p: ['Want to learn more or integrate with us? Reach out from the contact page and our team will get back to you.'] },
    ],
  },
  pt: {
    title: 'Sobre nós',
    intro: 'A NX036 é uma plataforma de comércio transfronteiriço que liga vendedores diretamente a fornecedores verificados na origem. Eliminamos intermediários e camadas de margem para que possa importar bestsellers, sincronizar o seu catálogo e cumprir encomendas com uma única integração.',
    sections: [
      { h: 'A nossa missão', p: ['Democratizar o acesso ao abastecimento global. Que qualquer vendedor — pequeno ou grande — possa vender produtos vencedores com preços supplier-direct, inventário em tempo real e logística automatizada, sem contactos nem volumes mínimos.'] },
      { h: 'O que fazemos', p: ['Selecionamos catálogos de fornecedores fiáveis, traduzimos as fichas em 8 idiomas, calculamos preços, impostos e envio por país e reencaminhamos automaticamente cada encomenda ao fornecedor com rastreio end-to-end. Você concentra-se em vender; nós tratamos do resto.'] },
      { h: 'Como funciona', p: ['Liga a sua loja (Shopify, WooCommerce) ou integra através da nossa API. Escolhe produtos do catálogo, são publicados na sua montra e, quando um cliente compra, a encomenda é abastecida com o fornecedor e devolvemos o número de rastreio.'] },
      { h: 'Os nossos valores', p: ['Transparência nos preços e comissões, fornecedores verificados com KPIs de entrega e uma plataforma segura e multilingue pensada para crescer consigo.'] },
      { h: 'Contacto', p: ['Quer saber mais ou integrar-se connosco? Escreva-nos a partir da página de contacto e a nossa equipa responderá.'] },
    ],
  },
  zh: {
    title: '关于我们',
    intro: 'NX036 是一个跨境电商平台,将卖家直接对接经过审核的源头供应商。我们去除中间商和加价环节,让您通过一次集成即可导入爆款、同步目录并履行订单。',
    sections: [
      { h: '我们的使命', p: ['让全球采购人人可及。无论规模大小,任何卖家都能以供应商直供价销售爆款商品,享受实时库存与自动化物流,无需人脉或起订量。'] },
      { h: '我们做什么', p: ['我们甄选可靠供应商的目录,将商品信息翻译成 8 种语言,按国家计算价格、税费与运费,并自动将每笔订单转发给供应商,提供端到端跟踪。您专注销售,其余交给我们。'] },
      { h: '运作方式', p: ['连接您的店铺(Shopify、WooCommerce)或通过我们的 API 集成。从目录中挑选商品并发布到您的店面;当客户下单时,订单由供应商履行,我们返回跟踪单号。'] },
      { h: '我们的价值观', p: ['价格与佣金透明、供应商经过审核并具备交付 KPI,以及一个安全、多语言、可随您扩展的平台。'] },
      { h: '联系我们', p: ['想了解更多或与我们集成?请通过联系页面给我们留言,我们的团队会尽快回复。'] },
    ],
  },
  fr: {
    title: 'À propos',
    intro: 'NX036 est une plateforme de commerce transfrontalier qui connecte les vendeurs directement à des fournisseurs vérifiés à la source. Nous supprimons les intermédiaires et les marges superflues pour que vous puissiez importer des bestsellers, synchroniser votre catalogue et exécuter les commandes avec une seule intégration.',
    sections: [
      { h: 'Notre mission', p: ['Démocratiser l’accès au sourcing mondial. Tout vendeur — petit ou grand — doit pouvoir vendre des produits gagnants à des prix supplier-direct, avec un inventaire en temps réel et une logistique automatisée, sans contacts ni volumes minimums.'] },
      { h: 'Ce que nous faisons', p: ['Nous sélectionnons des catalogues de fournisseurs fiables, traduisons les fiches en 8 langues, calculons les prix, taxes et frais de port par pays, et transférons automatiquement chaque commande au fournisseur avec un suivi end-to-end. Vous vendez ; nous gérons le reste.'] },
      { h: 'Comment ça marche', p: ['Connectez votre boutique (Shopify, WooCommerce) ou intégrez via notre API. Choisissez des produits du catalogue, publiez-les sur votre vitrine, et lorsqu’un client achète, la commande est exécutée avec le fournisseur et nous vous renvoyons le numéro de suivi.'] },
      { h: 'Nos valeurs', p: ['Transparence des prix et des commissions, fournisseurs vérifiés avec des KPI de livraison, et une plateforme sécurisée et multilingue conçue pour évoluer avec vous.'] },
      { h: 'Contact', p: ['Vous voulez en savoir plus ou vous intégrer ? Écrivez-nous depuis la page de contact et notre équipe vous répondra.'] },
    ],
  },
  de: {
    title: 'Über uns',
    intro: 'NX036 ist eine Plattform für grenzüberschreitenden Handel, die Verkäufer direkt mit geprüften Lieferanten an der Quelle verbindet. Wir schalten Zwischenhändler und Margenaufschläge aus, damit du Bestseller importieren, deinen Katalog synchronisieren und Bestellungen mit einer einzigen Integration erfüllen kannst.',
    sections: [
      { h: 'Unsere Mission', p: ['Den Zugang zu globalem Sourcing demokratisieren. Jeder Verkäufer — klein oder groß — soll Gewinnerprodukte zu Supplier-Direct-Preisen verkaufen können, mit Echtzeit-Bestand und automatisierter Logistik, ohne Kontakte oder Mindestmengen.'] },
      { h: 'Was wir tun', p: ['Wir kuratieren Kataloge zuverlässiger Lieferanten, übersetzen die Artikel in 8 Sprachen, berechnen Preise, Steuern und Versand pro Land und leiten jede Bestellung automatisch mit End-to-End-Tracking an den Lieferanten weiter. Du verkaufst; um den Rest kümmern wir uns.'] },
      { h: 'So funktioniert es', p: ['Verbinde deinen Shop (Shopify, WooCommerce) oder integriere über unsere API. Wähle Produkte aus dem Katalog, veröffentliche sie in deinem Schaufenster, und wenn ein Kunde kauft, wird die Bestellung beim Lieferanten erfüllt und wir liefern die Sendungsnummer zurück.'] },
      { h: 'Unsere Werte', p: ['Transparente Preise und Gebühren, geprüfte Lieferanten mit Liefer-KPIs und eine sichere, mehrsprachige Plattform, die mit dir wächst.'] },
      { h: 'Kontakt', p: ['Möchtest du mehr erfahren oder dich integrieren? Schreib uns über die Kontaktseite und unser Team meldet sich.'] },
    ],
  },
  it: {
    title: 'Chi siamo',
    intro: 'NX036 è una piattaforma di commercio transfrontaliero che collega i venditori direttamente a fornitori verificati all’origine. Eliminiamo intermediari e margini superflui così puoi importare bestseller, sincronizzare il tuo catalogo ed evadere gli ordini con un’unica integrazione.',
    sections: [
      { h: 'La nostra missione', p: ['Democratizzare l’accesso al sourcing globale. Ogni venditore — piccolo o grande — deve poter vendere prodotti vincenti a prezzi supplier-direct, con inventario in tempo reale e logistica automatizzata, senza contatti né volumi minimi.'] },
      { h: 'Cosa facciamo', p: ['Selezioniamo cataloghi di fornitori affidabili, traduciamo le schede in 8 lingue, calcoliamo prezzi, imposte e spedizione per Paese e inoltriamo automaticamente ogni ordine al fornitore con tracking end-to-end. Tu vendi; al resto pensiamo noi.'] },
      { h: 'Come funziona', p: ['Collega il tuo negozio (Shopify, WooCommerce) o integra tramite la nostra API. Scegli prodotti dal catalogo, pubblicali nella tua vetrina e, quando un cliente acquista, l’ordine viene evaso con il fornitore e ti restituiamo il numero di tracciamento.'] },
      { h: 'I nostri valori', p: ['Prezzi e commissioni trasparenti, fornitori verificati con KPI di consegna e una piattaforma sicura e multilingua pensata per crescere con te.'] },
      { h: 'Contatti', p: ['Vuoi saperne di più o integrarti con noi? Scrivici dalla pagina dei contatti e il nostro team ti risponderà.'] },
    ],
  },
  nl: {
    title: 'Over ons',
    intro: 'NX036 is een platform voor grensoverschrijdende handel dat verkopers rechtstreeks verbindt met gecontroleerde leveranciers bij de bron. We schakelen tussenpersonen en margelagen uit, zodat je bestsellers kunt importeren, je catalogus kunt synchroniseren en bestellingen kunt afhandelen met één integratie.',
    sections: [
      { h: 'Onze missie', p: ['Toegang tot wereldwijde sourcing democratiseren. Elke verkoper — klein of groot — moet winnende producten kunnen verkopen tegen supplier-direct-prijzen, met realtime voorraad en geautomatiseerde logistiek, zonder contacten of minimumafnames.'] },
      { h: 'Wat we doen', p: ['We cureren catalogi van betrouwbare leveranciers, vertalen de vermeldingen in 8 talen, berekenen prijzen, belasting en verzending per land en sturen elke bestelling automatisch door naar de leverancier met end-to-end tracking. Jij verkoopt; wij regelen de rest.'] },
      { h: 'Hoe het werkt', p: ['Verbind je winkel (Shopify, WooCommerce) of integreer via onze API. Kies producten uit de catalogus, publiceer ze in je etalage en wanneer een klant koopt, wordt de bestelling bij de leverancier afgehandeld en geven we het trackingnummer terug.'] },
      { h: 'Onze waarden', p: ['Transparante prijzen en kosten, gecontroleerde leveranciers met leverings-KPI’s en een veilig, meertalig platform dat met je meegroeit.'] },
      { h: 'Contact', p: ['Meer weten of integreren? Neem contact met ons op via de contactpagina en ons team reageert.'] },
    ],
  },
}

// ============================================================================================ PRIVACIDAD

// =============================================================================================== TÉRMINOS

// =============================================================================================== COOKIES
