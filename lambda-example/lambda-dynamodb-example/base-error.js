'use strict';

/**
 * @class BaseError
 *
 * @param {string} message Error message
 * @param {Object} [logDetail=undefined] Error details object to be logged
 * @param {Object} [responseDetail=undefined] Error details object to be returned
 */
class BaseError extends Error {
    constructor (message, logDetail = undefined, responseDetail = undefined) {
        super(message);
        this.name = this.constructor.name;
        this.logDetail = logDetail;
        this.responseDetail = responseDetail;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * @class UnknownError
 *
 * @param {Object} [logDetail=undefined] Error details object to be logged
 * @param {Object} [responseDetail=undefined] Error details object to be returned
 */
class UnknownError extends BaseError {
    constructor (logDetail, responseDetail) {
        super('Unknown Internal System Error', logDetail, responseDetail);
        this.httpCode = 500;
        this.code = 'SYST-9999';
        this.retry = true;
    }
}

/**
 * @class InternalError
 *
 * @param {Object} [logDetail=undefined] Error details object to be logged
 * @param {Object} [responseDetail=undefined] Error details object to be returned
 */
class InternalError extends BaseError {
    constructor (logDetail, responseDetail) {
        super('Internal System Error', logDetail, responseDetail);
        this.httpCode = 500;
        this.code = 'SYST-9998';
        this.retry = true;
    }
}

/**
 * exports
 */
module.exports = {
    BaseError,
    UnknownError,
    InternalError
};
