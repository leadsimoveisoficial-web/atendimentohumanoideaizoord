export type Item = { n: string; d: string; p: string };
export type Section = { t: string; items: Item[] };

export const MENU: Section[] = [
  { t: "Especiais", items: [
    { n: "Ebi Holl", d: "6 unid. Camarão empanado na panko, envolvido com lâminas de salmão", p: "R$ 49,00" },
    { n: "Uramaki Camarão Crocante", d: "Maki recheado com camarão empanado, cream cheese, laminado", p: "R$ 49,90" },
    { n: "Uramaki Camarão Filadélfia", d: "Maki recheado de camarão salteado, cream cheese e gergelim mix torrado", p: "R$ 47,90" },
    { n: "Uramaki Salmão Crocante", d: "Maki recheado com salmão empanado, cream cheese, laminado", p: "R$ 47,90" },
  ]},
  { t: "Combinados", items: [
    { n: "Combo Família", d: "10 Uramaki Salmão Filadélfia, 10 Uramaki Kani, 10 Uramaki Salmão", p: "R$ 129,90" },
    { n: "Combo Grill 10 peças + Temaki Hot", d: "5 Uramakis de Salmão Grelhado, 5 Hot Salmão Filadélfia e 1 Temaki Hot", p: "R$ 59,90" },
    { n: "Combo Hot Mix — 20 peças", d: "20 Hots Salmão Filadélfia e com diferentes cryspis da casa", p: "R$ 49,90" },
    { n: "Combo Moçambique — 60 Peças", d: "10 Uramaki Salmão, 10 Uramaki Dragon com Cryspi, 10...", p: "R$ 199,90" },
    { n: "Combo Sambaqui — 70 Peças", d: "10 Uramaki Salmão Filadélfia, 10 Uramaki Kani, 10 Uramaki Salmão...", p: "R$ 98,90" },
    { n: "Dakkai Chef — 50 peças", d: "10 Uramaki Salmão Filadélfia, 10 Ura Kani, 10 hossomaki Salmão, 5 niguiri...", p: "R$ 99,90" },
    { n: "Dakkai Junior — 15 Peças", d: "5 Uramaki Salmão Filadélfia, 5 Hossomaki de Salmão, 5 Hot Salmão", p: "R$ 59,90" },
    { n: "Dakkai Mini Delícia — 22 peças", d: "5 Uramaki Salmão Filadélfia, 5 Uramaki Salmão grelhado, 4 hossomaki...", p: "R$ 65,90" },
    { n: "Dakkai Salmão 46 Peças", d: "8 Sashimi Salmão, 10 Uramaki Salmão Filadélfia, 10 Uramaki Salmão Grelhado...", p: "R$ 139,90" },
    { n: "Dakkai Titanic — 100 peças", d: "10 Ura salmão Fila, 10 Ura salmão grelhado, 10 Ura Kani, 10 hossomaki...", p: "R$ 149,00" },
    { n: "Trio Joy Crispys — 12 pçs", d: "4 Joe de Salmão Alho-poró Crispy, 4 Joe Salmão Couve Crispy e 4 Joe...", p: "R$ 49,90" },
    { n: "Trio Joy Especiais — 12 pçs", d: "4 Salmão Gorgonzola, 4 Salmão Brie, 4 Salmão Amêndoas", p: "R$ 59,90" },
  ]},
  { t: "Temaki", items: [
    { n: "Temaki Camarão Filadélfia", d: "Grelhado ou empanado", p: "R$ 49,90" },
    { n: "Temaki Hot Salmão Filadélfia", d: "Cone de alga nori empanado na panko recheado com arroz japonês", p: "R$ 49,90" },
    { n: "Temaki Salmão Filadélfia", d: "Cone de alga nori recheado com arroz japonês, cream cheese, salmão", p: "R$ 48,00" },
    { n: "Temaki Salmão Grelhado", d: "Cone de alga nori recheado com arroz japonês, cream cheese, salmão", p: "R$ 32,90" },
    { n: "Temaki Salmão Sem Arroz", d: "Cone de alga nori recheado com cream cheese, salmão filadélfia", p: "R$ 43,00" },
    { n: "Temaki Salmão Spyce Alho Poró", d: "Cone de alga nori recheado com arroz japonês, cream cheese, salmão", p: "R$ 39,00" },
    { n: "Temaki Shimeji Filadélfia", d: "Shimeji com cream cheese", p: "R$ 39,90" },
  ]},
  { t: "Hot Holl", items: [
    { n: "Hot Banana com Doce de Leite", d: "10 unidades", p: "R$ 24,90" },
    { n: "Hot Holl Salmão Alho Poró", d: "10 unidades", p: "R$ 39,90" },
    { n: "Hot Holl Salmão e Camarão Empanado", d: "10 unidades", p: "R$ 49,90" },
    { n: "Hot Holl Salmão Filadélfia", d: "10 unidades", p: "R$ 35,90" },
    { n: "Hot Holl Salmão Tartar", d: "10 unidades", p: "R$ 42,90" },
  ]},
  { t: "Hossomaki", items: [
    { n: "Hossomaki Salmão", d: "8 unidades", p: "R$ 29,90" },
    { n: "Hossomaki Pepino", d: "8 unidades", p: "R$ 19,90" },
  ]},
  { t: "Uramaki", items: [
    { n: "Uramaki Califórnia", d: "10 peças — Maki holl com delicada camada de shari (arroz japonês)", p: "R$ 32,90" },
    { n: "Uramaki Salmão Filadélfia", d: "Holl de salmão, arroz japonês, cream cheese, nori e gergelim", p: "R$ 49,90" },
  ]},
  { t: "Joy", items: [
    { n: "Joy Salmão", d: "4 un. Arroz japonês, cream cheese e ceboletes", p: "R$ 26,90" },
    { n: "Joy Salmão Amêndoas", d: "4 un. Lâminas de salmão, cream cheese, amêndoas e molho teriyaki", p: "R$ 29,90" },
    { n: "Joy Salmão e Camarão", d: "4 un. Lâminas de salmão com arroz japonês, cream cheese", p: "R$ 32,90" },
  ]},
  { t: "Niguiris", items: [
    { n: "Niguiri Salmão", d: "4 un. Salmão e arroz japonês", p: "R$ 24,90" },
    { n: "Niguiri Skin", d: "4 unidades", p: "R$ 22,90" },
  ]},
  { t: "Sashimi", items: [
    { n: "Sashimi Salmão", d: "6 lâminas de salmão", p: "R$ 46,00" },
    { n: "Sashimi Salmão Crispy", d: "16 lâminas. Salmão maçaricado com molho de ostras, togarashi e crispy", p: "R$ 89,90" },
    { n: "Sashimi Salmão Tamagô Trufado", d: "6 lâminas. Salmão em cubos maçaricado com creme trufado", p: "R$ 60,00" },
  ]},
  { t: "Pokes", items: [
    { n: "Poke de Camarão Empanado", d: "Base de arroz japonês agridoce, camarão empanado, manga, tomate", p: "R$ 46,90" },
    { n: "Poke de Camarão Grelhado", d: "Base de arroz japonês agridoce, camarão grelhado, manga, tomate", p: "R$ 46,90" },
    { n: "Poke Salmão", d: "Base de arroz japonês agridoce, salmão fresco, manga, tomate cereja", p: "R$ 42,90" },
  ]},
  { t: "Teppaniaky", items: [
    { n: "Teppaniaky de Salmão", d: "Arroz japonês, salmão grelhado, óleo de gergelim e legumes salteados", p: "R$ 49,90" },
  ]},
  { t: "Bebidas", items: [
    { n: "Água com Gás", d: "510ml", p: "R$ 5,00" },
    { n: "Coca-Cola", d: "Lata 310ml", p: "R$ 7,00" },
    { n: "Coca-Cola Zero", d: "Lata 310ml", p: "R$ 7,00" },
    { n: "Coca-Cola Zero Lata", d: "350ml", p: "R$ 7,00" },
    { n: "Heineken Long Neck", d: "Garrafa", p: "R$ 14,00" },
  ]},
];

export const WHATSAPP = "https://wa.me/5548996522594?text=Ol%C3%A1!%20Vim%20pelo%20palco%20do%20DAKKAI%20e%20gostaria%20de%20fazer%20um%20pedido.";
export const ORDER_URL = "https://dakkai.menudino.com/";
