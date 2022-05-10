import type { Request } from "express"
import type { drive_v3 } from "googleapis"
import type DAO from '../utils/stackDatabase'

interface ExtendedRequest extends Request {
  gdrive: drive_v3.Drive
  dao: DAO
}

export default ExtendedRequest