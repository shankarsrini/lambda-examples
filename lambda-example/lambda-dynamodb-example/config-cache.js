'use strict';

/**
 * Define Constants
 */
const DEFAULT_EXPIRY_MS = 30 * 60 * 1000;
const DEFAULT_SSM_REQUEST_TIMEOUT_MS = 15 * 1000;

/**
 * Require
 */
const EventEmitter = require('events');
const myContext = require('./context');
const AWS = require('aws-sdk');

const ssm = new AWS.SSM({
    apiVersion: '2014-11-06',
    httpOptions: {
        timeout: DEFAULT_SSM_REQUEST_TIMEOUT_MS
    }
});

/**
 * Load Configuration
 *
 * @param {Object[]} configItems Configuration items and aliases
 * @param {string} configItems[].name Name of item in configuration, /<ENV>/ will be prepended
 * @param {string} configItems[].alias Name to refer to configuration item within local cache
 * @param {number} [expiryMs] Cache Expiry time in milliseconds
 */
function loadConfig(configItems, expiryMs = DEFAULT_EXPIRY_MS) {
    /**
     * Config state
     */
    const eventEmitter = new EventEmitter();
    const aliases = configItems.map(I => I.alias);
    var env;
    var cache = {
        expiration: new Date(0),
        items: {}
    };
    var keyMap;
    var partialParamArray;
    var partialAliasArray;

    /**
     * Build Key Map from configItems
     *
     * @param {string} env Environment indicator (e.g. 'DEV', 'PROD')
     * @param {Object[]} configuration Configuration items and aliases
     * @param {string} configuration[].name Name of item in configuration, /<ENV>/ will be prepended
     * @param {string} configuration[].alias Name to refer to configuration item within local cache
     */
    const buildKeyMap = (env, configuration) => {
        const config = {};
        for (const item of configuration) {
            Object.defineProperty(config, '/' + env + item.name, {
                value: item.alias,
                enumerable: true,
                writable: false
            });
        }
        return config;
    };

    /**
     * Get env
     */
    const getEnv = () => {
        return env;
    };

    /**
     * Set env to the given value, and force configuration refresh
     *
     * @param {string} newEnv Environment indicator (e.g. 'DEV', 'PROD')
     */
    const setEnv = newEnv => {
        // If the ENV hasn't changed, don't rebuild cache
        if (env === newEnv) {
            return;
        }

        env = newEnv;
        keyMap = buildKeyMap(env, configItems);
        if (expiryMs <= 0) {
            throw new Error(
                'you need to specify an expiry (ms) greater than 0, or leave it undefined'
            );
        }

        /**
         * Pre-process configuration items and aliases
         */
        const fullParams = Object.keys(keyMap);
        partialParamArray = fullParams.reduce(
            (accum, cur) => {
                if (accum[accum.length - 1].length >= 10) {
                    accum.push([cur]);
                } else {
                    accum[accum.length - 1].push(cur);
                }
                return accum;
            },
            [[]]
        );
        partialAliasArray = partialParamArray.map(partialParams =>
            partialParams.map(param => keyMap[param])
        );

        /**
         * Retaining old items ensures that any config change event listeners
         * will receive the onChange callback
         */
        cache = {
            expiration: new Date(0),
            items: cache.items
        };
    };

    /**
     * Validate all keys are present in params
     *
     * @param {Array} keys Configuration items to validate are present in params
     * @param {Object} params Param
     */
    const validate = (keys, params) => {
        const missing = keys.filter(k => params[k] === undefined);
        if (missing.length > 0) {
            throw new Error(`missing keys: ${missing}`);
        }
    };

    /**
     * Reload all configuration
     */
    const reload = function () {
        if (env === undefined) {
            throw new Error('env must be set before refreshing config');
        }

        const reloadCalls = [];

        for (let i = 0; i < partialParamArray.length; i++) {
            reloadCalls.push(
                reloadPart(partialParamArray[i], partialAliasArray[i])
            );
        }

        return Promise.all(reloadCalls).then(() => {
            const now = new Date();
            cache.expiration = new Date(now.getTime() + expiryMs);
            myContext.log.debug('current configuration', cache);
        });
    };

    /**
     * Reload partial configuraiton
     *
     * AWS SSM getParameters can only be called with maximum 10 parameters at once
     *
     * @param {Array} partialParams Array of parameters to fetch from SSM
     * @param {Array} partialAliases Array of aliases corresponding to partialParams
     */
    const reloadPart = function (partialParams, partialAliases) {
        myContext.log.verbose('loading configuration', {
            partialParams: partialParams
        });

        const req = {
            Names: partialParams,
            WithDecryption: true
        };
        return new Promise(function (resolve, reject) {
            ssm.getParameters(req, function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    const params = {};
                    const changedParams = [];
                    const initializedParams = [];
                    for (const p of data.Parameters) {
                        params[keyMap[p.Name]] = p.Value;

                        if (cache.items[keyMap[p.Name]] === undefined) {
                            initializedParams.push(keyMap[p.Name]);
                        } else if (cache.items[keyMap[p.Name]] !== p.Value) {
                            changedParams.push(keyMap[p.Name]);
                        }
                    }

                    validate(partialAliases, params);

                    myContext.log.verbose('successfully loaded configuration', {
                        partialParams: partialParams
                    });

                    cache.items = Object.assign(cache.items, params);

                    if (initializedParams.length > 0) {
                        eventEmitter.emit('initialize', initializedParams);
                    }
                    if (changedParams.length > 0) {
                        eventEmitter.emit('change', changedParams);
                    }

                    resolve(data);
                }
            });
        });
    };

    /**
     * Get Value of configuration item
     *
     * @param {string} key name of configuration item
     */
    const getValue = function (key) {
        if (cache.expiration.getTime() !== 0) {
            return cache.items[key];
        } else {
            throw new Error('configuration must be refreshed before accessing');
        }
    };

    /**
     * Create configuration cache object
     */
    const config = {
        onChange: listener => eventEmitter.addListener('change', listener),
        onInitialize: listener => eventEmitter.addListener('initialize', listener),
        setEnv: setEnv,
        getEnv: getEnv,
        refreshConfig: () => {
            const now = new Date();
            if (now > cache.expiration && aliases.length > 0) {
                return reload();
            } else {
                myContext.log.info('Current config key count: ', aliases.length);
                return Promise.resolve();
            }
        }
    };

    /**
     * Create accessors for each configuration item
     */
    for (const key of aliases) {
        Object.defineProperty(config, key, {
            get: function () {
                return getValue(key);
            },
            enumerable: true,
            configurable: false
        });
    }

    return config;
}

module.exports = {
    loadConfig
};
