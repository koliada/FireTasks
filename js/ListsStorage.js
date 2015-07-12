/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";

    var ListsStorage = function (listsCollection) {

        if (!ListsCollection.prototype.isPrototypeOf(listsCollection)) {
            throw new TypeError('ListsStorage must be created with ListsCollection instance as a parameter');
        }

        BasicStorage.apply(this, arguments);

        this.collection = listsCollection;
        this.dbName = listsCollection.account.getId();
        this.tableName = 'lists';
        this.createEngine();

        return this;
    };

    ListsStorage.prototype = Object.create(BasicStorage.prototype);
    ListsStorage.prototype.constructor = ListsStorage;

    ListsStorage.prototype.save = function (list) {

        if (!List.prototype.isPrototypeOf(list)) {
            throw new TypeError('list is not a List instance');
        }

        var listData = list.toStorage(),
            id = list.getId(),
            self = this;
        return new Promise(function (resolve, reject) {
            self.engine.getItem(id).then(function (data) {
                self.engine.setItem(id, listData).then(resolve).catch(reject);
            }).catch(function (e) {
                Logger.error(e);
                reject(e);
            });
        });
    };

    ListsStorage.prototype.replace = function (listId, list) {
        var self = this;

        if (!list instanceof List) {
            throw new TypeError("Unable to replace a list: Invalid arguments");
        }

        return self.remove(listId).then(function () {
            return self.save(list);
        });
    };

    /**
     * Removes list with given id from the storage
     * @param {List|String} listId
     * @returns {Promise}
     */
    ListsStorage.prototype.remove = function (listId) {

        if (List.prototype.isPrototypeOf(listId)) {
            listId = listId.getId();
        }

        var self = this;
        return new Promise(function (resolve, reject) {
            self.engine.getItem(listId).then(function () {
                self.engine.removeItem(listId).then(resolve).catch(reject);
            }).catch(function (e) {
                Logger.error(e);
                reject(e);
            });
        });
    };

    ListsStorage.prototype.saveAll = function () {
        var self = this;
        return Promise.all(this.collection.data.map(function (list) {
            return self.save(list);
        }));
    };

    ListsStorage.prototype.load = function () {
        var self = this,
            result = [];
        return new Promise(function (resolve, reject) {
            self.engine.iterate(function (value, key) {
                result.push(new List(self.collection, value));
            }).then(function () {
                resolve(result);
            }).catch(function (error) {
                Logger.error('failed to retrieve lists from storage', error);
                reject(error);
            });
        });
    };

    scope.ListsStorage = ListsStorage;

}(window));
