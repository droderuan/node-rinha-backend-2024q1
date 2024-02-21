import { Router } from 'express'
import { HttpError } from './HttpError'
import { HttpStatusCode } from './HttpError.enum'
import { Transacao, appService } from '../services'

const router = Router()

router.post('/clientes/:id/transacoes', async (req, res, next) => {
  const { id } = req.params
  const payload = req.body as { valor: number, tipo: Transacao['tipo'], descricao: string }

  if (!id || !Number(id)) {
    return res.status(HttpStatusCode.ClientErrorBadRequest).end();
  }

  if (!payload.descricao || payload.descricao.length < 0 || payload.descricao.length > 10) {
    return res.status(HttpStatusCode.ClientErrorUnprocessableEntity).end();
  }

  if (payload.valor <= 0 || !Number.isInteger(payload.valor)) {
    return res.status(HttpStatusCode.ClientErrorUnprocessableEntity).end();
  }

  if (!payload.tipo.match(/^[c,d]$/)) {
    return res.status(HttpStatusCode.ClientErrorUnprocessableEntity).end();
  }

  try {
    const clienteAtualizado = await appService.criarTransacao({ idCliente: id, transacao: payload })

    if (!clienteAtualizado) {
      return res.status(HttpStatusCode.ClientErrorUnprocessableEntity).end();
    }

    const responsePayload = {
      saldo: clienteAtualizado.saldo,
      limite: clienteAtualizado.limite
    }

    return res.status(HttpStatusCode.SuccessOK).json(responsePayload);

  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.statusCode).json(err).end();
    }
    return res.status(HttpStatusCode.ServerErrorInternal).end();
  }
})

router.get('/clientes/:id/extrato', async (req, res, next) => {
  const { id } = req.params

  try {
    if (!id || !Number(id)) {
      return res.status(HttpStatusCode.ClientErrorBadRequest);
    }

    const extrato = await appService.obterExtrato(Number(id))

    if (!extrato) {
      return res.status(HttpStatusCode.ClientErrorNotFound).end();
    }

    return res.status(HttpStatusCode.SuccessOK).json(extrato);
  } catch (err: any) {
    if (err instanceof HttpError) {
      return res.status(err.statusCode).end();
    } else if (err.code === '42P01') { // pg -> relation "undefined" does not exist
      return res.status(HttpStatusCode.ClientErrorNotFound).end();
    }
    return res.status(HttpStatusCode.ServerErrorInternal).end();
  }
})

export default router
