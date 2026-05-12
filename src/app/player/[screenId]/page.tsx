import { WebPlayerPage } from '@/components/player/WebPlayerPage';

export const metadata = {
  title: 'DOOH Web Player',
  description: 'DOOH Screen Playback Simulator',
};

interface Props {
  params: {
    screenId: string;
  };
}

export default function PlayerPage({ params }: Props) {
  return <WebPlayerPage screenId={params.screenId} />;
}
