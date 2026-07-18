import { Composition } from "remotion";
import { Reel189, REEL_DURATION_IN_FRAMES, FPS } from "./Reel189";
import { Cover, coverDefaults } from "./Cover";
import { CommReel01, REEL_DURATION_IN_FRAMES as COMM01_FRAMES, FPS as COMM_FPS } from "./CommReel01";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Reel189"
        component={Reel189}
        durationInFrames={REEL_DURATION_IN_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="CommReel01"
        component={CommReel01}
        durationInFrames={COMM01_FRAMES}
        fps={COMM_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="Cover"
        component={Cover}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={coverDefaults}
      />
    </>
  );
};
