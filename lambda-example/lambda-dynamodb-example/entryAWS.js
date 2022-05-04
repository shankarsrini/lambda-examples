'use strict';

/**
 * Define Constants
 */
const FUNCTION_NAME = 'lambda-dynamobb-example-handler';

/**
 * Require
 */
const myContext = require('./context');
const configClientAWS = require('./config-cache-aws');
const config = require('./config');
const metrics = require('./metrics')(FUNCTION_NAME);
const logger = require('./logger');
const util = require('./util');
const {
    BaseError,
    UnknownError
} = require('./base-error');
const {
    RefreshConfigError, NoEnvProvidedError
} = require('./system-error');

/**
 * Setup static service context for AWS
 * Settings persist between lambda calls
 */
myContext.log = logger;
myContext.config = configClientAWS.loadConfig(config);
myContext.config = Object.assign(myContext.config, process.env);
myContext.metrics = metrics;

/**
 * Require Lambda service
 */
const { lambdaHandler } = require('./service');

/**
 * AWS Handler
 *
 * @param {object} event JS object with input event
 * @param {object} context AWS Lambda context object
 * @param {object} callback Function to return data to caller
 */
exports.handler = async function (event, context, callback) {
    // Setup service context for AWS
    myContext.eventContext = context;
    myContext.event = event;

    myContext.saveCorrelationId(myContext.event, myContext.eventContext);
    // initializing the log builder
    myContext.logBuilder = require('./log-entry-builder')({
        correlationId: myContext.correlationId,
        event: myContext.event,
        awsContext: myContext.eventContext
    });

    myContext.log.info(myContext.logBuilder
        .withMessage(`${FUNCTION_NAME} received an event`)
        .buildServiceRequestLogEntry(event, (event) => util.maskJsonData(event)).info);

    myContext.callback = (error, response) => {
        myContext.log.info(myContext.logBuilder
            .withMessage(`Calling callback on ${FUNCTION_NAME}`)
            .withData({ response, error })
            .buildLogEntry().info);
        callback(error, response);
        myContext.metrics.reportMetrics();
    };

    // Setup Environment
    setupEnv();
    try {
        // Access SSM Parameter Store
        await myContext.config.refreshConfig()
            .catch(refreshConfigError => {
                throw new RefreshConfigError({ originalError: refreshConfigError });
            });
        // Set log level based on retrieved configuration
        logger.transports.console.level = myContext.config.LogLevel;
        await lambdaHandler(event);
    } catch (err) {
        let error;
        if (err instanceof BaseError) {
            error = err;
        } else {
            error = new UnknownError({
                originalError: err
            });
        }
        myContext.log.error(myContext.logBuilder
            .withMessage(`${FUNCTION_NAME} service has error occured`)
            .buildErrorLogEntry(error).info);
        myContext.callback('FAILURE');
    }
};

/**
 * Set environment
 */
const setupEnv = () => {
    // Get Stage Variable env
    const stageEnv = myContext.config.STAGE_ENV;
    // Stage env must always be provided
    if (!util.isValidField(stageEnv)) {
        throw new NoEnvProvidedError();
    } else if (myContext.config.getEnv() !== stageEnv) {
        if (myContext.config.getEnv() === undefined) {
            myContext.log.info(myContext.logBuilder.withMessage(`Setting Environment to ${stageEnv}`).buildLogEntry().info);
        } else {
            /**
             * The stage variable 'env' should not change, warn if it does
             */
            myContext.log.warn(myContext.logBuilder.withMessage(`Changing Environment from ${myContext.config.getEnv()} to ${stageEnv}`).buildLogEntry().info);
        }

        myContext.config.setEnv(stageEnv);
    }
};
