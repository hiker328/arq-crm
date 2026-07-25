import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { FunilKanban } from '@/arqcrm/funil/components/FunilKanban';
import { useIsDomainInstalled } from '@/arqcrm/painel/hooks/useIsDomainInstalled';

// Página do funil. Segunda das quatro telas fork-side.
//
// O quadro em si não depende dos objetos da app — ele lê o `opportunity`
// padrão. Mas os campos que dão sentido ao cartão (área em m², origem, tipo de
// projeto, lead score) são enxertos da app, então a tela só faz sentido com o
// domínio instalado. A guarda vive aqui, no pai, pelo mesmo motivo do painel:
// os hooks de dado lançam antes de qualquer `skip`.

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

export const FunilPage = () => {
  const isDomainInstalled = useIsDomainInstalled();

  return (
    <StyledPage>
      <StyledHeader>
        <StyledTitle>Funil</StyledTitle>
        <StyledSubtitle>
          Arraste o lead entre as etapas. As colunas vêm das etapas
          configuradas no seu escritório.
        </StyledSubtitle>
      </StyledHeader>

      {isDomainInstalled ? (
        <FunilKanban />
      ) : (
        <StyledNotice>
          A Application de domínio do CRM não está instalada neste workspace.
          Rode <code>yarn twenty apply</code> no pacote <code>arqcrm</code>.
        </StyledNotice>
      )}
    </StyledPage>
  );
};
