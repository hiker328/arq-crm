import { styled } from '@linaria/react';
import { motion } from 'framer-motion';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type FatorDoScore } from '@/arqcrm/score/hooks/useLeadScores';

// A explicação do score, fator a fator.
//
// É o requisito SCORE-02 e a razão de o score existir de forma confiável: a
// regra que governa o cálculo é NENHUM PONTO SEM FRASE. Um número sozinho o
// arquiteto não confere, não corrige e em duas semanas ignora. A frase também
// é o único mecanismo de correção que os pesos têm — eles são hipótese, não
// pesquisa, e discordar é o resultado esperado.
//
// A barra é proporcional ao MAIOR fator da tela inteira, positivos e negativos
// no mesmo denominador. Se cada lista normalizasse pelo próprio máximo, uma
// penalidade de 8 pontos apareceria do mesmo tamanho que um ganho de 15 — e a
// tela mentiria sobre o peso relativo, que é justamente o que ela existe para
// mostrar.

const StyledBloco = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledTitulo = styled.h4`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[2]};
  letter-spacing: 0.04em;
  margin: 0;
  text-transform: uppercase;
`;

const StyledLista = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledItem = styled(motion.li)`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StyledLinha = styled.div`
  align-items: baseline;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledTexto = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.35;
`;

const StyledPontos = styled.span<{ cor: string }>`
  color: ${({ cor }) => cor};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledTrilho = styled.div`
  background: ${themeCssVariables.background.quaternary};
  border-radius: ${themeCssVariables.border.radius.pill};
  height: 4px;
  overflow: hidden;
  width: 100%;
`;

// A cor vem por `style` em vez de prop tipada. Linaria repassa props
// desconhecidas ao componente embrulhado, e `motion.div` as joga no DOM — o
// resultado é um atributo `cor="var(--t-color-green)"` no HTML e aviso do React.
// Em tag simples isso não acontece porque Linaria filtra o que não é atributo.
const StyledBarra = styled(motion.div)`
  border-radius: ${themeCssVariables.border.radius.pill};
  height: 100%;
`;

const StyledVazio = styled.p`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.sm};
  font-style: italic;
  margin: 0;
`;

export type FatoresPanelProps = {
  titulo: string;
  fatores: FatorDoScore[];
  cor: string;
  sinal: '+' | '−';
  /** Maior valor absoluto entre TODOS os fatores do lead — ver comentário acima. */
  maximo: number;
  vazio: string;
};

export const FatoresPanel = ({
  titulo,
  fatores,
  cor,
  sinal,
  maximo,
  vazio,
}: FatoresPanelProps) => (
  <StyledBloco>
    <StyledTitulo>
      {titulo}
      <StyledPontos cor={cor}>
        {fatores.length > 0 &&
          `${sinal}${fatores.reduce((soma, fator) => soma + fator.pontos, 0)}`}
      </StyledPontos>
    </StyledTitulo>

    {fatores.length === 0 ? (
      <StyledVazio>{vazio}</StyledVazio>
    ) : (
      <StyledLista>
        {fatores.map((fator, indice) => (
          <StyledItem
            animate={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: -4 }}
            key={fator.texto}
            transition={{ delay: indice * 0.03, duration: 0.2 }}
          >
            <StyledLinha>
              <StyledTexto>{fator.texto}</StyledTexto>
              <StyledPontos cor={cor}>
                {sinal}
                {fator.pontos}
              </StyledPontos>
            </StyledLinha>
            <StyledTrilho>
              <StyledBarra
                animate={{
                  width: `${maximo > 0 ? (fator.pontos / maximo) * 100 : 0}%`,
                }}
                initial={{ width: 0 }}
                style={{ background: cor }}
                transition={{ delay: indice * 0.03, duration: 0.35 }}
              />
            </StyledTrilho>
          </StyledItem>
        ))}
      </StyledLista>
    )}
  </StyledBloco>
);
