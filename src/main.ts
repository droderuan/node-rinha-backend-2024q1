import express from "express"

import Routers from "./http/controllers"
import { appService } from "./services"

const app = express()

app.use(express.json());

app.use(Routers)

appService.connectToDb().then(() => {
  console.log("repositories connected")
  app.listen(3333, () => console.log('API started'))
})

