import { type RecordGqlFieldsAggregate } from '@/object-record/graphql/types/RecordGqlFieldsAggregate';
import { useAggregateRecords } from '@/object-record/hooks/useAggregateRecords';
import { type RecordGqlOperationFilter } from 'twenty-shared/types';
import { AggregateOperations } from '~/generated-metadata/graphql';

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
// ⚠️ Duas armadilhas já pagas aqui, as duas silenciosas:
//
// 1. As operações são o ENUM `AggregateOperations`, em maiúsculas. Escrever
//    'count' em vez de AggregateOperations.COUNT não dá erro: o construtor da
//    query procura a operação no mapa de agregações disponíveis, não encontra,
//    e simplesmente PULA o campo. A query sai sem campo nenhum, o Apollo nem
//    chega a mandar requisição, e todo número aparece zerado. Foi isso que
//    zerou o painel inteiro. Usar o enum torna o erro impossível.
//
// 2. As constantes estão fora do componente por necessidade, não por estilo.
//    `useAggregateRecordsQuery` memoiza o documento GraphQL usando o objeto
//    `recordGqlFieldsAggregate` como dependência: um literal inline cria
//    referência nova a cada render e o Apollo remonta a query sem parar.

const CONTAGEM: RecordGqlFieldsAggregate = { id: [AggregateOperations.COUNT] };
const CONTAGEM_E_CONTRATADO: RecordGqlFieldsAggregate = {
  valorContratado: [AggregateOperations.SUM],
};
const SOMA_RECEBIDO: RecordGqlFieldsAggregate = { valorRecebido: [AggregateOperations.SUM] };
const SOMA_VALOR: RecordGqlFieldsAggregate = { valor: [AggregateOperations.SUM] };
const CONTAGEM_E_VALOR: RecordGqlFieldsAggregate = {
  id: [AggregateOperations.COUNT],
  valor: [AggregateOperations.SUM],
};

const FILTRO_EM_ANDAMENTO: RecordGqlOperationFilter = { status: { eq: 'EM_ANDAMENTO' } };
const FILTRO_RECEBIDA: RecordGqlOperationFilter = { status: { eq: 'RECEBIDA' } };
const FILTRO_VENCIDA: RecordGqlOperationFilter = { status: { eq: 'VENCIDA' } };
const FILTRO_EM_ABERTO: RecordGqlOperationFilter = {
  status: { in: ['PREVISTA', 'A_VENCER', 'VENCIDA'] },
};

type AggregateShape = { [field: string]: { [op: string]: number | undefined } };

const contarComo = (data: AggregateShape | undefined, campo: string): number =>
  Number(data?.[campo]?.[AggregateOperations.COUNT] ?? 0);

const somarComo = (data: AggregateShape | undefined, campo: string): number =>
  Number(data?.[campo]?.[AggregateOperations.SUM] ?? 0);

export type PainelMetrics = {
  isLoading: boolean;
  receitaContratada: number;
  receitaRecebida: number;
  receitaEmAberto: number;
  receitaVencida: number;
  projetosAtivos: number;
  parcelasVencidas: number;
};

export const usePainelMetrics = (): PainelMetrics => {
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
    projetos,
    projetosEmAndamento,
    recebido,
    emAberto,
    vencidas,
  ].some((query) => query.loading);

  return {
    isLoading,
    parcelasVencidas: contarComo(vencidas.data, 'id'),
    projetosAtivos: contarComo(projetosEmAndamento.data, 'id'),
    receitaContratada: somarComo(projetos.data, 'valorContratado'),
    receitaEmAberto: somarComo(emAberto.data, 'valor'),
    receitaRecebida: somarComo(recebido.data, 'valorRecebido'),
    receitaVencida: somarComo(vencidas.data, 'valor'),
  };
};
