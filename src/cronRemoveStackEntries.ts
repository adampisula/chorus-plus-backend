import DAO from "./utils/stackDatabase"
import { CronJob } from "cron"
import logger from "./utils/logger"
import removeCachedFile from './utils/removeCachedFile'

const config = require('../config.json')

const EXPIRY_TIME = config.cacheExpiryTime

const job = new CronJob(
  '0 0 * * * *', // EVERY HOUR AT XX:00:00
  () => {
    const dao = new DAO()

    dao.init().then(() => {
      dao.database.all(`
        SELECT md5 FROM stack WHERE
        (strftime('%s', 'now') - last_used) > ${EXPIRY_TIME};
      `, (err, rows) => {
        if(err) {
          logger.error({
            error: err,
          })
        } else {
          rows.forEach(({ md5 }) => {
            removeCachedFile(md5, dao)
          })
        }
      })
    })
  }
)

export default job