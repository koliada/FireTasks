(function () {
    "use strict";

    var BasicEntity = require('./BasicEntity'),
        SynchronizationManager = require('../SynchronizationManager'),
        TasksCollection = require('../collections/TasksCollection'),
        ListView = require('../views/ListView'),
        ActiveListManager = require('../ActiveListManager'),
        utils = require('../utils');

    var List = function (listsCollection, listData) {

        if (!utils.isObject(listData)) {
            throw new TypeError('List must be created with list data object as second parameter');
        }

        this.super.apply(this, arguments);

        var tasks = listData.tasks;
        this.collection = listsCollection;
        this.account = this.collection.account;

        delete listData.tasks;

        this.tasks = new TasksCollection(this, tasks);
        this.view = new ListView(this, this.account.view.getListsContainer.bind(this.account.view));

        this.selected = (function (list) {
            var _selected = false;

            return function selected(value) {
                if (utils.isDefined(value)) {
                    value = Boolean(value);
                    if (_selected === value) {
                        return _selected;
                    }
                    _selected = value;
                    list.view.setActive(value);
                }
                return _selected;
            };
        }(this));
    };

    utils.inherits(List, BasicEntity);

    List.prototype.getSyncConfig = function (syncAction) {
        var instance = this;

        switch (syncAction) {
            case SynchronizationManager.actions.POST:
                return {
                    proxy: instance.collection.proxy,
                    method: "add",
                    data: {
                        title: instance.getName()
                    }
                };
                break;
            case SynchronizationManager.actions.DELETE:
                return {
                    proxy: instance.collection.proxy,
                    method: "remove",
                    urlParams: [instance.getId()]
                };
                break;
            case SynchronizationManager.actions.UPDATE:
                return {
                    proxy: instance.collection.proxy,
                    method: "update",
                    urlParams: [instance.getId()],
                    data: {
                        title: instance.getName()
                    }
                };
                break;
        }
    };

    List.prototype.doPostSyncActions = function (syncAction, data) {
        var instance = this;
        switch (syncAction) {
            case SynchronizationManager.actions.POST:
                var tempId = this.getId();
                return instance
                    .setData(data)
                    .updateInStorage(tempId)
                    .then(instance.view.update.bind(instance.view));
                break;
            case SynchronizationManager.actions.DELETE:
                var listId = instance.getId();
                return instance
                    .collection.storage.remove(listId)
                    .then(instance.collection.remove.bind(instance.collection, instance))
                    .then(instance.view.destroy.bind(instance.view));
                break;
            case SynchronizationManager.actions.UPDATE: //TODO
                instance.set('_syncAction', undefined);
                return instance.save();
                break;
        }
    };

    List.prototype.toStorage = function (excludeTasks) {
        var data = utils.clone(this.data);
        if (excludeTasks) {
            delete data.tasks;
        } else {
            data.tasks = this.tasks.toStorage();
        }
        return data;
    };

    List.prototype.updateInStorage = function (oldId) {
        return this.collection.storage.replace(oldId, this);
    };

    List.prototype.setActive = function () {
        return ActiveListManager.list(this);
    };

    List.prototype.remove = function () {
        var self = this;
        return new Promise(function (resolve, reject) {
            self.markDeleted().save().then(function () {
                ActiveListManager.checkDestroyedList(self);
                self.view.update();
                return SynchronizationManager.synchronize();
            }).then(resolve).catch(reject);
        });
    };

    List.prototype.isDeletable = function () {
        return this.getName() !== 'Uncategorized';
    };

    List.prototype.update = function (data) {
        if (utils.isEmptyObject(data)) {
            throw new Error('Unable to update list: no data passed');
        }
        var self = this;
        data._syncAction = SynchronizationManager.actions.UPDATE;
        this.set(data);
        return new Promise(function (resolve, reject) {
            self.collection.updatePosition(self);
            self.save().then(function () {
                self.view.update();
                if (self.selected()) {
                    // TODO: re-rendering tasks is not mandatory
                    return self.setActive();    // required for saved active list to be updated + title update
                } else {
                    return Promise.resolve();
                }
            }).then(function () {
                return SynchronizationManager.synchronize();
            }).then(resolve).catch(reject);
        });
    };

    module.exports = List;

}());
