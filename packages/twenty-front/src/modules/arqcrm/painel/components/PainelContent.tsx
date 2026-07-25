import { styled } from '@linaria/react';
import { useState } from 'react';
import {
  IconAlertTriangle,
  IconBuildingSkyscraper,
  IconCoins,
  IconHourglassHigh,
} from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { FunnelChart } from '@/arqcrm/funnel/components/FunnelChart';
import { AreaChart } from '@/arqcrm/painel/components/AreaChart';
import { AttentionList } from '@/arqcrm/painel/components/AttentionList';
import { DonutChart } from '@/arqcrm/painel/components/DonutChart';
import { PeriodoSegmentado } from '@/arqcrm/painel/components/PeriodoSegmentado';
import { StatCard } from '@/arqcrm/painel/components/StatCard';
import { usePainelDetalhes } from '@/arqcrm/painel/hooks/usePainelDetalhes';
import { usePainelMetrics } from '@/arqcrm/painel/hooks/usePainelMetrics';

// Conteúdo do painel. Só é montado quando a Application de domínio existe no
// workspace — ver `useIsDomainInstalled`.

const MICROS_POR_UNIDADE = 1_000_000;

const STATUS_PROPOSTA = {
  APROVADA: { cor: themeCssVariables.color.green, rotulo: 'Aprovada' },
  ENVIADA: { cor: themeCssVariables.color.blue, rotulo: 'Enviada' },
  EXPIRADA: { cor: themeCssVariables.color.orange, rotulo: 'Expirada' },
  RASCUNHO: { cor: themeCssVariables.color.gray, rotulo: 'Rascunho' },
  RECUSADA: { cor: themeCssVariables.color.red, rotulo: 'Recusada' },
  VISUALIZADA: { cor: themeCssVariables.color.purple, rotulo: 'Visualizada' },
} as const;

const StyledCards = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: repeat(4, minmax(0, 1fr));

  /* Arquiteto consulta em obra, no celular e no tablet. A referência de design
     era desktop-only; sem isto a linha de cards estoura a tela. */
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledRow = styled.div<{ template: string }>`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: ${({ template }) => template};

  @media (max-width: 1200px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledPanel = styled.section`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.lg};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[5]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[6]};
`;

const StyledPanelHeader = styled.header`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  min-height: 26px;
`;

const StyledPanelTitleGroup = styled.div`
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledPanelTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledPanelHint = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const brl = (micros: number) =>
  (micros / MICROS_POR_UNIDADE).toLocaleString('pt-BR', {
    currency: 'BRL',
    maximumFractionDigits: 0,
    style: 'currency',
  });

// Eixo do gráfico com números longos vira parede de dígitos. "R$ 120 mil" é
// mais legível que "R$ 120.000" repetido cinco vezes na vertical.
const brlCurto = (micros: number) => {
  const reais = micros / MICROS_POR_UNIDADE;

  if (reais === 0) return 'R$ 0';
  if (Math.abs(reais) >= 1_000_000)
    return `R$ ${(reais / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(reais) >= 1_000)
    return `R$ ${Math.round(reais / 1_000)} mil`;

  return `R$ ${Math.round(reais)}`;
};

const variacao = (serie: number[]): number | undefined => {
  if (serie.length < 2) return undefined;

  const atual = serie[serie.length - 1];
  const anterior = serie[serie.length - 2];

  // Sem base de comparação não há percentual honesto. Mostrar "+100%" porque o
  // mês anterior foi zero é inventar tendência.
  if (anterior === 0) return undefined;

  return ((atual - anterior) / anterior) * 100;
};

const PERIODOS = [
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
];

export const PainelContent = () => {
  const [mesesNaCurva, setMesesNaCurva] = useState(6);

  const metrics = usePainelMetrics();
  const detalhes = usePainelDetalhes(mesesNaCurva);

  const totalRecebidoNaJanela = detalhes.recebidoPorMes.reduce(
    (soma, valor) => soma + valor,
    0,
  );

  // Enquanto carrega, os componentes recebem vazio e cada um mostra "nenhum
  // registro ainda". Numa conexão lenta isso são vários segundos afirmando que
  // o escritório não tem nada — pior que um espaço em branco.
  const estaCarregando = metrics.isLoading || detalhes.isLoading;

  const CARREGANDO = 'Carregando…';

  const funil = detalhes.funil;
  const conversao =
    funil[0].value > 0 ? (funil[4].value / funil[0].value) * 100 : 0;

  const fatias = detalhes.propostasPorStatus
    .map((item) => {
      const config =
        STATUS_PROPOSTA[item.status as keyof typeof STATUS_PROPOSTA];

      return {
        color: config?.cor ?? themeCssVariables.color.gray,
        label: config?.rotulo ?? item.status,
        value: item.quantidade,
      };
    })
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <StyledCards>
        <StatCard
          hint={`${metrics.projetosAtivos} projeto${metrics.projetosAtivos === 1 ? '' : 's'} em andamento`}
          icon={<IconBuildingSkyscraper size={15} />}
          index={0}
          title="Receita contratada"
          tone="neutral"
          value={brl(metrics.receitaContratada)}
        />
        <StatCard
          deltaPercent={variacao(detalhes.recebidoPorMes)}
          hint={`nos últimos ${mesesNaCurva} meses`}
          icon={<IconCoins size={15} />}
          index={1}
          series={detalhes.recebidoPorMes}
          title="Recebido"
          tone="positive"
          value={brl(totalRecebidoNaJanela)}
        />
        <StatCard
          hint="parcelas ainda em aberto"
          icon={<IconHourglassHigh size={15} />}
          index={2}
          series={detalhes.previstoPorMes}
          title="A receber"
          tone="neutral"
          value={brl(detalhes.aReceberMicros)}
        />
        <StatCard
          hint={
            metrics.parcelasVencidas > 0
              ? `${metrics.parcelasVencidas} parcela${metrics.parcelasVencidas === 1 ? '' : 's'}`
              : 'nada em atraso'
          }
          icon={<IconAlertTriangle size={15} />}
          index={3}
          title="Vencido"
          tone={metrics.parcelasVencidas > 0 ? 'negative' : 'positive'}
          value={brl(metrics.receitaVencida)}
        />
      </StyledCards>

      <StyledRow template="minmax(0, 1.6fr) minmax(0, 1fr)">
        <StyledPanel>
          <StyledPanelHeader>
            <StyledPanelTitleGroup>
              <StyledPanelTitle>Funil</StyledPanelTitle>
              <StyledPanelHint>
                o percentual em cada etapa é a conversão contra a anterior
              </StyledPanelHint>
            </StyledPanelTitleGroup>
            <StyledPanelHint>
              {Math.round(conversao)}% dos leads viraram projeto
            </StyledPanelHint>
          </StyledPanelHeader>
          <FunnelChart
            emptyMessage={
              estaCarregando
                ? CARREGANDO
                : 'Nenhum lead ainda. O funil aparece assim que o primeiro contato entrar.'
            }
            colors={[
              themeCssVariables.color.blue,
              themeCssVariables.color.turquoise,
              themeCssVariables.color.green,
              themeCssVariables.color.yellow,
              themeCssVariables.color.purple,
            ]}
            stages={funil}
          />
        </StyledPanel>

        <StyledPanel>
          <StyledPanelHeader>
            <StyledPanelTitleGroup>
              <StyledPanelTitle>Propostas</StyledPanelTitle>
              <StyledPanelHint>por status</StyledPanelHint>
            </StyledPanelTitleGroup>
          </StyledPanelHeader>
          <DonutChart
            centerLabel="propostas"
            emptyMessage={
              estaCarregando ? CARREGANDO : 'Nenhuma proposta criada ainda.'
            }
            formatValue={(valor) => String(valor)}
            slices={fatias}
          />
        </StyledPanel>
      </StyledRow>

      <StyledPanel>
        <StyledPanelHeader>
          <StyledPanelTitleGroup>
            <StyledPanelTitle>Recebíveis</StyledPanelTitle>
            <StyledPanelHint>
              o que entrou contra o que está previsto, mês a mês
            </StyledPanelHint>
          </StyledPanelTitleGroup>
          <PeriodoSegmentado
            ariaLabel="Período da curva de recebíveis"
            onChange={setMesesNaCurva}
            options={PERIODOS}
            value={mesesNaCurva}
          />
        </StyledPanelHeader>
        <AreaChart
          emptyMessage={
            estaCarregando
              ? CARREGANDO
              : 'Ainda não há parcelas suficientes para desenhar a curva. Ela aparece assim que houver ao menos dois meses com movimento.'
          }
          formatAxis={brlCurto}
          formatValue={brl}
          labels={detalhes.meses}
          series={[
            {
              color: themeCssVariables.color.green,
              label: 'Recebido',
              values: detalhes.recebidoPorMes,
            },
            {
              color: themeCssVariables.color.blue,
              label: 'Previsto',
              values: detalhes.previstoPorMes,
            },
          ]}
        />
      </StyledPanel>

      <StyledPanel>
        <StyledPanelHeader>
          <StyledPanelTitleGroup>
            <StyledPanelTitle>Precisa de atenção</StyledPanelTitle>
            <StyledPanelHint>
              parcela vencida e proposta parada há mais de uma semana
            </StyledPanelHint>
          </StyledPanelTitleGroup>
        </StyledPanelHeader>
        <AttentionList
          emptyMessage={
            estaCarregando
              ? CARREGANDO
              : 'Nada parado. Nenhuma parcela vencida e nenhuma proposta sem resposta.'
          }
          items={detalhes.atencao}
        />
      </StyledPanel>
    </>
  );
};
