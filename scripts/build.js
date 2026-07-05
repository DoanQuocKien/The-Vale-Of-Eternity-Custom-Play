import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const __dirname = path.resolve();

function runCommand(cmd) {
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  // 1. Build Vite production assets
  runCommand('npm run build');

  // 2. Pre-create the distribution directory and copy the sidecar script
  const destDir = path.join(__dirname, 'dist', 'vale-of-eternity', 'electron');
  fs.mkdirSync(destDir, { recursive: true });
  
  const srcDir = path.join(__dirname, 'electron');
  console.log(`Copying sidecar: ${srcDir} -> ${destDir}`);
  fs.cpSync(srcDir, destDir, { recursive: true, force: true });

  // 3. Build Neutralino package (which zips everything in dist/vale-of-eternity)
  const isRelease = process.argv.includes('--release');
  const neuCmd = isRelease ? 'npx neu build --release' : 'npx neu build';
  runCommand(neuCmd);

  console.log('\nBuild completed successfully!');
} catch (err) {
  console.error('Build failed:', err);
  process.exit(1);
}
