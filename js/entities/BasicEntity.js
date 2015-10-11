(function () {
    "use strict";

    var SynchronizationManager = require('../SynchronizationManager'),
        BasicCollection = require('../collections/BasicCollection'),
        utils = require('../utils');

    /**
     *
     * @param collection
     * @param data
     * @returns {BasicEntity}
     * @constructor
     */
    var BasicEntity = function (collection, data) {
        this.collection = collection;
        this.data = data || {};
        this.deleted = this.get("_syncAction") === SynchronizationManager.actions.DELETE;

        return this;
    };

    /**
     * Updates instance property(ies)
     * @param {String|Object} key
     * @param {String|undefined} [value]
     * @returns {BasicEntity}
     */
    BasicEntity.prototype.set = function (key, value) {
        if (utils.isObject(key)) {
            var self = this;
            utils.iterate(key, function (value, key) {
                self.set(key, value);
            });
            return self;
        }

        if (value === undefined) {
            delete this.data[key];
        } else {
            this.data[key] = value;
        }
        return this;
    };

    /**
     * Complete data override.
     * Dangerous!
     * @param {Object} data
     * @returns {BasicEntity}
     */
    BasicEntity.prototype.setData = function (data) {
        if (!utils.isObject(data)) {
            throw new TypeError("Passed data is not an object");
        }
        this.data = data;
        return this;
    };

    BasicEntity.prototype.get = function (key) {
        return this.data[key];
    };

    BasicEntity.prototype.getId = function () {
        return this.get('id');
    };

    BasicEntity.prototype.getName = function () {
        return this.get('title');
    };

    BasicEntity.prototype.markDeleted = function () {
        this.set("_syncAction", SynchronizationManager.actions.DELETE);
        this.deleted = true;
        return this;
    };

    BasicEntity.prototype.isDeleted = function () {
        return this.deleted === true;
    };

    BasicEntity.prototype.isEqual = function (entity) {
        return this.getId() === entity.getId() || JSON.stringify(this.data) === JSON.stringify(entity.data);
    };

    BasicEntity.prototype.getIndex = function () {
        return this.collection.data.indexOf(this);
    };

    BasicEntity.prototype.save = function () {
        return this.collection.storage.save(this);
    };

    BasicEntity.prototype.setCollection = function (collection) {
        if (!BasicCollection.prototype.isPrototypeOf(collection)) {
            throw new TypeError('Cannot set collection. Invalid arguments')
        }
        this.collection && this.collection.remove(this);
        this.collection = collection;
        return this;
    };

    module.exports = BasicEntity;
}());
