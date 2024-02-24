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

  queryAtualizarSaldoInserirTransacao(idCliente: number, valorAoSaldo: number, transacaoValor: number, transacaoTipo: string, transacaoDescricao: string, transacaoDescricaoData: string) {
    return {
      name: 'atualizarSaldoInserirTransacao',
      text: 'SELECT * FROM atualizar_saldo_e_inserir_transacao($1, $2, $3, $4, $5, $6);',
      values: [idCliente, valorAoSaldo, transacaoValor, transacaoTipo, transacaoDescricao, transacaoDescricaoData]
    }
  }
}

const dbPool = new DbPool(40)

export { dbPool }
