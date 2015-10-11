(function () {
    "use strict";

    function _sortItemsAlphabetically(items) {
        return items.sort(function (a, b) {
            if (a.get('title').toLowerCase() < b.get('title').toLowerCase()) return -1;
            if (a.get('title').toLowerCase() > b.get('title').toLowerCase()) return 1;
            return 0;
        });
    }

    var BasicCollection = require('./BasicCollection'),
        ListsStorage = require('../storage/ListsStorage'),
        Proxy = require('../Proxy'),
        SynchronizationManager = require('../SynchronizationManager'),
        List = require('../entities/List'),
        utils = require('../utils'),
        Logger = utils.logger;

    var ListsCollection = function (account) {

        this.super.apply(this, arguments);
        this.account = account;
        this.data = [];
        this.storage = new ListsStorage(this);
        this.proxy = new Proxy(this.account, {
            load: {
                method: 'GET',
                url: 'https://www.googleapis.com/tasks/v1/users/@me/lists'
            },
            add: {
                method: 'POST',
                url: 'https://www.googleapis.com/tasks/v1/users/@me/lists'
            },
            remove: {
                method: 'DELETE',
                url: 'https://www.googleapis.com/tasks/v1/users/@me/lists/{0}'
            },
            update: {
                method: 'PATCH',
                url: 'https://www.googleapis.com/tasks/v1/users/@me/lists/{0}'
            }
        });

        this.started = null;

        return this;
    };

    utils.inherits(ListsCollection, BasicCollection);

    ListsCollection.prototype.initFromStorage = function () {
        var result = [];
        return this.storage.load(function (value) {
            result.push(new List(this, value));
        }.bind(this)).then(this.setData.bind(this, result));
    };

    /**
     * Loads list of lists from the server
     * @param {Function} [progressCb] Progress callback
     * @returns {Promise.<List[]>}
     */
    ListsCollection.prototype.load = function (progressCb) {
        return this.proxy.request('load')
            .then(function (data) {
                var result = [];
                data.items.forEach(function (list) {
                    result.push(new List(this, list));
                }.bind(this));
                this.setData(result);
                if (utils.isFunction(progressCb)) progressCb(data);
                return this.loadTasks(progressCb);
            }.bind(this))
            .then(this.storage.saveAll.bind(this.storage));
    };

    ListsCollection.prototype.loadTasks = function (progressCb) {
        return Promise.all(this.data.map(function (list) {
            return list.tasks.load(progressCb);
        }));
    };

    /**
     * Handles list adding sequence
     * @param {String} listName
     * @returns {Promise.<List>}
     */
    ListsCollection.prototype.add = function (listName) {
        try {
            var list = new List(this, {
                id: utils.generateID(),
                title: listName,
                _syncAction: SynchronizationManager.actions.POST
            });
            this.addSorted(list);
            return list.save()
                .then(function () {
                    list.view.render();
                    return list.setActive();
                })
                .then(SynchronizationManager.synchronize)
                .catch(function (e) {
                    console.error('List creation failed', e);
                    throw e;
                });
        } catch (e) {
            Logger.error("List creation failed:", e);
        }
    };

    ListsCollection.prototype.addSorted = function (data) {
        if (!utils.isArray(data)) {
            data = [data];
        }

        this.setData(this.data.concat(data));
    };

    // not used
    ListsCollection.prototype.addSortedAndSave = function (data) {
        var self = this,
            promises = [];
        this.addSorted(data);
        data.forEach(function (list) {
            promises.push(self.storage.save(list));
            //list.view.render();
        });
        return Promise.all(promises);
    };

    ListsCollection.prototype.setData = function (data) {
        data = data || this.data;

        if (!utils.isArray(data)) {
            throw new TypeError('Data must be an array');
        }

        this.data = _sortItemsAlphabetically(data);
    };

    ListsCollection.prototype.updatePosition = function (list) {
        this.remove(list);
        this.addSorted(list);
    };

    module.exports = ListsCollection;

}());
