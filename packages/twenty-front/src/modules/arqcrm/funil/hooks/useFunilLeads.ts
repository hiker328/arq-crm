import { useCallback, useMemo } from 'react';
import { type RecordGqlOperationGqlRecordFields } from 'twenty-shared/types';

import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';

// Dados do quadro do funil.
//
// As COLUNAS vêm do metadado, não de uma lista em código: são as opções do
// campo SELECT `stage` do `opportunity`. O escritório renomeia, reordena ou
// acrescenta uma etapa nas configurações e o quadro acompanha, sem deploy. Uma
// lista fixa aqui quebraria no primeiro escritório que chama "Visita técnica"
// o que outro chama "Reunião".
//
// Constante de módulo pela mesma razão do painel: o objeto de campos é
// dependência do memo que monta o documento GraphQL, e literal inline remonta
// a query a cada render.

const CAMPOS_LEAD: RecordGqlOperationGqlRecordFields = {
  amount: true,
  areaM2: true,
  company: { id: true, name: true },
  id: true,
  leadGrade: true,
  leadScore: true,
  name: true,
  origem: true,
  pointOfContact: { id: true, name: true },
  proximaAcao: true,
  proximaAcaoEm: true,
  stage: true,
  tipoProjeto: true,
  ultimoContatoEm: true,
};

export type LeadDoFunil = {
  __typename: string;
  id: string;
  name: string | null;
  stage: string | null;
  origem: string | null;
  tipoProjeto: string | null;
  areaM2: number | null;
  leadScore: number | null;
  leadGrade: string | null;
  proximaAcao: string | null;
  proximaAcaoEm: string | null;
  ultimoContatoEm: string | null;
  amount: { amountMicros?: number | string | null } | null;
  pointOfContact: { id: string; name: { firstName?: string | null; lastName?: string | null } } | null;
  company: { id: string; name: string | null } | null;
};

export type ColunaDoFunil = {
  value: string;
  label: string;
  color: string;
  leads: LeadDoFunil[];
};

export type FunilLeads = {
  isLoading: boolean;
  colunas: ColunaDoFunil[];
  /** Rótulos de origem e tipo, do metadado, para o cartão não mostrar 'INDICACAO'. */
  rotuloDeOrigem: (valor: string | null) => string | null;
  rotuloDeTipo: (valor: string | null) => string | null;
  moverLead: (leadId: string, paraEtapa: string) => Promise<void>;
};

type OpcaoSelect = { value: string; label: string; color: string; position: number };

const opcoesDoCampo = (
  campos: { name: string; options?: unknown }[] | undefined,
  nome: string,
): OpcaoSelect[] => {
  const opcoes = campos?.find((campo) => campo.name === nome)?.options;

  if (!Array.isArray(opcoes)) return [];

  return (opcoes as OpcaoSelect[])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
};

export const useFunilLeads = (): FunilLeads => {
  const { objectMetadataItems } = useObjectMetadataItems();
  const { updateOneRecord } = useUpdateOneRecord();

  const campos = objectMetadataItems.find(
    (item) => item.nameSingular === 'opportunity',
  )?.fields;

  const etapas = useMemo(() => opcoesDoCampo(campos, 'stage'), [campos]);
  const origens = useMemo(() => opcoesDoCampo(campos, 'origem'), [campos]);
  const tipos = useMemo(() => opcoesDoCampo(campos, 'tipoProjeto'), [campos]);

  const { records, loading } = useFindManyRecords<LeadDoFunil>({
    limit: 200,
    objectNameSingular: 'opportunity',
    recordGqlFields: CAMPOS_LEAD,
  });

  const colunas = useMemo(() => {
    const porEtapa = new Map<string, LeadDoFunil[]>(
      etapas.map((etapa) => [etapa.value, []]),
    );

    for (const lead of records) {
      // Lead com etapa nula ou com um valor que saiu do metadado cai na
      // primeira coluna em vez de sumir. Registro invisível é pior que
      // registro no lugar errado — ninguém procura o que não sabe que existe.
      const destino = porEtapa.has(lead.stage ?? '')
        ? (lead.stage as string)
        : etapas[0]?.value;

      if (destino !== undefined) {
        porEtapa.get(destino)?.push(lead);
      }
    }

    return etapas.map((etapa) => ({
      color: etapa.color,
      label: etapa.label,
      leads: porEtapa.get(etapa.value) ?? [],
      value: etapa.value,
    }));
  }, [etapas, records]);

  const rotulo = useCallback(
    (opcoes: OpcaoSelect[]) => (valor: string | null) =>
      valor === null
        ? null
        : (opcoes.find((opcao) => opcao.value === valor)?.label ?? valor),
    [],
  );

  const moverLead = useCallback(
    async (leadId: string, paraEtapa: string) => {
      await updateOneRecord({
        idToUpdate: leadId,
        objectNameSingular: 'opportunity',
        // Move o cartão na hora e reconcilia depois. Sem isto o cartão volta
        // para a coluna de origem por um instante e a interface parece ter
        // recusado o arrasto.
        optimisticRecord: { stage: paraEtapa },
        updateOneRecordInput: { stage: paraEtapa },
      });
    },
    [updateOneRecord],
  );

  return {
    colunas,
    isLoading: loading,
    moverLead,
    rotuloDeOrigem: rotulo(origens),
    rotuloDeTipo: rotulo(tipos),
  };
};
