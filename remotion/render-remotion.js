#!/usr/bin/env node

/**
 * Ploton - Real Remotion Renderer
 * Uses @remotion/bundler + @remotion/renderer (proper Node.js API)
 * 
 * Usage: node render-remotion.js <tsx-file> <output-path> <duration> <fps> <width> <height>
 */

const { bundle } = require('@remotion/bundler');
const { renderMedia, getCompositions } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs');

// Parse args from backend
const args = process.argv.slice(2);
if (args.length < 6) {
  console.error('Usage: node render-remotion.js <tsx-file> <output-path> <duration> <fps> <width> <height>');
  process.exit(1);
}

const [tsxFilePath, outputPath, durationSec, fps, width, height] = args;
const durationInFrames = parseInt(durationSec) * parseInt(fps);

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Temp dir for entry point
const TEMP_DIR = path.join(__dirname, '.ploton-temp');

function extractComponentName(content) {
  // Try: export default ComponentName
  let match = content.match(/export\s+default\s+(\w+)/);
  if (match) return match[1];

  // Try: const ComponentName: React.FC
  match = content.match(/const\s+(\w+)\s*:\s*React\.FC/);
  if (match) return match[1];

  // Try: export const ComponentName
  match = content.match(/export\s+const\s+(\w+)\s*[=:]/);
  if (match) return match[1];

  // Fallback
  return 'UserComponent';
}

function cleanCode(content) {
  // Remove compositionConfig - we handle this ourselves
  content = content.replace(
    /export\s+const\s+compositionConfig\s*=\s*\{[\s\S]*?\}\s*;?\s*/g,
    ''
  );
  return content.trim();
}

function createEntryPoint(tsxAbsPath, componentName) {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const entryPath = path.join(TEMP_DIR, 'index.tsx');

  // Use forward slashes for import path (works on Windows too)
  const importPath = tsxAbsPath.replace(/\\/g, '/');

  const entry = `
import React from 'react';
import { Composition, registerRoot } from 'remotion';
import * as UserModule from '${importPath}';

// Handle both default and named exports
const Component = UserModule.default || UserModule.${componentName} || Object.values(UserModule)[0];

const Root: React.FC = () => {
  return (
    <Composition
      id="UserVideo"
      component={Component}
      durationInFrames={${durationInFrames}}
      fps={${parseInt(fps)}}
      width={${parseInt(width)}}
      height={${parseInt(height)}}
    />
  );
};

registerRoot(Root);
`;

  fs.writeFileSync(entryPath, entry, 'utf-8');
  return entryPath;
}

function cleanup() {
  try {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  } catch (e) {
    // ignore
  }
}

async function render() {
  console.log('\n🎬 PLOTON RENDER STARTING');
  console.log(`   File:     ${tsxFilePath}`);
  console.log(`   Output:   ${outputPath}`);
  console.log(`   Duration: ${durationSec}s (${durationInFrames} frames)`);
  console.log(`   Size:     ${width}x${height}`);

  try {
    // 1. Read and clean user code
    let code = fs.readFileSync(tsxFilePath, 'utf-8');
    code = cleanCode(code);
    
    // Write cleaned code back
    const cleanedPath = path.join(TEMP_DIR.replace('.ploton-temp', ''), 
      '.ploton-temp', 'UserComponent.tsx');
    if (!fs.existsSync(path.dirname(cleanedPath))) {
      fs.mkdirSync(path.dirname(cleanedPath), { recursive: true });
    }
    fs.writeFileSync(cleanedPath, code, 'utf-8');

    // 2. Extract component name
    const componentName = extractComponentName(code);
    console.log(`\n   Component: ${componentName}`);

    // 3. Create entry point
    const entryPath = createEntryPoint(
      path.resolve(cleanedPath),
      componentName
    );
    console.log(`   ✅ Entry point created`);

    // 4. Bundle!
    console.log('\n📦 Bundling...');
    const bundleLocation = await bundle({
      entryPoint: entryPath,
      webpackOverride: (config) => config,
    });
    console.log(`   ✅ Bundled!`);

    // 5. Get compositions
    console.log('\n🔍 Reading composition...');
    const compositions = await getCompositions(bundleLocation, {
      inputProps: {},
    });

    if (compositions.length === 0) {
      throw new Error('No compositions found! Check your component exports.');
    }

    const composition = compositions.find(c => c.id === 'UserVideo') || compositions[0];
    console.log(`   ✅ Composition: "${composition.id}"`);
    console.log(`   Duration: ${composition.durationInFrames} frames @ ${composition.fps}fps`);

    // 6. RENDER!
    console.log('\n🎥 Rendering frames...');
    
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: {},
      crf: 18,
      pixelFormat: 'yuv420p',
      onProgress: ({ progress, renderedFrames }) => {
        const percent = (progress * 100).toFixed(1);
        process.stdout.write(
          `\r   ⏳ ${percent}% | Frame ${renderedFrames}/${composition.durationInFrames}`
        );
      },
    });

    const fileSize = fs.statSync(outputPath).size;
    console.log(`\n\n✅ RENDER COMPLETE!`);
    console.log(`   File: ${outputPath}`);
    console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    // Output JSON result for backend to parse
    console.log('\nRESULT_JSON:' + JSON.stringify({
      success: true,
      outputPath,
      fileSizeMb: parseFloat((fileSize / 1024 / 1024).toFixed(2)),
      durationInFrames: composition.durationInFrames,
      fps: composition.fps,
      width: composition.width,
      height: composition.height,
    }));

  } catch (err) {
    console.error('\n❌ RENDER FAILED!');
    console.error(err.message);
    
    console.log('\nRESULT_JSON:' + JSON.stringify({
      success: false,
      error: err.message,
    }));
    
    process.exit(1);
  } finally {
    cleanup();
  }
}

render();