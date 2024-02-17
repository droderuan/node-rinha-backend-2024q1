import express from "express"

import Routers from "./http/controllers"
import { HttpError } from "./http/HttpError"
import { appService } from "./services"

const app = express()

app.use(express.json());

app.use(Routers)

app.use((error: HttpError, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log(error)
  return res.status(error.statusCode).json({ msg: error.message });
})

appService.connectToDb().then(() => {
  console.log("repositories connected")
  app.listen(3333, () => console.log('API started'))
})

