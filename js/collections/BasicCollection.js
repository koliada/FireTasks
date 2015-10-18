(function () {
    "use strict";

    var utils = require('../utils');

    var BasicCollection = function () {
        this.data = [];
        this.storage = null;
    };

    /**
     * Finds data item by the given key and value
     * @param {String} key
     * @param {String} value
     * @throws TypeError
     * @returns {*|null} Null if not found
     */
    BasicCollection.prototype.getBy = function (key, value) {

        if (!utils.isString(key) || !utils.isString(value)) {
            throw new TypeError('key or value is not a string');
        }

        var data = this.data,
            length = data.length, i;

        try {
            for (i = 0; i < length; i++) {
                if (value === data[i].data[key]) {
                    return data[i];
                }
            }
            return null;
        } catch (e) {
            throw e;
        }
    };

    BasicCollection.prototype.getById = function (id) {
        return this.getBy('id', id);
    };

    BasicCollection.prototype.getLength = function () {
        return this.data.length;
    };

    BasicCollection.prototype.getAt = function (index) {
        return this.data[index] || null;
    };

    BasicCollection.prototype.remove = function (entity) {
        var index = null;
        if (utils.isFunction(entity.getIndex)) {
            index = entity.getIndex();
        }
        if (utils.isNumber(entity)) {
            index = entity;
            entity = this.getAt(index);
        }
        this.data.splice(index, 1);
        if (entity.collection === this) {
            entity.collection = null;
        }
    };

    BasicCollection.prototype.each = function (callback, scope) {
        this.data.forEach(callback, scope);
    };

    BasicCollection.prototype.getRange = function (from, to) {
        return this.data.slice(from, to);
    };

    BasicCollection.prototype.addAt = function (index, items) {
        index = utils.isDefined(index) ? index : (this.getLength());
        Array.prototype.splice.apply(this.data, [index, 0].concat(items));
    };

    BasicCollection.prototype.getAll = function () {
        return this.data;
    };

    module.exports = BasicCollection;

}());
