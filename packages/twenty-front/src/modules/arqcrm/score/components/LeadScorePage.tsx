import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useIsDomainInstalled } from '@/arqcrm/painel/hooks/useIsDomainInstalled';
import { LeadScoreContent } from '@/arqcrm/score/components/LeadScoreContent';

// Tela do lead score. Terceira das quatro telas fork-side.
//
// Justifica o slot porque é a tela que a referência favorita do usuário (o lead
// score do Dynamics 365) resolve e o Twenty nativo não: os widgets de gráfico
// agregam, mas não sabem ler o RAW_JSON de fatores nem ordenar por uma
// prioridade composta. Fazer isto em page layout daria uma lista ordenada por
// score, sem a explicação — que é justamente a metade que importa.
//
// A guarda de domínio instalado vive aqui, no pai, e não dentro do conteúdo,
// porque `useObjectMetadataItem` LANÇA quando o objeto não existe e `skip` não
// impede — o lançamento acontece antes de a opção ser lida.

const StyledPage = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[5]};
  height: 100%;
  min-height: 0;
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

const StyledNotice = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.lg};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.6;
  padding: ${themeCssVariables.spacing[6]};
`;

export const LeadScorePage = () => {
  const isDomainInstalled = useIsDomainInstalled();

  return (
    <StyledPage>
      <StyledHeader>
        <StyledTitle>Lead score</StyledTitle>
        <StyledSubtitle>
          Quem ligar primeiro, e o que sustenta cada nota. Recalculado quando o
          lead muda e na virada do dia.
        </StyledSubtitle>
      </StyledHeader>

      {isDomainInstalled ? (
        <LeadScoreContent />
      ) : (
        <StyledNotice>
          A Application de domínio do CRM não está instalada neste workspace.
          Rode <code>yarn twenty apply</code> no pacote <code>arqcrm</code>.
        </StyledNotice>
      )}
    </StyledPage>
  );
};
