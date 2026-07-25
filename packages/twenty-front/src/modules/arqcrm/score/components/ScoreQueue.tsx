import { styled } from '@linaria/react';
import { motion } from 'framer-motion';
import { IconClock } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { corDaGrade } from '@/arqcrm/score/constants/gradeCores';
import { type LeadComScore } from '@/arqcrm/score/hooks/useLeadScores';

// A fila: quem ligar primeiro.
//
// Cada linha carrega a barra do score porque comparar dois números de dois
// dígitos numa lista de vinte itens é trabalho de leitura; comparar duas barras
// é trabalho de olhar. É o mesmo motivo de a grade ser cor antes de ser letra.
//
// Sem paginação e sem virtualização: o teto é 200 leads ABERTOS, que é muito
// mais do que um escritório de arquitetura tem em funil ao mesmo tempo.
// ponytail: virtualizar quando um piloto reclamar de rolagem, não antes.

const MICROS_POR_UNIDADE = 1_000_000;

const StyledLista = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 2px;
  list-style: none;
  margin: 0;
  overflow-y: auto;
  padding: 0;
`;

// Estado de seleção por atributo de dado, não por prop tipada: Linaria repassa
// props desconhecidas ao componente embrulhado e o `motion.li` as joga no DOM.
// `data-*` é atributo legítimo, então atravessa sem aviso do React.
const StyledLinha = styled(motion.li)`
  align-items: center;
  background: transparent;
  border-radius: ${themeCssVariables.border.radius.md};
  cursor: pointer;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  position: relative;
  transition: background 120ms ease;

  &[data-selecionada='true'] {
    background: ${themeCssVariables.background.tertiary};
  }

  &:hover {
    background: ${themeCssVariables.background.tertiary};
  }
`;

const StyledMarcador = styled.span<{ selecionada: boolean; cor: string }>`
  background: ${({ cor, selecionada }) => (selecionada ? cor : 'transparent')};
  border-radius: 0 2px 2px 0;
  bottom: 6px;
  left: 0;
  position: absolute;
  top: 6px;
  width: 3px;
`;

const StyledGrade = styled.span<{ cor: string; fundo: string }>`
  align-items: center;
  background: ${({ fundo }) => fundo};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ cor }) => cor};
  display: inline-flex;
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  height: 26px;
  justify-content: center;
  width: 26px;
`;

const StyledMeio = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const StyledNome = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledTrilho = styled.div`
  background: ${themeCssVariables.background.quaternary};
  border-radius: ${themeCssVariables.border.radius.pill};
  height: 3px;
  overflow: hidden;
  width: 100%;
`;

const StyledBarra = styled(motion.div)`
  border-radius: ${themeCssVariables.border.radius.pill};
  height: 100%;
`;

const StyledDireita = styled.div`
  align-items: flex-end;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 2px;
`;

const StyledScore = styled.span<{ cor: string }>`
  color: ${({ cor }) => cor};
  font-size: ${themeCssVariables.font.size.md};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.semiBold};
  line-height: 1.1;
`;

const StyledDias = styled.span<{ alerta: boolean }>`
  align-items: center;
  color: ${({ alerta }) =>
    alerta ? themeCssVariables.color.orange : themeCssVariables.font.color.tertiary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: 3px;
  white-space: nowrap;
`;

const StyledValor = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-variant-numeric: tabular-nums;
`;

const StyledVazio = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  justify-content: center;
  min-height: 160px;
  text-align: center;
`;

// Alinhado com DIAS_PARA_ESFRIAR do domínio: é o dia em que a penalidade por
// silêncio começa a correr. A cor aparecer no mesmo dia em que o score começa
// a cair é o que faz a tela e o cálculo contarem a mesma história.
const DIAS_PARA_ALERTAR = 14;

const brl = (micros: number) =>
  (micros / MICROS_POR_UNIDADE).toLocaleString('pt-BR', {
    currency: 'BRL',
    maximumFractionDigits: 0,
    style: 'currency',
  });

export type ScoreQueueProps = {
  leads: LeadComScore[];
  selecionadoId: string | null;
  onSelecionar: (id: string) => void;
  vazio: string;
};

export const ScoreQueue = ({
  leads,
  selecionadoId,
  onSelecionar,
  vazio,
}: ScoreQueueProps) => {
  if (leads.length === 0) {
    return <StyledVazio>{vazio}</StyledVazio>;
  }

  return (
    <StyledLista>
      {leads.map((lead, indice) => {
        const { cor, fundo } = corDaGrade(lead.leadGrade);
        const selecionada = lead.id === selecionadoId;

        return (
          <StyledLinha
            animate={{ opacity: 1, y: 0 }}
            data-selecionada={selecionada}
            initial={{ opacity: 0, y: 4 }}
            key={lead.id}
            layout
            onClick={() => onSelecionar(lead.id)}
            transition={{ delay: Math.min(indice, 12) * 0.02, duration: 0.2 }}
          >
            <StyledMarcador cor={cor} selecionada={selecionada} />

            <StyledGrade cor={cor} fundo={fundo}>
              {lead.leadGrade ?? '—'}
            </StyledGrade>

            <StyledMeio>
              <StyledNome title={lead.name ?? ''}>
                {lead.name ?? 'Sem nome'}
              </StyledNome>
              <StyledTrilho>
                <StyledBarra
                  animate={{
                    width: `${Math.max(0, Math.min(100, lead.leadScore ?? 0))}%`,
                  }}
                  initial={{ width: 0 }}
                  style={{ background: cor }}
                  transition={{ duration: 0.4 }}
                />
              </StyledTrilho>
            </StyledMeio>

            <StyledDireita>
              <StyledScore cor={cor}>{lead.leadScore ?? '—'}</StyledScore>
              {lead.diasSemContato !== null && (
                <StyledDias alerta={lead.diasSemContato >= DIAS_PARA_ALERTAR}>
                  <IconClock size={10} />
                  {lead.diasSemContato === 0
                    ? 'hoje'
                    : `${lead.diasSemContato}d`}
                </StyledDias>
              )}
              {lead.valorMicros > 0 && (
                <StyledValor>{brl(lead.valorMicros)}</StyledValor>
              )}
            </StyledDireita>
          </StyledLinha>
        );
      })}
    </StyledLista>
  );
};
