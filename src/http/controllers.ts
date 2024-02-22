import { Router } from 'express'
import { HttpStatusCode } from './HttpError.enum'
import { Transacao, appService } from '../services'

const router = Router()

router.post('/clientes/:id/transacoes', async (req, res, next) => {
  const { id } = req.params
  const payload = req.body as { valor: number, tipo: Transacao['tipo'], descricao: string }
  const idCliente = Number(id)

  if (!idCliente) {
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

  const clienteAtualizado = await appService.criarTransacao({ idCliente: Number(id), transacao: payload }) as any

  if (clienteAtualizado.code) {
    return res.status(clienteAtualizado.code).end();
  }

  const responsePayload = {
    saldo: clienteAtualizado.saldo,
    limite: clienteAtualizado.limite
  }
  return res.status(HttpStatusCode.SuccessOK).json(responsePayload);

})

router.get('/clientes/:id/extrato', async (req, res, next) => {
  const { id } = req.params
  const parsedId = Number(id)

  if (!parsedId) {
    return res.status(HttpStatusCode.ClientErrorBadRequest);
  }

  const extrato = await appService.obterExtrato(parsedId)

  if (extrato.code) {
    return res.status(extrato.code).end();
  }
  return res.status(HttpStatusCode.SuccessOK).json(extrato);
})

export default router
