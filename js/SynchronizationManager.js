/*
 * Alexei Koliada 2015.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";

    scope.SynchronizationManager = (function () {

        var _queues = [],
            _actions = {
                POST: "POST",
                UPDATE: "UPDATE",
                DELETE: "DELETE"
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
                        toUpdate: []
                    }
                },
                _tasksResults = {
                    lists: {
                        deleted: [],
                        created: [],
                        updated: []
                    },
                    tasks: {
                        deleted: [],
                        created: [],
                        updated: []
                    }
                },
                _prepareResultData = function () {
                    return {
                        entity: arguments[0],
                        data: arguments[1]
                    }
                },
                /**
                 * @this {BasicEntity}
                 */
                _postRequestActions = {
                    addList: function (list, callback) {
                        var tempId = this.getId(),
                            listInstance = this;
                        listInstance.setData(list).updateInStorage(tempId).then(function () {
                            listInstance.view.update();
                            //_tasksResults.lists.created.push(_prepareResultData(this, list));

                            // Update future list renaming tasks with actual ID
                            _tasks.lists.toUpdate.forEach(function (task) {
                                if (task.urlParams[0] === tempId) {
                                    task.urlParams[0] = instance.getId();
                                }
                            });
                            // TODO: tasks tasks update
                            _tasks.tasks.toCreate.forEach(function (task) {
                                if (task.urlParams[0] === tempId) {
                                    task.urlParams[0] = instance.getId();
                                }
                            });

                            callback();
                        });
                    },
                    deleteList: function (list, callback) {
                        var listInstance = this,
                            listId = listInstance.getId();
                        listInstance.collection.storage.remove(listId).then(function () {
                            listInstance.collection.remove(listInstance);
                            listInstance.view.destroy();
                            //_tasksResults.lists.deleted.push(_prepareResultData(this, list));

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
                    updateList: function (list, callback) {
                        var listInstance = this;
                        listInstance.set('_syncAction', undefined);
                        listInstance.save().then(callback);
                    },
                    addTask: function (task, callback) {
                        var tempId = this.getId(),
                            taskInstance = this;

                        taskInstance.setData(task).save().then(function () {
                            taskInstance.view.update();
                            callback();
                        });
                    },
                    deleteTask: function (task, callback) {
                        var taskInstance = this;
                        taskInstance.collection.remove(taskInstance);
                        taskInstance.collection.list.save()
                            .then(function () {
                                //

                                callback();
                            });
                    },
                    updateTask: function (task, callback) {
                        var listInstance = this;
                        listInstance.set('_syncAction', undefined);
                        listInstance.save().then(callback);
                    }
                },
                _createTask = function (entity, syncAction) {
                    var conf = entity.getSyncConfig(syncAction);
                    switch (syncAction) {
                        case _actions.DELETE:
                            conf.postRequestAction = _postRequestActions[entity instanceof List ? 'deleteList' : 'deleteTask'].bind(entity);
                            _tasks[entity instanceof List ? 'lists' : 'tasks'].toDelete.push(conf);
                            break;
                        case _actions.POST:
                            conf.postRequestAction = _postRequestActions[entity instanceof List ? 'addList' : 'addTask'].bind(entity);
                            _tasks[entity instanceof List ? 'lists' : 'tasks'].toCreate.push(conf);
                            break;
                        case _actions.UPDATE:
                            conf.postRequestAction = _postRequestActions[entity instanceof List ? 'updateList' : 'updateTask'].bind(entity);
                            _tasks[entity instanceof List ? 'lists' : 'tasks'].toUpdate.push(conf);
                            break;
                    }
                },
                _processCollection = function (collection) {
                    var syncAction;
                    collection.each(function (entity) {
                        syncAction = entity.get("_syncAction");
                        if (syncAction) {
                            _createTask(entity, syncAction);
                        }
                        if (entity instanceof List) {
                            _processCollection(entity.tasks);
                        } else if (entity instanceof Task) {
                            _processCollection(entity.children);
                        }
                    });
                };

            _processCollection(account.lists);

            this.run = function () {
                return new Promise(function (resolve, reject) {
                    _makeRequest(_tasks.lists.toDelete)
                        .then(_makeRequest(_tasks.lists.toUpdate))
                        .then(_makeRequest(_tasks.lists.toCreate))
                        .then(_makeRequest(_tasks.tasks.toDelete))
                        .then(_makeRequest(_tasks.tasks.toCreate))
                        .then(_makeRequest(_tasks.tasks.toUpdate))
                        .then(resolve)
                        .catch(reject);
                });
            };
        };

        function _collectData() {
            FT.accounts.data.forEach(function (account) {
                _queues.push(new AccountQueue(account));
            });
        }

        function _synchronize() {
            return new Promise(function (resolve, reject) {
                _collectData();
                Promise.all(_queues.map(function (queue) {
                    return queue.run();
                })).then(resolve).catch(reject);
            });
        }


        return {
            synchronize: _synchronize,
            actions: _actions
        };

    }());

    Object.freeze(scope.SynchronizationManager);

}(window));
