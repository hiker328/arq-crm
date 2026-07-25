import { styled } from '@linaria/react';
import { type PanInfo, motion, useDragControls } from 'framer-motion';
import { useRef } from 'react';
import { AppPath } from 'twenty-shared/types';
// IconRuler2 existe no registro interno do twenty-ui mas NÃO é reexportado
// pelo index.ts — usar quebra o build em MISSING_EXPORT. Conferir ícone só em
// packages/twenty-ui/src/icon/index.ts.
import {
  IconClock,
  IconGripVertical,
  IconLayoutGrid,
  IconTarget,
} from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type LeadDoFunil } from '@/arqcrm/funil/hooks/useFunilLeads';
import { GRADE_COR } from '@/arqcrm/score/constants/gradeCores';
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
  /* position:relative + z-index só valem enquanto arrasta; sem isso o cartão
     passa POR BAIXO das colunas vizinhas ao atravessá-las. */
  position: relative;
  /* Sem isto, arrastar seleciona o texto do cartão e dos vizinhos em vez de
     mover — o gesto vira marcação de texto azul atravessando o quadro. */
  user-select: none;
  -webkit-user-select: none;

  &:hover {
    border-color: ${themeCssVariables.border.color.medium};
  }
`;

const StyledPegador = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.extraLight};
  cursor: grab;
  display: inline-flex;
  flex-shrink: 0;
  /* Área de toque maior que o ícone: 16px de alvo é frustrante no tablet. */
  margin: -6px -4px -6px 0;
  padding: 6px 4px;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }

  &:hover {
    color: ${themeCssVariables.font.color.tertiary};
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
  onArrastoInicio: () => void;
  /** Recebe o ponto onde o cartão foi solto, em coordenadas de viewport. */
  onArrastoFim: (ponto: { x: number; y: number }) => void;
};

export const LeadCard = ({
  lead,
  rotuloDeOrigem,
  rotuloDeTipo,
  isArrastando,
  onArrastoInicio,
  onArrastoFim,
}: LeadCardProps) => {
  const navigateApp = useNavigateApp();
  const controles = useDragControls();

  // O arrasto termina disparando um clique no cartão. Sem esta trava, soltar o
  // cartão numa coluna abriria o registro logo em seguida.
  const acabouDeArrastar = useRef(false);

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
      // `drag` do framer-motion em vez do arrasto nativo do HTML5. O nativo não
      // desenhava fantasma nenhum aqui: o navegador não gera a imagem de
      // arrasto quando o elemento tem `transform`, e o framer-motion aplica
      // transform em todo componente `motion`. Aqui o cartão de verdade se
      // move, o que além de resolver o sintoma funciona em toque — o arrasto
      // nativo não existe em tela de toque, e o arquiteto usa tablet em obra.
      drag
      dragControls={controles}
      dragElastic={0.12}
      // Só o pegador inicia o arrasto. Se o cartão inteiro arrastasse, rolar a
      // coluna com o dedo viraria arrasto, e o clique para abrir o registro
      // ficaria ambíguo.
      dragListener={false}
      dragMomentum={false}
      // Volta sozinho para o lugar. Quem move o cartão de coluna é o servidor
      // respondendo, não a posição em que o dedo soltou — se a gravação falha,
      // o cartão volta e conta a verdade.
      dragSnapToOrigin
      initial={{ opacity: 0, y: 6 }}
      // `layout` faz o cartão deslizar até a posição nova quando a etapa muda,
      // em vez de sumir de uma coluna e aparecer na outra.
      layout
      onClick={() => {
        if (acabouDeArrastar.current) {
          acabouDeArrastar.current = false;

          return;
        }

        navigateApp(AppPath.RecordShowPage, {
          objectNameSingular: 'opportunity',
          objectRecordId: lead.id,
        });
      }}
      onDragEnd={(_evento, info: PanInfo) => {
        acabouDeArrastar.current = true;
        onArrastoFim(info.point);
      }}
      onDragStart={onArrastoInicio}
      style={{ zIndex: isArrastando ? 50 : 1 }}
      transition={{ duration: 0.2 }}
      whileDrag={{
        boxShadow: themeCssVariables.boxShadow.strong,
        cursor: 'grabbing',
        // Inclinação de 1.5° é o detalhe que faz o cartão parecer levantado da
        // pilha em vez de deslizando no plano. Vem das referências.
        rotate: -1.5,
        scale: 1.03,
      }}
    >
      <StyledTopo>
        <StyledNome title={lead.name ?? ''}>{lead.name ?? 'Sem nome'}</StyledNome>
        <StyledPegador
          aria-label="Arrastar para outra etapa"
          onClick={(evento) => evento.stopPropagation()}
          onPointerDown={(evento) => controles.start(evento)}
          title="Arraste para mover de etapa"
        >
          <IconGripVertical size={15} />
        </StyledPegador>
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

    </StyledCard>
  );
};
