import { existsSync } from "fs"
import { dirname, join } from 'path'
import dotenv from 'dotenv'

dotenv.config()

interface Config {
  executablePath7Zip: string
  tempPath: string
  logPath: string
  optPath: string
  cacheExpiryTime: number
}

const rootPath = dirname(require.main.filename)

const configPath = join(rootPath, '..', 'config.json')
const devConfigPath = join(rootPath, '..', 'config.dev.json')

const getConfig = () => {
  let config: Config = require(configPath)

  if(process.env.DEVELOPMENT == 'true') {
    if(existsSync(devConfigPath)) {
      config = require(devConfigPath)
    } else {
      console.log('No dev config found. Falling back to default config')
    }
  } 
  
  return config
}

export default getConfig