'use strict';

/**
 * Require
 */
const myContext = require('./context');
const {
    BaseError,
    UnknownError
} = require('./base-error');
const util = require('./util');

/**
 * Setup static service context for HOST
 * Settings persist between function calls
 */
myContext.log = {
    info: () => {},
    verbose: () => {},
    error: () => {}
};
myContext.config = Object.assign({ onChange: () => { } }, process.env);
myContext.metrics = { addSample: () => { } };

/**
 * Require Lambda service
 */
const { lambdaHandler } = require('./service');

/**
 * Unit Test Handler
 *
 * @param {object} event Lambda event
 * @param {object} context Unit Test context object
 * @param {object} callback Function to return data to caller
 */
exports.handler = async (event, context, callback) => {
    // Setup service context for Unit Test
    myContext.eventContext = context;
    myContext.event = event;

    // setting correlationId in the context.
    myContext.saveCorrelationId(myContext.event, myContext.eventContext);

    // initializing the log builder
    myContext.logBuilder = require('./log-entry-builder')({
        correlationId: myContext.correlationId,
        event: myContext.event,
        awsContext: myContext.eventContext
    });

    myContext.log.info(myContext.logBuilder
        .withMessage('lambda-db-handler received an event')
        .buildServiceRequestLogEntry(event, (event) => util.maskJsonData(event)).info);

    // Setup service context for Unit Test
    myContext.callback = (error, response) => {
        myContext.log.info(myContext.logBuilder
            .withMessage('Calling callback on order-db-update-handler')
            .withData({ response, error })
            .buildLogEntry().info);
        callback(error, response);
    };

    try {
        await lambdaHandler(event);
    } catch (err) {
        let error;
        /* istanbul ignore else */
        if (err instanceof BaseError) {
            error = err;
        } else {
            error = new UnknownError('Unhandled Error', {
                originalError: err
            });
        }
        myContext.log.error(myContext.logBuilder
            .withMessage('order-db-update-handler service has error occured')
            .buildErrorLogEntry(error).info);
        myContext.callback('FAILURE');
    };
};
