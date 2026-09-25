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
  // Reescrito el 25-sep-2026: la página describía NX036 como un servicio de integración —«conecta tu
  // tienda con Shopify o WooCommerce»— que NO se está ofreciendo. Es la página que un buscador indexa
  // palabra por palabra, así que lo que diga aquí es lo que se lee de la empresa. Si algún día se
  // ofrecen integraciones, se añaden aquí; mientras no se ofrezcan, no se nombran.
  es: {
    title: 'Sobre nosotros',
    intro: 'NX036 es una plataforma de comercio transfronterizo donde se compra directamente, por unidades y sin pedidos mínimos. Seleccionamos bestsellers de proveedores verificados en origen y los vendemos en nuestra propia web con el precio ya cerrado: producto, impuestos y envío internacional. Eliminamos intermediarios y capas de margen para que comprar fuera sea tan sencillo como comprar en casa.',
    sections: [
      { h: 'Nuestra misión', p: ['Democratizar el acceso al abastecimiento global: que cualquiera pueda comprar productos de origen al precio de origen, sin contactos, sin volúmenes mínimos y sin sorpresas en la aduana.'] },
      { h: 'Qué hacemos', p: ['Seleccionamos catálogos de proveedores fiables, traducimos cada ficha a 8 idiomas, calculamos el precio por país —con impuestos y envío incluidos— en varias divisas, y nos ocupamos del pedido de principio a fin: lo abastecemos con el proveedor y te damos el seguimiento hasta tu puerta.'] },
      { h: 'Cómo funciona', p: ['Eliges el producto en nuestro catálogo y pagas el precio que ves, sin cargos al recibir. Nosotros lo compramos al proveedor, lo preparamos y te lo enviamos con número de seguimiento. Cuantas más unidades lleves del mismo producto, menor es el precio por unidad: la tabla de cantidades de cada ficha lo dice antes de pagar.'] },
      { h: 'Qué ofrece la plataforma', p: [
        'Catálogo multiproveedor con miles de productos verificados, fichas traducidas automáticamente a 8 idiomas y precios calculados por país —impuestos y envío incluidos— en varias divisas.',
        'En muchos productos asumimos nosotros parte del envío y del arancel de aduana. Verás cuáles, marcados en su ficha, antes de pagar.',
        'Monedero para gestionar saldo y recargas, programa de afiliados con comisiones y facturación con IVA por país. Todo desde un único panel.',
      ] },
      { h: 'Para quién es NX036', p: [
        'Para compradores: cualquier persona que quiera comprar directamente en nuestra web, con precios competitivos, envío internacional y seguimiento de cada pedido.',
        'Para revendedores: quien compra para revender encuentra precio de origen por unidades y descuentos por cantidad, sin mantener stock ni negociar con el proveedor.',
      ] },
      { h: 'Soporte y confianza', p: ['Proveedores verificados con indicadores de entrega, pagos protegidos, datos tratados conforme al RGPD y un equipo de soporte que responde en 24–48 h. La plataforma está disponible en 8 idiomas y varias divisas para que compres en tu mercado con comodidad.'] },
      { h: 'Nuestros valores', p: ['Transparencia en precios y comisiones, proveedores verificados con indicadores de entrega, y una plataforma segura y multi-idioma.'] },
      { h: 'Contacto', p: ['¿Quieres saber más? Escríbenos desde la página de contacto y nuestro equipo te responderá.'] },
    ],
  },
  en: {
    title: 'About us',
    intro: 'NX036 is a cross-border commerce platform where you buy directly, by the unit and with no minimum order. We curate bestsellers from vetted suppliers at source and sell them on our own website at a settled price: product, taxes and international shipping. We remove middlemen and margin layers so buying from abroad is as simple as buying at home.',
    sections: [
      { h: 'Our mission', p: ['Democratize access to global sourcing: anyone should be able to buy products at source prices, with no contacts, no minimum volumes and no surprises at customs.'] },
      { h: 'What we do', p: ['We curate catalogs from reliable suppliers, translate every listing into 8 languages, compute per-country prices — taxes and shipping included — in several currencies, and handle the order end to end: we source it with the supplier and give you tracking all the way to your door.'] },
      { h: 'How it works', p: ['You pick a product from our catalog and pay the price you see, with nothing to pay on delivery. We buy it from the supplier, prepare it and ship it with a tracking number. The more units of the same product you take, the lower the price per unit: each listing states it in its quantity table before you pay.'] },
      { h: 'What the platform offers', p: [
        'A multi-supplier catalog with thousands of vetted products, listings auto-translated into 8 languages, and per-country prices — taxes and shipping included — in several currencies.',
        'On many products we cover part of the shipping and the customs duty ourselves. You will see which ones, marked on the listing, before you pay.',
        'A wallet to manage balance and top-ups, an affiliate program with commissions, and per-country VAT invoicing — all from a single dashboard.',
      ] },
      { h: 'Who NX036 is for', p: [
        'For shoppers: anyone who wants to buy directly on our website, with competitive prices, international shipping and tracking on every order.',
        'For resellers: buying to resell means source prices by the unit and quantity discounts, with no stock to hold and no supplier to negotiate with.',
      ] },
      { h: 'Support and trust', p: ['Vetted suppliers with delivery metrics, protected payments, GDPR-compliant data handling, and a support team that replies within 24–48 h. The platform is available in 8 languages and several currencies so you can buy comfortably in your market.'] },
      { h: 'Our values', p: ['Transparent prices and fees, vetted suppliers with delivery metrics, and a secure, multi-language platform.'] },
      { h: 'Contact', p: ['Want to know more? Reach out from the contact page and our team will get back to you.'] },
    ],
  },
  pt: {
    title: 'Sobre nós',
    intro: 'A NX036 é uma plataforma de comércio transfronteiriço onde se compra diretamente, à unidade e sem encomenda mínima. Selecionamos bestsellers de fornecedores verificados na origem e vendemo-los no nosso próprio site com o preço já fechado: produto, impostos e envio internacional. Eliminamos intermediários e camadas de margem para que comprar lá fora seja tão simples como comprar em casa.',
    sections: [
      { h: 'A nossa missão', p: ['Democratizar o acesso ao abastecimento global: que qualquer pessoa possa comprar produtos ao preço de origem, sem contactos, sem volumes mínimos e sem surpresas na alfândega.'] },
      { h: 'O que fazemos', p: ['Selecionamos catálogos de fornecedores fiáveis, traduzimos cada ficha em 8 idiomas, calculamos o preço por país — com impostos e envio incluídos — em várias moedas, e tratamos da encomenda de ponta a ponta: abastecemo-la com o fornecedor e damos-lhe o rastreio até à sua porta.'] },
      { h: 'Como funciona', p: ['Escolhe o produto no nosso catálogo e paga o preço que vê, sem encargos na entrega. Nós compramo-lo ao fornecedor, preparamo-lo e enviamo-lo com número de rastreio. Quantas mais unidades levar do mesmo produto, menor é o preço por unidade: a tabela de quantidades de cada ficha di-lo antes de pagar.'] },
      { h: 'Os nossos valores', p: ['Transparência nos preços e comissões, fornecedores verificados com indicadores de entrega e uma plataforma segura e multilingue.'] },
      { h: 'Contacto', p: ['Quer saber mais? Escreva-nos a partir da página de contacto e a nossa equipa responderá.'] },
    ],
  },
  zh: {
    title: '关于我们',
    intro: 'NX036 是一个跨境电商平台,您可以在这里直接按件购买,没有起订量。我们从源头甄选经过审核的供应商的爆款商品,并在自有网站上以最终价格出售:商品、税费和国际运费全部包含在内。我们去除中间商和加价环节,让您海外购物像在本地购物一样简单。',
    sections: [
      { h: '我们的使命', p: ['让全球采购人人可及:任何人都能以源头价格购买商品,无需人脉、无需起订量,清关也不会有意外费用。'] },
      { h: '我们做什么', p: ['我们甄选可靠供应商的目录,将每件商品的信息翻译成 8 种语言,按国家以多种货币计算含税含运的价格,并全程负责订单:我们向供应商采购,并提供直到您家门口的物流跟踪。'] },
      { h: '运作方式', p: ['您在我们的目录中挑选商品,按所见价格付款,收货时无需再付任何费用。我们向供应商采购、打包并发货,并提供跟踪单号。同一商品购买的件数越多,单价越低:每件商品的数量价格表在付款前就会写明。'] },
      { h: '我们的价值观', p: ['价格与佣金透明、供应商经过审核并具备交付指标,以及一个安全的多语言平台。'] },
      { h: '联系我们', p: ['想了解更多?请通过联系页面给我们留言,我们的团队会尽快回复。'] },
    ],
  },
  fr: {
    title: 'À propos',
    intro: 'NX036 est une plateforme de commerce transfrontalier où l’on achète directement, à l’unité et sans commande minimum. Nous sélectionnons des bestsellers auprès de fournisseurs vérifiés à la source et les vendons sur notre propre site à un prix arrêté : produit, taxes et livraison internationale. Nous supprimons les intermédiaires et les marges superflues pour qu’acheter à l’étranger soit aussi simple qu’acheter chez soi.',
    sections: [
      { h: 'Notre mission', p: ['Démocratiser l’accès au sourcing mondial : que chacun puisse acheter des produits au prix de la source, sans contacts, sans volumes minimums et sans surprise à la douane.'] },
      { h: 'Ce que nous faisons', p: ['Nous sélectionnons des catalogues de fournisseurs fiables, traduisons chaque fiche en 8 langues, calculons le prix par pays — taxes et livraison comprises — dans plusieurs devises, et prenons en charge la commande de bout en bout : nous l’approvisionnons auprès du fournisseur et vous donnons le suivi jusqu’à votre porte.'] },
      { h: 'Comment ça marche', p: ['Vous choisissez le produit dans notre catalogue et payez le prix affiché, sans frais à la réception. Nous l’achetons au fournisseur, le préparons et vous l’expédions avec un numéro de suivi. Plus vous prenez d’unités du même produit, plus le prix unitaire baisse : le tableau de quantités de chaque fiche l’indique avant le paiement.'] },
      { h: 'Nos valeurs', p: ['Transparence des prix et des commissions, fournisseurs vérifiés avec des indicateurs de livraison, et une plateforme sécurisée et multilingue.'] },
      { h: 'Contact', p: ['Vous voulez en savoir plus ? Écrivez-nous depuis la page de contact et notre équipe vous répondra.'] },
    ],
  },
  de: {
    title: 'Über uns',
    intro: 'NX036 ist eine Plattform für grenzüberschreitenden Handel, auf der du direkt einkaufst — stückweise und ohne Mindestbestellmenge. Wir kuratieren Bestseller von geprüften Lieferanten an der Quelle und verkaufen sie auf unserer eigenen Website zum Endpreis: Produkt, Steuern und internationaler Versand. Wir schalten Zwischenhändler und Margenaufschläge aus, damit Einkaufen im Ausland so einfach ist wie zu Hause.',
    sections: [
      { h: 'Unsere Mission', p: ['Den Zugang zu globalem Sourcing demokratisieren: Jede und jeder soll Produkte zum Preis der Quelle kaufen können — ohne Kontakte, ohne Mindestmengen und ohne Überraschungen beim Zoll.'] },
      { h: 'Was wir tun', p: ['Wir kuratieren Kataloge zuverlässiger Lieferanten, übersetzen jeden Artikel in 8 Sprachen, berechnen den Preis pro Land — inklusive Steuern und Versand — in mehreren Währungen und kümmern uns um die Bestellung von Anfang bis Ende: Wir beschaffen sie beim Lieferanten und geben dir die Sendungsverfolgung bis vor die Tür.'] },
      { h: 'So funktioniert es', p: ['Du wählst das Produkt in unserem Katalog und zahlst den Preis, den du siehst — bei der Zustellung fällt nichts mehr an. Wir kaufen es beim Lieferanten, bereiten es vor und versenden es mit Sendungsnummer. Je mehr Stück desselben Produkts du nimmst, desto niedriger der Stückpreis: Die Mengentabelle jedes Artikels sagt es dir vor dem Bezahlen.'] },
      { h: 'Unsere Werte', p: ['Transparente Preise und Gebühren, geprüfte Lieferanten mit Lieferkennzahlen und eine sichere, mehrsprachige Plattform.'] },
      { h: 'Kontakt', p: ['Möchtest du mehr erfahren? Schreib uns über die Kontaktseite und unser Team meldet sich.'] },
    ],
  },
  it: {
    title: 'Chi siamo',
    intro: 'NX036 è una piattaforma di commercio transfrontaliero dove si acquista direttamente, a pezzo e senza ordine minimo. Selezioniamo bestseller da fornitori verificati all’origine e li vendiamo sul nostro sito a prezzo chiuso: prodotto, imposte e spedizione internazionale. Eliminiamo intermediari e margini superflui perché comprare dall’estero sia semplice come comprare a casa.',
    sections: [
      { h: 'La nostra missione', p: ['Democratizzare l’accesso al sourcing globale: chiunque deve poter comprare prodotti al prezzo dell’origine, senza contatti, senza volumi minimi e senza sorprese in dogana.'] },
      { h: 'Cosa facciamo', p: ['Selezioniamo cataloghi di fornitori affidabili, traduciamo ogni scheda in 8 lingue, calcoliamo il prezzo per Paese — imposte e spedizione incluse — in diverse valute e seguiamo l’ordine dall’inizio alla fine: lo approvvigioniamo dal fornitore e ti diamo il tracking fino alla porta di casa.'] },
      { h: 'Come funziona', p: ['Scegli il prodotto nel nostro catalogo e paghi il prezzo che vedi, senza costi alla consegna. Noi lo acquistiamo dal fornitore, lo prepariamo e te lo spediamo con numero di tracciamento. Più pezzi prendi dello stesso prodotto, più scende il prezzo unitario: la tabella delle quantità di ogni scheda lo dice prima del pagamento.'] },
      { h: 'I nostri valori', p: ['Prezzi e commissioni trasparenti, fornitori verificati con indicatori di consegna e una piattaforma sicura e multilingua.'] },
      { h: 'Contatti', p: ['Vuoi saperne di più? Scrivici dalla pagina dei contatti e il nostro team ti risponderà.'] },
    ],
  },
  nl: {
    title: 'Over ons',
    intro: 'NX036 is een platform voor grensoverschrijdende handel waar je rechtstreeks koopt, per stuk en zonder minimumbestelling. We selecteren bestsellers van gecontroleerde leveranciers bij de bron en verkopen ze op onze eigen website tegen een vaste prijs: product, belasting en internationale verzending. We schakelen tussenpersonen en margelagen uit, zodat kopen in het buitenland net zo eenvoudig is als kopen om de hoek.',
    sections: [
      { h: 'Onze missie', p: ['Toegang tot wereldwijde sourcing democratiseren: iedereen moet producten kunnen kopen tegen de prijs van de bron, zonder contacten, zonder minimumafnames en zonder verrassingen bij de douane.'] },
      { h: 'Wat we doen', p: ['We cureren catalogi van betrouwbare leveranciers, vertalen elke vermelding in 8 talen, berekenen de prijs per land — inclusief belasting en verzending — in meerdere valuta’s en regelen de bestelling van begin tot eind: we kopen hem in bij de leverancier en geven je tracking tot aan je deur.'] },
      { h: 'Hoe het werkt', p: ['Je kiest het product uit onze catalogus en betaalt de prijs die je ziet, zonder kosten bij ontvangst. Wij kopen het bij de leverancier, maken het klaar en versturen het met een trackingnummer. Hoe meer stuks van hetzelfde product je neemt, hoe lager de stukprijs: de hoeveelheidstabel op elke pagina zegt het vóór het betalen.'] },
      { h: 'Onze waarden', p: ['Transparante prijzen en kosten, gecontroleerde leveranciers met leveringsindicatoren en een veilig, meertalig platform.'] },
      { h: 'Contact', p: ['Meer weten? Neem contact met ons op via de contactpagina en ons team reageert.'] },
    ],
  },
}

// ============================================================================================ PRIVACIDAD

// =============================================================================================== TÉRMINOS

// =============================================================================================== COOKIES
