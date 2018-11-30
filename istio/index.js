const Koa = require('koa')
const Router = require('koa-router')
const _ = require('lodash')


const app = new Koa()

const VERSION = 'v4'

let totalRequest = 0

// settimeout to promise
function delay(duration, ...args) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve(...args)
    }, duration)
  })
}

// x-response-time
app.use(async (ctx, next) => {
  const start = Date.now()
  totalRequest++
  await next()
  const ms = Date.now() - start
  ctx.set('X-Response-Time', `${ms}ms`)
})

// router
const router = new Router()

router.get('/', (ctx, next) => {
  ctx.body = 'Hello World! ' + VERSION
})

router.get('/version', (ctx, next) => {
  ctx.body = VERSION
})

router.get('/total', (ctx, next) => {
  ctx.body = 'total:' + totalRequest
})

router.get('/delay/:ms', async (ctx, next) => {
  let start = Date.now()
  await delay(parseInt(ctx.params.ms) || 0)
  ctx.body = 'delay:' + (Date.now() - start) + 'ms'
})

app.use(router.routes()).use(router.allowedMethods())
app.listen(3000)
