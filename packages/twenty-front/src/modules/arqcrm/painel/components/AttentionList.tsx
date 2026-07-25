import { styled } from '@linaria/react';
import { motion } from 'framer-motion';
import { AppPath } from 'twenty-shared/types';
import { IconChevronRight } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useNavigateApp } from '~/hooks/useNavigateApp';
import { tom } from '@/arqcrm/theme/tom';

// "Precisa de atenção" — a lista que responde "o que parou?".
//
// Existe porque o painel bonito sem isto responde "como estamos", que é a
// pergunta do dono no fim do mês, não a do arquiteto às nove da manhã. A
// pesquisa de features registrou que a reclamação do piloto sobre o Vobi tem
// dois eixos, e o segundo — "não é prático" — é atrito de fluxo. Uma tela que
// diz o que fazer agora ataca exatamente esse eixo.
//
// Cada linha navega para o registro. Painel que mostra problema e não deixa
// agir obriga o usuário a procurar o mesmo registro na tabela — dois passos
// para o que devia ser um.

const StyledList = styled.ul`
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledRow = styled(motion.li)`
  align-items: center;
  border-radius: ${themeCssVariables.border.radius.sm};
  cursor: pointer;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[2]};
  transition: background 120ms ease;

  &:hover {
    background: ${themeCssVariables.background.tertiary};
  }
`;

const StyledMark = styled.span<{ color: string; tint: string }>`
  align-items: center;
  background: ${({ tint }) => tint};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ color }) => color};
  display: inline-flex;
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  height: 30px;
  justify-content: center;
  text-transform: uppercase;
  width: 30px;
`;

const StyledTexts = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledSublabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledRight = styled.div`
  align-items: flex-end;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 2px;
`;

const StyledValue = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledBadge = styled.span<{ color: string }>`
  color: ${({ color }) => color};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledChevron = styled.span`
  color: ${themeCssVariables.font.color.extraLight};
  display: inline-flex;
  flex-shrink: 0;
`;

const StyledEmpty = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: center;
  min-height: 120px;
  text-align: center;
`;

export type AttentionSeverity = 'alta' | 'media';

export type AttentionItem = {
  id: string;
  objectNameSingular: string;
  mark: string;
  label: string;
  sublabel: string;
  value?: string;
  badge: string;
  severity: AttentionSeverity;
};

export type AttentionListProps = {
  items: AttentionItem[];
  emptyMessage: string;
};

const SEVERITY_COLOR: Record<AttentionSeverity, string> = {
  alta: themeCssVariables.color.red,
  media: themeCssVariables.color.orange,
};

const SEVERITY_TINT: Record<AttentionSeverity, string> = {
  alta: tom(themeCssVariables.color.red),
  media: tom(themeCssVariables.color.orange),
};

export const AttentionList = ({ items, emptyMessage }: AttentionListProps) => {
  const navigateApp = useNavigateApp();

  if (items.length === 0) {
    return <StyledEmpty>{emptyMessage}</StyledEmpty>;
  }

  return (
    <StyledList>
      {items.map((item, indice) => (
        <StyledRow
          animate={{ opacity: 1, x: 0 }}
          initial={{ opacity: 0, x: -6 }}
          key={`${item.objectNameSingular}-${item.id}`}
          onClick={() =>
            navigateApp(AppPath.RecordShowPage, {
              objectNameSingular: item.objectNameSingular,
              objectRecordId: item.id,
            })
          }
          transition={{ delay: indice * 0.04, duration: 0.25 }}
        >
          <StyledMark
            color={SEVERITY_COLOR[item.severity]}
            tint={SEVERITY_TINT[item.severity]}
          >
            {item.mark}
          </StyledMark>

          <StyledTexts>
            <StyledLabel title={item.label}>{item.label}</StyledLabel>
            <StyledSublabel title={item.sublabel}>
              {item.sublabel}
            </StyledSublabel>
          </StyledTexts>

          <StyledRight>
            {item.value !== undefined && (
              <StyledValue>{item.value}</StyledValue>
            )}
            <StyledBadge color={SEVERITY_COLOR[item.severity]}>
              {item.badge}
            </StyledBadge>
          </StyledRight>

          <StyledChevron>
            <IconChevronRight size={16} />
          </StyledChevron>
        </StyledRow>
      ))}
    </StyledList>
  );
};
