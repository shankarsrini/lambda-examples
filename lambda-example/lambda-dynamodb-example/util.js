'use strict';

const format = require('date-fns/format');
const parse = require('date-fns/parse');
const addMinutes = require('date-fns/add_minutes');
//const { PrincipalIdNotFoundError } = require('./security-error');
/**
 * Utilities module
 */
const setupUtil = function () {
    /**
     * Validate Helper functions that checks for null, empty or undefined values
     *
     * @param {Object} field the field that is being validate
     */
    const isValidField = (field) =>
        field !== undefined && field !== null && field !== '';

    /**
     * Get Query String Parameter Helper function
     *
     * @param {Object} event Request event object
     * @param {string} param Name of parameter to find in the query string
     */
    const getQueryParameter = (event, param) => {
        let value = safeGet(event, ['params', 'querystring', param]);
        if (isValidField(value)) {
            return value.trim();
        }
        return undefined;
    };

    // Return all fields not in objAttrs
    const checkFields = (obj = {}) => (fields = []) =>
        fields.filter(A => !util.isValidField(obj[A]));

    // Return all fields
    const checkItemFields = (itemArray = []) => (fields = []) =>
        itemArray.map(I => checkFields(I)(fields))
            .reduce((a, b) => a.concat(b), []);

    /**
     * Get Redacted Copy of object
     *
     * @param {Object} obj Object to be copied
     * @param {Array} keysToOmit Keys to be redacted from obj
     */
    const getRedactedCopy = (obj, keysToOmit) => {
        let redactedObj = JSON.parse(JSON.stringify(obj));

        keysToOmit.forEach(function (element) {
            let key = redactedObj;

            let levels = element.split('.');

            for (let i = 0; i < levels.length - 1; i++) {
                key = key[levels[i]];
            }

            delete key[levels[levels.length - 1]];
        });

        return redactedObj;
    };

    /**
     * Get String Parameter Helper function
     *
     * @param {Object} event Request event body
     * @param {string|Array} param Name of parameter to find in JSON body.
     *  Optionally, accepts a path for deep access.
     */
    const getBodyParameter = (event, param) => {
        if (!Array.isArray(param)) {
            param = [param];
        }
        let value = safeGet(event, param);
        if (value !== undefined && value !== null && typeof value === 'string') {
            value = value.trim();
        }
        return value;
    };

    /**
     * Safely get deeply nested attributes
     *
     * @param {Object} obj Object to be referenced
     * @param {Array} path Path to attribute
     * @param {*} [errorValue=undefined] Optional custom error value to return if
     *  path is invalid
     */
    const safeGet = (obj, path, errorValue = undefined) => {
        return path.reduce((xs, x) => (xs && xs[x] !== undefined) ? xs[x] : errorValue, obj);
    };

    /**
     * Format in UTC
     *
     * Note: If timezone is included in format, it will be local timezone.
     *
     * @param {Date|String|Number} dirtyDate - the original date
     * @param {String} [formatString='YYYY-MM-DDTHH:mm:ss.SSS'] - the string of tokens
     */
    const formatUTC = (dirtyDate, formatString = 'YYYY-MM-DDTHH:mm:ss.SSS') => {
        const date = parse(dirtyDate);
        return format(addMinutes(date, date.getTimezoneOffset()), formatString);
    };

    /**
    * Get Loggable Copy
    *
    * @param {Object} src Source object
    * @param {Object} destTemplate Destination object; only keys in this object will be copied
    * @param {number} [arrayLimit] Length to limit copying from arrays
    */
    const getLoggableCopy = (src, destTemplate, arrayLimit = undefined) => {
        let result = {};
        for (let key of Object.keys(destTemplate)) {
            if (src.hasOwnProperty(key)) {
                switch (typeof src[key]) {
                    case 'string':
                        if (typeof destTemplate[key] === 'string' && destTemplate[key] !== '') {
                            result[key] = destTemplate[key] + src[key].substring(destTemplate[key].length);
                        } else {
                            result[key] = src[key];
                        }
                        break;
                    case 'number':
                    case 'boolean':
                        result[key] = src[key];
                        break;
                    case 'object':
                        if (Array.isArray(src[key])) {
                            if (Array.isArray(destTemplate[key])) {
                                // Populate array object
                                let destElementTemplate = destTemplate[key][0];
                                result[key] = [];
                                // If arrayLimit has been set, only copy max arrayLimit elements
                                let arrayPopulateLength = arrayLimit ?
                                    Math.min(arrayLimit, src[key].length) : src[key].length;
                                for (let i = 0; i < arrayPopulateLength; i++) {
                                    result[key].push(getLoggableCopy(src[key][i], destElementTemplate, arrayLimit));
                                }
                            } else {
                                // Source is an array, destination expected a non-array object
                                result[key] = [];
                            }
                        } else {
                            if (Array.isArray(destTemplate[key])) {
                                // Source is a non-array object, destination expected an array
                                result[key] = {};
                            } else {
                                // Populate non-array object
                                result[key] = getLoggableCopy(src[key], destTemplate[key], arrayLimit);
                            }
                        }
                        break;
                    default:
                        // Other types not supported
                        result[key] = 'Source type unsupported: ' + typeof src[key];
                }
            } else {
                // Key wasn't in source object
                result[key] = 'Source does not have key';
            }
        }
        return result;
    };

    /**
     * Pad number
     *
     * @param {number} number Number to be padded
     * @param {number} length Length of result string
     * @param {string} padChar Character to be used for padding
     */
    const pad = (number, length, padChar = '0') => {
        let paddedNumber = '' + number;
        let difference = length - paddedNumber.length;
        for (let i = 0; i < difference; i++) {
            paddedNumber = padChar + paddedNumber;
        }
        return paddedNumber;
    };

    /**
     * extract guest id from requestContext authorizer
     * @params {object} event the event
     */
    const getGuestId = (event) => {
        // compatibility with RO replatform phase one
        const queryParamGuestId = util.safeGet(event, ['queryStringParameters', 'guestId']);
        if (queryParamGuestId !== undefined) {
            return queryParamGuestId;
        }
        // 'typical' auth flow after replatform
        const authObject = util.safeGet(event, ['requestContext', 'authorizer']);
        if (authObject === undefined) {
           /* throw new PrincipalIdNotFoundError({
                event,
                description: 'authorization object undefined'
            });*/
        }
        const identifier = util.safeGet(authObject, ['principalId']);
        if (identifier !== undefined) {
            return identifier;
        }
        /*throw new PrincipalIdNotFoundError({
            event,
            description: 'caller is not a customer'
        });*/
    }

    return {
        isValidField: isValidField,
        getQueryParameter: getQueryParameter,
        checkItemFields: checkItemFields,
        checkFields: checkFields,
        getRedactedCopy: getRedactedCopy,
        getBodyParameter: getBodyParameter,
        safeGet: safeGet,
        formatUTC: formatUTC,
        getLoggableCopy: getLoggableCopy,
        pad: pad,
        getGuestId: getGuestId
    };
};

const util = setupUtil();

/**
 * Exports
 */
module.exports = util;
