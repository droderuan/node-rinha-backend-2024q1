import { HttpStatusCode } from './http/HttpError.enum'
import { dbPool } from './db/pool';

interface Cliente {
  id: number
  limite: number
  saldo: number
}

interface Transacao {
  id: number
  idCliente: number
  valor: number
  descricao: string
  tipo: 'c' | 'd'
  realizada_em: string
}

class AppService {

  async obterExtrato(idCliente: number) {
    if (idCliente < 1 || idCliente > 5) {
      return { code: HttpStatusCode.ClientErrorNotFound }
    }

    const [clienteResultado, transacoesResultado] = await Promise.all([
      dbPool.pool.query<Cliente>(dbPool.queryCliente(idCliente)),
      dbPool.pool.query<Transacao>(dbPool.queryTransacoes(idCliente))
    ])

    if (transacoesResultado.rows?.length === 10) {
      const query = dbPool.queryDeletarTransacoes(transacoesResultado.rows[9].id, idCliente)
      dbPool.pool.query(query)
    }

    return {
      saldo: {
        total: clienteResultado.rows[0].saldo,
        data_extrato: new Date(),
        limite: clienteResultado.rows[0].limite
      },
      ultimas_transacoes: transacoesResultado.rows
    }
  }

  async credito({ idCliente, transacao }: { idCliente: number, transacao: { valor: number, tipo: Transacao['tipo'], descricao: string } }) {
    const query = dbPool.queryAtualizarSaldoInserirTransacao(idCliente, transacao.valor, transacao.valor, transacao.tipo, transacao.descricao, new Date().toISOString())
    const resultado = await dbPool.pool.query(query)
    return resultado.rows[0]
  }

  async debito({ idCliente, transacao }: { idCliente: number, transacao: { valor: number, tipo: Transacao['tipo'], descricao: string } }) {
    const query = dbPool.queryAtualizarSaldoInserirTransacao(idCliente, -1 * transacao.valor, transacao.valor, transacao.tipo, transacao.descricao, new Date().toISOString())

    const client = await dbPool.getConnection()
    await client.query('BEGIN')
    const resultado = await client.query(query)
    const cliente = resultado.rows[0]

    if (!this.autorizarDebito(cliente)) {
      client.query('ROLLBACK').then(() => client.release())

      return { code: HttpStatusCode.ClientErrorUnprocessableEntity }
    }

    client.query('COMMIT').then(() => client.release())

    return cliente
  }

  async criarTransacao({ idCliente, transacao }: { idCliente: number, transacao: { valor: number, tipo: Transacao['tipo'], descricao: string } }) {
    if (idCliente < 1 || idCliente > 5) return { code: HttpStatusCode.ClientErrorNotFound }

    if (transacao.tipo === 'c') {
      return this.credito({ idCliente, transacao })
    } else {
      return this.debito({ idCliente, transacao })
    }
  }

  private autorizarDebito(customer: Cliente) {
    return Math.abs(customer.saldo) <= customer.limite
  }
}

const appService = new AppService()

export {
  Cliente,
  Transacao,
  appService
}
