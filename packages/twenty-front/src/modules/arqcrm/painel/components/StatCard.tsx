import { styled } from '@linaria/react';
import { curveMonotoneX, area as d3Area, line as d3Line } from 'd3-shape';
import { motion } from 'framer-motion';
import { useId, useMemo } from 'react';
import { IconTrendingDown, IconTrendingUp } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { tom } from '@/arqcrm/theme/tom';

// Card de métrica: valor grande, variação colorida e sparkline com gradiente.
//
// Portado da referência de design do cliente. A sparkline usa `d3-shape`, que já
// é dependência do Twenty, em vez do Recharts do original: o `ResponsiveContainer`
// do Recharts depende de ResizeObserver, e trocá-lo por um SVG com viewBox fixo
// remove a dependência de medição, tira ~100 KB do bundle e evita adicionar uma
// biblioteca de gráfico redundante ao lado do Nivo já instalado.

// A sparkline ocupa a largura inteira do card, abaixo do número, em vez de
// dividir a linha com ele. Ao lado, ela roubava ~130px e "R$ 120.360" virava
// "R$ 120...". Empilhado, o valor tem o card todo — e o traço fica maior, que é
// como as referências (ORION, HubSpot) desenham.
const SPARK_WIDTH = 240;
const SPARK_HEIGHT = 36;

const StyledCard = styled(motion.div)`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  cursor: default;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  overflow: hidden;
  padding: ${themeCssVariables.spacing[4]};
  position: relative;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;

  &:hover {
    border-color: ${themeCssVariables.border.color.medium};
    box-shadow: ${themeCssVariables.boxShadow.light};
  }
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledTitle = styled.h3`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledIconTile = styled.span<{ tint: string }>`
  align-items: center;
  background: ${({ tint }) => tint};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  flex-shrink: 0;
  height: 26px;
  justify-content: center;
  width: 26px;
`;

const StyledBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledValueGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledValue = styled.p`
  color: ${themeCssVariables.font.color.primary};
  /* Encolhe em tela estreita em vez de virar reticências: o número é o card. */
  font-size: clamp(1.25rem, 2.1vw, 1.75rem);
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledFooter = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledDelta = styled.span<{ color: string; tint: string }>`
  align-items: center;
  background: ${({ tint }) => tint};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ color }) => color};
  display: inline-flex;
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: 2px;
  padding: 1px 6px 1px 4px;
`;

const StyledHint = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledSpark = styled.svg`
  display: block;
  height: ${SPARK_HEIGHT}px;
  overflow: visible;
  width: 100%;
`;

export type StatCardTone = 'neutral' | 'positive' | 'negative' | 'attention';

export type StatCardProps = {
  title: string;
  value: string;
  hint?: string;
  /** Série para a sparkline. Menos de dois pontos: a sparkline é omitida. */
  series?: number[];
  /** Variação percentual contra o período anterior. */
  deltaPercent?: number;
  /**
   * Quando `true`, uma variação positiva é ruim — inadimplência que cresce.
   * Sem isto, "vencido +40%" apareceria em verde.
   */
  isDeltaInverted?: boolean;
  tone?: StatCardTone;
  icon?: React.ReactNode;
  /** Posição na linha de cards, só para escalonar a animação de entrada. */
  index?: number;
};

const TONE_COLOR: Record<StatCardTone, string> = {
  attention: themeCssVariables.color.orange,
  negative: themeCssVariables.color.red,
  neutral: themeCssVariables.color.blue,
  positive: themeCssVariables.color.green,
};

const TONE_TINT: Record<StatCardTone, string> = {
  attention: tom(themeCssVariables.color.orange),
  negative: tom(themeCssVariables.color.red),
  neutral: tom(themeCssVariables.color.blue),
  positive: tom(themeCssVariables.color.green),
};

export const StatCard = ({
  title,
  value,
  hint,
  series,
  deltaPercent,
  isDeltaInverted = false,
  tone = 'neutral',
  icon,
  index = 0,
}: StatCardProps) => {
  // `useId` devolve algo como ":r3:" e os dois-pontos quebram a referência
  // `url(#id)` em alguns navegadores. Remover é mais barato que descobrir isso
  // num gradiente que some só no Safari.
  const gradientId = useId().replace(/:/g, '');
  const color = TONE_COLOR[tone];

  const paths = useMemo(() => {
    // Uma sparkline com um ponto é uma mentira visual: sugere tendência onde não
    // há dado. O piloto vai passar as primeiras semanas exatamente nesse estado.
    if (!series || series.length < 2) {
      return null;
    }

    const minimo = Math.min(...series);
    const maximo = Math.max(...series);
    const amplitude = maximo - minimo || 1;

    // Respiro em cima e embaixo para o traço não encostar na borda do viewBox.
    const escalaY = (valor: number) =>
      SPARK_HEIGHT - 4 - ((valor - minimo) / amplitude) * (SPARK_HEIGHT - 8);
    const escalaX = (indice: number) =>
      (indice / (series.length - 1)) * SPARK_WIDTH;

    return {
      area:
        d3Area<number>()
          .x((_, indice) => escalaX(indice))
          .y0(SPARK_HEIGHT)
          .y1((valor) => escalaY(valor))
          .curve(curveMonotoneX)(series) ?? '',
      line:
        d3Line<number>()
          .x((_, indice) => escalaX(indice))
          .y((valor) => escalaY(valor))
          .curve(curveMonotoneX)(series) ?? '',
    };
  }, [series]);

  const temDelta = deltaPercent !== undefined && Number.isFinite(deltaPercent);
  const subiu = temDelta && (deltaPercent as number) >= 0;
  const deltaEhBom = isDeltaInverted ? !subiu : subiu;
  const deltaColor = deltaEhBom
    ? themeCssVariables.color.green
    : themeCssVariables.color.red;
  const deltaTint = deltaEhBom
    ? tom(themeCssVariables.color.green)
    : tom(themeCssVariables.color.red);

  return (
    <StyledCard
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 10 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
    >
      <StyledHeader>
        <StyledTitle title={title}>{title}</StyledTitle>
        {icon !== undefined && (
          <StyledIconTile tint={TONE_TINT[tone]}>{icon}</StyledIconTile>
        )}
      </StyledHeader>

      <StyledBody>
        <StyledValueGroup>
          <StyledValue title={value}>{value}</StyledValue>
          <StyledFooter>
            {temDelta && (
              <StyledDelta color={deltaColor} tint={deltaTint}>
                {subiu ? (
                  <IconTrendingUp size={13} />
                ) : (
                  <IconTrendingDown size={13} />
                )}
                {Math.abs(deltaPercent as number).toFixed(0)}%
              </StyledDelta>
            )}
            {hint !== undefined && <StyledHint title={hint}>{hint}</StyledHint>}
          </StyledFooter>
        </StyledValueGroup>

        {paths !== null && (
          <StyledSpark
            aria-hidden="true"
            preserveAspectRatio="none"
            role="presentation"
            viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <motion.path
              animate={{ opacity: 1 }}
              d={paths.area}
              fill={`url(#${gradientId})`}
              initial={{ opacity: 0 }}
              transition={{ delay: 0.2 + index * 0.05, duration: 0.5 }}
            />
            <motion.path
              animate={{ pathLength: 1 }}
              d={paths.line}
              fill="none"
              initial={{ pathLength: 0 }}
              stroke={color}
              strokeLinecap="round"
              strokeWidth={2}
              transition={{
                delay: index * 0.05,
                duration: 0.7,
                ease: 'easeOut',
              }}
              // O viewBox é esticado na horizontal (preserveAspectRatio="none")
              // para a linha ocupar a largura do card. Sem isto a espessura do
              // traço esticaria junto e ficaria deformada.
              vectorEffect="non-scaling-stroke"
            />
          </StyledSpark>
        )}
      </StyledBody>
    </StyledCard>
  );
};
