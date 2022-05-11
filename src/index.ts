import express from 'express'
import { drive_v3, google } from 'googleapis'

import downloadRouter from './routes/download'
import panelRouter from './routes/panel'

import ExtendedRequest from './types/ExtendedRequest'
import DAO from './utils/stackDatabase'
import cronRemoveStackEntries from './workers/cronRemoveStackEntries'
import logger from './utils/logger'
import { existsSync, writeFileSync } from 'fs'
import dotenv from 'dotenv'
import basicAuth from 'express-basic-auth'
import randomString from './utils/randomString'
import getConfig from './utils/getConfig'
import { GoogleAuth } from 'google-auth-library'

dotenv.config()

const app = express()
const PORT = 80

const config = getConfig()

const KEYFILEPATH = 'ServiceAccountCredentials.json'
const SCOPES = [ 'https://www.googleapis.com/auth/drive' ]

if((!existsSync(KEYFILEPATH) || (process.env.SAC_PROJECT_ID && process.env.SAC_PRIVATE_KEY_ID && process.env.SAC_PRIVATE_KEY && process.env.SAC_CLIENT_EMAIL && process.env.SAC_CLIENT_ID && process.env.SAC_CLIENT_X509_CERT_URL)) && process.env.DISABLE_SAC_GENERATION == 'false') {
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

// CREATE PANEL AUTH IDENTITIES
const authIdentitiesLogins = [ 'admin' ]
const authIdentities = {}

for(let i = 0; i < authIdentitiesLogins.length; i++) {
  authIdentities[authIdentitiesLogins[i]] = randomString(16, true)
}

logger.info(`Identities created: ${JSON.stringify(authIdentities)}`)

let auth: GoogleAuth
let driveService: drive_v3.Drive

try {
  auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  })

  driveService = google.drive({ version: 'v3', auth })
} catch(err) {
  logger.error({
    error: JSON.stringify(err),
  })
}

// Database Access Object
const dao = new DAO()
dao.init()

app.use((req: ExtendedRequest, res, next) => {
  req.gdrive = driveService
  req.dao = dao
  next()
})
app.use(downloadRouter)

app.set('view engine', 'ejs')

app.use(basicAuth({
  users: authIdentities,
  challenge: true,
}))
app.use(panelRouter)

cronRemoveStackEntries.start()

try {
  app.listen(PORT, () => {
    logger.info(`Chorus Plus is listening on port ${PORT}`)
  })
} catch(err) {
  logger.error({
    error: JSON.stringify(err),
  })
}