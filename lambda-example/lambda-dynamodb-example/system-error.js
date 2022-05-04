'use strict';

const {
    BaseError,
    InternalError
} = require('./base-error');

/**
 * @class Dynamo DB Access Error
 *
 * @param {Object} [logDetail=undefined] Error details object to be logged
 * @param {Object} [responseDetail=undefined] Error details object to be returned
 */
class DynamoDBAccessError extends BaseError {
    constructor (logDetail, responseDetail) {
        super('Dynamo DB Access Error', logDetail, responseDetail);
        this.code = 'SYST-9000';
        this.retry = true;
        this.overrideResponseError = new InternalError();
    }
}

/**
 * @class SQS Connection Error
 *
 * @param {Object} [logDetail=undefined] Error details object to be logged
 * @param {Object} [responseDetail=undefined] Error details object to be returned
 */
class SQSConnectionError extends BaseError {
    constructor (logDetail, responseDetail) {
        super('Unable to connect SQS or Error publishing a message to the Queue', logDetail, responseDetail);
        this.code = 'SYST-9001';
        this.retry = true;
        this.overrideResponseError = new InternalError();
    }
}

/**
 * @class JSON Parse Error
 *
 * @param {Object} [logDetail=undefined] Error details object to be logged
 * @param {Object} [responseDetail=undefined] Error details object to be returned
 */
class JSONParseError extends BaseError {
    constructor (logDetail, responseDetail) {
        super('Unexpected end of JSON input', logDetail, responseDetail);
        this.code = 'SYST-9002';
        this.retry = true;
        this.overrideResponseError = new InternalError();
    }
}

/**
 * @class NoEnvProvidedError
 *
 * thrown when input event contains invalid environment
 *
 * @param {Object} [logDetail=undefined] Error details object to be logged
 * @param {Object} [responseDetail=undefined] Error details object to be returned
 */
class NoEnvProvidedError extends BaseError {
    constructor (logDetail, responseDetail) {
        super('No Environment Provided', logDetail, responseDetail);
        this.code = 'SYST-9003';
        this.overrideResponseError = new InternalError();
    }
}

/**
 * @class RefreshConfigError
 *
 * thrown when configuration refresh fails
 *
 * @param {string} message Error message
 * @param {Object} details Error details object
 */
class RefreshConfigError extends BaseError {
    constructor (logDetail, responseDetail) {
        super('Refresh Configuration Error', logDetail, responseDetail);
        this.code = 'SYST-9004';
        this.overrideResponseError = new InternalError();
    }
}

/**
 * @class S3 Access Error
 *
 * thrown when an S3 error occurs
 *
 * @param {Object} [logDetail=undefined] Error details object to be logged
 * @param {Object} [responseDetail=undefined] Error details object to be returned
 */
class S3AccessError extends BaseError {
    constructor (logDetail, responseDetail) {
        super('S3 Access Error', logDetail, responseDetail);
        this.code = 'SYST-9005';
        this.retry = true;
        this.overrideResponseError = new InternalError();
    }
}

/**
 * @class Lambda Invoke Error
 *
 * thrown when an Lambda invoke error occurs
 *
 * @param {Object} [logDetail=undefined] Error details object to be logged
 * @param {Object} [responseDetail=undefined] Error details object to be returned
 */
class LambdaInvokeError extends BaseError {
    constructor (logDetail, responseDetail) {
        super('Lambda Invoke Error', logDetail, responseDetail);
        this.code = 'SYST-9006';
        this.retry = true;
        this.overrideResponseError = new InternalError();
    }
}

/**
 * @class Invalid Event From Source Error
 *
 * thrown when an Invalid Event From Source Error occurs
 *
 * @param {Object} [logDetail=undefined] Error details object to be logged
 * @param {Object} [responseDetail=undefined] Error details object to be returned
 */
class InvalidEventFromSourceError extends BaseError {
    constructor (logDetail, responseDetail) {
        super('Invalid Event From Source Error', logDetail, responseDetail);
        this.code = 'SYST-9007';
        this.retry = true;
        this.overrideResponseError = new InternalError();
    }
}

/**
 * @class Webhook Request Error
 *
 * thrown when an Webhook Request Error occurs
 *
 * @param {Object} [logDetail=undefined] Error details object to be logged
 * @param {Object} [responseDetail=undefined] Error details object to be returned
 */
class WebhookRequestError extends BaseError {
    constructor (logDetail, responseDetail) {
        super('Webhook Request Error', logDetail, responseDetail);
        this.code = 'SYST-9008';
        this.retry = true;
        this.overrideResponseError = new InternalError();
    }
}
module.exports = {
    DynamoDBAccessError,
    SQSConnectionError,
    JSONParseError,
    NoEnvProvidedError,
    RefreshConfigError,
    S3AccessError,
    LambdaInvokeError,
    InvalidEventFromSourceError,
    WebhookRequestError
};
