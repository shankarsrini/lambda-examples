'use strict';

/**
 * Context module
 *
 * - Common interface for host-specific functionality
 * - Can be configured for Azure or AWS
 */
const setupContext = function () {
    /**
     * Host-specific functionality
     *
     *  log: Winston module to manage writing to logs
     *  callback: Callback function to return data to caller
     *  config: Configuration module to manage and expose configuration
     *  metrics: Metrics module, to collect and report error statistics
     *  caller: Microservice function caller module
     *  eventContext: Context object passed to handler function
     *  event: Input event in JSON format
     *  rawEvent: Input event in raw format (only used if input is not JSON)
     *  commonErrorDetails: Common error details object to be merged with
     *      error-specific details in error logs
     */
    var context = {
        log: undefined,
        callback: undefined,
        config: undefined,
        metrics: undefined,
        caller: undefined,
        eventContext: undefined,
        event: undefined,
        rawEvent: undefined,
        commonErrorDetails: undefined,
        constructFailureObject: (errCode, message) => {
            return {
                status: 'Failure',
                reason: message
            };
        }
    };

    /**
     * Setup logger interface
     */
    var logger;
    var externalLogger;
    Object.defineProperty(context, 'log', {
        get: function () {
            return externalLogger;
        },
        set: function (value) {
            setLogger(value);
        },
        enumerable: true,
        configurable: false
    });

    /**
     * Set Logger
     *
     * @param {Object} loggingModule Winston logging module
     */
    const setLogger = (loggingModule) => {
        logger = loggingModule;

        // Override context.log.error with context.logError to intercept errors
        externalLogger = Object.assign({}, logger, { error: logError });
    };

    /**
     * Add Metrics Sample
     *
     * @param {string} errCode Error Code
     */
    const addSample = (errCode) => {
        if (context.metrics !== undefined) {
            context.metrics.addSample(errCode);
        } else {
            logger.error('Failed to collect error metrics');
        }
    };

    /**
     * Log caught error
     *
     * @param {Object} error Standard Error Object
     */
    const logError = (error) => {
        logger.error(error.name, {
            error: {
                code: error.code,
                details: Object.assign({}, context.commonErrorDetails, error.logDetail),
                object: error,
                input: {
                    raw: context.rawEvent,
                    event: context.event
                }
            }
        });
        addSample(error.name);
    };

    /**
     * Log and return caught error
     *
     * @param {string} errCode Error Code
     * @param {Object} message Human-readable error message to return to caller
     * @param {Object} [error={}] Error JS object (optional)
     */
    const returnError = (errCode, message, error = {}) => {
        logError(errCode, error);

        context.callback(context.constructFailureObject(errCode, message));
    };

    /**
       * Log info and return caught error messages
       *
       * @param {string} errCode Error Code
       * @param {Object} message Human-readable error message to return to caller
       * @param {string} status Status of the response - set Failure as default (optional)
       */
    const returnErrorCallback = (errCode, message, status = 'Failure') => {
        context.log.info('Error response', { code: errCode, message: message });

        context.callback({
            status: status,
            reason: {
                code: errCode,
                message: message
            }
        });
    };

    const exportFunctions = {
        returnError: returnError,
        returnErrorCallback: returnErrorCallback
    };

    return Object.assign(context, exportFunctions);
};

/**
 * Create context closure to be exposed
 */
const context = setupContext();

/**
 * Exports
 */
module.exports = context;
