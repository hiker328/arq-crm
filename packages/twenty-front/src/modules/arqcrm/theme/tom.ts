// Gera o tom translúcido de uma cor de destaque.
//
// ⚠️ Existe porque o sufixo `10` do tema do Twenty NÃO é um tom de 10%.
// Medido no navegador: `--t-color-green` é `display-p3 .332 .634 .442` e
// `--t-color-green10` é `.357 .682 .474` — um sólido levemente MAIS CLARO, não
// uma versão transparente. Os quatro pares se comportam assim.
//
// A consequência não é estética, é de legibilidade: escrever texto em
// `color.green` sobre fundo `color.green10` é escrever a cor em cima dela
// mesma. Foi assim que o selo A/B/C/D e as marcas de severidade do painel
// nasceram como quadrados sólidos com o conteúdo invisível.
//
// `color-mix` resolve para uma cor com alfa real (verificado no navegador:
// `color(srgb ... / 0.18)`), e como o alfa deixa o fundo da página aparecer,
// o mesmo valor serve para tema claro e escuro — sem precisar de um par de
// tokens por tema.
export const tom = (cor: string, porcentagem = 18) =>
  `color-mix(in srgb, ${cor} ${porcentagem}%, transparent)`;
