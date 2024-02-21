import pg from 'pg';

import { HttpError } from './http/HttpError'
import { HttpStatusCode } from './http/HttpError.enum'

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
  private dbPool!: pg.Pool

  async connectToDb() {
    const pool = new pg.Pool({
      host: process.env.DB_HOST,
      user: 'rinha',
      password: 'backend',
      database: 'rinha_backend',
      port: 5432,
      max: 15,
      idleTimeoutMillis: 0,
    })

    this.dbPool = pool
  }

  async obterExtrato(idCliente: number) {
    if (idCliente < 1 || idCliente > 5) {
      return null
    }

    const resultado = await this.dbPool.query<Cliente & Transacao>(`SELECT * FROM Cliente as c left join Transacao as t on t.idCliente=${idCliente} where c.id=${idCliente} order by t.id DESC limit 10;`)

    return {
      saldo: {
        total: resultado.rows[0].saldo,
        data_extrato: new Date(),
        limite: resultado.rows[0].limite
      },
      ultimas_transacoes: resultado.rows[0].realizada_em ? resultado.rows.map((trans) => ({
        valor: trans.valor, descricao: trans.descricao, tipo: trans.tipo, realizada_em: new Date(Number(trans.realizada_em)).toISOString()
      })) : []
    }
  }

  async criarTransacao({ idCliente, transacao }: { idCliente: string, transacao: { valor: number, tipo: Transacao['tipo'], descricao: string } }) {
    if (Number(idCliente) < 1 || Number(idCliente) > 5) {
      return null
    }

    const conn = await this.dbPool.connect()
    await conn.query('BEGIN')

    try {
      const valorAoSaldo = this.calcularMudancaSaldo(transacao.valor, transacao.tipo)
      const resultado = await conn.query(`SELECT * FROM atualizar_saldo_e_inserir_transacao(${idCliente}, ${valorAoSaldo}, ${transacao.valor}, '${transacao.tipo}', '${transacao.descricao}', '${Date.now()}');`)

      const cliente = resultado.rows[0]

      if (!this.autorizarTransacao(cliente, transacao.tipo)) {
        throw new HttpError(HttpStatusCode.ClientErrorUnprocessableEntity, 'vai com calma amigao');
      }

      await conn.query('COMMIT')
      conn.release()

      return cliente
    } catch (err) {
      await conn.query('ROLLBACK')
      conn.release()
      throw err
    }
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
