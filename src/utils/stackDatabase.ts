import sqlite3 from 'sqlite3'
import getConfig from './getConfig'
import logger from './logger'

const config = getConfig()

const DB_PATH = `${config.optPath}/stack.db`

class DAO {
  database: sqlite3.Database

  constructor() {}

  init() {
    return new Promise((res, rej) => {
      const dbInstance = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
        if(err) {
          this.createDatabase()
            .then(() => {
              this.createTables()
              res(true)
            })
            .catch((err) => {
              logger.error({
                error: JSON.stringify(err),
              })
              rej(err)
            })
        } else {
          this.database = dbInstance
          res(true)
        }
      })
    })
  }

  createDatabase() {
    return new Promise((res, rej) => {
      const dbInstance = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if(err) {
          rej(err)
        } else {
          this.database = dbInstance

          res(true)
        }
      })
    })
  }

  createTables() {
    // STACK TABLE
    this.database.exec(`
      CREATE TABLE stack (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        md5 TEXT NOT NULL,
        last_used INTEGER NOT NULL,
        status TEXT NOT NULL
      );
    `, (err) => {
      if(err) {
        logger.error({
          error: JSON.stringify(err),
        })
      }
    })
  }
}

export default DAO