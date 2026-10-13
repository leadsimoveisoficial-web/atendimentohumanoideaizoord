export type Item = { n: string; d: string; p: string };
export type Section = { t: string; items: Item[] };
const W = "Consulte";

export const MENU: Section[] = [
  { t: "Combinados", items: [
    { n: "Combo Família", d: "Uramakis, hossomakis, 20 Hot Filadélfia e 20 Hot Banana", p: "R$ 119,90" },
    { n: "Dakkai Minha Delícia — 22 pç", d: "Uramakis, hossomaki, niguiri e joy salmão", p: "R$ 49,90" },
    { n: "Dakkai Chef — 50 pç", d: "Ura Filadélfia, Ura Skin, hossomaki, niguiris e hot", p: "R$ 98,00" },
    { n: "Dakkai Salmão — 46 pç", d: "Sashimi, uramakis, hossomaki, niguiri e joy", p: "R$ 149,90" },
    { n: "Trio Joy Especiais — 12 pç", d: "Joy gorgonzola, brie e amêndoas", p: "R$ 59,90" },
    { n: "Combo Gourmet — 32 pç", d: "Ura trufado, niguiri brie, sashimi com salsa trufada", p: "R$ 169,90" },
  ]},
  { t: "Joy", items: [
    { n: "Joy Salmão — 4 un", d: "Salmão, arroz, cream cheese e cebolete", p: "R$ 22,90" },
    { n: "Joy Salmão Amêndoas — 4 un", d: "Cream cheese, amêndoas e teriyaki", p: "R$ 26,90" },
    { n: "Joy (Dupla) Gorgonzola", d: "Creme gorgonzola e nozes", p: "R$ 26,00" },
  ]},
  { t: "Hot Roll", items: [
    { n: "Hot Filadélfia", d: "Empanado crocante, salmão e cream cheese", p: W },
    { n: "Hot Banana com Doce de Leite", d: "Hot doce empanado", p: W },
    { n: "Hot Salmão & Camarão — 10 un", d: "Recheio de salmão e camarão", p: W },
  ]},
  { t: "Sashimi", items: [
    { n: "Sashimi Salmão — 6 lâminas", d: "Lâminas frescas de salmão", p: "R$ 36,00" },
    { n: "Sashimi Salmão Crispy — 16", d: "Maçaricado, molho de ostras, togarashi, crispy de batata-doce", p: "R$ 69,00" },
  ]},
  { t: "Niguiris", items: [
    { n: "Niguiri Salmão — 4 un", d: "Salmão e arroz japonês", p: "R$ 26,90" },
    { n: "Niguiri Skin — 4 un", d: "Skin crocante e arroz", p: W },
    { n: "Niguiri Salmão Brie — 4 un", d: "Maçaricado, brie e geleia de pimenta", p: "R$ 39,90" },
  ]},
  { t: "Temaki", items: [
    { n: "Temaki Califórnia", d: "Manga, pepino e abacate (vegano)", p: "R$ 29,90" },
    { n: "Temaki Salmão Filadélfia", d: "Salmão, cream cheese e arroz", p: "R$ 44,90" },
    { n: "Temaki Salmão Spicy Alho-Poró", d: "Toque picante e alho-poró crocante", p: "R$ 44,90" },
    { n: "Temaki Salmão Sem Arroz", d: "Low carb", p: "R$ 49,90" },
  ]},
  { t: "Uramaki", items: [
    { n: "Salmão Filadélfia", d: "Salmão, cream cheese, nori e gergelim", p: "R$ 47,00" },
    { n: "Califórnia — 10 pç", d: "Pepino, manga, aspargos (opção vegana)", p: "R$ 21,90" },
    { n: "Cogumelos Filadélfia — 10 pç", d: "Cogumelos salteados (opção vegana)", p: "R$ 24,90" },
    { n: "Salmão Crocante", d: "Empanado, laminado, crispy de alho-poró", p: "R$ 61,00" },
    { n: "Camarão Filadélfia", d: "Camarão, cream cheese, nori e gergelim", p: "R$ 47,00" },
    { n: "Camarão Crocante", d: "Empanado, laminado, crispy de couve", p: "R$ 56,00" },
  ]},
  { t: "Hossomaki", items: [
    { n: "Salmão — 8 un", d: "Clássico de salmão", p: "R$ 26,90" },
    { n: "Kani — 8 un", d: "Kani e arroz japonês", p: "R$ 21,90" },
    { n: "Pepino — 8 un", d: "Refrescante e leve", p: "R$ 18,00" },
    { n: "Manga — 8 un", d: "Vegano", p: "R$ 16,90" },
  ]},
  { t: "Entradas & Bebidas", items: [
    { n: "Sonomono", d: "Salada agridoce de pepino com gergelim", p: "R$ 19,90" },
    { n: "Fanta Laranja 350ml", d: "Lata", p: "R$ 7,00" },
    { n: "Fanta Guaraná 350ml", d: "Lata", p: "R$ 7,00" },
    { n: "Água Tônica Schweppes 350ml", d: "Lata", p: "R$ 7,00" },
    { n: "Água com Gás 500ml", d: "Flua", p: "R$ 5,00" },
  ]},
];

export const WHATSAPP = "https://wa.me/5548996522594?text=Ol%C3%A1!%20Vim%20pelo%20palco%20do%20DAKKAI%20e%20gostaria%20de%20fazer%20um%20pedido.";
export const ORDER_URL = "https://dakkai.menudino.com/";
