import { exec } from 'child_process'
import { parse } from 'path' 

export default (absOriginFolder: string, absDestFile: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const config = require('../../config.json')
    
    if(!config.executablePath7Zip) {
      reject('Incorrect 7zip executable path provided!')
    }

    const command = `${config.executablePath7Zip} a -tzip -mx7 "${absDestFile}" "${absOriginFolder}"`

    exec(command, (err, stdout, stderr) => {
      if(err) {
        reject(err)
      }

      resolve(absDestFile)
    })
  })
}