'use strict';

/**
 * Require
 */
const util = require('./util');
const context = require('./context');
const AWS = require('aws-sdk');

/**
 * Constants
 *

/**
 * Order DB update handler entry point - this is called by the AWS handler function.
 *
 * @param {object} event lambda-db-handler event
 */
const lambdaHandler = async (event) => {
    console.log("Inside Lambda function handler execution");
    context.callback(null, 'SUCCESS');
};

const convertDynamoDBJSONToPureJSON = (image) => {
    return AWS.DynamoDB.Converter.unmarshall(image);
};

/**
 * This function converts oldImage and newImage into JSON format and invoke Guest Notification API
 *
 * @param  {object} eventRecord DynamoDB stream event
 * @throws error if 500 error occurs while calling Guest Api
 */
const notifyGuest = async (eventRecord) => {
    if (eventRecord.eventName === MODIFY) {
        const oldImage = convertDynamoDBJSONToPureJSON(eventRecord.dynamodb.OldImage);
        const newImage = convertDynamoDBJSONToPureJSON(eventRecord.dynamodb.NewImage);

        if (newImage.inboundProvider === DIGITAL_ORDER) {
            if (newImage.orderStatus === COMPLETED) {
                newImage.orderPayload = JSON.parse(util.safeGet(newImage, ['orderPayload']), '');
                oldImage.orderPayload = JSON.parse(util.safeGet(oldImage, ['orderPayload']), '');

                if (util.safeGet(newImage, ['orderPayload', 'customer', 'customerId'])) {
                    try {
                        await invokeGuestNotification(newImage);
                    } catch (error) {
                        context.log.info(context.logBuilder
                            .withMessage(`Event ${eventRecord.eventID} failed with error`)
                            .buildErrorLogEntry(error).info);

                        if (util.safeGet(error, ['name']) === 'DigitalGuestRequestError') {
                            throw error;
                        }
                    }
                } else {
                    context.log.info(context.logBuilder
                        .withMessage(`Ignoring EVENT ${eventRecord.eventID} as customer is not registered`)
                        .buildLogEntry().info);
                }
            } else {
                context.log.info(context.logBuilder
                    .withMessage(`Ignoring EVENT ${eventRecord.eventID} as orderStatus is not completed`)
                    .buildLogEntry().info);
            }
        } else {
            context.log.info(context.logBuilder
                .withMessage(`Ignoring EVENT ${eventRecord.eventID} as inbound provider is not DigitalOrder`)
                .buildLogEntry().info);
        }
    } else {
        context.log.info(context.logBuilder
            .withMessage(`Ignoring EVENT ${eventRecord.eventID} as event type is not MODIFY`)
            .buildLogEntry().info);
    }
};

/**
 * Export interface
 */
module.exports = { lambdaHandler };
