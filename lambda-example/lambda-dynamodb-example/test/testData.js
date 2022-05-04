'use strict';

/**
 * Events
 */
const validRequestEvent = {
    'body-json': {},
    'params': {
        header: {
            'Content-Type': 'application/json',
        }
    }
};

const invalidSignatureRequestEvent = {
    'body-json': {},
    'params': {
        header: {
            'Content-Type': 'application/json',
        }
    }
};

const validS3Response = {
    Body: Buffer.from(JSON.stringify({
        locations: [
            { storeNumber: '55908-0', status: 'healthy', technicalDetails: null },
            { storeNumber: '3708-0', status: 'healthy', technicalDetails: null }
        ]
    }))
};

const invalidS3Response = { Body: Buffer.from('{]') };

/**
 * Exports
 */
module.exports = {
    validRequestEvent,
    invalidSignatureRequestEvent,
    validS3Response,
    invalidS3Response
};
