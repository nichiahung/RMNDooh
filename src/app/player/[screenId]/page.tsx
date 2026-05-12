import { WebPlayerPage } from '@/components/player/WebPlayerPage';
import { mockScreens } from '@/data/mockScreens';

export const metadata = {
  title: 'DOOH Web Player',
  description: 'DOOH Screen Playback Simulator',
};

// Required for static export — pre-generate all known screen routes
export function generateStaticParams() {
  return mockScreens.map(screen => ({ screenId: screen.screenId }));
}

interface Props {
  params: Promise<{
    screenId: string;
  }>;
}

export default async function PlayerPage({ params }: Props) {
  const { screenId } = await params;
  return <WebPlayerPage screenId={screenId} />;
}
