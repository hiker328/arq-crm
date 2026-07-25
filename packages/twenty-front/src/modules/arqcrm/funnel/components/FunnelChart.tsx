import { styled } from '@linaria/react';
import { motion, useSpring } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  buildFunnelSegments,
  funnelSegmentPath,
  type FunnelStage,
} from '@/arqcrm/funnel/utils/funnelSegmentPath';

// Funil lead → proposta → projeto.
//
// Portado da referência de design do cliente. Duas mudanças em relação ao
// original, ambas necessárias:
//
//   1. Tailwind → Linaria e `motion/react` → `framer-motion`. É a mesma
//      biblioteca de animação sob outro nome de pacote, e as duas já estão na
//      árvore do Twenty — nenhuma dependência nova foi adicionada.
//   2. viewBox de coordenadas fixas em vez de medir o container. O original
//      usava ResizeObserver + getBoundingClientRect para calcular os paths em
//      pixels. Com viewBox fixo o SVG escala sozinho via CSS, o componente
//      funciona em qualquer largura sem re-render, e — o motivo real — ele
//      também passa a ser portável para o sandbox de front components de app,
//      que não tem API de medição.
//
// Estados que a arte de referência não mostra e que o produto tem de verdade:
// funil vazio, um único registro, e primeiro estágio em zero. Todos tratados.

// Espaço de coordenadas do viewBox. Números redondos porque toda a geometria é
// relativa a eles; o CSS faz a escala para a largura real.
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 420;
const GAP = 6;

// Camadas concêntricas dão a profundidade da referência. Três é o ponto em que
// se lê como volume sem virar borrão.
const LAYERS = 3;

const SPRING = { stiffness: 120, damping: 20, mass: 1 };
const HOVER_SPRING = { stiffness: 300, damping: 24 };
const STAGGER_SECONDS = 0.09;

const StyledWrapper = styled.div`
  position: relative;
  user-select: none;
  width: 100%;
`;

const StyledSvg = styled.svg`
  display: block;
  height: auto;
  overflow: visible;
  width: 100%;
`;

const StyledLabelLayer = styled.div`
  inset: 0;
  position: absolute;
`;

const StyledSegmentLabel = styled(motion.div)`
  align-items: center;
  cursor: default;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[2]} 0;
  position: absolute;
`;

const StyledValue = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  white-space: nowrap;
`;

const StyledPercentPill = styled.span`
  background: ${themeCssVariables.font.color.primary};
  border-radius: 999px;
  color: ${themeCssVariables.background.primary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  white-space: nowrap;
`;

const StyledStageLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  text-align: center;
  white-space: nowrap;
`;

const StyledEmpty = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: center;
  min-height: 220px;
  text-align: center;
`;

const formatValue = (value: number) => value.toLocaleString('pt-BR');
const formatPercent = (percent: number) => `${Math.round(percent)}%`;

type FunnelSegmentShapeProps = {
  index: number;
  paths: string[];
  color: string;
  offsetX: number;
  isHovered: boolean;
  isDimmed: boolean;
};

const FunnelSegmentShape = ({
  index,
  paths,
  color,
  offsetX,
  isHovered,
  isDimmed,
}: FunnelSegmentShapeProps) => {
  // Entrada com stagger: cada segmento cresce da esquerda, um depois do outro.
  const grow = useSpring(0, SPRING);
  const dim = useSpring(1, HOVER_SPRING);

  useEffect(() => {
    const timeout = setTimeout(
      () => grow.set(1),
      index * STAGGER_SECONDS * 1000,
    );

    return () => clearTimeout(timeout);
  }, [grow, index]);

  useEffect(() => {
    dim.set(isDimmed ? 0.35 : 1);
  }, [dim, isDimmed]);

  // O posicionamento horizontal fica num <g> ESTÁTICO por fora, com o
  // `transform` no atributo, e a animação num <g> por dentro, com o transform
  // no style. Os dois não podem viver no mesmo elemento: o framer-motion
  // escreve `transform` em `style`, e em SVG o transform do style SOBRESCREVE o
  // do atributo. Com os dois juntos, o translate era descartado e os cinco
  // segmentos eram desenhados empilhados em x=0 — o funil virava um borrão
  // colorido no primeiro estágio e os outros sumiam.
  return (
    <g transform={`translate(${offsetX}, 0)`}>
      <motion.g
        style={{
          opacity: dim,
          scaleX: grow,
          transformBox: 'fill-box',
          transformOrigin: 'left center',
        }}
      >
      {paths.map((path, layer) => {
        const isInnermost = layer === paths.length - 1;
        // A opacidade crescente por camada é o que cria a leitura de volume.
        const opacity = 0.18 + (layer / Math.max(LAYERS - 1, 1)) * 0.7;
        // No hover a camada interna cresce um pouco mais que a externa,
        // reproduzindo o efeito elástico da referência.
        const hoverScale = isHovered
          ? 1 + (layer / Math.max(LAYERS - 1, 1)) * 0.1
          : 1;

        return (
          <motion.path
            animate={{ scaleY: hoverScale }}
            d={path}
            fill={color}
            key={`layer-${layer}`}
            opacity={opacity}
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center center',
            }}
            transition={{
              damping: 24 - layer * 3,
              stiffness: 300 - layer * 60,
              type: 'spring',
            }}
            {...(isInnermost ? { 'data-innermost': true } : {})}
          />
        );
      })}
      </motion.g>
    </g>
  );
};

export type FunnelChartProps = {
  stages: FunnelStage[];
  /** Cor base. Aceita qualquer valor CSS, inclusive var() do tema. */
  color?: string;
  /** Cor por estágio, na mesma ordem. Sobrepõe `color`. */
  colors?: string[];
  straightEdges?: boolean;
  emptyMessage?: string;
};

export const FunnelChart = ({
  stages,
  color = themeCssVariables.color.blue,
  colors,
  straightEdges = false,
  emptyMessage = 'Nenhum lead ainda. O funil aparece assim que o primeiro contato entrar.',
}: FunnelChartProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const segments = useMemo(() => buildFunnelSegments(stages), [stages]);

  const hasData = segments.length > 0 && stages[0].value > 0;

  const segmentWidth = useMemo(() => {
    if (segments.length === 0) {
      return 0;
    }

    return (VIEW_WIDTH - GAP * (segments.length - 1)) / segments.length;
  }, [segments.length]);

  // Estado vazio explícito. Sem isto o funil renderiza como uma linha fina e
  // parece bug — e é o estado real do escritório na primeira semana de uso.
  if (!hasData) {
    return <StyledEmpty>{emptyMessage}</StyledEmpty>;
  }

  return (
    <StyledWrapper
      onMouseLeave={() => setHoveredIndex(null)}
      style={{ aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}` }}
    >
      <StyledSvg
        aria-hidden="true"
        preserveAspectRatio="none"
        role="presentation"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      >
        {segments.map((segment) => {
          const paths = Array.from({ length: LAYERS }, (_, layer) =>
            funnelSegmentPath({
              height: VIEW_HEIGHT,
              layerScale: 1 - (layer / LAYERS) * 0.35,
              normEnd: segment.normEnd,
              normStart: segment.normStart,
              straight: straightEdges,
              width: segmentWidth,
            }),
          );

          return (
            <FunnelSegmentShape
              color={colors?.[segment.index] ?? color}
              index={segment.index}
              isDimmed={hoveredIndex !== null && hoveredIndex !== segment.index}
              isHovered={hoveredIndex === segment.index}
              key={segment.stage.label}
              offsetX={(segmentWidth + GAP) * segment.index}
              paths={paths}
            />
          );
        })}
      </StyledSvg>

      <StyledLabelLayer>
        {segments.map((segment) => {
          const widthPercent = (segmentWidth / VIEW_WIDTH) * 100;
          const leftPercent =
            (((segmentWidth + GAP) * segment.index) / VIEW_WIDTH) * 100;
          const isDimmed =
            hoveredIndex !== null && hoveredIndex !== segment.index;

          return (
            <StyledSegmentLabel
              animate={{ opacity: isDimmed ? 0.35 : 1 }}
              initial={{ opacity: 0 }}
              key={`label-${segment.stage.label}`}
              onMouseEnter={() => setHoveredIndex(segment.index)}
              style={{
                height: '100%',
                left: `${leftPercent}%`,
                top: 0,
                width: `${widthPercent}%`,
              }}
              transition={{
                delay: segment.index * STAGGER_SECONDS + 0.2,
                duration: 0.3,
              }}
            >
              <StyledValue>
                {segment.stage.displayValue ?? formatValue(segment.stage.value)}
              </StyledValue>
              <StyledPercentPill>
                {/* Percentual contra o estágio ANTERIOR, não o primeiro: é a
                    taxa de conversão daquele passo, que é a pergunta que o
                    arquiteto realmente faz ("quantas propostas viram
                    projeto?"). A referência mostrava contra o primeiro. */}
                {formatPercent(segment.percentOfPrevious)}
              </StyledPercentPill>
              <StyledStageLabel>{segment.stage.label}</StyledStageLabel>
            </StyledSegmentLabel>
          );
        })}
      </StyledLabelLayer>
    </StyledWrapper>
  );
};
