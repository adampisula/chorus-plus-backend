import { drive_v3 } from "googleapis"
import { mkdir } from "fs"
import rimraf from 'rimraf'

import { downloadFile, downloadFolder } from "./download"
import unpack from "./unpack"
import zip from "./zip"
import logger from "./logger"

const config = require('../../config.json')

const downloadAndProcess = (drive: drive_v3.Drive, gdId: string, hash: string) => {
  return new Promise((resolve, reject) => {
    drive.files.get({
      fileId: gdId,
      supportsAllDrives: true,
      fields: 'id,mimeType,name',
    })
      .then(fileInfo => {
        let pF = config.tempPath
    
        switch(fileInfo.data.mimeType) {
          case 'application/vnd.google-apps.folder':
            pF += `\\${hash}`
    
            logger.info(`Downloading folder from Google Drive (${hash})`)
    
            mkdir(pF, (err) => {
              if(err) {
                reject(err)
              } else {
                downloadFolder(drive, gdId, pF)
                  //.on('progress', prog => console.log(`${fileInfo.data.name}: ${progressPercentage(prog)}%`))
                  .on('progress', () => {})
                  .on('end', p => {
                    logger.info(`Downloaded folder (${hash})`)
                    
                    logger.info(`Zipping folder (${hash})`)
                    zip(p, `${pF}.zip`)
                      .then((zippedPath) => {
                        logger.info(`Removing downloaded folder (${hash})`)

                        rimraf(pF, e => {
                          if(e) {
                            logger.error({
                              error: err,
                              data: hash,
                            })
                            reject(e)
                          } else {
                            resolve(zippedPath)
                          }
                        })
                      })
                      .catch((err) => {
                        logger.error({
                          error: err,
                          data: hash,
                        })
                        reject(err)
                      })
                  })
                  .on('error', err => {
                    logger.error({
                      error: err,
                      data: hash,
                    })
                    reject(err)
                  })
              }
            })
            break;
          default:
            logger.info(`Downloading file from Google Drive (${hash})`)
    
            downloadFile(drive, gdId, pF, false, hash)
              //.on('progress', prog => console.log(`${fileInfo.data.name}: ${progressPercentage(prog)}%`))
              .on('progress', () => {})
              .on('end', p => {
                logger.info(`Downloaded file (${hash})`)
                logger.info(`Extracting archive (${hash})`)

                unpack(p, pF).then(extractFolder => {
                  logger.info(`Removing downloaded archive (${hash})`)

                  rimraf(p, e => {
                    if(e) {
                      logger.error({
                        error: e,
                        data: hash,
                      })
                      reject(e)
                    } else {
                      logger.info(`Zipping folder (${hash})`)

                      zip(extractFolder, `${pF}/${hash}.zip`)
                        .then((zippedPath) => {
                          logger.info(`Removing extracted folder (${hash})`)

                          rimraf(extractFolder, e => {
                            if(e) {
                              logger.error({
                                error: e,
                                data: hash,
                              })
                              reject(e)
                            } else {
                              resolve(zippedPath)
                            }
                          })
                        })
                        .catch((err) => {
                          logger.error({
                            error: err,
                            data: hash,
                          })
                          reject(err)
                        })
                    }
                  })
                })
              })
              .on('error', err => {
                logger.error({
                  error: err,
                  data: hash,
                })
                reject(err)
              })
        }
      })
      .catch((err) => {
        logger.error({
          error: err,
          data: hash,
        })
        reject(err)
      })
  })
}

/*const progressPercentage = (progress: string) => {
  return (Number(progress) * 100).toString().slice(0, 5)
}*/

export default downloadAndProcess