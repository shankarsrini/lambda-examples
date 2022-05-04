'use strict';

// global imports
const util = require('./util');

/**
 * Set Log Builder function
 * @param {string} correlationId Name of parameter correlationId to set in identifiers object
 * @param {object} event lambda event object
 * @param {object} awsContext aws context object
 */

const logBuilder = ({ correlationId, event, awsContext }) => {
    // throw error if event or awsContext comes as undefined
    if (!util.isValidField(correlationId) || !util.isValidField(event) || !util.isValidField(awsContext)) {
        throw new Error('logBuilder needs correlationId, event, awsContext params');
    }

    // Can be accessed throughout the module
    const identifiers = {
        correlationId: undefined, // generated in context (separate PBI)
        lambdaRequestId: undefined, // comes from context
        apiGatewayRequestId: undefined, // comes from event.context
        serviceName: undefined, // comes from context
        externalRefId: undefined, // Request field to Fresh Order
        countryCode: undefined,
        deviceType: undefined
    };

    // set temporary data
    const tempData = {
        data: {},
        message: '',
        dump: function () {
            const output = JSON.parse(JSON.stringify({
                data: this.data,
                message: this.message
            }));
            this.data = {};
            this.message = '';
            return output;
        }
    };

    identifiers.serviceName = awsContext.functionName;
    identifiers.correlationId = correlationId;
    identifiers.lambdaRequestId = awsContext.awsRequestId;
    // this will only work once we add [mapping template](https://dev.azure.com/SubwayTechnology/Middleware/_wiki/wikis/Middleware.wiki/3756/Correlation-ID)
    identifiers.apiGatewayRequestId = event.context ? event.context.apiGatewayRequestId : undefined;


    /**
     * set externalRefId in identifiers object
     * @param {string} id
     * @returns logBuilder class instance
     */
    const setExternalRefId = function (id) {
        identifiers.externalRefId = id;
        return this;
    };

    /**
     * set transactionId in identifiers object
     * @param {string} id
     * @returns logBuilder class instance
     */
    const setTransactionId = function (id) {
        identifiers.transactionId = id;
        return this;
    };

    /**
     * set countryCode in identifiers object
     * @param {string} code
     * @returns logBuilder class instance
     */
    const setCountryCode = function (code) {
        identifiers.countryCode = code;
        return this;
    };

    /**
     * set deviceType in identifiers object
     * @param {string} deviceType
     * @returns logBuilder class instance
     */
    const setDeviceType = function (deviceType) {
        identifiers.deviceType = deviceType;
        return this;
    };

    /**
     * @param {string} message message string to set
     */
    const withMessage = function (message) {
        tempData.message = message;
        return this;
    };

    /**
     * @param {Object} data data json object to set
     */
    const withData = function (data) {
        if (typeof data === 'undefined') {
            return this;
        }
        try {
            tempData.data = JSON.parse(JSON.stringify(data));
            return this; // singleton class instance
        } catch (e) {
            tempData.data = data.toString();
            return this;
        }
    };

    /**
     * Builder function for http request log entry : Public
     * To use this builder, services should use the request-util
     * @param {object} opts http request options object
     * @param {Function} debugToInfoFn optional : debugOutput function
     * @returns {object} returns debug, info
     */
    const buildHTTPRequestLogEntry = (opts, debugToInfoFn = (debugOutput) => debugOutput) => {
        if (!util.isValidField(opts)) {
            throw new Error('buildHTTPRequestLogEntry needs a options param');
        } else if (typeof opts !== 'object') {
            throw new Error('buildHTTPRequestLogEntry options param should be a JSON object');
        }
        const options = JSON.parse(JSON.stringify(opts));
        const output = {
            ...identifiers,
            ...tempData.dump(),
            externalHTTPRequest: {
                data: options,
                metadata: {
                    ...extractHTTPRequest(options)
                }
            }
        };
        return {
            debug: output,
            info: debugToInfoFn(maskAuthorization(output))
        };
    };

    /**
      * Builder function for http response log entry : Public
      * To use this builder, services should use the request-util
      * @param {object} response the full http response including body and statusCode fields
      * @param {Function} debugToInfoFn optional : debugOutput function
      * @returns {object} returns debug, info
      */
    const buildHTTPResponseLogEntry = (response, debugToInfoFn = (debugOutput) => debugOutput) => {
        if (!util.isValidField(response)) {
            throw new Error('buildHTTPResponseLogEntry needs a response param');
        } else if (typeof response !== 'object') {
            throw new Error('buildHTTPResponseLogEntry response param should be a JSON object');
        }
        const responseObj = JSON.parse(JSON.stringify(response));
        const output = {
            ...identifiers,
            ...tempData.dump(),
            externalHTTPResponse: {
                data: responseObj,
                metadata: {
                    statusCode: responseObj.statusCode
                }
            }
        };
        return {
            debug: output,
            info: debugToInfoFn(maskAuthorization(output))
        };
    };

    /**
     * Builder function for direct lambda request log entry : Public
     * @param {object} opts lambda request options object - { functionName, body }
     * @param {Function} debugToInfoFn optional : debugOutput function
     * @returns {object} returns debug, info
     */
    const buildLambdaRequestLogEntry = ({ functionName, body }, debugToInfoFn = (debugOutput) => debugOutput) => {
        if (typeof functionName !== 'string') {
            throw new Error('First param must include a string field named functionName.');
        } else if (typeof body !== 'object') {
            throw new Error('First param must include an object field named body.');
        }
        const output = {
            ...identifiers,
            ...tempData.dump(),
            lambdaRequest: {
                data: { functionName, body }
            }
        };
        return {
            debug: output,
            info: debugToInfoFn(output)
        };
    };

    /**
      * Builder function for direct lambda response log entry : Public
      * @param {object} response the full lambda response
      * @param {Function} debugToInfoFn optional : debugOutput function
      * @returns {object} returns debug, info
      */
    const buildLambdaResponseLogEntry = (response, debugToInfoFn = (debugOutput) => debugOutput) => {
        const responseObj = JSON.parse(JSON.stringify(response));
        const output = {
            ...identifiers,
            ...tempData.dump(),
            lambdaResponse: {
                data: responseObj,
                metadata: {
                    statusCode: responseObj.statusCode
                }
            }
        };
        return {
            debug: output,
            info: debugToInfoFn(output)
        };
    };

    /**
     * Builder function for dynamoDB Request log entry : Public
     * @param {object} dbRequest dynamoDB request json object
     * @param {Function} debugToInfoFn optional : debugOutput function
     * @returns {object} returns debug, info
     */
    const buildDynamoDBRequestLogEntry = (dbRequest, debugToInfoFn = (debugOutput) => debugOutput) => {
        if (!dbRequest) {
            throw new Error('buildDynamoDBRequestLogEntry needs a dbRequest param');
        } else if (typeof dbRequest !== 'object') {
            throw new Error('buildDynamoDBRequestLogEntry dbRequest param should be a JSON object');
        } else if (typeof dbRequest.TableName !== 'string') {
            throw new Error('TableName is a required field for dynamodb queries');
        }
        const requestObj = JSON.parse(JSON.stringify(dbRequest));
        const output = {
            ...identifiers,
            ...tempData.dump(),
            dbRequest: {
                data: requestObj,
                metadata: {
                    TableName: requestObj.TableName
                }
            }
        };
        return {
            debug: output,
            info: debugToInfoFn(output)
        };
    };

    /**
      * Builder function for dynamoDB Response log entry : Public
      * @param {object} dbResponse The original DynamoDB response object
      * @param {Function} debugToInfoFn optional : debugOutput function
      * @returns {object} returns debug, info
      */
    const buildDynamoDBResponseLogEntry = (dbResponse, debugToInfoFn = (debugOutput) => debugOutput) => {
        if (!util.isValidField(dbResponse)) {
            throw new Error('buildDynamoDBResponseLogEntry needs a dbResponse param');
        } else if (typeof dbResponse !== 'object') {
            throw new Error('buildDynamoDBResponseLogEntry dbResponse param should be a JSON object');
        }
        const responseObj = JSON.parse(JSON.stringify(dbResponse));
        const output = {
            ...identifiers,
            message: 'DB Response',
            ...tempData.dump(),
            dbResponse: {
                data: responseObj,
                metadata: {}
            }
        };
        return {
            debug: output,
            info: debugToInfoFn(maskAuthorization(output))
        };
    };

    /**
     * Builder function for error log entry : Public
     * @param {Error} error an instance of Error or a class that inherits from Error
     * @param {Function} debugToInfoFn optional : debugOutput function
     * @returns {object} returns debug, info
     */
    const buildErrorLogEntry = (error, debugToInfoFn = (debugOutput) => debugOutput) => {
        if (!util.isValidField(error)) {
            throw new Error('buildErrorLogEntry needs a error param');
        } else if (!(error instanceof Error)) {
            throw new Error('buildErrorLogEntry error param should be a JS Error');
        }
        const output = {
            ...identifiers,
            message: `Error ${error.name} Occurred`,
            ...tempData.dump(),
            error: {
                data: {
                    ...error,
                    errorStack: getErrorStack(error)
                },
                metadata: {
                    logDetail: getErrorStack(error)
                }
            }
        };
        return {
            debug: output,
            info: debugToInfoFn(output)
        };
    };

    /**
     * Builder function for  Service Request log entry : Public
     * @param {object} request
     * @param {Function} debugToInfoFn optional : debugOutput function
     * @returns {object} returns debug, info
     */
    const buildServiceRequestLogEntry = (request, debugToInfoFn = (debugOutput) => debugOutput) => {
        let requestObj;
        try {
            requestObj = JSON.parse(JSON.stringify(request));
        } catch (e) {
            requestObj = undefined;
        }
        if (!util.isValidField(requestObj)) {
            throw new Error('buildServiceRequestLogEntry needs a request param');
        }

        const eventSource = util.getLambdaEventSource(requestObj);
        const bodyObj = extractBodyFromEvent(requestObj, eventSource);

        const output = {
            ...identifiers,
            message: `${identifiers.serviceName} received an event`,
            ...tempData.dump(),
            serviceRequest: {
                data: {
                    ...requestObj,
                    body: bodyObj
                },
                metadata: {
                    eventSource: eventSource
                }
            }
        };
        return {
            debug: output,
            info: debugToInfoFn(maskAuthorization(output))
        };
    };

    /**
      * Builder function for  Service Response log entry : Public
      * @param {object} event
      * @param {Function} debugToInfoFn optional : debugOutput function
      * @returns {object} returns debug, info
      */
    const buildServiceResponseLogEntry = (response, debugToInfoFn = (debugOutput) => debugOutput) => {
        let responseObj;
        try {
            responseObj = JSON.parse(JSON.stringify(response));
        } catch (e) {
            responseObj = undefined;
        }
        if (!util.isValidField(responseObj)) {
            throw new Error('buildServiceResponseLogEntry needs a response param');
        }
        if (!util.isValidField(responseObj.statusCode)) {
            throw new Error('buildServiceResponseLogEntry needs a statusCode property in the response param');
        }
        // metadata is a placeholder in case we have future data we want to extract from the response object
        const output = {
            ...identifiers,
            message: `Responding from ${identifiers.serviceName}`,
            ...tempData.dump(),
            serviceResponse: {
                data: responseObj,
                metadata: {}
            }
        };
        return {
            debug: output,
            info: debugToInfoFn(maskAuthorization(output))
        };
    };

    /**
      * Builder function for S3 Request log entry : Public
      * @param {object} s3Request S3 request json object
      * @param {Function} debugToInfoFn optional : debugOutput function
      * @returns {object} returns debug, info
      */
    const buildS3RequestLogEntry = (s3Request, debugToInfoFn = (debugOutput) => debugOutput) => {
        if (!util.isValidField(s3Request)) {
            throw new Error('buildS3RequestLogEntry needs a s3Request param');
        } else if (typeof s3Request !== 'object') {
            throw new Error('buildS3RequestLogEntry s3Request param should be a JSON object');
        } else if (!s3Request.hasOwnProperty('Bucket')) {
            throw new Error('Bucket is a required field for S3 request');
        } else if (!s3Request.hasOwnProperty('Key')) {
            throw new Error('Key is a required field for S3 request');
        } 
        const requestObj = JSON.parse(JSON.stringify(s3Request));
        const output = {
            ...identifiers,
            ...tempData.dump(),
            s3Request: {
                data: requestObj,
                metadata: {
                    Bucket: requestObj.Bucket
                }
            }
        };
        return {
            debug: output,
            info: debugToInfoFn(output)
        };
    };

    /**
      * Builder function for S3 Response log entry : Public
      * @param {object} s3Response The original S3 response object
      * @param {Function} debugToInfoFn optional : debugOutput function
      * @returns {object} returns debug, info
      */
    const buildS3ResponseLogEntry = (s3Response, debugToInfoFn = (debugOutput) => debugOutput) => {
        if (!util.isValidField(s3Response)) {
            throw new Error('buildS3ResponseLogEntry needs a s3Response param');
        } else if (typeof s3Response !== 'object') {
            throw new Error('buildS3ResponseLogEntry s3Response param should be a JSON object');
        }
        const responseObj = JSON.parse(JSON.stringify(s3Response));
        const output = {
            ...identifiers,
            message: 'S3 Response',
            ...tempData.dump(),
            s3Response: {
                data: responseObj,
                metadata: {}
            }
        };
        return {
            debug: output,
            info: debugToInfoFn(output)
        };
    };

    /**
      * Builder function for SQS Request log entry : Public
      * @param {object} sqsRequest SQS request json object
      * @param {Function} debugToInfoFn optional : debugOutput function
      * @returns {object} returns debug, info
      */
    const buildSQSRequestLogEntry = (sqsRequest, debugToInfoFn = (debugOutput) => debugOutput) => {
        if (!util.isValidField(sqsRequest)) {
            throw new Error('buildSQSRequestLogEntry needs a SQSRequest param');
        } else if (typeof sqsRequest !== 'object') {
            throw new Error('buildSQSRequestLogEntry SQSRequest param should be a JSON object');
        } else if (!sqsRequest.hasOwnProperty('QueueUrl')) {
            throw new Error('QueueUrl is a required field for SQS request');
        } 
        const requestObj = JSON.parse(JSON.stringify(sqsRequest));
        const output = {
            ...identifiers,
            ...tempData.dump(),
            sqsRequest: {
                data: requestObj,
                metadata: {
                    QueueUrl: requestObj.QueueUrl
                }
            }
        };
        return {
            debug: output,
            info: debugToInfoFn(output)
        };
    };

    /**
      * Builder function for SQS Response log entry : Public
      * @param {object} sqsResponse The original SQS response object
      * @param {Function} debugToInfoFn optional : debugOutput function
      * @returns {object} returns debug, info
      */
    const buildSQSResponseLogEntry = (sqsResponse, debugToInfoFn = (debugOutput) => debugOutput) => {
        if (!util.isValidField(sqsResponse)) {
            throw new Error('buildSQSResponseLogEntry needs a SQSResponse param');
        } else if (typeof sqsResponse !== 'object') {
            throw new Error('buildSQSResponseLogEntry SQSResponse param should be a JSON object');
        }
        const responseObj = JSON.parse(JSON.stringify(sqsResponse));
        const output = {
            ...identifiers,
            message: 'SQS Response',
            ...tempData.dump(),
            sqsResponse: {
                data: responseObj,
                metadata: {}
            }
        };
        return {
            debug: output,
            info: debugToInfoFn(output)
        };
    };

    /**
     * Builder function for message log entry : Public
     * @param {Function} debugToInfoFn optional : debugOutput function
     * @returns {object} returns debug, info
     */
    const buildLogEntry = (debugToInfoFn = (debugOutput) => debugOutput) => {
        if (typeof debugToInfoFn !== 'function') {
            throw new Error("buildLogEntry's optional parameter must be a function if it exists.");
        }
        const output = {
            ...identifiers,
            ...tempData.dump()
        };
        return {
            debug: output,
            info: debugToInfoFn(output)
        };
    };

    /**
     * Builder function for custom data log entry : Public
     * @param {*} custom
     * @param {Function} debugToInfoFn optional : debugOutput function
     * @returns {object} returns debug, info
     */
    const buildCustomLogEntry = (custom, debugToInfoFn = (debugOutput) => debugOutput) => {
        if (typeof custom !== 'object') {
            throw new Error('buildCustomLogEntry custom parameter should be type of object');
        }
        const output = {
            ...identifiers,
            ...tempData.dump(),
            customData: { custom }
        };
        return {
            debug: output,
            info: debugToInfoFn(output)
        };
    };

    // extract http request attributes from http request : Private
    const extractHTTPRequest = ({ uri }) => {
        const { href, protocol, hostname, port, pathname, searchParams } = new URL(uri);
        const result = {
            href, protocol, hostname, port, pathname, searchParams
        };
        return result;
    };

    // extractBodyFromEvent function will process event from event builder function based on event source type. This function will return parsed body from extracted input event. : Private
    const extractBodyFromEvent = (eventObj, eventSource) => {
        const extractBody = (eventObj) => {
            if (eventSource === 'isApiGatewayHttp') {
                return eventObj.body;
            } else if (eventSource === 'isSqs') {
                return event.Records[0].body;
            } else if (eventSource === 'isScheduledEvent' || eventSource === 'isDirectLambdaCall') {
                return eventObj.body || eventObj['body-json'];
            }
        };
        try {
            const bodyObj = extractBody(eventObj);
            const bodyCopy = JSON.parse(JSON.stringify(bodyObj));
            return bodyCopy;
        } catch {
            return {};
        }
    };

    // Body that contains authentication token that needs to be masked
    const maskAuthorization = (body) => {
        return util.maskJsonData(body, ['Authorization', 'authorization']);
    };

    // get error stack from error instance
    const getErrorStack = (error) => {
        const errorCopy = util.safeGet(error, ['logDetail', 'originalError']) || error;
        const stackName = errorCopy.errorStack ? 'errorStack' : 'stack';
        const errorStack = errorCopy[stackName];
        if (!errorStack) {
            return {};
        }
        try {
            return JSON.parse(JSON.stringify(errorStack));
        } catch (e) {
            return JSON.stringify(errorStack);
        }
    };

    return {
        setExternalRefId,
        setTransactionId,
        setCountryCode,
        setDeviceType,
        withData,
        withMessage,
        buildLambdaRequestLogEntry,
        buildLambdaResponseLogEntry,
        buildHTTPRequestLogEntry,
        buildHTTPResponseLogEntry,
        buildDynamoDBRequestLogEntry,
        buildDynamoDBResponseLogEntry,
        buildS3RequestLogEntry,
        buildS3ResponseLogEntry,
        buildSQSRequestLogEntry,
        buildSQSResponseLogEntry,
        buildErrorLogEntry,
        buildServiceResponseLogEntry,
        buildServiceRequestLogEntry,
        buildCustomLogEntry,
        buildLogEntry
    };
};

module.exports = logBuilder;