import express from "express"

import Routers from "./http/controllers"
import { dbPool } from "./db/pool"

const app = express()

app.use(express.json());

app.use(Routers)

dbPool.start().then(() => {
  app.listen(3333, () => console.log('API started'))
})

