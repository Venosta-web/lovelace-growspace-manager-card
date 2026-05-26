import { Composition } from 'remotion';
import { WalkthroughComposition } from './WalkthroughComposition';
import './style.css';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WalkthroughComposition"
        component={WalkthroughComposition}
        durationInFrames={900} // 30 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
            title: "Growspace Manager",
            subtitle: "Advanced Home Assistant Card"
        }}
      />
    </>
  );
};
