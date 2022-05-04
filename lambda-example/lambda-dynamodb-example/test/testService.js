'use strict';

/* global describe it */

const chai = require('chai');
const should = chai.should();

const nock = require('nock');
const decache = require('decache');

const { S3AccessError } = require('./system-error');

require('dotenv').config({ path: './test/test.env' });

const testCheckHealthEvents = require('./testData');

describe('Check Health Unit Tests', () => {
    let testCounter = 1;
    describe('Positive Tests', () => {
        it(`${testCounter++} - Should succeed getting healthy stores from s3 bucket`, (done) => {
            decacheFiles();
            const awsMock = require('aws-sdk-mock');
            let filename;
            awsMock.mock('S3', 'getObject', (params, callback) => {
                filename = params.Key;
                callback(null, testCheckHealthEvents.validS3Response);
            });
            const checkHealth = require('../entryUnitTests');
            // mock the date
            checkHealth.handler(testCheckHealthEvents.validRequestEvent, {}, (err, result) => {
                try {
                    should.not.exist(err);
                    should.exist(result);
                    filename.should.equal('storehealthcache');
                    if (!nock.isDone()) {
                        throw Error('At least one mocked call has not been made');
                    }
                    awsMock.restore('S3');
                    done();
                } catch (error) {
                    done(error);
                }
            }
            );
        });
    });

    describe('Negative Tests', function () {
        it(`${testCounter++} - Should fail when olo signature is invalid`, (done) => {
            decacheFiles();
            const checkHealth = require('../entryUnitTests');
            checkHealth.handler(testCheckHealthEvents.invalidSignatureRequestEvent, {}, (err, result) => {
                try {
                    should.not.exist(result);
                    should.exist(err);
                    const errData = JSON.parse(err);
                    errData.responseToOlo.technicalMessage.should.equal('Invalid Signature');
                    if (!nock.isDone()) {
                        throw Error('At least one mocked call has not been made');
                    }
                    done();
                } catch (error) {
                    done(error);
                }
            });
        });

        it(`${testCounter++} - Should fail when s3 throws an error`, (done) => {
            decacheFiles();
            const awsMock = require('aws-sdk-mock');

            awsMock.mock('S3', 'getObject', (_, callback) => {
                callback(new S3AccessError('some s3 error'));
            });
            const checkHealth = require('../entryUnitTests');
            checkHealth.handler(testCheckHealthEvents.validRequestEvent, {}, (err, result) => {
                try {
                    should.not.exist(result);
                    should.exist(err);
                    const errData = JSON.parse(err);
                    errData.responseToOlo.technicalMessage.should.equal('S3 Access Error. Please try again later');
                    if (!nock.isDone()) {
                        throw Error('At least one mocked call has not been made');
                    }
                    awsMock.restore('S3');
                    done();
                } catch (error) {
                    done(error);
                }
            });
        });

        it(`${testCounter++} - should fail is json file is invalid`, (done) => {
            decacheFiles();
            const awsMock = require('aws-sdk-mock');

            awsMock.mock('S3', 'getObject', (_, callback) => {
                callback(null, testCheckHealthEvents.invalidS3Response);
            });
            const checkHealth = require('../entryUnitTests');
            checkHealth.handler(testCheckHealthEvents.validRequestEvent, {}, (err, result) => {
                try {
                    should.not.exist(result);
                    should.exist(err);
                    const errData = JSON.parse(err);
                    errData.responseToOlo.technicalMessage.should.equal('Unexpected end of JSON input. Please try again later');
                    if (!nock.isDone()) {
                        throw Error('At least one mocked call has not been made');
                    }
                    awsMock.restore('S3');
                    done();
                } catch (error) {
                    done(error);
                }
            });
        });
    });
});

function decacheFiles () {
    decache('aws-sdk-mock');
    decache('../entryUnitTests');
}
