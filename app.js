const koa = require('./myRouter')

koa.add('GET', '/hello1', (req, res, pathName) => {
    res.end('hello1 world')
})

koa.index('/world', '/index.html')

koa.start(8082)
