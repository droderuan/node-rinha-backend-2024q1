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
      dbPool.pool.query<Cliente>(`SELECT * FROM Cliente where id=${idCliente};`),
      dbPool.pool.query<Transacao>(`SELECT * FROM Transacao where idCliente=${idCliente} order by id DESC;`)
    ])

    if (transacoesResultado.rows?.length > 10) {
      dbPool.pool.query<Transacao>(`DELETE FROM Transacao where id < ${transacoesResultado.rows[10].id} and idCliente=${idCliente};`)
    }

    return {
      saldo: {
        total: clienteResultado.rows[0].saldo,
        data_extrato: new Date(),
        limite: clienteResultado.rows[0].limite
      },
      ultimas_transacoes: transacoesResultado.rows.slice(0, 10).map((trans) => ({ ...trans, realizada_em: new Date(Number(trans.realizada_em)).toISOString() }))
    }
  }

  async credito({ idCliente, transacao }: { idCliente: number, transacao: { valor: number, tipo: Transacao['tipo'], descricao: string } }) {
    const resultado = await dbPool.pool.query(`SELECT * FROM atualizar_saldo_e_inserir_transacao(${idCliente}, ${transacao.valor}, ${transacao.valor}, '${transacao.tipo}', '${transacao.descricao}', '${Date.now()}');`)
    const cliente = resultado.rows[0]
    return cliente
  }

  async debito({ idCliente, transacao }: { idCliente: number, transacao: { valor: number, tipo: Transacao['tipo'], descricao: string } }) {
    const client = await dbPool.getConnection()
    await client.query('BEGIN')

    const resultado = await client.query(`SELECT * FROM atualizar_saldo_e_inserir_transacao(${idCliente}, ${transacao.valor * -1}, ${transacao.valor}, '${transacao.tipo}', '${transacao.descricao}', '${Date.now()}');`)
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
