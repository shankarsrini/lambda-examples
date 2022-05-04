'use strict';

/**
 * Events
 */
const validRequestEvent = {
    'body-json': {},
    'params': {
        header: {
            'Content-Type': 'application/json',
            'X-Olo-Timestamp': '635496010947825810',
            'X-Olo-Transaction-Id': 'cff9e75d-fbb2-48d1-a090-d4916ce6ad3d',
            'X-Olo-Transaction-Signature': 'elzh4zW3Lz4Avw/c7QR81dLNAeLhNhjrWGWZEpm74UE='
        }
    }
};

const invalidSignatureRequestEvent = {
    'body-json': {},
    'params': {
        header: {
            'Content-Type': 'application/json',
            'X-Olo-Timestamp': '635496010947825810',
            'X-Olo-Transaction-Id': 'cff9e75d-fbb2-48d1-a090-d4916ce6ad3d',
            'X-Olo-Transaction-Signature': 'z'
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
