/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";

    function _sortItemsAlphabetically(items) {
        return items.sort(function (a, b) {
            if (a.get('title').toLowerCase() < b.get('title').toLowerCase()) return -1;
            if (a.get('title').toLowerCase() > b.get('title').toLowerCase()) return 1;
            return 0;
        });
    }

    var ListsCollection = function (account) {


        if (!Account.prototype.isPrototypeOf(account)) {
            throw new TypeError('ListsCollection must be created with Account instance as a parameter');
        }

        BasicCollection.apply(this, arguments);
        /**
         * @type Account
         */
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
                url: 'https://www.googleapis.com/tasks/v1/users/@me/lists/${0}'
            },
            update: {
                method: 'PATCH',
                url: 'https://www.googleapis.com/tasks/v1/users/@me/lists/${0}'
            }
        });

        this.started = null;

        return this;
    };

    ListsCollection.prototype = Object.create(BasicCollection.prototype);
    ListsCollection.prototype.constructor = ListsCollection;

    ListsCollection.prototype.initFromStorage = function () {
        var self = this;
        return this.storage.load().then(function (result) {
            self.setData(result);
        });
    };

    /**
     * Loads list of lists from the server
     * @returns {Promise.<List[]>}
     */
    ListsCollection.prototype.load = function () {
        var self = this,
            result = [];
        return new Promise(function (resolve, reject) {
            self.proxy.request('load').then(function (data) {
                data.items.forEach(function (list) {
                    result.push(new List(self, list));
                });
                self.setData(result);
                return self.storage.saveAll();
            }).then(function () {
                resolve(self.data);
            }).catch(function (request) {
                reject(request);
            });
        });
    };

    ListsCollection.prototype.loadTasks = function () {
        return Promise.all(this.data.map(function (list) {
            return list.tasks.load();
        }));
    };

    /**
     * Handles list adding sequence
     * @param {String} listName
     * @returns {Promise.<List>}
     */
    ListsCollection.prototype.add = function (listName) {
        var self = this,
            list;

        try {
            list = new List(self, {
                id: FT.generateID(),
                title: listName,
                _syncAction: SynchronizationManager.actions.POST
            });
            self.addSorted(list);
            return list.save()
                .then(function () {
                    list.view.render();
                    return list.setActive();
                })
                .then(SynchronizationManager.synchronize);
        } catch (e) {
            Logger.error("List creation failed:", e);
        }
    };

    ListsCollection.prototype.addSorted = function (data) {
        if (!FT.isArray(data)) {
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

        if (!FT.isArray(data)) {
            throw new TypeError('Data must be an array');
        }

        this.data = _sortItemsAlphabetically(data);
    };

    ListsCollection.prototype.updatePosition = function (list) {
        this.remove(list);
        this.addSorted(list);
    };

    scope.ListsCollection = ListsCollection;

}(window));
