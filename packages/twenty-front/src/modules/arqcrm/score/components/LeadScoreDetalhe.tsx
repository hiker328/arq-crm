import { styled } from '@linaria/react';
import { AppPath } from 'twenty-shared/types';
import { IconArrowUpRight, IconClock, IconTarget } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { FatoresPanel } from '@/arqcrm/score/components/FatoresPanel';
import { RegistrarContato } from '@/arqcrm/score/components/RegistrarContato';
import { ScoreGauge } from '@/arqcrm/score/components/ScoreGauge';
import { type LeadComScore } from '@/arqcrm/score/hooks/useLeadScores';
import { useNavigateApp } from '~/hooks/useNavigateApp';

// O painel da direita: por que este lead tem este número.
//
// Termina num botão que abre o registro. Uma tela que explica o problema e não
// deixa agir obriga o usuário a procurar o mesmo lead na tabela — dois passos
// para o que devia ser um. Mesma decisão da lista "Precisa de atenção" no
// painel.

const StyledPainel = styled.aside`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.lg};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[5]};
`;

const StyledTopo = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  text-align: center;
`;

const StyledNome = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.01em;
  line-height: 1.3;
  margin: 0;
`;

const StyledMetas = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: center;
`;

const StyledMeta = styled.span`
  align-items: center;
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: 4px;
  padding: 3px ${themeCssVariables.spacing[2]};
`;

const StyledDivisor = styled.hr`
  background: ${themeCssVariables.border.color.light};
  border: none;
  height: 1px;
  margin: 0;
`;

const StyledRodape = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  margin-top: auto;
  padding-top: ${themeCssVariables.spacing[2]};
`;

const StyledCarimbo = styled.span`
  color: ${themeCssVariables.font.color.extraLight};
  font-size: ${themeCssVariables.font.size.xs};
  text-align: center;
`;

const StyledBotao = styled.button`
  align-items: center;
  background: ${themeCssVariables.font.color.primary};
  border: none;
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.background.primary};
  cursor: pointer;
  display: inline-flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: 6px;
  justify-content: center;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  transition: opacity 120ms ease;

  &:hover {
    opacity: 0.88;
  }
`;

const StyledVazio = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  justify-content: center;
  padding: ${themeCssVariables.spacing[8]} ${themeCssVariables.spacing[4]};
  text-align: center;
`;

const StyledAviso = styled.p`
  /* Escrito à mão em vez de chamar o helper: dentro de um template do Linaria a
     expressão é avaliada em BUILD, e chamada de função importada é a categoria
     de coisa que falha depois de doze minutos de build. Nos outros usos o tom
     entra por prop, que é JavaScript comum em tempo de execução. */
  background: color-mix(in srgb, ${themeCssVariables.color.orange} 18%, transparent);
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.5;
  margin: 0;
  padding: ${themeCssVariables.spacing[2]};
`;

const dataCurta = (iso: string | null): string | null => {
  if (iso === null) return null;

  const quando = new Date(iso);

  if (!Number.isFinite(quando.getTime())) return null;

  return quando.toLocaleString('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  });
};

const textoDeContato = (lead: LeadComScore): string => {
  if (lead.diasSemContato === null) return 'sem data de contato';

  const prefixo = lead.temContatoRegistrado ? 'último contato' : 'criado';

  if (lead.diasSemContato === 0) return `${prefixo} hoje`;

  return `${prefixo} há ${lead.diasSemContato} dia${lead.diasSemContato === 1 ? '' : 's'}`;
};

export type LeadScoreDetalheProps = { lead: LeadComScore | null };

export const LeadScoreDetalhe = ({ lead }: LeadScoreDetalheProps) => {
  const navigateApp = useNavigateApp();

  if (lead === null) {
    return (
      <StyledPainel>
        <StyledVazio>
          Escolha um lead na fila para ver o que sustenta o score dele.
        </StyledVazio>
      </StyledPainel>
    );
  }

  const positivos = lead.fatores?.positivos ?? [];
  const negativos = lead.fatores?.negativos ?? [];

  const maximo = Math.max(
    1,
    ...positivos.map((fator) => fator.pontos),
    ...negativos.map((fator) => fator.pontos),
  );

  const calculadoEm = dataCurta(lead.fatores?.calculadoEm ?? null);

  return (
    <StyledPainel>
      <StyledTopo>
        <ScoreGauge grade={lead.leadGrade} score={lead.leadScore} />
        <StyledNome>{lead.name ?? 'Sem nome'}</StyledNome>
        <StyledMetas>
          <StyledMeta>
            <IconClock size={11} />
            {textoDeContato(lead)}
          </StyledMeta>
          {lead.proximaAcao !== null && lead.proximaAcao.trim() !== '' && (
            <StyledMeta title={lead.proximaAcao}>
              <IconTarget size={11} />
              {lead.proximaAcao}
            </StyledMeta>
          )}
        </StyledMetas>
      </StyledTopo>

      <StyledDivisor />

      {lead.fatores === null ? (
        <StyledAviso>
          Este lead ainda não foi pontuado. O score é gravado quando o lead é
          criado, quando um campo de qualificação muda, ou na virada do dia.
        </StyledAviso>
      ) : (
        <>
          <FatoresPanel
            cor={themeCssVariables.color.green}
            fatores={positivos}
            maximo={maximo}
            sinal="+"
            titulo="A favor"
            vazio="Nenhum sinal favorável registrado ainda."
          />

          <FatoresPanel
            cor={themeCssVariables.color.red}
            fatores={negativos}
            maximo={maximo}
            sinal="−"
            titulo="Contra"
            vazio="Nada pesando contra."
          />
        </>
      )}

      <StyledRodape>
        <RegistrarContato leadId={lead.id} proximaAcaoAtual={lead.proximaAcao} />

        {calculadoEm !== null && (
          <StyledCarimbo>Pontuado em {calculadoEm}</StyledCarimbo>
        )}
        <StyledBotao
          onClick={() =>
            navigateApp(AppPath.RecordShowPage, {
              objectNameSingular: 'opportunity',
              objectRecordId: lead.id,
            })
          }
          type="button"
        >
          Abrir lead
          <IconArrowUpRight size={14} />
        </StyledBotao>
      </StyledRodape>
    </StyledPainel>
  );
};
