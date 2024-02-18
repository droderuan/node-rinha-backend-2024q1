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
  realizada_em: Date
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

    await this.dbPool.query(`
      PREPARE insert_transacao as
      INSERT INTO Transacao (idCliente, valor, tipo, descricao, realizada_em)
      VALUES ($1, $2, $3, $4, NOW());
    `)

    await this.dbPool.query(`
      PREPARE get_cliente as
      SELECT * FROM Cliente where id=$1 FOR UPDATE;
    `)
  }

  async obterExtrato(idCliente: string) {
    const resultado = await this.dbPool.query<Cliente & Transacao>(`SELECT * FROM Cliente as c left join Transacao as t on c.id = t.idCliente where c.id=${idCliente} order by t.id DESC , t.realizada_em DESC limit 10;`)

    if (resultado.rowCount === 0) {
      return null
    }

    return {
      saldo: {
        total: resultado.rows[0].saldo,
        data_extrato: new Date(),
        limite: resultado.rows[0].limite
      },
      ultimas_transacoes: resultado.rows[0].realizada_em ? resultado.rows.map((trans) => ({
        valor: trans.valor, descricao: trans.descricao, tipo: trans.tipo, realizada_em: trans.realizada_em
      })) : []
    }
  }

  async criarTransacao({ idCliente, transacao }: { idCliente: string, transacao: { valor: number, tipo: Transacao['tipo'], descricao: string } }) {
    const conn = await this.dbPool.connect()
    await conn.query('BEGIN')

    try {
      const valorAoSaldo = this.calcularMudancaSaldo(transacao.valor, transacao.tipo)
      const resultado = await conn.query(`SELECT * FROM atualizar_saldo_e_inserir_transacao(${idCliente}, ${valorAoSaldo}, ${transacao.valor}, '${transacao.tipo}', '${transacao.descricao}');`)

      if (resultado.rowCount != 1) {
        throw new HttpError(HttpStatusCode.ClientErrorNotFound, 'id not found')
      }

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
