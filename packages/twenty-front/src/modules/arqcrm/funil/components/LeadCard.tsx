import { styled } from '@linaria/react';
import { motion } from 'framer-motion';
import { type DragEvent } from 'react';
import { AppPath } from 'twenty-shared/types';
// IconRuler2 existe no registro interno do twenty-ui mas NÃO é reexportado
// pelo index.ts — usar quebra o build em MISSING_EXPORT. Conferir ícone só em
// packages/twenty-ui/src/icon/index.ts.
import { IconClock, IconLayoutGrid, IconTarget } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type LeadDoFunil } from '@/arqcrm/funil/hooks/useFunilLeads';
import { useNavigateApp } from '~/hooks/useNavigateApp';

// Cartão do lead no quadro do funil.
//
// O que entra aqui foi escolhido pela pergunta que o arquiteto faz olhando a
// coluna: "vale a pena ligar para este?". Por isso área em m², tipo de projeto
// e há quantos dias ninguém fala com ele — e não campos de CRM genérico.
//
// O que NÃO entra: descrição livre e contagem de comentários/anexos, que a
// referência mostra. Um lead não tem descrição no modelo, e inventar espaço
// para dado que não existe deixa o cartão vazio na tela do piloto.

const MICROS_POR_UNIDADE = 1_000_000;

const StyledCard = styled(motion.article)`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease;

  &:hover {
    border-color: ${themeCssVariables.border.color.medium};
    box-shadow: ${themeCssVariables.boxShadow.light};
  }

  &[data-arrastando='true'] {
    opacity: 0.4;
  }
`;

const StyledTopo = styled.div`
  align-items: flex-start;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledNome = styled.h4`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  line-height: 1.35;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
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
  height: 22px;
  justify-content: center;
  min-width: 22px;
  padding: 0 5px;
`;

const StyledValor = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledEtiquetas = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledEtiqueta = styled.span`
  align-items: center;
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: 3px;
  padding: 2px 6px;
`;

const StyledRodape = styled.div`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  margin-top: ${themeCssVariables.spacing[1]};
  padding-top: ${themeCssVariables.spacing[2]};
`;

const StyledContato = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledAtrasado = styled.span`
  color: ${themeCssVariables.color.orange};
`;

const StyledInicial = styled.span`
  align-items: center;
  background: ${themeCssVariables.background.quaternary};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: ${themeCssVariables.font.weight.semiBold};
  height: 22px;
  justify-content: center;
  text-transform: uppercase;
  width: 22px;
`;

const StyledMover = styled.select`
  background: ${themeCssVariables.background.transparent.light};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.xs};
  margin-top: ${themeCssVariables.spacing[1]};
  padding: 3px 4px;
  width: 100%;
`;

const GRADE_COR: Record<string, { cor: string; fundo: string }> = {
  A: { cor: themeCssVariables.color.green, fundo: themeCssVariables.color.green10 },
  B: { cor: themeCssVariables.color.purple, fundo: themeCssVariables.color.purple10 },
  C: { cor: themeCssVariables.color.yellow, fundo: themeCssVariables.color.yellow10 },
  D: { cor: themeCssVariables.color.red, fundo: themeCssVariables.color.red10 },
};

const DIAS_SEM_CONTATO_PARA_ALERTAR = 10;

const diasDesde = (data: string | null): number | null => {
  if (typeof data !== 'string' || data.length < 10) return null;

  const quando = new Date(data).getTime();

  if (!Number.isFinite(quando)) return null;

  return Math.floor((Date.now() - quando) / 86_400_000);
};

const brl = (micros: number) =>
  (micros / MICROS_POR_UNIDADE).toLocaleString('pt-BR', {
    currency: 'BRL',
    maximumFractionDigits: 0,
    style: 'currency',
  });

export type LeadCardProps = {
  lead: LeadDoFunil;
  rotuloDeOrigem: (valor: string | null) => string | null;
  rotuloDeTipo: (valor: string | null) => string | null;
  isArrastando: boolean;
  onDragStart: (evento: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  /** Etapas disponíveis, para o seletor de mover — o caminho que funciona em toque. */
  etapas: { value: string; label: string }[];
  onMover: (paraEtapa: string) => void;
  /** Em telas de toque o arrasto HTML5 não existe; o seletor aparece no lugar. */
  mostrarSeletor: boolean;
};

export const LeadCard = ({
  lead,
  rotuloDeOrigem,
  rotuloDeTipo,
  isArrastando,
  onDragStart,
  onDragEnd,
  etapas,
  onMover,
  mostrarSeletor,
}: LeadCardProps) => {
  const navigateApp = useNavigateApp();

  const dias = diasDesde(lead.ultimoContatoEm);
  const grade = lead.leadGrade ? GRADE_COR[lead.leadGrade] : undefined;
  const valorMicros = Number(lead.amount?.amountMicros ?? 0);

  const contato = lead.pointOfContact?.name;
  const nomeContato = [contato?.firstName, contato?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const exibirContato = nomeContato || lead.company?.name || null;

  return (
    <StyledCard
      animate={{ opacity: 1, y: 0 }}
      data-arrastando={isArrastando}
      draggable
      initial={{ opacity: 0, y: 6 }}
      onClick={() =>
        navigateApp(AppPath.RecordShowPage, {
          objectNameSingular: 'opportunity',
          objectRecordId: lead.id,
        })
      }
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      transition={{ duration: 0.2 }}
    >
      <StyledTopo>
        <StyledNome title={lead.name ?? ''}>{lead.name ?? 'Sem nome'}</StyledNome>
        {grade !== undefined && (
          <StyledGrade
            cor={grade.cor}
            fundo={grade.fundo}
            title={
              lead.leadScore !== null
                ? `Lead score ${lead.leadScore} de 100`
                : 'Classificação do lead'
            }
          >
            {lead.leadGrade}
          </StyledGrade>
        )}
      </StyledTopo>

      {valorMicros > 0 && <StyledValor>{brl(valorMicros)}</StyledValor>}

      <StyledEtiquetas>
        {lead.tipoProjeto !== null && (
          <StyledEtiqueta>{rotuloDeTipo(lead.tipoProjeto)}</StyledEtiqueta>
        )}
        {lead.areaM2 !== null && lead.areaM2 > 0 && (
          <StyledEtiqueta>
            <IconLayoutGrid size={11} />
            {lead.areaM2.toLocaleString('pt-BR')} m²
          </StyledEtiqueta>
        )}
        {lead.origem !== null && (
          <StyledEtiqueta>{rotuloDeOrigem(lead.origem)}</StyledEtiqueta>
        )}
      </StyledEtiquetas>

      {lead.proximaAcao !== null && lead.proximaAcao.trim() !== '' && (
        <StyledEtiqueta title={lead.proximaAcao}>
          <IconTarget size={11} />
          {lead.proximaAcao}
        </StyledEtiqueta>
      )}

      <StyledRodape>
        <StyledContato>
          <IconClock size={12} />
          {dias === null ? (
            'sem contato registrado'
          ) : dias >= DIAS_SEM_CONTATO_PARA_ALERTAR ? (
            <StyledAtrasado>há {dias} dias</StyledAtrasado>
          ) : (
            `há ${dias} dia${dias === 1 ? '' : 's'}`
          )}
        </StyledContato>
        {exibirContato !== null && (
          <StyledInicial title={exibirContato}>
            {exibirContato.slice(0, 2)}
          </StyledInicial>
        )}
      </StyledRodape>

      {mostrarSeletor && (
        // Arrastar e soltar do HTML5 não existe em toque, e o arquiteto usa
        // tablet em obra — é requisito declarado, não hipótese. Um <select>
        // nativo é feio comparado a um menu sob medida, mas funciona em toque,
        // é acessível por teclado e leitor de tela, e custa dez linhas. Trocar
        // por um menu próprio é melhoria, não pré-requisito.
        <StyledMover
          aria-label={`Mover ${lead.name ?? 'lead'} para outra etapa`}
          onChange={(evento) => onMover(evento.target.value)}
          onClick={(evento) => evento.stopPropagation()}
          value={lead.stage ?? ''}
        >
          {etapas.map((etapa) => (
            <option key={etapa.value} value={etapa.value}>
              {etapa.label}
            </option>
          ))}
        </StyledMover>
      )}
    </StyledCard>
  );
};
