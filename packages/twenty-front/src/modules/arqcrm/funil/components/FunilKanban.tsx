import { styled } from '@linaria/react';
import { LayoutGroup } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { LeadCard } from '@/arqcrm/funil/components/LeadCard';
import { useFunilLeads } from '@/arqcrm/funil/hooks/useFunilLeads';

// Quadro do funil.
//
// Substitui o kanban nativo do Twenty, que o cliente rejeitou. As colunas vêm
// do metadado — renomear uma etapa nas configurações renomeia a coluna.
//
// O arrasto é o `drag` do framer-motion, não o do HTML5 como na referência.
// Dois motivos, o segundo mais importante que o primeiro:
//
//   1. O arrasto nativo não desenhava fantasma nenhum. O navegador não gera a
//      imagem de arrasto quando o elemento tem `transform`, e todo componente
//      `motion` tem. O cartão trocava de coluna ao soltar, mas nada seguia o
//      cursor — parecia quebrado mesmo funcionando.
//   2. Arrasto nativo do HTML5 não existe em tela de toque. Com ponteiro, o
//      mesmo código serve mouse e dedo, e o seletor de etapa que existia como
//      alternativa para tablet deixou de ser necessário.
//
// A parte que a referência NÃO tem, e que é metade do trabalho: persistir.
// Soltar grava a etapa no servidor com atualização otimista; a referência só
// mexe num array em memória.

const StyledQuadro = styled.div<{ isArrastandoAlgo: boolean }>`
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  min-height: 0;
  /* Enquanto um cartão está sendo arrastado o recorte precisa sumir, senão o
     cartão é cortado ao sair da coluna e o arrasto parece bugado. Ninguém rola
     o quadro com o cartão na mão, então trocar por visible durante o gesto
     não custa nada — e a posição de rolagem é preservada. */
  overflow-x: ${({ isArrastandoAlgo }) => (isArrastandoAlgo ? 'visible' : 'auto')};
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

const StyledLista = styled.div<{ isArrastandoAlgo: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 60px;
  /* Mesmo motivo do quadro: recorte vertical cortaria o cartão arrastado. */
  overflow-y: ${({ isArrastandoAlgo }) => (isArrastandoAlgo ? 'visible' : 'auto')};
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

export const FunilKanban = () => {
  const { colunas, isLoading, moverLead, rotuloDeOrigem, rotuloDeTipo } =
    useFunilLeads();

  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<string | null>(null);

  // Referência a cada coluna para descobrir sobre qual o cartão foi solto.
  // Medir aqui é seguro: isto é fork-side, com DOM de verdade. A regra de
  // evitar `getBoundingClientRect` vale para o sandbox de front component da
  // app, que é outro ambiente e não tem essa API.
  const colunasRef = useRef(new Map<string, HTMLElement>());

  const registrarColuna = useCallback(
    (valor: string) => (elemento: HTMLElement | null) => {
      if (elemento === null) {
        colunasRef.current.delete(valor);
      } else {
        colunasRef.current.set(valor, elemento);
      }
    },
    [],
  );

  const colunaSobOPonteiro = useCallback(
    (ponto: { x: number; y: number }) => {
      for (const [valor, elemento] of colunasRef.current) {
        const area = elemento.getBoundingClientRect();

        if (
          ponto.x >= area.left &&
          ponto.x <= area.right &&
          ponto.y >= area.top &&
          ponto.y <= area.bottom
        ) {
          return valor;
        }
      }

      return null;
    },
    [],
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

  const aoSoltar = async (leadId: string, ponto: { x: number; y: number }) => {
    setArrastando(null);
    setColunaAlvo(null);

    const destino = colunaSobOPonteiro(ponto);

    // Solto fora de qualquer coluna: `dragSnapToOrigin` já devolveu o cartão ao
    // lugar e não há nada a gravar.
    if (destino === null) return;

    const origem = colunas.find((coluna) =>
      coluna.leads.some((lead) => lead.id === leadId),
    );

    if (origem?.value === destino) return;

    await moverLead(leadId, destino);
  };

  return (
    <StyledQuadro
      isArrastandoAlgo={arrastando !== null}
      onPointerMove={(evento) => {
        // O realce da coluna sob o ponteiro é calculado aqui, no contêiner, e
        // não em cada coluna: durante o arrasto o cartão captura o ponteiro e
        // as colunas nunca recebem evento próprio.
        if (arrastando === null) return;

        setColunaAlvo(
          colunaSobOPonteiro({ x: evento.clientX, y: evento.clientY }),
        );
      }}
    >
      <LayoutGroup>
        {colunas.map((coluna) => (
          <StyledColuna
            isAlvo={colunaAlvo === coluna.value && arrastando !== null}
            key={coluna.value}
            ref={registrarColuna(coluna.value)}
          >
          <StyledCabecalho>
            <StyledPonto cor={coluna.color} />
            <StyledTituloColuna title={coluna.label}>
              {coluna.label}
            </StyledTituloColuna>
            <StyledContagem>{coluna.leads.length}</StyledContagem>
          </StyledCabecalho>

          <StyledLista isArrastandoAlgo={arrastando !== null}>
            {coluna.leads.length === 0 ? (
              <StyledVazio>Nenhum lead aqui</StyledVazio>
            ) : (
              coluna.leads.map((lead) => (
                <LeadCard
                  isArrastando={arrastando === lead.id}
                  key={lead.id}
                  lead={lead}
                  onArrastoFim={(ponto) => void aoSoltar(lead.id, ponto)}
                  onArrastoInicio={() => setArrastando(lead.id)}
                  rotuloDeOrigem={rotuloDeOrigem}
                  rotuloDeTipo={rotuloDeTipo}
                />
              ))
            )}
          </StyledLista>
          </StyledColuna>
        ))}
      </LayoutGroup>
    </StyledQuadro>
  );
};
