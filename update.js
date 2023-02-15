/**
 * {}
 * @author yutent<yutent.io@gmail.com>
 * @date 2023/02/15 22:46:25
 */

import Es from 'esbuild'
import fs from 'iofs'
import { resolve } from 'path'
import { exec } from 'child_process'
import pkg from './package.json' assert { type: 'json' }

const NPM_URL = 'https://registry.npmmirror.com'

function download(url) {
  return fetch(url).then(r => r.arrayBuffer())
}

export function execAsync(cmd) {
  return new Promise((yes, no) => {
    exec(cmd, { cwd: resolve('./') }, (err, res) => {
      if (err) {
        no(err)
      } else {
        yes(res)
      }
    })
  })
}

!(async function () {
  let { version, url } = await fetch(
    'https://registry.npmmirror.com/vue-router',
    {
      headers: {
        'content-type': 'application/json',
        accept: 'application/json'
      }
    }
  )
    .then(r => r.json())
    .then(r => {
      let v = r['dist-tags'].latest
      let url = r.versions[v].dist.tarball
      return { version: v, url }
    })
  let ab = await download(url)

  pkg.version = version

  fs.echo(JSON.stringify(pkg, null, 2), './package.json')
  fs.echo(Buffer.from(ab), './vue-router.tgz')

  await execAsync('tar -xzf vue-router.tgz')

  let code = fs.cat('package/dist/vue-router.esm-browser.js').toString()

  fs.echo(
    code
      .replace(/\r\n/g, '\n')
      .replace("import { setupDevtoolsPlugin } from '@vue/devtools-api';", '')
      .replace('let routerId = 0;', '')
      .replace(
        /function addDevtools\(app, router, matcher\) \{[\w\W]*?\n\}/,
        ''
      )
      .replace('addDevtools(app, router, matcher);', '')
      .replace(
        /if \(isBrowser &&\n\s+component\.ref\) \{\n[\w\W]*?\n\s{12}\}/,
        ''
      )
      .replace(/\s{4}\/\/ devtools only\n[\w\W]*?\n\s{4}\}/, ''),
    'src/vue-router.js'
  )

  Es.build({
    entryPoints: ['src/vue-router.js'],
    outdir: 'dist',
    target: 'es2017',
    format: 'esm',
    minify: true
  })

  fs.rm('./package', true)
  fs.rm('./vue-router.tgz')
})()
