(function () {
    "use strict";

    var BasicStorage = require('./BasicStorage'),
        utils = require('../utils'),
        Logger = utils.logger;

    var ListsStorage = function (listsCollection) {
        this.super.apply(this, arguments);

        this.collection = listsCollection;
        this.dbName = listsCollection.account.getId();
        this.tableName = 'lists';
        this.createEngine();

        return this;
    };

    utils.inherits(ListsStorage, BasicStorage);

    ListsStorage.prototype.save = function (list) {
        var listData = list.toStorage(),
            listId = list.getId();
        return this.engine.setItem(listId, listData)
            .catch(function (e) {
                Logger.error(e);
            });
    };

    ListsStorage.prototype.replace = function (listId, list) {
        return this.remove(listId).then(function () {
            return this.save(list);
        }.bind(this));
    };

    /**
     * Removes list with given id from the storage
     * @param {List|String} listId or List instance
     * @returns {Promise}
     */
    ListsStorage.prototype.remove = function (listId) {
        if (!utils.isString(listId)) {
            listId = listId.getId();
        }
        return this.engine.removeItem(listId);
    };

    ListsStorage.prototype.saveAll = function () {
        return this.clear()
            .then(function () {
                return Promise.all(this.collection.getAll().map(function (list) {
                    return this.save(list);
                }.bind(this)))
            }.bind(this));
    };

    ListsStorage.prototype.load = function (iterator) {
        return this.engine.iterate(iterator).catch(function (error) {
            Logger.error('failed to retrieve lists from storage', error);
            throw error;
        });
    };

    module.exports = ListsStorage;

}());
