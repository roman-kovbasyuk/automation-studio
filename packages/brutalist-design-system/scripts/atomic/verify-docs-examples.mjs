import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { toPublicSource } from '../../src/atomic/screens/docs/sourceFormatting.ts'

// A temporary public-package consumer, with existing dependencies to make this check offline.
// The separate verify-consumer command verifies fresh dependency installation from a tarball.
const root = resolve(import.meta.dirname, '../..')
const fixture = mkdtempSync(join(tmpdir(), 'basics-docs-examples-'))
try {
  mkdirSync(join(fixture, 'node_modules'))
  symlinkSync(join(root, 'dist-atomic-library'), join(fixture, 'node_modules/brutalist-design-system'))
  for (const name of ['react', 'react-dom', '@types']) symlinkSync(join(root, 'node_modules', name), join(fixture, 'node_modules', name))
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({type:'module'}))
  const directory = join(root, 'src/atomic/screens/docs/examples')
  const files = readdirSync(directory).filter(file => file.endsWith('.tsx'))
  if (files.length !== 8) throw new Error(`Expected all eight Basics modules, received ${files.length}`)
  for (const file of files) writeFileSync(join(fixture, file), toPublicSource(readFileSync(join(directory, file), 'utf8')))
  writeFileSync(join(fixture, 'tsconfig.json'), JSON.stringify({compilerOptions:{strict:true,jsx:'react-jsx',module:'ESNext',moduleResolution:'bundler',target:'ES2022',noEmit:true,skipLibCheck:true},include:['*.tsx']}))
  execFileSync('npm', ['exec', '--', 'tsc', '-p', join(fixture,'tsconfig.json')], {cwd:root,stdio:'inherit'})
  writeFileSync(join(fixture, 'index.html'), '<div id="root"></div><script type="module" src="/main.tsx"></script>')
  const modules = files.map((file,i) => `import * as example${i} from './${file}'`).join('\n')
  const allExports = files.map((_,i) => `...Object.values(example${i})`).join(',')
  writeFileSync(join(fixture, 'main.tsx'), `import { createElement } from 'react'\nimport { createRoot } from 'react-dom/client'\n${modules}\ncreateRoot(document.getElementById('root')!).render(<>{[${allExports}].map((Example,i)=>createElement(Example,{key:i}))}</>)`)
  const { build } = await import('vite')
  await build({root:fixture,configFile:false,logLevel:'warn',build:{outDir:join(fixture,'dist')}})
  console.log(`Verified ${files.length} displayed source modules (16 example exports): public imports, declarations and production bundle.`)
} finally {
  rmSync(fixture, {recursive:true, force:true})
}
