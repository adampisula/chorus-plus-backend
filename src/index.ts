import express from 'express'
import { google } from 'googleapis'

import indexRouter from './routes/index'
import ExtendedRequest from './types/ExtendedRequest'
import DAO from './utils/stackDatabase'
import cronRemoveStackEntries from './cronRemoveStackEntries'
import logger from './utils/logger'
import { existsSync, writeFileSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = 80

const KEYFILEPATH = 'ServiceAccountCredentials.json'
const SCOPES = [ 'https://www.googleapis.com/auth/drive' ]

if(!existsSync(KEYFILEPATH) || (process.env.SAC_PROJECT_ID && process.env.SAC_PRIVATE_KEY_ID && process.env.SAC_PRIVATE_KEY && process.env.SAC_CLIENT_EMAIL && process.env.SAC_CLIENT_ID && process.env.SAC_CLIENT_X509_CERT_URL)) {
  const serviceAccountCredentials = {
    type: process.env.SAC_TYPE || "service_account",
    project_id: process.env.SAC_PROJECT_ID,
    private_key_id: process.env.SAC_PRIVATE_KEY_ID,
    private_key: process.env.SAC_PRIVATE_KEY.replaceAll("\\n", "\n"),
    client_email: process.env.SAC_CLIENT_EMAIL,
    client_id: process.env.SAC_CLIENT_ID,
    auth_uri: process.env.SAC_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
    token_uri: process.env.SAC_TOKEN_URI || "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: process.env.SAC_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.SAC_CLIENT_X509_CERT_URL,
  }

  writeFileSync(KEYFILEPATH, JSON.stringify(serviceAccountCredentials, null, 2))
}

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
})

const driveService = google.drive({ version: 'v3', auth })

// Database Access Object
const dao = new DAO()
dao.init()

app.use((req: ExtendedRequest, res, next) => {
  req.gdrive = driveService
  req.dao = dao
  next()
})
app.use(indexRouter)

cronRemoveStackEntries.start()

app.listen(PORT, () => {
  logger.info(`Chorus Plus is listening on port ${PORT}`)
})