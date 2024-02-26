import pg from 'pg';

class DbPool {
  connectionCount = 0
  pool!: pg.Pool

  constructor(numberOfConnections: number) {
    this.connectionCount = numberOfConnections
  }

  async start() {
    const pool = new pg.Pool({
      host: process.env.DB_HOST,
      user: 'postgres',
      password: 'backend',
      database: 'rinha_backend',
      port: 5432,
      max: this.connectionCount,
      idleTimeoutMillis: 0,
    })

    this.pool = pool

    const iterable = Array.from(Array(this.connectionCount))

    await Promise.all(iterable.map(async () => (await this.pool.connect()).release()))

    console.log('database connected and ready!')
    return
  }

  async getConnection() {
    return this.pool.connect()
  }

  queryCliente(idCliente: number) {
    return {
      name: 'obterCliente',
      text: 'SELECT * FROM Cliente where id=$1',
      values: [idCliente]
    }
  }

  queryTransacoes(idCliente: number) {
    return {
      name: 'obterTransacoes',
      text: 'SELECT * FROM Transacao where idCliente=$1 ORDER BY id DESC LIMIT 10;',
      values: [idCliente]
    }
  }

  queryDeletarTransacoes(minTransacaoId: number, idCliente: number) {
    return {
      name: 'deletarTransacoes',
      text: 'DELETE FROM Transacao where id < $1 and idCliente=$2;',
      values: [minTransacaoId, idCliente]
    }
  }

  queryAtualizarSaldoCredito(idCliente: number, valorAoSaldo: number) {
    return {
      name: 'atualizarSaldoCredito',
      text: 'UPDATE cliente set saldo=saldo+$2 where id=$1 RETURNING *;',
      values: [idCliente, valorAoSaldo]
    }
  }

  queryInserirTransacao(idCliente: number, transacaoValor: number, transacaoTipo: string, transacaoDescricao: string, transacaoDescricaoData: string) {
    return {
      name: 'inserirTransacaoCredito',
      text: 'INSERT INTO Transacao (idCliente, valor, tipo, descricao, realizada_em) VALUES ($1, $2, $3, $4, $5);',
      values: [idCliente, transacaoValor, transacaoTipo, transacaoDescricao, transacaoDescricaoData]
    }
  }

  queryAtualizarSaldoDebito(idCliente: number, valorAoSaldo: number) {
    return {
      name: 'atualizarSaldoDebito',
      text: 'UPDATE cliente set saldo=saldo-$2 where id=$1 RETURNING *;',
      values: [idCliente, valorAoSaldo]
    }
  }
}

const dbPool = new DbPool(20)

export { dbPool }
