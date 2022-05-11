import express from 'express'
import geoip from 'geoip-lite'

import getRequestCountry from '../middleware/getRequestCountry'

import addHistoryEntry from '../utils/addHistoryEntry'
import getDownloadUrl from '../utils/getDownloadUrl'
import stripGDriveUrl from '../utils/stripGDriveUrl'
import downloadAndProcess from '../utils/downloadAndProcess'
import ExtendedRequest from '../types/ExtendedRequest'
import StackEntryStatus from '../types/StackEntryStatus'
import HistoryEntry from '../types/HistoryEntry'
import logger from '../utils/logger'

const config = require('../../config.json')
const TEMP_PATH = config.tempPath

const router = express.Router()

router.use(getRequestCountry)

router.get('/', (req, res) => {
  res.send('Hello!')
})

router.get('/download/:hash', (req: ExtendedRequest, res) => {
  if(req.params.hash.length == 32) {
    const geo = geoip.lookup(req.clientIp)
    const country = (geo) ? geo.country || 'N-A' : 'N-A'

    req.dao.database.all(`
      SELECT status
      FROM stack
      WHERE md5 = '${req.params.hash}';
    `, (err, rows) => {
      if(err) {
        logger.error({
          error: err,
          data: req.params.hash,
        })
        res.send(err)
      } else {
        if(rows.length > 0) {
          const status: StackEntryStatus = rows[0].status

          if(status == 'CACHED') {
            req.dao.database.exec(`
              UPDATE stack
              SET last_used = strftime('%s', 'now')
              WHERE md5 = '${req.params.hash}';
            `)

            const historyEntry: HistoryEntry = {
              hash: req.params.hash,
              timestamp: Math.floor(new Date().getTime() / 1000),
              country: country,
              fromCache: true,
            }

            addHistoryEntry(historyEntry)

            logger.info(`Sending cached file (${req.params.hash})`)
            res.sendFile(`${TEMP_PATH}/${req.params.hash}.zip`)
          } else {
            logger.info(`Requested file currently being downloaded. Waiting (${req.params.hash})`)

            const timer = setInterval(() => {
              req.dao.database.all(`
                SELECT status
                FROM stack
                WHERE md5 = '${req.params.hash}';
              `, (err, rows) => {
                if(rows.length > 0) {
                  const checkStatus: StackEntryStatus = rows[0].status

                  if(checkStatus == 'CACHED') {
                    clearInterval(timer)
            
                    req.dao.database.exec(`
                      UPDATE stack
                      SET last_used = strftime('%s', 'now')
                      WHERE md5 = '${req.params.hash}';
                    `)

                    const historyEntry: HistoryEntry = {
                      hash: req.params.hash,
                      timestamp: Math.floor(new Date().getTime() / 1000),
                      country: country,
                      fromCache: true,
                    }
                    
                    addHistoryEntry(historyEntry)

                    logger.info(`Sending cached file (${req.params.hash})`)
                    res.sendFile(`${TEMP_PATH}/${req.params.hash}.zip`)
                  }
                } else {
                  logger.error({
                    error: err,
                    data: req.params.hash,
                  })
                  res.send(err)
                }
              })
            }, 1000)
          }
        } else {
          getDownloadUrl(req.params.hash)
            .then((url: string) => {
              let status: StackEntryStatus = 'DOWNLOADING'

              req.dao.database.exec(`
                INSERT INTO stack (md5, last_used, status)
                VALUES ('${req.params.hash}', strftime('%s', 'now'), '${status}');
              `)

              downloadAndProcess(req.gdrive, stripGDriveUrl(url), req.params.hash)
                .then((zippedPath: string) => {
                  status = 'CACHED'

                  req.dao.database.exec(`
                    UPDATE stack
                    SET status = '${status}'
                    WHERE md5 = '${req.params.hash}';
                  `)

                  const historyEntry: HistoryEntry = {
                    hash: req.params.hash,
                    timestamp: Math.floor(new Date().getTime() / 1000),
                    country: country,
                    fromCache: false,
                  }
                  
                  addHistoryEntry(historyEntry)

                  logger.info(`Sending zipped file (${req.params.hash})`)
                  res.sendFile(zippedPath)
                })
                .catch((err) => {
                  req.dao.database.exec(`
                    DELETE FROM stack
                    WHERE md5 = '${req.params.hash}';
                  `)

                  logger.error({
                    error: err,
                    data: req.params.hash,
                  })
                  res.send(err)
                })
            })
            .catch((err) => {
              logger.error({
                error: err,
                data: req.params.hash,
              })
              res.send(err)
            })
        }
      }
    })
  } else {
    logger.info(`Incorrect file hash (${req.params.hash})`)
    res.send('Incorrect hash')
  }
})

export default router