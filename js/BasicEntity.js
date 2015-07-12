/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

var BasicEntity = function (collection, data) {
    "use strict";

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
    "use strict";

    if (FT.isObject(key)) {
        var self = this;
        FT.iterate(key, function (value, key) {
            self.set(key, value);
        });
        return self;
    }

    //if (!this.data[key]) {
    //    throw new ReferenceError("'" + key + "' property not found in instance", this);
    //}

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
    "use strict";
    if (!FT.isObject(data)) {
        throw new TypeError("Passed data is not an object");
    }
    this.data = data;
    return this;
};

BasicEntity.prototype.get = function (key) {
    "use strict";
    return this.data[key];
};

BasicEntity.prototype.getId = function () {
    "use strict";
    return this.get('id');
};

BasicEntity.prototype.getName = function () {
    "use strict";
    return this.get('title');
};

/**
 * @deprecated
 * @param data
 */
BasicEntity.prototype.updateData = function (data) {
    "use strict";

    if (!FT.isObject(data)) {
        throw new TypeError('data is not an object');
    }

    this.data(FT.apply(this.data, data));
};

//BasicEntity.prototype.setData = function(data) {
//    "use strict";
//    var self = this;
//    self.data = {};
//    FT.iterate(data, function (value, key) {
//        self.data[key] = ko.observable(value);
//    });
//    return this.data;
//};

BasicEntity.prototype.markDeleted = function () {
    "use strict";
    this.set("_syncAction", SynchronizationManager.actions.DELETE);
    this.deleted = true;
    return this;
};

BasicEntity.prototype.isDeleted = function () {
    "use strict";
    return this.deleted === true;
};

BasicEntity.prototype.isEqual = function (entity) {
    "use strict";
    return this.getId() === entity.getId() || this.data === entity.data;
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
