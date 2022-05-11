import express from 'express'
import ExtendedRequest from '../types/ExtendedRequest'
import logger from '../utils/logger'
import fs from 'fs'

const config = require('../../config.json')
const router = express.Router()

router.get('/panel', (req: ExtendedRequest, res) => {
  req.dao.database.all(`
    SELECT *
    FROM stack;
  `, (err, rows) => {
    if(err) {
      logger.error({
        error: JSON.stringify(err),
        data: 'GET /panel/',
      })
      res.send(err)
    } else {
      fs.readdir(`${config.tempPath}`, (err, files) => {
        if(err) {
          logger.error({
            error: JSON.stringify(err),
            data: 'GET /panel/',
          })
          res.send(err)
        } else {
          res.render('panel', {
            stack: rows,
            cache: files,
          })
        }
      })
    }
  })
})

router.post('/panel/:hash/remove', (req: ExtendedRequest, res) => {
  req.dao.database.exec(`
    DELETE FROM stack
    WHERE md5 = '${req.params.hash}';
  `, (err) => {
    if(err) {
      logger.error({
        error: JSON.stringify(err),
        data: `POST /panel/${req.params.hash}/remove`,
      })
      res.send(err)
    } else {
      fs.unlink(`${config.tempPath}/${req.params.hash}.zip`, (err) => {
        if(err) {
          logger.error({
            error: JSON.stringify(err),
            data: `POST /panel/${req.params.hash}/remove`,
          })
          res.send(err)
        } else {
          res.send('OK')
        }
      })
    }
  })
})

export default router