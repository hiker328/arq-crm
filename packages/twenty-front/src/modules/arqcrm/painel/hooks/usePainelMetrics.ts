import { useAggregateRecords } from '@/object-record/hooks/useAggregateRecords';
import { type FunnelStage } from '@/arqcrm/funnel/utils/funnelSegmentPath';

// Métricas agregadas do painel.
//
// O funil aqui atravessa TRÊS objetos (lead → proposta → projeto), não os
// estágios do `opportunity`. Isso é deliberado: o estágio do opportunity conta
// onde a negociação está, mas a pergunta do escritório é outra — "de cada dez
// propostas que eu envio, quantas viram projeto?". Só um funil que cruza os três
// objetos responde isso.
//
// Cada etapa é uma agregação de COUNT separada em vez de um groupBy. São
// consultas pequenas e independentes, e o custo de contagens indexadas é
// irrelevante contra a legibilidade de cada número ter uma origem explícita.
//
// Todas passam pelo `useAggregateRecords`, que usa o runner permission-aware do
// Twenty. Nunca montar SQL de agregação à mão: a pior vulnerabilidade já
// encontrada nesta base (CVSS 9.9) nasceu exatamente aí.
//
// ⚠️ Este hook só pode ser montado quando a Application de domínio existe no
// workspace. `useAggregateRecords` chama `useObjectMetadataItem`, que LANÇA
// quando o objeto não existe — e `skip` NÃO evita o lançamento, porque ele
// acontece antes. Quem garante a condição é o componente pai; ver
// `useIsDomainInstalled` e `PainelPage`.

type AggregateShape = { [field: string]: { [op: string]: number | undefined } };

const contarComo = (data: AggregateShape | undefined, campo: string): number =>
  Number(data?.[campo]?.count ?? 0);

const somarComo = (data: AggregateShape | undefined, campo: string): number =>
  Number(data?.[campo]?.sum ?? 0);

export type PainelMetrics = {
  isLoading: boolean;
  funnel: FunnelStage[];
  receitaContratada: number;
  receitaRecebida: number;
  receitaEmAberto: number;
  receitaVencida: number;
  projetosAtivos: number;
  parcelasVencidas: number;
};

export const usePainelMetrics = (): PainelMetrics => {
  const leads = useAggregateRecords<AggregateShape>({
    objectNameSingular: 'opportunity',
    recordGqlFieldsAggregate: { id: ['count'] },
  });

  const propostas = useAggregateRecords<AggregateShape>({
    objectNameSingular: 'proposta',
    recordGqlFieldsAggregate: { id: ['count'] },
  });

  const propostasEnviadas = useAggregateRecords<AggregateShape>({
    filter: { enviadaEm: { is: 'NOT_NULL' } },
    objectNameSingular: 'proposta',
    recordGqlFieldsAggregate: { id: ['count'] },
  });

  const propostasAprovadas = useAggregateRecords<AggregateShape>({
    filter: { status: { eq: 'APROVADA' } },
    objectNameSingular: 'proposta',
    recordGqlFieldsAggregate: { id: ['count'] },
  });

  const projetos = useAggregateRecords<AggregateShape>({
    objectNameSingular: 'projeto',
    recordGqlFieldsAggregate: { id: ['count'], valorContratado: ['sum'] },
  });

  const projetosEmAndamento = useAggregateRecords<AggregateShape>({
    filter: { status: { eq: 'EM_ANDAMENTO' } },
    objectNameSingular: 'projeto',
    recordGqlFieldsAggregate: { id: ['count'] },
  });

  const recebido = useAggregateRecords<AggregateShape>({
    filter: { status: { eq: 'RECEBIDA' } },
    objectNameSingular: 'parcela',
    recordGqlFieldsAggregate: { valorRecebido: ['sum'] },
  });

  const emAberto = useAggregateRecords<AggregateShape>({
    filter: { status: { in: ['PREVISTA', 'A_VENCER', 'VENCIDA'] } },
    objectNameSingular: 'parcela',
    recordGqlFieldsAggregate: { valor: ['sum'] },
  });

  const vencidas = useAggregateRecords<AggregateShape>({
    filter: { status: { eq: 'VENCIDA' } },
    objectNameSingular: 'parcela',
    recordGqlFieldsAggregate: { id: ['count'], valor: ['sum'] },
  });

  const isLoading = [
    leads,
    propostas,
    propostasEnviadas,
    propostasAprovadas,
    projetos,
    projetosEmAndamento,
    recebido,
    emAberto,
    vencidas,
  ].some((query) => query.loading);

  return {
    funnel: [
      { label: 'Leads', value: contarComo(leads.data, 'id') },
      { label: 'Propostas', value: contarComo(propostas.data, 'id') },
      { label: 'Enviadas', value: contarComo(propostasEnviadas.data, 'id') },
      { label: 'Aprovadas', value: contarComo(propostasAprovadas.data, 'id') },
      { label: 'Projetos', value: contarComo(projetos.data, 'id') },
    ],
    isLoading,
    parcelasVencidas: contarComo(vencidas.data, 'id'),
    projetosAtivos: contarComo(projetosEmAndamento.data, 'id'),
    receitaContratada: somarComo(projetos.data, 'valorContratado'),
    receitaEmAberto: somarComo(emAberto.data, 'valor'),
    receitaRecebida: somarComo(recebido.data, 'valorRecebido'),
    receitaVencida: somarComo(vencidas.data, 'valor'),
  };
};
