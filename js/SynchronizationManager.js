(function () {
    "use strict";

    var AccountsCollection = require('./collections/AccountsCollection'),
        utils = require('./utils');

    var _queues = [],
        _actions = {
            POST: "POST",
            UPDATE: "UPDATE",
            DELETE: "DELETE",
            MOVE: "MOVE"
        };

    function _makeRequest(data) {
        return new Promise(function (resolve, reject) {
            if (!data || data.length === 0) {
                resolve();
                return;
            }
            if (!Array.isArray(data)) {
                data = [data];
            }
            var reqData = data.shift();

            if (!reqData.proxy) {
                var e = new ReferenceError("Crap! We've lost proxy!");
                reject(e);
                throw e;
            }

            reqData.proxy.request(reqData.method, reqData.urlParams, reqData.data).then(function (response) {
                if (reqData.postRequestAction) {
                    reqData.postRequestAction(response, function () {
                        resolve(_makeRequest(data));
                    });
                } else {
                    resolve(_makeRequest(data));
                }
            }).catch(reject);
        });
    }

    /**
     * Synchronization queue for account
     * @param {Account} account
     * @constructor
     */
    var AccountQueue = function (account) {

        var _tasks = {
                lists: {
                    toDelete: [],
                    toCreate: [],
                    toUpdate: []
                },
                tasks: {
                    toDelete: [],
                    toCreate: [],
                    toUpdate: [],
                    toMove: []
                }
            },
            /**
             * @this {BasicEntity}
             */
            _postRequestActions = {
                addList: function (entity, data, callback) {
                    var tempId = entity.getId(),
                        newId = data.id;
                    entity.doPostSyncActions(_actions.POST, data).then(function () {
                        // Update future list renaming tasks with actual ID
                        _tasks.lists.toUpdate.forEach(function (task) {
                            if (task.urlParams[0] === tempId) {
                                task.urlParams[0] = newId;
                            }
                        });
                        // TODO: tasks tasks update
                        _tasks.tasks.toCreate.forEach(function (task) {
                            if (task.urlParams[0] === tempId) {
                                task.urlParams[0] = newId;
                            }
                        });
                        callback();
                    });
                },
                deleteList: function (entity, data, callback) {
                    var listId = entity.getId();
                    entity.doPostSyncActions(_actions.DELETE, data).then(function () {
                        // Delete future tasks with this list
                        _tasks.lists.toUpdate = _tasks.lists.toUpdate.filter(function (task) {
                            return task.urlParams[0] !== listId;
                        });
                        // TODO: tasks tasks update
                        _tasks.tasks.toCreate = _tasks.tasks.toCreate.filter(function (task) {
                            return task.urlParams[0] !== listId;
                        });
                        _tasks.tasks.toDelete = _tasks.tasks.toDelete.filter(function (task) {
                            return task.urlParams[0] !== listId;
                        });

                        callback();
                    });
                },
                updateList: function (entity, data, callback) {
                    entity.doPostSyncActions(_actions.UPDATE, null).then(callback);
                },
                addTask: function (entity, data, callback) {
                    var tempId = entity.getId(),
                        newId = data.id;
                    entity.doPostSyncActions(_actions.POST, data).then(function () {
                        _tasks.tasks.toUpdate.forEach(function (task) {
                            if (task.urlParams[1] === tempId) {
                                task.urlParams[1] = newId;
                            }
                        });
                        _tasks.tasks.toCreate.forEach(function (task) {
                            if (task.urlParams[1] === tempId) {
                                task.urlParams[1] = newId;
                            }
                            if (task.urlParams[2] === tempId) {
                                task.urlParams[2] = newId;
                            }
                        });
                        callback();
                    });
                },
                deleteTask: function (entity, data, callback) {
                    var previous = entity.collection.getAt(entity.getIndex() - 1);
                    entity.doPostSyncActions(_actions.DELETE, data).then(function () {
                        _tasks.tasks.toMove.forEach(function (task) {
                            if (task.urlParams[3] === entity.getId()) {
                                task.urlParams[3] = previous ? previous.getId() : undefined;
                            }
                        });
                        callback();
                    });
                },
                updateTask: function (entity, data, callback) {
                    entity.doPostSyncActions(_actions.UPDATE, null).then(callback);
                }
            },
            _createTask = function (entity, syncAction) {
                var conf = entity.getSyncConfig(syncAction),
                    List = require('./entities/List'),
                    Task = require('./entities/Task'); //TODO
                switch (syncAction) {
                    case _actions.DELETE:
                        conf.postRequestAction = _postRequestActions[List.prototype.isPrototypeOf(entity) ? 'deleteList' : 'deleteTask'].bind(null, entity);
                        _tasks[List.prototype.isPrototypeOf(entity) ? 'lists' : 'tasks'].toDelete.push(conf);
                        break;
                    case _actions.POST:
                        conf.postRequestAction = _postRequestActions[List.prototype.isPrototypeOf(entity) ? 'addList' : 'addTask'].bind(null, entity);
                        _tasks[List.prototype.isPrototypeOf(entity) ? 'lists' : 'tasks'].toCreate.push(conf);
                        break;
                    case _actions.UPDATE:
                        conf.postRequestAction = _postRequestActions[List.prototype.isPrototypeOf(entity) ? 'updateList' : 'updateTask'].bind(null, entity);
                        _tasks[List.prototype.isPrototypeOf(entity) ? 'lists' : 'tasks'].toUpdate.push(conf);
                        break;
                    case _actions.MOVE:
                        //TODO: no MOVE for lists
                        conf.postRequestAction = _postRequestActions[List.prototype.isPrototypeOf(entity) ? 'updateList' : 'updateTask'].bind(null, entity);
                        _tasks[List.prototype.isPrototypeOf(entity) ? 'lists' : 'tasks'].toMove.push(conf);
                        break;
                }
            },
            /**
             * Processes lists collection of the account
             * @param {ListsCollection} collection
             */
            processCollection = function (collection) {
                try {
                    var syncAction,
                        List = require('./entities/List'),
                        Task = require('./entities/Task'); //TODO
                    collection.each(function (entity) {
                        syncAction = entity.get("_syncAction");
                        if (syncAction) {
                            _createTask(entity, syncAction);
                            //console.debug("SynchronizationManager: task created", entity, syncAction);
                        }
                        if (List.prototype.isPrototypeOf(entity)) {
                            processCollection(entity.tasks);
                        }
                        if (Task.prototype.isPrototypeOf(entity)) {
                            processCollection(entity.children);
                        }
                    });
                } catch (e) {
                    console.error('SynchronizationManager~AccountQueue~processCollection:', e);
                }
            };

        processCollection(account.lists);

        this.run = function () {
            var o = utils.clone(_tasks);
            console.debug("SynchronizationManager: 'run' called for account " + account.getName(), o);
            return _makeRequest(_tasks.lists.toDelete)
                .then(function () {
                    return _makeRequest(_tasks.lists.toUpdate.reverse());
                })
                .then(function () {
                    return _makeRequest(_tasks.lists.toCreate.reverse());
                })
                .then(function () {
                    return _makeRequest(_tasks.tasks.toDelete.reverse());
                })
                .then(function () {
                    return _makeRequest(_tasks.tasks.toMove);
                })
                .then(function () {
                    return _makeRequest(_tasks.tasks.toCreate);
                })
                .then(function () {
                    return _makeRequest(_tasks.tasks.toUpdate.reverse());
                });
        };
    };

    function collectData() {
        try {
            _queues = [];
            AccountsCollection.getAccounts().each(function (account) {
                _queues.push(new AccountQueue(account));
            });
        } catch (e) {
            console.error('SynchronizationManager#~collectData:', e);
        }
    }

    function _synchronize() {
        collectData();
        return Promise.all(_queues.map(function (queue) {
            return queue.run();
        })).catch(function (e) {
            console.error('SynchronizationManager.synchronize:', e);
            throw e;
        });
    }

    module.exports = {
        synchronize: _synchronize,
        actions: _actions
    };

    global.SynchronizationManager = module.exports; // TODO: debug purpose

    Object.freeze(module.exports);

}());
