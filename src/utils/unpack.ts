import { exec } from 'child_process'
import { mkdirSync } from 'fs'
import { parse } from 'path' 
import getConfig from './getConfig'

export default (absFilePath: string, absExtractParentFolder: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const config = getConfig()
    
    if(!config.executablePath7Zip) {
      reject('Incorrect p7zip executable path provided!')
    }

    let extractFolder = `${absExtractParentFolder}/${parse(absFilePath).name}`

    try {
      mkdirSync(extractFolder)
    } catch(err) {
      reject(err)
    }

    const command = `${config.executablePath7Zip} x "${absFilePath}" -o"${extractFolder}"`

    exec(command, (err, stdout, stderr) => {
      if(err) {
        reject(err)
      }

      resolve(extractFolder)
    })
  })
}