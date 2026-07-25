import { styled } from '@linaria/react';
import {
  area as d3Area,
  curveMonotoneX,
  line as d3Line,
} from 'd3-shape';
import { motion } from 'framer-motion';
import { type MouseEvent, useId, useMemo, useState } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

// Gráfico de área com gradiente — o "os gráficos deste aqui são lindos demais"
// das referências do cliente.
//
// Construído sobre `d3-shape`, que já é dependência do Twenty e é a base do
// `chart-core` nativo. Nem Nivo nem Recharts entram aqui: os dois querem medir o
// contêiner com ResizeObserver, e este componente usa `viewBox` fixo escalado
// por CSS. Isso o torna responsivo sem medição, o que além de mais simples o
// deixa portável para o sandbox de front component, onde não há
// `getBoundingClientRect`.
//
// O hover é resolvido inteiramente dentro do SVG (guia vertical + rótulo em
// <text>), sem posicionar div flutuante. Mesma razão: zero medição de layout.

const VIEW_WIDTH = 760;
const VIEW_HEIGHT = 260;
const PADDING = { top: 16, right: 16, bottom: 28, left: 56 };

const PLOT_WIDTH = VIEW_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = VIEW_HEIGHT - PADDING.top - PADDING.bottom;

const GRID_LINES = 4;

export type AreaSeries = {
  label: string;
  color: string;
  values: number[];
};

export type AreaChartProps = {
  labels: string[];
  series: AreaSeries[];
  formatValue: (value: number) => string;
  formatAxis?: (value: number) => string;
};

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  width: 100%;
`;

const StyledSvg = styled.svg`
  display: block;
  height: auto;
  width: 100%;

  /* A fonte tem uma ligadura que transforma "R$" em "₹$" — o símbolo da rúpia.
     Só acontece dentro do SVG; no HTML dos cards o mesmo texto sai certo.
     Desligar ligaduras nos rótulos resolve, e nenhum deles precisa delas. */
  text {
    font-variant-ligatures: none;
  }
`;

const StyledLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[4]};
`;

const StyledLegendItem = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledSwatch = styled.span<{ color: string }>`
  background: ${({ color }) => color};
  border-radius: 2px;
  display: inline-block;
  height: 8px;
  width: 8px;
`;

const StyledEmpty = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  justify-content: center;
  min-height: 180px;
  text-align: center;
`;

// Escala "bonita": arredonda o topo para 1/2/5 × 10^n para os rótulos do eixo
// não virarem R$ 47.312 e sim R$ 50.000.
const escalaAgradavel = (maximo: number): number => {
  if (maximo <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(maximo));
  const normalizado = maximo / magnitude;
  const passo = normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10;

  return passo * magnitude;
};

export const AreaChart = ({
  labels,
  series,
  formatValue,
  formatAxis,
}: AreaChartProps) => {
  // `useId` devolve algo como ":r3:" e os dois-pontos quebram a referência
  // `url(#id)` em alguns navegadores. Remover é mais barato que descobrir isso
  // num gradiente que some só no Safari.
  const gradientId = useId().replace(/:/g, '');
  const [indiceAtivo, setIndiceAtivo] = useState<number | null>(null);

  const temDado = labels.length >= 2 && series.some((s) => s.values.length >= 2);

  const { topo, x, y, paths } = useMemo(() => {
    const maximoBruto = Math.max(
      0,
      ...series.flatMap((serie) => serie.values),
    );
    const topoEscala = escalaAgradavel(maximoBruto);

    const escalaX = (indice: number) =>
      PADDING.left +
      (labels.length <= 1
        ? PLOT_WIDTH / 2
        : (indice / (labels.length - 1)) * PLOT_WIDTH);

    const escalaY = (valor: number) =>
      PADDING.top + PLOT_HEIGHT - (valor / topoEscala) * PLOT_HEIGHT;

    const geradorLinha = d3Line<number>()
      .x((_, indice) => escalaX(indice))
      .y((valor) => escalaY(valor))
      .curve(curveMonotoneX);

    const geradorArea = d3Area<number>()
      .x((_, indice) => escalaX(indice))
      .y0(PADDING.top + PLOT_HEIGHT)
      .y1((valor) => escalaY(valor))
      .curve(curveMonotoneX);

    return {
      paths: series.map((serie) => ({
        area: geradorArea(serie.values) ?? '',
        line: geradorLinha(serie.values) ?? '',
      })),
      topo: topoEscala,
      x: escalaX,
      y: escalaY,
    };
  }, [labels.length, series]);

  if (!temDado) {
    return (
      <StyledEmpty>
        Ainda não há parcelas suficientes para desenhar a curva. Ela aparece
        assim que houver ao menos dois meses com movimento.
      </StyledEmpty>
    );
  }

  const rotuloEixo = formatAxis ?? formatValue;

  // Converte a posição do ponteiro para índice de mês. `nativeEvent.offsetX` é
  // relativo ao SVG e escala junto com ele, então não é preciso medir nada.
  const aoMover = (evento: MouseEvent<SVGSVGElement>) => {
    const alvo = evento.currentTarget;
    const proporcao = evento.nativeEvent.offsetX / alvo.clientWidth;
    const xNoViewBox = proporcao * VIEW_WIDTH;
    const posicao =
      ((xNoViewBox - PADDING.left) / PLOT_WIDTH) * (labels.length - 1);

    setIndiceAtivo(
      Math.max(0, Math.min(labels.length - 1, Math.round(posicao))),
    );
  };

  return (
    <StyledWrapper>
      <StyledSvg
        onMouseLeave={() => setIndiceAtivo(null)}
        onMouseMove={aoMover}
        role="img"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      >
        <defs>
          {series.map((serie, indice) => (
            <linearGradient
              id={`${gradientId}-${indice}`}
              key={serie.label}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0%" stopColor={serie.color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={serie.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {/* Grade e rótulos do eixo Y */}
        {Array.from({ length: GRID_LINES + 1 }, (_, indice) => {
          const valor = (topo / GRID_LINES) * indice;
          const posicaoY = y(valor);

          return (
            <g key={indice}>
              <line
                stroke={themeCssVariables.border.color.light}
                strokeDasharray={indice === 0 ? undefined : '3 4'}
                x1={PADDING.left}
                x2={VIEW_WIDTH - PADDING.right}
                y1={posicaoY}
                y2={posicaoY}
              />
              <text
                fill={themeCssVariables.font.color.tertiary}
                fontSize={11}
                textAnchor="end"
                x={PADDING.left - 10}
                y={posicaoY + 4}
              >
                {rotuloEixo(valor)}
              </text>
            </g>
          );
        })}

        {series.map((serie, indiceSerie) => (
          <g key={serie.label}>
            <motion.path
              animate={{ opacity: 1 }}
              d={paths[indiceSerie].area}
              fill={`url(#${gradientId}-${indiceSerie})`}
              initial={{ opacity: 0 }}
              transition={{ delay: 0.1 * indiceSerie, duration: 0.5 }}
            />
            <motion.path
              animate={{ pathLength: 1 }}
              d={paths[indiceSerie].line}
              fill="none"
              initial={{ pathLength: 0 }}
              stroke={serie.color}
              strokeLinecap="round"
              strokeWidth={2.5}
              transition={{
                delay: 0.1 * indiceSerie,
                duration: 0.8,
                ease: 'easeOut',
              }}
            />
          </g>
        ))}

        {/* Rótulos do eixo X */}
        {labels.map((rotulo, indice) => (
          <text
            fill={
              indice === indiceAtivo
                ? themeCssVariables.font.color.secondary
                : themeCssVariables.font.color.tertiary
            }
            fontSize={11}
            key={rotulo}
            textAnchor="middle"
            x={x(indice)}
            y={VIEW_HEIGHT - 8}
          >
            {rotulo}
          </text>
        ))}

        {/* Guia de hover, pontos e valores */}
        {indiceAtivo !== null && (
          <g pointerEvents="none">
            <line
              stroke={themeCssVariables.border.color.medium}
              strokeDasharray="3 3"
              x1={x(indiceAtivo)}
              x2={x(indiceAtivo)}
              y1={PADDING.top}
              y2={PADDING.top + PLOT_HEIGHT}
            />
            {series.map((serie) => {
              const valor = serie.values[indiceAtivo] ?? 0;

              return (
                <g key={serie.label}>
                  <circle
                    cx={x(indiceAtivo)}
                    cy={y(valor)}
                    fill={themeCssVariables.background.primary}
                    r={5}
                    stroke={serie.color}
                    strokeWidth={2.5}
                  />
                  <text
                    fill={themeCssVariables.font.color.primary}
                    fontSize={11}
                    fontWeight={600}
                    textAnchor={
                      indiceAtivo > labels.length - 2 ? 'end' : 'start'
                    }
                    x={
                      x(indiceAtivo) +
                      (indiceAtivo > labels.length - 2 ? -10 : 10)
                    }
                    y={y(valor) - 10}
                  >
                    {formatValue(valor)}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </StyledSvg>

      <StyledLegend>
        {series.map((serie) => (
          <StyledLegendItem key={serie.label}>
            <StyledSwatch color={serie.color} />
            {serie.label}
          </StyledLegendItem>
        ))}
      </StyledLegend>
    </StyledWrapper>
  );
};
