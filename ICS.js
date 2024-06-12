const http = require("http");
const funcs = require("./functions");
const url = require("url");
const fs = require("fs");
const cp = require("child_process")
const ijson = require("./ijson")

let servers = {};
let recordList = [];

function newServer(host="localhost",port="8080",globalFunc=()=>{}){
    let sName = funcs.gibberish(7,7);
    let server = http.createServer((req,res) => {
        if(globalFunc != undefined && typeof globalFunc === "function"){
            globalFunc(req,res);
        }
    })
    servers[sName] = {
        server: server,
        hostname: host,
        port: port,
        routes: [],
        paths: [],
        globalFunc: globalFunc,
        default: undefined
    };
    return {
        serverID: sName,
        addRoute: (path="/",func=() => {}) => {
            addRoute(sName,path,func);
        },
        start: (properties={startAlert:true,record:false}) => {
            start(sName,properties);
        },
        default: (func=()=>{}) => {
            defaultF(sName,func);
        },
        url: "http://"+host+":"+port+"/",
        serverObj: server
    };
}
function addRoute(server=Object.keys(servers)[0],path="/",func=()=>{}){
    let r = servers[server].routes;
    let p = servers[server].paths;
    if(!p.includes(path)){
        p.push(path)
        r.push({path: path,func: func})
    } else{
        r[p.indexOf(path)] = {path: path,func: func};
    }
    let s = http.createServer((req,res) => {
        if(p.includes(url.parse(req.url).pathname)){
            r[p.indexOf(url.parse(req.url).pathname)].func(req,res)
        }
        if(servers[server].globalFunc != undefined && typeof servers[server].globalFunc === "function"){
            servers[server].globalFunc(req,res);
        }
    });
    servers[server].server = s;
}
function defaultF(server=Object.keys(servers)[0],func=()=>{}){
    let r = servers[server].routes;
    let p = servers[server].paths;
    let s = http.createServer((req,res) => {
        if(p.includes(url.parse(req.url).pathname)){
            r[p.indexOf(url.parse(req.url).pathname)].func(req,res)
        } else if(typeof func === "function"){
            func(req,res);
        }
        if(servers[server].globalFunc != undefined && typeof servers[server].globalFunc === "function"){
            servers[server].globalFunc(req,res);
        }
    });
    servers[server].server = s;
    servers[server].default = func;
}
function start(server = Object.keys(servers)[0], properties = {startAlert: true, record: false}){
    servers[server].server.listen(servers[server].port,servers[server].hostname)
    if(properties.startAlert === true){
        console.log(`Server ${server} listening on port ${servers[server].port}...`)
    }
    let sessionK = funcs.rndm(10000000,100000).toString();
    if(properties.record === true){
        if(!fs.existsSync("./serverLogs")){
            fs.mkdirSync("./serverLogs");
        }
        if(!fs.existsSync("./serverLogs/"+server)){
            fs.mkdirSync("./serverLogs/"+server);
        }
        recordList.push({
            sName: server,
            sessionKey: sessionK
        });
        record(server,sessionK);
    }
}
function record(server=Object.keys(servers)[0],sessionK=0){
    let recordObj = {}
    servers[server].server.addListener("request",(req,res) => {
        let parsedURL = url.parse(req.url,true)
        if(!recordObj[parsedURL.pathname]){
            recordObj[parsedURL.pathname] = {
                requests: [],
                query: parsedURL.query
            }
        }
        recordObj[parsedURL.pathname].requests.push({
            url: req.url,
            path: parsedURL.path,
            timeStamp: Date.now(),
        })
    });
    process.on("exit",() => {
        fs.writeFileSync("./serverLogs/"+server+"/"+sessionK+".json",JSON.stringify([]),{"encoding":'utf-8'})
        ijson.write("./serverLogs/"+server+"/"+sessionK+".json",0,null,recordObj);
        process.exit();
    })
    process.on("SIGINT",() => {
        process.exit();
    })
    servers[server].server.addListener
}

module.exports = {
    newServer
}
