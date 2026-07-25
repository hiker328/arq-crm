import { useLocation } from 'react-router-dom';
import { IconFilter, IconLayoutDashboard } from 'twenty-ui/icon';

import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { NavigationDrawerSectionTitle } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSectionTitle';

// As duas telas próprias do ORBE no menu lateral.
//
// Por que isto vive no fork e não no manifesto da app: o item de menu do tipo
// LINK do Twenty força prefixo `https://` (ver
// `getLinkNavigationMenuItemComputedLink`), então não aceita rota interna. Os
// tipos OBJECT, VIEW e PAGE_LAYOUT apontam para telas nativas. Não existe tipo
// que aponte para uma rota do fork — daí a inserção aqui.
//
// Fica no TOPO do menu de propósito: são as duas telas por onde o arquiteto
// entra no produto. Enterrá-las abaixo da lista de objetos as transformaria em
// relatório que ninguém abre.
//
// Usa os componentes de menu do próprio Twenty em vez de estilo próprio, para
// herdar espaçamento, estados de hover/ativo e o comportamento de recolher o
// menu. Estilo paralelo aqui é a receita para o item parecer colado por fora.

export const OrbeSection = () => {
  const { pathname } = useLocation();

  return (
    <NavigationDrawerSection>
      <NavigationDrawerSectionTitle label="ORBE" />
      <NavigationDrawerItem
        Icon={IconLayoutDashboard}
        active={pathname === '/painel'}
        label="Painel"
        to="/painel"
      />
      <NavigationDrawerItem
        Icon={IconFilter}
        active={pathname === '/funil'}
        label="Funil"
        to="/funil"
      />
    </NavigationDrawerSection>
  );
};
