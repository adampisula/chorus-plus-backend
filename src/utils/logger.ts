import winston from "winston"

const config = require('../../config.json')

const logger = winston.createLogger({
  transports: [
    // LOG TO CONSOLE
    new winston.transports.Console({
      
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'DD/MM/YYYY HH:mm:ss'
        }),
        winston.format.printf(message => 
          `[${message.timestamp}] ${message.level}: ${message.message}`),
      ),
    }),
    
    // ERROR LOGGING
    new winston.transports.File({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      level: 'error',
      filename: `${config.logPath}/error.log`,
    }),

    // ACTIVITY LOGGING
    new winston.transports.File({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      level: 'info',
      filename: `${config.logPath}/activity.log`,
    }),
  ]
})

export default logger