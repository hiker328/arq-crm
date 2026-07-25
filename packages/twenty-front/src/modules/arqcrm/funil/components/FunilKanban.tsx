import { styled } from '@linaria/react';
import { useMemo, useState } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { LeadCard } from '@/arqcrm/funil/components/LeadCard';
import { useFunilLeads } from '@/arqcrm/funil/hooks/useFunilLeads';
import { useIsMobile } from '@/ui/utilities/responsive/hooks/useIsMobile';

// Quadro do funil.
//
// Substitui o kanban nativo do Twenty, que o cliente rejeitou. As colunas vêm
// do metadado — renomear uma etapa nas configurações renomeia a coluna.
//
// Arrastar e soltar é HTML5 nativo, como na referência. A parte que a
// referência NÃO tem, e que é metade do trabalho: persistir. Soltar o cartão
// grava a etapa no servidor com atualização otimista; a referência só mexe num
// array em memória.

const MOSTRA_SELETOR_ATE = 1024;

const StyledQuadro = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  min-height: 0;
  overflow-x: auto;
  padding-bottom: ${themeCssVariables.spacing[2]};

  /* Barra de rolagem discreta: o quadro rola na horizontal por natureza e uma
     barra grossa rouba altura útil em tela de tablet. */
  scrollbar-width: thin;
`;

const StyledColuna = styled.section<{ isAlvo: boolean }>`
  background: ${({ isAlvo }) =>
    isAlvo
      ? themeCssVariables.background.transparent.light
      : themeCssVariables.background.tertiary};
  border: 1px solid
    ${({ isAlvo }) =>
      isAlvo
        ? themeCssVariables.border.color.medium
        : themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.lg};
  display: flex;
  flex: 0 0 288px;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  max-height: 100%;
  padding: ${themeCssVariables.spacing[3]};
  transition:
    background 140ms ease,
    border-color 140ms ease;
`;

const StyledCabecalho = styled.header`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: 0 ${themeCssVariables.spacing[1]};
`;

const StyledPonto = styled.span<{ cor: string }>`
  background: ${({ cor }) => cor};
  border-radius: ${themeCssVariables.border.radius.pill};
  flex-shrink: 0;
  height: 8px;
  width: 8px;
`;

const StyledTituloColuna = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledContagem = styled.span`
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: 1px 7px;
`;

const StyledLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 60px;
  overflow-y: auto;
`;

const StyledVazio = styled.p`
  color: ${themeCssVariables.font.color.extraLight};
  font-size: ${themeCssVariables.font.size.xs};
  margin: 0;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[1]};
  text-align: center;
`;

const StyledEstado = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  justify-content: center;
  min-height: 240px;
`;

// Formato do arrasto: só o id. Serializar o registro inteiro no dataTransfer
// funciona e é o que a referência faz, mas transporta uma cópia que pode estar
// velha quando o soltar acontece. O id é sempre verdade.
const TIPO_ARRASTO = 'text/plain';

export const FunilKanban = () => {
  const { colunas, isLoading, moverLead, rotuloDeOrigem, rotuloDeTipo } =
    useFunilLeads();
  const isMobile = useIsMobile();

  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<string | null>(null);

  // O seletor de etapa aparece quando não dá para arrastar: toque, ou tela
  // estreita onde arrastar entre colunas exige rolagem horizontal simultânea —
  // um gesto que quase ninguém consegue fazer.
  const mostrarSeletor =
    isMobile ||
    (typeof window !== 'undefined' && window.innerWidth < MOSTRA_SELETOR_ATE);

  const etapas = useMemo(
    () => colunas.map(({ value, label }) => ({ label, value })),
    [colunas],
  );

  const total = colunas.reduce((soma, coluna) => soma + coluna.leads.length, 0);

  if (isLoading && total === 0) {
    return <StyledEstado>Carregando o funil…</StyledEstado>;
  }

  if (colunas.length === 0) {
    return (
      <StyledEstado>
        Nenhuma etapa configurada no funil. Elas vêm das opções do campo
        &quot;Etapa&quot; do lead, nas configurações.
      </StyledEstado>
    );
  }

  const aoSoltar = async (etapaDestino: string) => {
    const leadId = arrastando;

    setArrastando(null);
    setColunaAlvo(null);

    if (leadId === null) return;

    const origem = colunas.find((coluna) =>
      coluna.leads.some((lead) => lead.id === leadId),
    );

    if (origem?.value === etapaDestino) return;

    await moverLead(leadId, etapaDestino);
  };

  return (
    <StyledQuadro>
      {colunas.map((coluna) => (
        <StyledColuna
          isAlvo={colunaAlvo === coluna.value && arrastando !== null}
          key={coluna.value}
          onDragLeave={() =>
            setColunaAlvo((atual) => (atual === coluna.value ? null : atual))
          }
          onDragOver={(evento) => {
            evento.preventDefault();
            setColunaAlvo(coluna.value);
          }}
          onDrop={(evento) => {
            evento.preventDefault();
            void aoSoltar(coluna.value);
          }}
        >
          <StyledCabecalho>
            <StyledPonto cor={coluna.color} />
            <StyledTituloColuna title={coluna.label}>
              {coluna.label}
            </StyledTituloColuna>
            <StyledContagem>{coluna.leads.length}</StyledContagem>
          </StyledCabecalho>

          <StyledLista>
            {coluna.leads.length === 0 ? (
              <StyledVazio>Nenhum lead aqui</StyledVazio>
            ) : (
              coluna.leads.map((lead) => (
                <LeadCard
                  etapas={etapas}
                  isArrastando={arrastando === lead.id}
                  key={lead.id}
                  lead={lead}
                  mostrarSeletor={mostrarSeletor}
                  onDragEnd={() => {
                    setArrastando(null);
                    setColunaAlvo(null);
                  }}
                  onDragStart={(evento) => {
                    // O Firefox só inicia o arrasto se algo for escrito no
                    // dataTransfer. O id que vale é o do estado — este aqui
                    // existe só para o navegador deixar arrastar.
                    evento.dataTransfer.setData(TIPO_ARRASTO, lead.id);
                    evento.dataTransfer.effectAllowed = 'move';
                    setArrastando(lead.id);
                  }}
                  onMover={(paraEtapa) => void moverLead(lead.id, paraEtapa)}
                  rotuloDeOrigem={rotuloDeOrigem}
                  rotuloDeTipo={rotuloDeTipo}
                />
              ))
            )}
          </StyledLista>
        </StyledColuna>
      ))}
    </StyledQuadro>
  );
};
