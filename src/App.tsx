import { useCallback, useEffect, useState } from 'react';
import { Layout, NAV, type Screen } from './components/Layout';
import { HomeScreen } from './screens/HomeScreen';
import { CollectionScreen } from './screens/CollectionScreen';
import { CreateScreen } from './screens/CreateScreen';
import { BattleScreen } from './screens/BattleScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ShopScreen } from './screens/ShopScreen';
import { GuideScreen } from './screens/GuideScreen';

/** Hash routes look like  #/shop?m=<monster uid>  */
const readHash = (): { screen: Screen; param?: string } => {
  const [path, query] = window.location.hash.replace(/^#\/?/, '').split('?');
  const screen = (NAV.some((n) => n.id === path) ? path : 'home') as Screen;
  const param = new URLSearchParams(query ?? '').get('m') ?? undefined;
  return { screen, param };
};

export default function App() {
  const [route, setRoute] = useState(readHash);

  useEffect(() => {
    const onHash = () => {
      setRoute(readHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((s: Screen) => {
    if (window.location.hash !== `#/${s}`) window.location.hash = `/${s}`;
    setRoute({ screen: s });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const { screen, param } = route;
  return (
    <Layout screen={screen} go={go}>
      {screen === 'home' && <HomeScreen go={go} />}
      {screen === 'collection' && <CollectionScreen go={go} />}
      {screen === 'create' && <CreateScreen go={go} />}
      {screen === 'battle' && <BattleScreen go={go} />}
      {screen === 'shop' && <ShopScreen go={go} param={param} />}
      {screen === 'profile' && <ProfileScreen go={go} />}
      {screen === 'guide' && <GuideScreen go={go} />}
    </Layout>
  );
}
