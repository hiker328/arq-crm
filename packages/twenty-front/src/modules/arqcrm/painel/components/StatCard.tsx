import { styled } from '@linaria/react';
import { motion } from 'framer-motion';
import { line as d3Line, curveMonotoneX } from 'd3-shape';
import { useMemo } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

// Card de métrica com sparkline.
//
// Portado da referência de design do cliente. A sparkline usa `d3-shape`, que já
// é dependência do Twenty, em vez do Recharts do original: o `ResponsiveContainer`
// do Recharts depende de ResizeObserver, e trocá-lo por uma linha SVG com
// viewBox fixo remove a dependência de medição, tira ~100 KB do bundle e evita
// adicionar biblioteca de gráfico redundante ao lado do Nivo já instalado.

const SPARK_WIDTH = 120;
const SPARK_HEIGHT = 40;

const StyledCard = styled(motion.div)`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  cursor: default;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[4]};
  transition: border-color 150ms ease;

  &:hover {
    border-color: ${themeCssVariables.border.color.medium};
  }
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
`;

const StyledTitle = styled.h3`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;

const StyledBody = styled.div`
  align-items: flex-end;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
`;

const StyledValueGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledValue = styled.p`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.02em;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledHint = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledSpark = styled.svg`
  flex-shrink: 0;
  overflow: visible;
`;

export type StatCardProps = {
  title: string;
  value: string;
  hint?: string;
  /** Série para a sparkline. Menos de dois pontos: a sparkline é omitida. */
  series?: number[];
  tone?: 'neutral' | 'positive' | 'negative';
  icon?: React.ReactNode;
};

const TONE_COLOR: Record<NonNullable<StatCardProps['tone']>, string> = {
  negative: themeCssVariables.color.red,
  neutral: themeCssVariables.color.blue,
  positive: themeCssVariables.color.green,
};

export const StatCard = ({
  title,
  value,
  hint,
  series,
  tone = 'neutral',
  icon,
}: StatCardProps) => {
  const color = TONE_COLOR[tone];

  const path = useMemo(() => {
    // Uma sparkline com um ponto é uma mentira visual: sugere tendência onde não
    // há dado. O piloto vai passar as primeiras semanas exatamente nesse estado.
    if (!series || series.length < 2) {
      return null;
    }

    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;

    const generator = d3Line<number>()
      .x((_, index) => (index / (series.length - 1)) * SPARK_WIDTH)
      .y((datum) => SPARK_HEIGHT - ((datum - min) / range) * SPARK_HEIGHT)
      .curve(curveMonotoneX);

    return generator(series);
  }, [series]);

  return (
    <StyledCard
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
    >
      <StyledHeader>
        <StyledTitle>{title}</StyledTitle>
        {icon}
      </StyledHeader>
      <StyledBody>
        <StyledValueGroup>
          <StyledValue title={value}>{value}</StyledValue>
          {hint !== undefined && <StyledHint>{hint}</StyledHint>}
        </StyledValueGroup>
        {path !== null && (
          <StyledSpark
            aria-hidden="true"
            height={SPARK_HEIGHT}
            role="presentation"
            viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
            width={SPARK_WIDTH}
          >
            <motion.path
              animate={{ pathLength: 1 }}
              d={path}
              fill="none"
              initial={{ pathLength: 0 }}
              stroke={color}
              strokeLinecap="round"
              strokeWidth={2}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </StyledSpark>
        )}
      </StyledBody>
    </StyledCard>
  );
};
