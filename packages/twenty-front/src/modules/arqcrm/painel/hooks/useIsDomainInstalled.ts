import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';

// Guarda de existência dos objetos do domínio.
//
// Precisa ser um hook separado, chamado por um componente que decide se monta
// o filho, porque `useObjectMetadataItem` — usado por dentro de
// `useAggregateRecords` e `useFindManyRecords` — LANÇA quando o objeto não
// existe no workspace. Passar `skip: true` não impede: o lançamento acontece
// antes de a opção ser lida.
//
// Na prática: num workspace sem a app instalada, chamar os hooks de dado dentro
// do mesmo componente que faz a verificação derrubaria a página inteira com um
// erro de metadado. A verificação tem que estar num componente PAI.

const OBJETOS_NECESSARIOS = ['proposta', 'projeto', 'parcela'] as const;

export const useIsDomainInstalled = (): boolean => {
  const { objectMetadataItems } = useObjectMetadataItems();

  return OBJETOS_NECESSARIOS.every((nome) =>
    objectMetadataItems.some((item) => item.nameSingular === nome),
  );
};
