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

    const clienteResultado = await dbPool.pool.query<Cliente>(`SELECT * FROM Cliente where id=${idCliente};`)
    const transacoesResultado = await dbPool.pool.query<Transacao>(`SELECT * FROM Transacao where idCliente=${idCliente} order by id DESC limit 10;`)

    return {
      saldo: {
        total: clienteResultado.rows[0].saldo,
        data_extrato: new Date(),
        limite: clienteResultado.rows[0].limite
      },
      ultimas_transacoes: transacoesResultado.rows
    }
  }

  async criarTransacao({ idCliente, transacao }: { idCliente: number, transacao: { valor: number, tipo: Transacao['tipo'], descricao: string } }) {
    if (idCliente < 1 || idCliente > 5) {
      return { code: HttpStatusCode.ClientErrorNotFound }
    }

    const client = await dbPool.getConnection()
    await client.query('BEGIN')

    const valorAoSaldo = this.calcularMudancaSaldo(transacao.valor, transacao.tipo)

    const resultado = await client.query(`SELECT * FROM atualizar_saldo_e_inserir_transacao(${idCliente}, ${valorAoSaldo}, ${transacao.valor}, '${transacao.tipo}', '${transacao.descricao}', '${Date.now()}');`)
    const cliente = resultado.rows[0]

    if (transacao.tipo === 'd' && !this.autorizarTransacao(cliente, transacao.tipo)) {
      client.query('ROLLBACK').then(() => client.release())

      return { code: HttpStatusCode.ClientErrorUnprocessableEntity }
    }

    client.query('COMMIT').then(() => {
      client.release()
    })

    return cliente
  }

  private autorizarTransacao(customer: Cliente, type: Transacao["tipo"]) {
    if (type === 'c') return true
    if (type === 'd') {
      return Math.abs(customer.saldo) <= customer.limite
    }
    return false
  }

  private calcularMudancaSaldo(valor: number, type: Transacao["tipo"]) {
    if (type === 'c') return valor
    else return valor * -1
  }
}

const appService = new AppService()

export {
  Cliente,
  Transacao,
  appService
}
