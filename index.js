const express = require('express');
const responseTime = require("response-time")
const client = require("prom-client")//metric collection
const { createLogger, transports } = require("winston");
const LokiTransport = require("winston-loki");
const options = {
  
  transports: [
    new LokiTransport({
      labels:{
        appName: "express"
      },
      host: "http://127.0.0.1:3100"
    })
  ]

};
const logger = createLogger(options);
const { doSomeHeavyTask } = require("./util")

const app = express();
const port = 8000;


const collectDeafaultMetrics = client.collectDefaultMetrics
collectDeafaultMetrics({register:client.register})

const reqResTime = new client.Histogram({
  name: "http_express_req_res_time",
  help: "This tells how mush time is taken by req and res",
  labelNames:["method","route","status_code"],
  buckets:[1,50,100,200,400,500,800,1000,2000],
})

const totalReqCounter = new client.Counter({
  name: 'total_req',
  help: 'Tells total req'
})




app.use(responseTime((req,res,time)=>{
  totalReqCounter.inc()
  reqResTime
  .labels({
    method: req.method,
    route: req.url,
    status_code: res.statusCode
  })
  .observe(time)

}))

app.get("/",(req,res)=>{
  logger.info('req come')
return res.json({message:"hello from express server"})
})

app.get("/slow", async(req, res) => {
try {
  logger.info('req come slow')

  const timeTaken  = await doSomeHeavyTask()
  return res.json({
    status: "Success",
    message: `heavy task completed in ${timeTaken}ms`
  })
} catch (error) {
  logger.error('error.message')

  return res.status(500).json({status:"Error",error:"internal error"})
}
})


app.get("/metrics",async(req,res)=>{
  res.setHeader('Content-Type', client.register.contentType)
  const metrics = await client.register.metrics()
  res.send(metrics)
})









// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});