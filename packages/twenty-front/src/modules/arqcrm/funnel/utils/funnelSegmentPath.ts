// Geometria dos segmentos do funil.
//
// Portado da referência de design fornecida pelo cliente. Só a orientação
// horizontal foi mantida: o funil do produto é lead → proposta → projeto, que é
// horizontal por natureza, e carregar a variante vertical seria código morto.
//
// Isolado do componente de propósito: é a única parte com matemática de verdade
// aqui, e path errado produz um gráfico que *parece* certo — a checagem em
// __tests__ existe por isso.

export type FunnelSegmentGeometry = {
  /** Altura normalizada (0..1) na borda esquerda do segmento. */
  normStart: number;
  /** Altura normalizada (0..1) na borda direita — é o próximo estágio. */
  normEnd: number;
  /** Largura do segmento em unidades do viewBox. */
  width: number;
  /** Altura total disponível em unidades do viewBox. */
  height: number;
  /**
   * Escala da camada. O visual empilha camadas concêntricas para dar
   * profundidade; 1 é a externa.
   */
  layerScale: number;
  /** Arestas retas em vez de curva Bézier. */
  straight?: boolean;
};

// 0.44 mantém o funil ocupando ~88% da altura no estágio cheio, deixando
// respiro para os rótulos de valor e label acima e abaixo.
const HEIGHT_RATIO = 0.44;

// Posição dos pontos de controle da Bézier, como fração da largura do segmento.
// 0.55 dá a barriga suave da referência: menor achata, maior cria degrau.
const CONTROL_POINT_RATIO = 0.55;

export const funnelSegmentPath = ({
  normStart,
  normEnd,
  width,
  height,
  layerScale,
  straight = false,
}: FunnelSegmentGeometry): string => {
  const middle = height / 2;
  const halfStart = normStart * height * HEIGHT_RATIO * layerScale;
  const halfEnd = normEnd * height * HEIGHT_RATIO * layerScale;

  if (straight) {
    return [
      `M 0 ${middle - halfStart}`,
      `L ${width} ${middle - halfEnd}`,
      `L ${width} ${middle + halfEnd}`,
      `L 0 ${middle + halfStart}`,
      'Z',
    ].join(' ');
  }

  const control = width * CONTROL_POINT_RATIO;

  return [
    `M 0 ${middle - halfStart}`,
    `C ${control} ${middle - halfStart}, ${width - control} ${middle - halfEnd}, ${width} ${middle - halfEnd}`,
    `L ${width} ${middle + halfEnd}`,
    `C ${width - control} ${middle + halfEnd}, ${control} ${middle + halfStart}, 0 ${middle + halfStart}`,
    'Z',
  ].join(' ');
};

export type FunnelStage = {
  label: string;
  value: number;
  /** Rótulo já formatado. Quando ausente, o componente formata em pt-BR. */
  displayValue?: string;
};

export type FunnelSegment = {
  stage: FunnelStage;
  index: number;
  normStart: number;
  normEnd: number;
  /** Percentual em relação ao primeiro estágio. */
  percentOfFirst: number;
  /** Percentual em relação ao estágio anterior — a taxa de conversão real. */
  percentOfPrevious: number;
};

// Normaliza os estágios contra o primeiro. Trata o caso que a arte de
// referência nunca mostra: funil vazio ou com o primeiro estágio em zero, que é
// exatamente o estado do escritório piloto na primeira semana.
export const buildFunnelSegments = (
  stages: FunnelStage[],
): FunnelSegment[] => {
  if (stages.length === 0) {
    return [];
  }

  const max = stages[0].value;

  return stages.map((stage, index) => {
    const next = stages[Math.min(index + 1, stages.length - 1)];
    const previous = index === 0 ? stage : stages[index - 1];

    return {
      stage,
      index,
      normStart: max > 0 ? stage.value / max : 0,
      normEnd: max > 0 ? next.value / max : 0,
      percentOfFirst: max > 0 ? (stage.value / max) * 100 : 0,
      percentOfPrevious:
        previous.value > 0 ? (stage.value / previous.value) * 100 : 0,
    };
  });
};
