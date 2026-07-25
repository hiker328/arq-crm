import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { PainelContent } from '@/arqcrm/painel/components/PainelContent';
import { useIsDomainInstalled } from '@/arqcrm/painel/hooks/useIsDomainInstalled';

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
//
// Este componente não consulta NADA. Ele só decide se o conteúdo pode ser
// montado — porque os hooks de dado lançam quando os objetos do domínio não
// existem no workspace, e o lançamento acontece antes de qualquer `skip`.

const StyledPage = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[5]};
  height: 100%;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[6]};
`;

const StyledHeader = styled.header`
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledBrand = styled.span`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: 0.08em;
  padding: 2px ${themeCssVariables.spacing[2]};
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

const StyledNotice = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.6;
  padding: ${themeCssVariables.spacing[6]};
`;

const saudacao = (): string => {
  const hora = new Date().getHours();

  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';

  return 'Boa noite';
};

export const PainelPage = () => {
  const isDomainInstalled = useIsDomainInstalled();

  return (
    <StyledPage>
      <StyledHeader>
        <StyledTitleGroup>
          <StyledTitle>Painel do escritório</StyledTitle>
          <StyledSubtitle>
            {saudacao()} — do primeiro contato até a última parcela recebida.
          </StyledSubtitle>
        </StyledTitleGroup>
        <StyledBrand>ORBE</StyledBrand>
      </StyledHeader>

      {isDomainInstalled ? (
        <PainelContent />
      ) : (
        <StyledNotice>
          A Application de domínio do CRM não está instalada neste workspace.
          Rode <code>yarn twenty apply</code> no pacote <code>arqcrm</code> para
          criar propostas, projetos, etapas e recebíveis.
        </StyledNotice>
      )}
    </StyledPage>
  );
};
