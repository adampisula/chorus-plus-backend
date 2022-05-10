import DAO from "./utils/stackDatabase"
import { unlink } from "fs"
import { CronJob } from "cron"
import logger from "./utils/logger"

const config = require('../config.json')

const EXPIRY_TIME = config.cacheExpiryTime
const TEMP_PATH = config.tempPath

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
            logger.info(`Removing cached file (${md5})`)

            unlink(`${TEMP_PATH}/${md5}.zip`, (err) => {
              if(err) {
                logger.error({
                  error: err,
                })
              } else {
                dao.database.exec(`
                  DELETE FROM stack WHERE md5='${md5}';
                `, (err) => {
                  if(err) {
                    logger.error({
                      error: err,
                    })
                  }
                })
              }
            })
          })
        }
      })
    })
  }
)

export default job