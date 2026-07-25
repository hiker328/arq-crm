import { styled } from '@linaria/react';
import { arc as d3Arc, pie as d3Pie } from 'd3-shape';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

// Rosca com total no centro e legenda com valores.
//
// O centro não é enfeite: é onde vai o número que responde a pergunta antes de
// o arquiteto ler qualquer fatia. Ao passar o mouse numa fatia, o centro troca
// para aquela fatia — assim a leitura detalhada não exige um tooltip flutuante,
// que exigiria medir a página.
//
// `d3-shape` de novo, mesmo motivo do AreaChart: já é dependência, e um SVG com
// viewBox escala sem ResizeObserver.

const VIEW = 200;
const RAIO_EXTERNO = 92;
const RAIO_INTERNO = 62;
const EXPANSAO_HOVER = 4;

export type DonutSlice = {
  label: string;
  value: number;
  color: string;
};

export type DonutChartProps = {
  slices: DonutSlice[];
  formatValue: (value: number) => string;
  emptyMessage: string;
  centerLabel: string;
};

const StyledWrapper = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[6]};

  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const StyledSvg = styled.svg`
  flex-shrink: 0;
  height: ${VIEW}px;
  width: ${VIEW}px;
`;

const StyledLegend = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  list-style: none;
  margin: 0;
  min-width: 0;
  padding: 0;
  width: 100%;
`;

const StyledLegendRow = styled.li<{ isDimmed: boolean }>`
  align-items: center;
  cursor: default;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  opacity: ${({ isDimmed }) => (isDimmed ? 0.45 : 1)};
  transition: opacity 120ms ease;
`;

const StyledSwatch = styled.span<{ color: string }>`
  background: ${({ color }) => color};
  border-radius: 3px;
  flex-shrink: 0;
  height: 10px;
  width: 10px;
`;

const StyledLegendLabel = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  flex: 1;
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledLegendValue = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledEmpty = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  justify-content: center;
  min-height: 180px;
  text-align: center;
  width: 100%;
`;

export const DonutChart = ({
  slices,
  formatValue,
  emptyMessage,
  centerLabel,
}: DonutChartProps) => {
  const [indiceAtivo, setIndiceAtivo] = useState<number | null>(null);

  const comValor = slices.filter((fatia) => fatia.value > 0);
  const total = comValor.reduce((soma, fatia) => soma + fatia.value, 0);

  const arcos = useMemo(() => {
    const gerarPie = d3Pie<DonutSlice>()
      .value((fatia) => fatia.value)
      .sort(null)
      // Começa no topo e gira no sentido horário, como se lê um relógio.
      .startAngle(0)
      .endAngle(Math.PI * 2)
      .padAngle(0.02);

    return gerarPie(comValor);
  }, [comValor]);

  if (total === 0) {
    return <StyledEmpty>{emptyMessage}</StyledEmpty>;
  }

  const gerarArco = (expandido: boolean) =>
    d3Arc<(typeof arcos)[number]>()
      .innerRadius(RAIO_INTERNO)
      .outerRadius(RAIO_EXTERNO + (expandido ? EXPANSAO_HOVER : 0))
      .cornerRadius(3);

  const emDestaque = indiceAtivo !== null ? comValor[indiceAtivo] : null;

  return (
    <StyledWrapper>
      <StyledSvg
        role="img"
        viewBox={`${-VIEW / 2} ${-VIEW / 2} ${VIEW} ${VIEW}`}
      >
        {arcos.map((arco, indice) => (
          <motion.path
            animate={{ opacity: 1, scale: 1 }}
            d={gerarArco(indice === indiceAtivo)(arco) ?? ''}
            fill={comValor[indice].color}
            initial={{ opacity: 0, scale: 0.9 }}
            key={comValor[indice].label}
            onMouseEnter={() => setIndiceAtivo(indice)}
            onMouseLeave={() => setIndiceAtivo(null)}
            transition={{ delay: 0.05 * indice, duration: 0.35 }}
          />
        ))}

        <text
          fill={themeCssVariables.font.color.primary}
          fontSize={22}
          fontWeight={600}
          textAnchor="middle"
          y={-2}
        >
          {formatValue(emDestaque ? emDestaque.value : total)}
        </text>
        <text
          fill={themeCssVariables.font.color.tertiary}
          fontSize={11}
          textAnchor="middle"
          y={18}
        >
          {emDestaque ? emDestaque.label : centerLabel}
        </text>
      </StyledSvg>

      <StyledLegend>
        {comValor.map((fatia, indice) => (
          <StyledLegendRow
            isDimmed={indiceAtivo !== null && indiceAtivo !== indice}
            key={fatia.label}
            onMouseEnter={() => setIndiceAtivo(indice)}
            onMouseLeave={() => setIndiceAtivo(null)}
          >
            <StyledSwatch color={fatia.color} />
            <StyledLegendLabel title={fatia.label}>
              {fatia.label}
            </StyledLegendLabel>
            <StyledLegendValue>{formatValue(fatia.value)}</StyledLegendValue>
          </StyledLegendRow>
        ))}
      </StyledLegend>
    </StyledWrapper>
  );
};
