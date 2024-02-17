import mysql from "mysql2/promise"

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
  dbPool!: mysql.Pool

  async connectToDb() {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: 'root',
      password: 'backend',
      database: 'rinha_backend',
      port: 3306,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_POOL) || 10,
      enableKeepAlive: true,
      idleTimeout: 0
    })

    this.dbPool = pool
  }

  async getAllTransacoes(idCliente: string) {
    const [result] = await this.dbPool.query(`SELECT * FROM Cliente as c left join Transacao as t on c.id = t.idCliente where c.id=${idCliente} order by t.id DESC , t.realizada_em DESC limit 10;`) as unknown as [any[], string]

    if (result.length === 0) {
      return null
    }

    return {
      saldo: {
        total: result[0].saldo,
        data_extrato: new Date(),
        limite: result[0].limite
      },
      ultimas_transacoes: result[0].realizada_em ? result.map((trans) => ({
        valor: trans.valor, descricao: trans.descricao, tipo: trans.tipo, realizada_em: trans.realizada_em
      })) : []
    }
  }

  async create({ idCliente, amount, type, description }: { idCliente: string, amount: number, type: Transacao['tipo'], description: string }) {
    const conn = await this.dbPool.getConnection()
    await conn.beginTransaction();

    try {
      const [customerResult] = await conn.query(`SELECT * FROM Cliente where id=${idCliente} FOR UPDATE;`) as unknown as [Cliente[], string]

      if (customerResult.length != 1) {
        throw new HttpError(HttpStatusCode.ClientErrorNotFound, 'id not found')
      }

      const customer = customerResult[0]

      if (!this.authorized(customer, amount, type)) {
        throw new HttpError(HttpStatusCode.ClientErrorUnprocessableEntity, '');
      }

      customer.saldo = this.resolveBalance(customer.saldo, amount, type)

      await Promise.all([
        conn.query(`UPDATE Cliente set saldo=${customer.saldo} where id=${customer.id};`),
        conn.query(`INSERT INTO Transacao (idCliente, valor, tipo, descricao, realizada_em) VALUES (${customer.id}, ${amount}, "${type}", "${description}", current_timestamp);`)
      ])
      await conn.commit()
      conn.release()

      return { ...customer, balance: type === 'c' ? customer.saldo + amount : customer.saldo - amount }
    } catch (err) {
      await conn.rollback()
      conn.release()
      throw err
    }
  }

  private authorized(customer: Cliente, amount: number, type: Transacao["tipo"]) {
    if (type === 'c') return true
    if (type === 'd') {
      return (Math.abs(customer.saldo) + amount) <= customer.limite
    }
    return false
  }

  private resolveBalance(balance: number, amount: number, type: Transacao["tipo"]) {
    if (type === 'c') return balance + amount
    else return balance - amount
  }
}

const appService = new AppService()

export {
  Cliente,
  Transacao,
  appService
}
