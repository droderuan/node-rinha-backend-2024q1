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

    await Promise.all(iterable.map(async () => {
      (await this.pool.connect()).release()
    }))

    console.log('database connected and ready!')
    return
  }
  async getConnection() {
    return this.pool.connect()
  }
}

const dbPool = new DbPool(40)

export { dbPool }
