import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  Img,
  Video,
  Audio,
  Sequence,
  getInputProps,
} from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadRoboto } from '@remotion/google-fonts/Roboto';
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat';
import { loadFont as loadPoppins } from '@remotion/google-fonts/Poppins';
import { loadFont as loadBebasNeue } from '@remotion/google-fonts/BebasNeue';

export const DynamicComposition: React.FC = () => {
  const inputProps = getInputProps();
  const code = (inputProps as any).code as string;

  const scope = useMemo(() => {
    // Safe Image/Video component
    const SafeImg = (props: any) => {
      const src = props.src;
      if (
        typeof src === 'string' &&
        (src.includes('.mp4') || src.includes('.webm') || src.includes('.mov'))
      ) {
        return React.createElement(Video, { ...props, muted: true });
      }
      return React.createElement(Img, props);
    };

    return {
      React,
      useCurrentFrame,
      useVideoConfig,
      interpolate,
      spring,
      Easing,
      AbsoluteFill,
      Sequence,
      Audio,
      Img: SafeImg,
      Video: SafeImg,
      // All Google Fonts pre-loaded
      loadFont: loadInter,
      loadInter,
      loadRoboto,
      loadMontserrat,
      loadPoppins,
      loadBebasNeue,
    };
  }, []);

  const CompiledComponent = useMemo(() => {
    if (!code) {
      return () => (
        <AbsoluteFill style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 40,
          fontWeight: 'bold',
          fontFamily: 'sans-serif'
        }}>
          No code provided
        </AbsoluteFill>
      );
    }

    try {
      const cleanCode = code.trim();

      // Strip ALL import statements - not needed, everything provided via scope
      const codeWithoutImports = cleanCode
        .replace(/^import\s+[\s\S]*?from\s+['"][^'"]*['"];?\s*$/gm, '')
        .replace(/^import\s+['"][^'"]*['"];?\s*$/gm, '')
        .trim();

      const wrappedCode = `
        const {
          React,
          useCurrentFrame,
          useVideoConfig,
          interpolate,
          spring,
          Easing,
          AbsoluteFill,
          Sequence,
          Audio,
          Img,
          Video,
          loadFont,
          loadInter,
          loadRoboto,
          loadMontserrat,
          loadPoppins,
          loadBebasNeue,
        } = scope;

        ${codeWithoutImports}

        const componentMatch = \`${codeWithoutImports.replace(/`/g, '\\`')}\`
          .match(/(?:export\\s+default\\s+(\\w+)|const\\s+(\\w+):\\s*React\\.FC)/);

        const componentName = componentMatch
          ? (componentMatch[1] || componentMatch[2])
          : null;

        if (componentName) {
          try { return eval(componentName); } catch (e) {
            console.error("eval failed:", e);
          }
        }

        return () => React.createElement(
          AbsoluteFill,
          {
            style: {
              background: '#111',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontFamily: 'sans-serif'
            }
          },
          'Component not found'
        );
      `;

      const compiledFunc = new Function('scope', wrappedCode);
      return compiledFunc(scope);

    } catch (e: any) {
      console.error("Compilation Error:", e);
      return () => (
        <AbsoluteFill style={{
          background: '#1a1a1a',
          color: '#ff6b6b',
          padding: 40,
          fontFamily: 'monospace',
          fontSize: 18,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div>
            <h2 style={{ marginBottom: 20 }}>⚠️ Compilation Error</h2>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14, opacity: 0.8 }}>
              {e.message}
            </pre>
          </div>
        </AbsoluteFill>
      );
    }
  }, [code, scope]);

  return <CompiledComponent />;
};