import { HttpStatusCode } from "./HttpError.enum"

export class HttpError {
  statusCode: HttpStatusCode
  message: string

  constructor(statusCode: HttpStatusCode, message: string) {
    this.statusCode = statusCode
    this.message = message
  }
}
