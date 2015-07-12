/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";

    var BasicCollection = function () {
        this.data = [];
        this.storage = null;

        return this;
    };

    /**
     * Finds data item by the given key and value
     * @param {String} key
     * @param {String} value
     * @throws TypeError
     * @returns {*|null} Null if not found
     */
    BasicCollection.prototype.getBy = function (key, value) {

        if (!FT.isString(key) || !FT.isString(value)) {
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

    BasicCollection.prototype.empty = function () {
        this.data.removeAll();
    };

    BasicCollection.prototype.remove = function (entity) {
        if (FT.isFunction(entity.getIndex)) {
            entity = entity.getIndex();
        }
        if (FT.isNumber(entity)) {
            this.data.splice(entity, 1);
        }
        if (entity.collection === this) {
            entity.collection = null;
        }
    };

    BasicCollection.prototype.each = function (callback) {
        this.data.forEach(callback);
    };

    BasicCollection.prototype.getRange = function (from, to) {
        return this.data.slice(from, to);
    };

    BasicCollection.prototype.addAt = function (index, items) {
        index = FT.isDefined(index) ? index : (this.getLength());
        Array.prototype.splice.apply(this.data, [index, 0].concat(items));
    };

    scope.BasicCollection = BasicCollection;

}(window));
