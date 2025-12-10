const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const { URL } = require('url')

const base = process.env.TEST_BACKEND_URL || 'http://localhost:3000'
const u = new URL(base.replace(/\/$/, '') + '/api/free-tts')
const isHttps = u.protocol === 'https:'
const payload = JSON.stringify({ text: 'Hello! This is a free TTS test.' })
const opts = { method: 'POST', hostname: u.hostname, port: u.port || (isHttps ? 443 : 80), path: u.pathname, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }

const req = (isHttps ? https : http).request(opts, (res) => {
  const chunks = []
  res.on('data', (c) => chunks.push(c))
  res.on('end', () => {
    const buf = Buffer.concat(chunks)
    const out = path.join(process.cwd(), 'free-tts-test.mp3')
    fs.writeFileSync(out, buf)
    process.stdout.write('Saved ' + out + '\n')
  })
})
req.on('error', (e) => { process.stderr.write(String(e) + '\n'); process.exitCode = 1 })
req.write(payload)
req.end()
