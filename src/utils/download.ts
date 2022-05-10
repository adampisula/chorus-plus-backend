
import EventEmitter from 'events'
import * as fs from 'fs'
import type { drive_v3 } from 'googleapis'
import DriveFile from '../types/DriveFile'
import * as path from 'path'
import sanitize from 'sanitize-filename'

export const downloadFile = (drive: drive_v3.Drive, fileId: string, absDestFolder: string, progressInBytes = false, hash = ''): EventEmitter => {
  const ee = new EventEmitter()

  if(!fs.existsSync(absDestFolder)) {
    fs.mkdirSync(absDestFolder, { recursive: true })
  }

  drive.files.get({
    fileId: fileId,
    supportsAllDrives: true,
    fields: 'kind,id,size,mimeType,name',
  }).then(fileInfo => {
    const file = fileInfo.data
    const fileSize = Number(file.size)
    const newFileName = hash ? `${hash}${path.extname(file.name)}` : sanitize(file.name)

    const fileSavePath = `${absDestFolder}/${newFileName}`
    const destination = fs.createWriteStream(fileSavePath)

    drive.files.get(
      { fileId: file.id!, alt: 'media', supportsAllDrives: true, },
      { responseType: 'stream' }
    ).then(response => {
      let bytesDownloaded = 0
      let progress: number | string = 0
      let lastSentProgress: number | string = -1

      response.data
        .on('end', () => {
          ee.emit('end', fileSavePath)
        })
        .on('error', err => {
          ee.emit('error', err)
        })
        .on('data', d => {
          bytesDownloaded += d.length;

          // ROUND PROGRESS TO 0.xxx OR SET TO AMOUNT OF BYTES IN CASE FILE SIZE WAS UNAVAILABLE
          const emittedProgress: string = (file.size && !progressInBytes) 
            ? (Math.round(bytesDownloaded / fileSize * 1000) / 1000).toString().slice(0, 5) // TRIM TO 5 CHARACTERS (0.xxx)
            : `${bytesDownloaded}b`

          progress = emittedProgress

          if(progress != lastSentProgress) {
            ee.emit('progress', progress)

            lastSentProgress = progress
          }
        })
        .pipe(destination)
    })
  })

  return ee
}

export const getFolderStructure = async (drive: drive_v3.Drive, folderId: string, parent = '') => {
  let structure: any = {}

  const response = await drive.files.list({
    supportsAllDrives: true,
    q: `'${folderId}' in parents`,
    fields: 'files',
  })

  const fileList = response.data.files || []

  for(var i = 0; i < fileList.length; i++) {
    const currentFile = fileList[i]

    if(currentFile.mimeType == 'application/vnd.google-apps.folder') {
      structure = {
        ...(await getFolderStructure(drive, currentFile.id!, `${parent}/${currentFile.name!}`)),
        ...structure
      }
    } else {
      const fileData: DriveFile = {
        kind: currentFile.kind!,
        id: currentFile.id!,
        name: currentFile.name!,
        mimeType: currentFile.mimeType!,
        size: Number(currentFile.size!) || undefined,
      }

      structure[`${parent}/${currentFile.name}`] = fileData
    }
  }

  return structure
}

export const downloadFolder = (drive: drive_v3.Drive, folderId: string, absDestFolder: string, progressInBytes = false): EventEmitter => {
  const ee = new EventEmitter()

  if(absDestFolder[absDestFolder.length - 1] == '/' || absDestFolder[absDestFolder.length - 1] == '\\') {
    absDestFolder = absDestFolder.slice(0, -1)
  }

  getFolderStructure(drive, folderId).then((structure) => {
    let totalDownloadSize = 0

    let downloadedFiles = JSON.parse(JSON.stringify(structure))

    // FILL OBJECT OF DOWNLOADED FILES WITH false's
    for(const key in downloadedFiles) {
      downloadedFiles[key] = {
        finished: false,
        bytesDownloaded: 0,
      }

      totalDownloadSize += parseInt(structure[key].size) || 0
    }

    // DOWNLOAD ALL FILES
    for(const key in structure) {
      const absDestFile = absDestFolder + path.dirname(key)

      downloadFile(drive, structure[key].id, absDestFile, true)
        .on('progress', fileDownloadedBytes => {
          downloadedFiles[key].bytesDownloaded = parseInt(fileDownloadedBytes.slice(0, -1))

          // SEND TOTAL PERCENTAGE
          let totalDownloadedSize = 0

          for(const countKey in downloadedFiles) {
            totalDownloadedSize += downloadedFiles[countKey].bytesDownloaded
          }

          const emittedProgress: string = (totalDownloadSize > 0 && !progressInBytes) 
            ? (Math.round(totalDownloadedSize / totalDownloadSize * 1000) / 1000).toString().slice(0, 5) // TRIM TO 5 CHARACTERS (0.xxx)
            : `${totalDownloadedSize}b`

          ee.emit('progress', emittedProgress)
        }).on('end', filePath => {
          downloadedFiles[key].finished = true

          // SEE IF ALL FILES HAVE BEEN DOWNLOADED
          // @ts-ignore
          const allDownloaded = Object.values(downloadedFiles).every(item => item.finished === true)

          if(allDownloaded) {
            ee.emit('end', absDestFolder)
          }
        }).on('error', err => {
          ee.emit('error', err)
        })
    }
  })

  return ee
}