import { styled } from '@linaria/react';
import { motion } from 'framer-motion';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  GRADE_SIGNIFICADO,
  corDaGrade,
} from '@/arqcrm/score/constants/gradeCores';

// Medidor circular do score.
//
// O número no centro é HTML sobre o SVG, não texto SVG. Dois motivos: a fonte
// tem ligadura que estraga alguns glifos dentro de SVG (já custou uma rodada
// com "R$" virando outra coisa nos eixos do painel), e centralizar texto SVG
// exige medir, que é a coisa que este projeto evita.
//
// O arco anima o `strokeDashoffset`, nunca o `transform`. Em SVG o transform do
// `style` sobrescreve o do atributo, e o framer-motion escreve em `style` — por
// isso a rotação de -90° (que faz o arco começar às 12h) fica num `<g>`
// estático por fora.

const TAMANHO = 132;
const RAIO = 56;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

const StyledWrap = styled.div`
  display: grid;
  height: ${TAMANHO}px;
  place-items: center;
  position: relative;
  width: ${TAMANHO}px;
`;

const StyledCentro = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  inset: 0;
  justify-content: center;
  position: absolute;
`;

const StyledNumero = styled.span<{ cor: string }>`
  color: ${({ cor }) => cor};
  font-size: 40px;
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.03em;
  line-height: 1;
`;

const StyledDe = styled.span`
  color: ${themeCssVariables.font.color.extraLight};
  font-size: ${themeCssVariables.font.size.xs};
  margin-top: 3px;
`;

const StyledGrade = styled.span<{ cor: string; fundo: string }>`
  align-items: center;
  background: ${({ fundo }) => fundo};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${({ cor }) => cor};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: 5px;
  padding: 3px ${themeCssVariables.spacing[2]};
`;

const StyledMedidor = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

export type ScoreGaugeProps = {
  score: number | null;
  grade: string | null;
};

export const ScoreGauge = ({ score, grade }: ScoreGaugeProps) => {
  const { cor, fundo } = corDaGrade(grade);
  const preenchido = Math.max(0, Math.min(100, score ?? 0)) / 100;

  return (
    <StyledMedidor>
      <StyledWrap>
        <svg
          aria-hidden="true"
          height={TAMANHO}
          viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}
          width={TAMANHO}
        >
          <g transform={`rotate(-90 ${TAMANHO / 2} ${TAMANHO / 2})`}>
            <circle
              cx={TAMANHO / 2}
              cy={TAMANHO / 2}
              fill="none"
              r={RAIO}
              stroke={themeCssVariables.background.quaternary}
              strokeWidth={10}
            />
            <motion.circle
              animate={{ strokeDashoffset: CIRCUNFERENCIA * (1 - preenchido) }}
              cx={TAMANHO / 2}
              cy={TAMANHO / 2}
              fill="none"
              initial={{ strokeDashoffset: CIRCUNFERENCIA }}
              r={RAIO}
              stroke={cor}
              strokeDasharray={CIRCUNFERENCIA}
              strokeLinecap="round"
              strokeWidth={10}
              transition={{ damping: 26, stiffness: 90, type: 'spring' }}
            />
          </g>
        </svg>

        <StyledCentro>
          <StyledNumero cor={score === null ? themeCssVariables.font.color.light : cor}>
            {score ?? '—'}
          </StyledNumero>
          <StyledDe>de 100</StyledDe>
        </StyledCentro>
      </StyledWrap>

      <StyledGrade cor={cor} fundo={fundo}>
        {grade ?? '?'}
        <span>{grade !== null ? GRADE_SIGNIFICADO[grade] : 'Sem pontuação'}</span>
      </StyledGrade>
    </StyledMedidor>
  );
};
