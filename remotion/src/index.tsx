// @ts-nocheck
import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { MakeCleanAnimation } from './UserComponent';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="UserVideo"
      component={MakeCleanAnimation}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};

registerRoot(RemotionRoot);
