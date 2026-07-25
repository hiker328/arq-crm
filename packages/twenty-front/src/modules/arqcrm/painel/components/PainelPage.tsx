import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { FunnelChart } from '@/arqcrm/funnel/components/FunnelChart';
import { StatCard } from '@/arqcrm/painel/components/StatCard';
import { usePainelMetrics } from '@/arqcrm/painel/hooks/usePainelMetrics';

// Painel do escritório.
//
// É a tela onde o design É o produto — a tese comercial é que os concorrentes
// são feios e impraticáveis, e o escritório piloto confirmou isso em campo sobre
// o Vobi. Por isso ela é uma das poucas telas que justificam divergir do
// upstream em vez de usar o page layout nativo.
//
// O funil não é enfeite de dashboard: lead → proposta → projeto É o core value
// declarado do produto, então ele é o elemento principal da tela, não um widget
// no canto.

const CENTS_PER_UNIT = 1_000_000;

const StyledPage = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[6]};
  height: 100%;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[6]};
`;

const StyledHeader = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.02em;
  margin: 0;
`;

const StyledSubtitle = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

const StyledCards = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: repeat(4, minmax(0, 1fr));

  /* Arquiteto consulta em obra, no celular e no tablet. A referência de design
     era desktop-only; sem isto a linha de cards estoura a tela. */
  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledPanel = styled.section`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[6]};
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

const StyledNotice = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.6;
  padding: ${themeCssVariables.spacing[6]};
`;

const brl = (micros: number) =>
  (micros / CENTS_PER_UNIT).toLocaleString('pt-BR', {
    currency: 'BRL',
    maximumFractionDigits: 0,
    style: 'currency',
  });

export const PainelPage = () => {
  const metrics = usePainelMetrics();

  if (!metrics.isDomainInstalled) {
    return (
      <StyledPage>
        <StyledNotice>
          A Application de domínio do CRM não está instalada neste workspace.
          Rode <code>yarn twenty apply</code> no pacote <code>arqcrm</code> para
          criar propostas, projetos, etapas e recebíveis.
        </StyledNotice>
      </StyledPage>
    );
  }

  const conversao =
    metrics.funnel[0].value > 0
      ? (metrics.funnel[4].value / metrics.funnel[0].value) * 100
      : 0;

  return (
    <StyledPage>
      <StyledHeader>
        <StyledTitle>Painel do escritório</StyledTitle>
        <StyledSubtitle>
          Do primeiro contato até a última parcela recebida.
        </StyledSubtitle>
      </StyledHeader>

      <StyledCards>
        <StatCard
          hint={`${metrics.projetosAtivos} projeto(s) em andamento`}
          title="Receita contratada"
          tone="neutral"
          value={brl(metrics.receitaContratada)}
        />
        <StatCard
          hint="Parcelas com baixa registrada"
          title="Recebido"
          tone="positive"
          value={brl(metrics.receitaRecebida)}
        />
        <StatCard
          hint={
            metrics.parcelasVencidas > 0
              ? `${metrics.parcelasVencidas} parcela(s) vencida(s)`
              : 'Nenhuma parcela vencida'
          }
          title="Em aberto"
          tone={metrics.parcelasVencidas > 0 ? 'negative' : 'neutral'}
          value={brl(metrics.receitaEmAberto)}
        />
        <StatCard
          hint={`${Math.round(conversao)}% dos leads viraram projeto`}
          title="Leads em aberto"
          tone="neutral"
          value={metrics.funnel[0].value.toLocaleString('pt-BR')}
        />
      </StyledCards>

      <StyledPanel>
        <div>
          <StyledPanelTitle>Funil</StyledPanelTitle>{' '}
          <StyledPanelHint>
            O percentual é a conversão em relação à etapa anterior.
          </StyledPanelHint>
        </div>
        <FunnelChart
          colors={[
            themeCssVariables.color.blue,
            themeCssVariables.color.turquoise,
            themeCssVariables.color.green,
            themeCssVariables.color.yellow,
            themeCssVariables.color.purple,
          ]}
          stages={metrics.funnel}
        />
      </StyledPanel>
    </StyledPage>
  );
};
