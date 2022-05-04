'use strict';

/**
 * Require
 */
const winston = require('winston');
const format = require('date-fns/format');

const tsFormat = () => format(new Date());
const logger = new (winston.Logger)({
    transports: [
        // colorize the output to the console
        new (winston.transports.Console)({
            timestamp: tsFormat,
            colorize: true,
            json: true,
            stringify: true,
            prettyPrint: true,
            level: 'info'
        })
    ]
});

/**
 * Exports
 */
module.exports = logger;
