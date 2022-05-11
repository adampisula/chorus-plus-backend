import express from 'express'
import { google } from 'googleapis'

import downloadRouter from './routes/download'
import panelRouter from './routes/panel'

import ExtendedRequest from './types/ExtendedRequest'
import DAO from './utils/stackDatabase'
import cronRemoveStackEntries from './cronRemoveStackEntries'
import logger from './utils/logger'
import { existsSync, writeFileSync } from 'fs'
import dotenv from 'dotenv'
import basicAuth from 'express-basic-auth'

dotenv.config()

const app = express()
const PORT = 80

const config = require('../config.json')

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

const randomString = (length: number) => {
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  
  for ( let i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

// CREATE PANEL AUTH IDENTITIES
const authIdentitiesLogins = [ 'admin' ]
const authIdentities = {}

for(let i = 0; i < authIdentitiesLogins.length; i++) {
  authIdentities[authIdentitiesLogins[i]] = randomString(16)
}

logger.info(`Identities created: ${JSON.stringify(authIdentities)}`)

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
app.use(downloadRouter)

app.set('view engine', 'ejs')

app.use(basicAuth({
  users: authIdentities,
  challenge: true,
}))
app.use(panelRouter)

cronRemoveStackEntries.start()

app.listen(PORT, () => {
  logger.info(`Chorus Plus is listening on port ${PORT}`)
})