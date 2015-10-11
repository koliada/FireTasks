(function () {
    "use strict";

    var localforage = require('localforage');

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

    BasicStorage.prototype.clear = function () {
        return this.engine.clear();
    };

    //TODO: find a way to truly destroy DB - current implementation will not completely delete unused databases
    BasicStorage.prototype.destroy = function () {
        return this.clear();
        //return new Promise(function (resolve, reject) {
        //    this.engine.ready().then(function () {
        //        var request = indexedDB.deleteDatabase(this.engine._dbInfo.name);
        //        request.onsuccess = function () {
        //            console.log("Deleted database successfully");
        //            resolve();
        //        };
        //        request.onerror = function () {
        //            console.log("Couldn't delete database");
        //            reject();
        //        };
        //        request.onblocked = function () {
        //            console.log("Couldn't delete database due to the operation being blocked");
        //            return this.destroy();// not very good idea
        //        }.bind(this);
        //    }.bind(this));
        //}.bind(this));
    };

    module.exports = BasicStorage;

}());
