/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";

    /**
     * Basic storage to be used as prototype for exact storage instances
     * @returns {BasicStorage}
     * @constructor
     */
    var BasicStorage = function () {
        this.engine = localforage;
        this.dbName = null;
        this.tableName = null;

        return this;
    };

    /**
     * Creates separate LocalForage instance
     */
    BasicStorage.prototype.createEngine = function () {

        if (!this.tableName) {
            throw new Error('tableName is not overridden');
        }

        this.engine = localforage.createInstance({
            name: this.dbName || this.tableName,
            storeName: this.tableName
        });
    };

    /**
     * @static
     * @returns {Object}
     */
    BasicStorage.statuses = function () {
        return {
            added: 'added',
            updated: 'updated',
            deleted: 'deleted'
        }
    };

    scope.BasicStorage = BasicStorage;

}(window));
