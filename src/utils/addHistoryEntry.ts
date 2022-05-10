import { appendFile } from 'fs'
import HistoryEntry from '../types/HistoryEntry'
import logger from './logger'

const config = require('../../config.json')

const addHistoryEntry = (entry: HistoryEntry) => {
  const entryRaw = `${entry.hash},${entry.timestamp},${entry.country},${entry.fromCache ? 'true' : 'false'}\n`

  appendFile(`${config.optPath}/history.csv`, entryRaw, (err) => {
    if(err) {
      logger.error({
        error: err,
        data: entry,
      })
      console.log(err)
    }
  })
}

export default addHistoryEntry