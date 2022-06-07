import { unlink } from 'fs'
import logger from './logger'

const config = require('../../config.json')

const TEMP_PATH = config.tempPath

const removeCachedFile = (md5, dao) => {
  return new Promise((res, rej) => {
    logger.info(`Removing cached file (${md5})`)

    unlink(`${TEMP_PATH}/${md5}.zip`, (err) => {
      if(err) {
        logger.error({
          error: err,
        })

        res(false)
      } else {
        dao.database.exec(`
          DELETE FROM stack WHERE md5='${md5}';
        `, (err) => {
          if(err) {
            logger.error({
              error: err,
            })

            res(false)
          }

          res(true)
        })
      }
    })
  })
}

export default removeCachedFile