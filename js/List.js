/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";

    /**
     * List instance
     * @param listsCollection
     * @param listData
     * @returns {List}
     * @constructor
     * @extends BasicEntity
     */
    var List = function (listsCollection, listData) {

        if (!ListsCollection.prototype.isPrototypeOf(listsCollection)) {
            throw new TypeError('List must be created with ListsCollection instance as first parameter');
        }

        if (!FT.isObject(listData)) {
            throw new TypeError('List must be created with list data object as second parameter');
        }

        BasicEntity.apply(this, arguments);

        var tasks = listData.tasks;
        this.collection = listsCollection;
        this.account = this.collection.account;
        //this.local = listData.local;

        delete listData.tasks;
        //delete listData.local;

        this.tasks = new TasksCollection(this, tasks);
        this.view = new ListView(this, this.account.view.getListsContainer.bind(this.account.view));

        this.selected = (function (list) {
            var _selected = false;

            return function selected(value) {
                if (FT.isDefined(value)) {
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

        return this;
    };

    List.prototype = Object.create(BasicEntity.prototype);
    List.prototype.constructor = List;

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

    /**
     * Validates whether given argument is a List instance
     * @param {List} list
     * @deprecated
     */
    List.validateInstance = function (list) {
        if (!List.prototype.isPrototypeOf(list)) {
            throw new TypeError('List.validateInstance(): given argument is not an instance of List');
        }
    };

    List.prototype.toStorage = function (excludeTasks) {

        // TODO: simplify after all ko stuff
        var data = this.data;
        //FT.iterate(this.data, function (value, key) {
        //    //data[key] = ko.unwrap(value);
        //    data[key] = value;
        //});
        if (excludeTasks) {
            delete data.tasks;
        } else {
            data.tasks = this.tasks.toStorage();
        }
        //data.local = this.local;
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
        if (FT.isEmptyObject(data)) {
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

    scope.List = List;

}(window));
