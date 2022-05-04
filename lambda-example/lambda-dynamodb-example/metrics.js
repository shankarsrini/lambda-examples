'use strict';

/**
 * Define Constants
 */
const METRIC_NAMESPACE = 'ShankarWorkshop/Lambda';
const METRIC_NAME = 'Error';

/**
 * Require
 */
const context = require('./context');
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

/**
 * Load Metrics
 *
 * @param {string} functionName String Name to use as Function-dimension of Error metric
 * @return {Object} Metrics module closure used to record and report metrics
 */
const loadMetrics = (functionName) => {
    var metricsUsed = false;
    var metrics = {};

    /**
     * Reset Metrics state
     */
    const resetMetrics = function () {
        metricsUsed = false;
        metrics = {};
    };

    /**
     * Add Sample
     *
     * @param {string} key Name of Error to be used as Type-dimension of Error metric
     */
    const addSample = function (key) {
        metricsUsed = true;

        const currentValue = metrics[key] || 0;

        metrics[key] = currentValue + 1;
    };

    /**
     * Report Metrics current state to CloudWatch
     */
    const reportMetrics = function () {
        if (!metricsUsed) {
            return;
        }

        context.log.info('Reporting Error Metrics');

        var metricData = Object.keys(metrics).map(key => ({
            MetricName: METRIC_NAME,
            Dimensions: [
                {
                    Name: 'Type',
                    Value: key
                },
                {
                    Name: 'FunctionName',
                    Value: functionName
                },
                {
                    Name: 'Environment',
                    Value: context.config.getEnv()
                }
            ],
            Timestamp: new Date(),
            Unit: 'Count',
            Value: metrics[key]
        }));

        var params = {
            MetricData: metricData,
            Namespace: METRIC_NAMESPACE
        };
        cloudwatch.putMetricData(params, function (err, data) {
            if (err) {
                context.log.error(err, err.stack);
            } else {
                context.log.verbose('Succeeded putting metrics data', { data: data });
            }
        });

        resetMetrics();
    };

    const metricsAWS = {
        addSample: addSample,
        reportMetrics: reportMetrics
    };

    return metricsAWS;
};

module.exports = loadMetrics;
