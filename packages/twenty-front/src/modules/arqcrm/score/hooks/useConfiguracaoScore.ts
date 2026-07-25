import { useCallback, useMemo } from 'react';
import { type RecordGqlOperationGqlRecordFields } from 'twenty-shared/types';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';

// SCORE-05: os pesos que o escritório pode ajustar.
//
// Espelha a validação do servidor de propósito. O `arqcrm/src/domain/
// configuracao-score.ts` faz a mesma queda para o padrão do lado de lá — se só
// o servidor validasse, a tela deixaria salvar um valor que depois seria
// silenciosamente ignorado, e o arquiteto veria o score não mudar sem entender
// por quê. Validar nos dois lados é o que faz a tela contar a verdade.
//
// O que NÃO é duplicado é a fonte dos pesos padrão: eles vivem só no pacote da
// app. Aqui a tela lê o que está gravado no workspace, que o post-install já
// semeou com o padrão.

const CAMPOS: RecordGqlOperationGqlRecordFields = {
  areaGrandeM2: true,
  faixaA: true,
  faixaB: true,
  faixaC: true,
  id: true,
  isAtiva: true,
  nome: true,
  observacoes: true,
  orcamentoAcimaDaMedia: true,
  pesos: true,
};

const MICROS_POR_UNIDADE = 1_000_000;

// A ordem e os rótulos são a tela. Os pesos são hipótese, e o arquiteto só
// consegue discordar de um número se souber a que frase ele corresponde — a
// mesma frase que aparece no painel de fatores do lead.
export const FATORES_POSITIVOS = [
  { chave: 'decisorPresente', label: 'Quem decide está na conversa' },
  { chave: 'orcamentoDeclarado', label: 'Declarou um orçamento' },
  { chave: 'temTerreno', label: 'Já tem o terreno' },
  { chave: 'origemIndicacao', label: 'Veio por indicação' },
  { chave: 'temLevantamento', label: 'Levantamento já feito' },
  { chave: 'orcamentoAcimaDaMedia', label: 'Orçamento acima da média' },
  { chave: 'areaInformada', label: 'Informou a área' },
  { chave: 'contatoRecente', label: 'Contato nos últimos dias' },
  { chave: 'areaGrande', label: 'Projeto de porte' },
  { chave: 'tipoProjetoInformado', label: 'Tipo de projeto definido' },
  { chave: 'prazoDefinido', label: 'Prazo desejado definido' },
] as const;

export const FATORES_NEGATIVOS = [
  { chave: 'penalidadeSemContato', label: 'Sem contato há muito tempo' },
  { chave: 'penalidadeSemOrcamento', label: 'Não quis informar orçamento' },
  { chave: 'penalidadePrazoVencido', label: 'Prazo desejado já passou' },
  { chave: 'penalidadeOutroArquiteto', label: 'Já falou com outro arquiteto' },
] as const;

export type Pesos = Record<string, number>;

export type ConfiguracaoScore = {
  id: string;
  nome: string | null;
  pesos: Pesos;
  faixaA: number;
  faixaB: number;
  faixaC: number;
  areaGrandeM2: number;
  orcamentoAcimaDaMediaReais: number;
  observacoes: string | null;
};

type RegistroBruto = {
  id: string;
  nome: string | null;
  pesos: unknown;
  faixaA: number | null;
  faixaB: number | null;
  faixaC: number | null;
  areaGrandeM2: number | null;
  observacoes: string | null;
  orcamentoAcimaDaMedia: { amountMicros?: number | string | null } | null;
};

const numero = (valor: unknown, padrao: number): number => {
  const convertido = typeof valor === 'string' ? Number(valor) : valor;

  return typeof convertido === 'number' && Number.isFinite(convertido)
    ? convertido
    : padrao;
};

const lerPesos = (valor: unknown): Pesos => {
  const bruto =
    typeof valor === 'string'
      ? ((): unknown => {
          try {
            return JSON.parse(valor);
          } catch {
            return null;
          }
        })()
      : valor;

  if (typeof bruto !== 'object' || bruto === null) return {};

  const registro = bruto as Record<string, unknown>;
  const pesos: Pesos = {};

  for (const { chave } of [...FATORES_POSITIVOS, ...FATORES_NEGATIVOS]) {
    pesos[chave] = numero(registro[chave], 0);
  }

  return pesos;
};

export const somaDosPositivos = (pesos: Pesos): number =>
  FATORES_POSITIVOS.reduce((soma, fator) => soma + (pesos[fator.chave] ?? 0), 0);

// As faixas têm que ser estritamente decrescentes: com A menor ou igual a B,
// a grade B nunca é alcançada e some da carteira sem aviso.
export const faixasValidas = (a: number, b: number, c: number): boolean =>
  a > b && b > c && c >= 0 && a <= 100;

export type UsoDaConfiguracao = {
  isLoading: boolean;
  configuracao: ConfiguracaoScore | null;
  salvar: (mudancas: Partial<ConfiguracaoScore>) => Promise<void>;
};

export const useConfiguracaoScore = (): UsoDaConfiguracao => {
  const { records, loading } = useFindManyRecords<RegistroBruto>({
    filter: { isAtiva: { eq: true } },
    limit: 1,
    objectNameSingular: 'configuracaoScore',
    recordGqlFields: CAMPOS,
  });

  const { updateOneRecord } = useUpdateOneRecord();

  const configuracao = useMemo((): ConfiguracaoScore | null => {
    const registro = records[0];

    if (!registro) return null;

    return {
      areaGrandeM2: numero(registro.areaGrandeM2, 250),
      faixaA: numero(registro.faixaA, 75),
      faixaB: numero(registro.faixaB, 55),
      faixaC: numero(registro.faixaC, 35),
      id: registro.id,
      nome: registro.nome,
      observacoes: registro.observacoes,
      orcamentoAcimaDaMediaReais:
        numero(registro.orcamentoAcimaDaMedia?.amountMicros, 150_000 * MICROS_POR_UNIDADE) /
        MICROS_POR_UNIDADE,
      pesos: lerPesos(registro.pesos),
    };
  }, [records]);

  const salvar = useCallback(
    async (mudancas: Partial<ConfiguracaoScore>) => {
      if (configuracao === null) return;

      const dados: Record<string, unknown> = {};

      if (mudancas.pesos !== undefined) dados.pesos = mudancas.pesos;
      if (mudancas.faixaA !== undefined) dados.faixaA = mudancas.faixaA;
      if (mudancas.faixaB !== undefined) dados.faixaB = mudancas.faixaB;
      if (mudancas.faixaC !== undefined) dados.faixaC = mudancas.faixaC;
      if (mudancas.areaGrandeM2 !== undefined) {
        dados.areaGrandeM2 = mudancas.areaGrandeM2;
      }
      if (mudancas.orcamentoAcimaDaMediaReais !== undefined) {
        dados.orcamentoAcimaDaMedia = {
          amountMicros: Math.round(
            mudancas.orcamentoAcimaDaMediaReais * MICROS_POR_UNIDADE,
          ),
          currencyCode: 'BRL',
        };
      }

      await updateOneRecord({
        idToUpdate: configuracao.id,
        objectNameSingular: 'configuracaoScore',
        updateOneRecordInput: dados,
      });
    },
    [configuracao, updateOneRecord],
  );

  return { configuracao, isLoading: loading, salvar };
};
