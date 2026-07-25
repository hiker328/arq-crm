import { themeCssVariables } from 'twenty-ui/theme-constants';

// Cores da grade, num lugar só.
//
// A/B/C/D aparece no cartão do kanban, na fila do lead score e no medidor. Se
// cada tela escolher a própria cor, o mesmo lead fica verde num lugar e roxo
// no outro — e a cor é justamente o que o arquiteto lê antes do número.
//
// A escala é a do Dynamics 365, que é a referência declarada: verde para o que
// vale ligar hoje, vermelho para o que não vale. Roxo no B em vez de azul
// porque azul é a cor de seleção do Twenty e os dois se confundem na lista.

export type CorDeGrade = { cor: string; fundo: string };

export const GRADE_COR: Record<string, CorDeGrade> = {
  A: { cor: themeCssVariables.color.green, fundo: themeCssVariables.color.green10 },
  B: { cor: themeCssVariables.color.purple, fundo: themeCssVariables.color.purple10 },
  C: { cor: themeCssVariables.color.yellow, fundo: themeCssVariables.color.yellow10 },
  D: { cor: themeCssVariables.color.red, fundo: themeCssVariables.color.red10 },
};

export const GRADE_SEM_COR: CorDeGrade = {
  cor: themeCssVariables.font.color.tertiary,
  fundo: themeCssVariables.background.quaternary,
};

export const corDaGrade = (grade: string | null): CorDeGrade =>
  (grade !== null ? GRADE_COR[grade] : undefined) ?? GRADE_SEM_COR;

// O que cada faixa quer dizer em português. O selo colorido sozinho é código
// interno; a frase é o que torna a grade acionável para quem nunca leu a
// documentação do score.
export const GRADE_SIGNIFICADO: Record<string, string> = {
  A: 'Ligar hoje',
  B: 'Vale acompanhar',
  C: 'Precisa qualificar',
  D: 'Frio',
};
