const http = require('http')
const url = require('url')
const path = require('path')
const fs = require('fs')
const cluster = require('cluster')
const os = require('os')

/**
 * 路由表
 */
const routeArr = {
    'GET': {},
    'POST': {},
    'PUT': {},
    'DELETE': {}
}

/**
 * 进程列表
 */
const workers = {}

/**
 * 进程数量
 */
const clusterNum = os.cpus().length

/**
 * 是否是一个请求
 * @param {*} pathName 
 */
const isFunc = (method, pathName) => typeof routeArr[method][pathName] === 'function'

/**
 * 静态资源处理
 * @param {*} req 
 * @param {*} res 
 * @param {*} pathName 
 */
const resStatic = (req, res, pathName) => {
    fs.readFile(pathName.substr(1), (err, data) => {
        if (err) {
            endErrorReq(res, 501)
        } else {
            endStaticReq(res, pathName, data)
        }   
        res.end()
    })
}

/**
 * 响应静态资源
 * @param {*} res 
 * @param {*} pathName 
 * @param {*} data 
 */
const endStaticReq = (res, pathName, data) => {
    const suffix = path.extname(pathName)
    res.writeHead(200, {
        'Content-Type': suffix === '.css' ? 'text/css' : 'text/html;charset=utf-8'
    })
    res.write(data)
}

/**
 * 结束错误请求
 * @param {*} res 
 * @param {*} err 
 */
const endErrorReq = (res, err) => {
    res.writeHead(err)
}

/**
 * 路由分发处理器
 * @param {*} req 
 * @param {*} res 
 */
const routeHandler = (req, res) => {
    const {pathname: pathName} = url.parse(req.url)
    const method = req.method
    isFunc(method, pathName) ? routeArr[method][pathName](req, res, pathName) : resStatic(req, res, pathName)
    console.log(method + '请求：'+ pathName)
}

/**
 * 添加动态路由解析
 * @param {*} method 请求方法 get post put delete
 * @param {*} reqUrl 
 * @param {*} service 
 */
const addDynamicRoute = (method, reqUrl, service) => {
    console.log(`添加一个${method}服务：` + reqUrl)
    routeArr[method.toUpperCase()][reqUrl] = service
}

/**
 * 开启服务器并监听接口
 * @param {*} port 
 */
const startServer = port => {
    if (clusterNum > 1) {
        startClusterServer(port)
    } else {
        http.createServer((req, res) => {
            routeHandler(req, res)
        }).listen(port)
        console.log('Server running at http://127.0.0.1:' + port)
    }
}

/**
 * 设置静态页面请求别名
 * @param {*} newUrl 新的请求路径
 * @param {*} oldUrl 原始路径
 */
const setIndex = (newUrl, oldUrl) => addDynamicRoute('GET', newUrl, (req, res) => resStatic(req, res, oldUrl))

/**
 * 自定义静态页面处理方式
 * @param {*} staticHandlerService 
 */
const setresStaticFunc = staticHandlerService => resStatic = staticHandlerService

/**
 * 开启集群服务
 * @param {*} port 
 */
const startClusterServer = port => {
    if (cluster.isMaster) {
        for (let i = 0;i < clusterNum;i++) {
            const work = cluster.fork()
            console.log(work.process.pid)
            workers[i] = work
        }
        cluster.on('exit', (worker, code, signal) => {
            console.log(`worker ${worker.process.pid} died`)
        })
    } else {
        console.log(cluster.worker.id)
        http.createServer((req, res) => {
            console.log('子进程：' + cluster.worker.id + '正在处理请求')
            routeHandler(req, res)
        }).listen(port)
        console.log('Server running at http://127.0.0.1:' + port)
    }
}

module.exports = {
    route: routeHandler,
    add: addDynamicRoute,
    start: startServer,
    index: setIndex,
    get (reqUrl, service) {
        addDynamicRoute('GET', reqUrl, service)
    },
    post (reqUrl, service) {
        addDynamicRoute('POST', reqUrl, service)
    },
    put (reqUrl, service) {
        addDynamicRoute('PUT', reqUrl, service)
    },
    delete (reqUrl, service) {
        addDynamicRoute('DELETE', reqUrl, service)
    },
    modStatic: setresStaticFunc
}

/**
 * myRouter快速灵活的路由
 * 功能如下：
 * 1、自动静态路由解析（resStatic）
 * 2、支持手动设置静态路由别名（setIndex）
 * 3、支持创建新的静态路由实现（方便加载模板）
 * 4、动态路由解析（routeHandler）
 * 5、自动错误响应（endErrorReq）
 * 6、使用原生API，无第三方框架实现
 * 7、支持单机集群（startClusterServer）
 */
