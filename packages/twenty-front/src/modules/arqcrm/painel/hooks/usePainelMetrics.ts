import { type RecordGqlFieldsAggregate } from '@/object-record/graphql/types/RecordGqlFieldsAggregate';
import { useAggregateRecords } from '@/object-record/hooks/useAggregateRecords';
import { type RecordGqlOperationFilter } from 'twenty-shared/types';
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
//
// ⚠️ As constantes abaixo estão FORA do componente por necessidade, não por
// estilo. `useAggregateRecordsQuery` memoiza o documento GraphQL usando o
// objeto `recordGqlFieldsAggregate` como dependência: passar um literal inline
// cria uma referência nova a cada render, o Apollo recebe uma query nova toda
// vez, e o resultado nunca assenta — todo número fica zerado para sempre. Foi
// exatamente esse o bug que zerou o painel inteiro na primeira subida.

const CONTAGEM: RecordGqlFieldsAggregate = { id: ['count'] };
const CONTAGEM_E_CONTRATADO: RecordGqlFieldsAggregate = {
  id: ['count'],
  valorContratado: ['sum'],
};
const SOMA_RECEBIDO: RecordGqlFieldsAggregate = { valorRecebido: ['sum'] };
const SOMA_VALOR: RecordGqlFieldsAggregate = { valor: ['sum'] };
const CONTAGEM_E_VALOR: RecordGqlFieldsAggregate = { id: ['count'], valor: ['sum'] };

const FILTRO_ENVIADA: RecordGqlOperationFilter = { enviadaEm: { is: 'NOT_NULL' } };
const FILTRO_APROVADA: RecordGqlOperationFilter = { status: { eq: 'APROVADA' } };
const FILTRO_EM_ANDAMENTO: RecordGqlOperationFilter = { status: { eq: 'EM_ANDAMENTO' } };
const FILTRO_RECEBIDA: RecordGqlOperationFilter = { status: { eq: 'RECEBIDA' } };
const FILTRO_VENCIDA: RecordGqlOperationFilter = { status: { eq: 'VENCIDA' } };
const FILTRO_EM_ABERTO: RecordGqlOperationFilter = {
  status: { in: ['PREVISTA', 'A_VENCER', 'VENCIDA'] },
};

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
    recordGqlFieldsAggregate: CONTAGEM,
  });

  const propostas = useAggregateRecords<AggregateShape>({
    objectNameSingular: 'proposta',
    recordGqlFieldsAggregate: CONTAGEM,
  });

  const propostasEnviadas = useAggregateRecords<AggregateShape>({
    filter: FILTRO_ENVIADA,
    objectNameSingular: 'proposta',
    recordGqlFieldsAggregate: CONTAGEM,
  });

  const propostasAprovadas = useAggregateRecords<AggregateShape>({
    filter: FILTRO_APROVADA,
    objectNameSingular: 'proposta',
    recordGqlFieldsAggregate: CONTAGEM,
  });

  const projetos = useAggregateRecords<AggregateShape>({
    objectNameSingular: 'projeto',
    recordGqlFieldsAggregate: CONTAGEM_E_CONTRATADO,
  });

  const projetosEmAndamento = useAggregateRecords<AggregateShape>({
    filter: FILTRO_EM_ANDAMENTO,
    objectNameSingular: 'projeto',
    recordGqlFieldsAggregate: CONTAGEM,
  });

  const recebido = useAggregateRecords<AggregateShape>({
    filter: FILTRO_RECEBIDA,
    objectNameSingular: 'parcela',
    recordGqlFieldsAggregate: SOMA_RECEBIDO,
  });

  const emAberto = useAggregateRecords<AggregateShape>({
    filter: FILTRO_EM_ABERTO,
    objectNameSingular: 'parcela',
    recordGqlFieldsAggregate: SOMA_VALOR,
  });

  const vencidas = useAggregateRecords<AggregateShape>({
    filter: FILTRO_VENCIDA,
    objectNameSingular: 'parcela',
    recordGqlFieldsAggregate: CONTAGEM_E_VALOR,
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
