(function () {
    "use strict";

    var BasicCollection = require('./BasicCollection'),
        SynchronizationManager = require('../SynchronizationManager'),
        TaskListSortModeManager = require('../TaskListSortModeManager'),
        TaskListSortModeDialog = require('../dialogs/TaskListSortModeDialog'),
        ConnectivityManager = require('../ConnectivityManager'),
        Proxy = require('../Proxy'),
        Task = require('../entities/Task'),
        utils = require('../utils'),
        Logger = utils.logger;

    var TasksCollection = function (list, data, parent) {

        if (utils.isDefined(parent) && !Task.prototype.isPrototypeOf(parent)) {
            throw new TypeError('parent task must be instance of Task');
        }

        this.superclass.apply(this, arguments);

        this.parent = parent || null;
        this.list = list;
        this.account = this.list.account;
        this.proxy = (this.parent) ? this.parent.collection.proxy : new Proxy(this.account, {
            load: {
                method: 'GET',
                url: 'https://www.googleapis.com/tasks/v1/lists/' + this.list.getId() + '/tasks?showDeleted={0}'
            },
            add: {
                method: 'POST',
                url: 'https://www.googleapis.com/tasks/v1/lists/{0}/tasks?parent={1}&previous={2}'
            },
            remove: {
                method: 'DELETE',
                url: 'https://www.googleapis.com/tasks/v1/lists/{0}/tasks/{1}'
            },
            update: {
                method: 'PATCH',
                url: 'https://www.googleapis.com/tasks/v1/lists/{0}/tasks/{1}'
            },
            move: {
                method: 'POST',
                url: 'https://www.googleapis.com/tasks/v1/lists/{0}/tasks/{1}/move?parent={2}&previous={3}'
            }
        });
        this.data = utils.isArray(data) ? this._fromArray(data) : [];
    };

    utils.inherits(TasksCollection, BasicCollection);

    TasksCollection.prototype._fromArray = function (tasks) {

        if (!utils.isArray(tasks)) {
            throw new TypeError('data must be an array')
        }

        for (var i = 0; i < tasks.length; i++) {
            // TODO: Probably there is a sense to move this actions to the Task constructor
            if (this.parent) {
                tasks[i].parent = this.parent.getId();
            }
            if (tasks[i - 1]) {
                tasks[i].previous = tasks[i - 1].getId();
            }
            tasks[i] = new Task(this, tasks[i]);
            tasks[i].children = new TasksCollection(this.list, tasks[i].get('children'), tasks[i]);
            tasks[i].set('children', undefined);
        }

        return tasks;
    };

    /**
     * Builds tasks tree from fetched data
     * @link http://blog.tcs.de/creating-trees-from-sql-queries-in-javascript/
     * @param {Object} options
     * @returns {Array}
     */
    TasksCollection.prototype._makeTree = function (options) {
        var children, e, id, o, pid, temp, _i, _len, _ref;
        id = options.id || "id";
        pid = options.parentid || "parent";
        children = options.children || "children";
        temp = {};
        o = [];
        _ref = options.q;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            e = _ref[_i];
            e[children] = [];
            temp[e[id]] = e;
            if (temp[e[pid]] != null) {
                temp[e[pid]][children].push(e);
            } else {
                o.push(e);
            }
        }
        return o;
    };

    TasksCollection.prototype.load = function (progressCb) {
        return this.proxy.request('load', ['false']).then(function (data) {
            var items = data.items || [];
            items = this._makeTree({q: items});
            this.data = this._fromArray(items);
            //return this.list.save();
            if (utils.isFunction(progressCb)) progressCb(data);
            return Promise.resolve();
        }.bind(this));
    };

    TasksCollection.prototype.toStorage = function () {
        return this.data.map(function (task) {
            var result = utils.clone(task.data);
            if (task.hasChildren()) {
                result.children = task.children.toStorage();
            }
            return result;
        });
    };

    TasksCollection.prototype.add = function (taskData, previous) {
        var task,
            children,
            data = {},
            childPromises = [];

        if (Task.prototype.isPrototypeOf(taskData)) {
            children = taskData.children;
            data = taskData._toRequest();
        } else {
            data = taskData;
        }

        data.id = utils.generateID();
        data.status = data.status || (data.completed ? 'completed' : 'needsAction'); // TODO: make actions transparent for API
        data._syncAction = SynchronizationManager.actions.POST;

        try {
            task = new Task(this, data);
            this.addAt(previous ? (previous.getIndex() + 1) : 0, task);
            return task
                .save()
                .then(function () {
                    children && children.each(function (child, index) {
                        childPromises.push(task.children.add(child, task.children.getAt(index - 1))); // TODO: think how to get rid of 'previous'
                        child.remove();
                    }, this);
                    return Promise.all(childPromises);
                })
                .then(function () {
                    if (this.list.selected()) {
                        task.view.renderTemplate(); // no need to use prepareTaskFragment()
                        task.view.render();
                    }
                    return Promise.resolve();
                }.bind(this));
        } catch (e) {
            Logger.error("Task adding failed:", e);
        }
    };

    TasksCollection.prototype.onTaskSelected = function (task) {
        if (this.parent) {
            this.parent.collection.onTaskSelected();
        }
        return this;
    };

    /**
     * Returns array of selected tasks
     * @returns {Task[]}
     */
    TasksCollection.prototype.getSelected = function () {
        var total = [];
        this.each(function (task) {
            if (task.selected()) {
                total.push(task);
            }
            total = total.concat(task.children.getSelected());
        });
        return total;
    };

    /**
     * Returns top collection
     * @returns {TasksCollection}
     */
    TasksCollection.prototype.getTopCollection = function () {
        return (this.parent && this.parent.collection.getTopCollection()) || this;
    };

    TasksCollection.prototype.makeSnapshots = function () {
        this.each(function (task) {
            task.makeSnapshot();
        });
    };

    TasksCollection.prototype.isDirty = function () {
        return this.data.some(function (task) {
            return task.isDirty();
        });
    };

    TasksCollection.prototype.checkDirtinessAndSave = function () {
        if (this.isDirty()) {
            //return Promise.resolve();
            return this.list.save().then(function () {return true;});
        } else {
            return Promise.resolve(false);
        }
    };

    TasksCollection.prototype.findById = function (id) {
        var result = null;
        this.data.some(function (task) {
            if (task.getId() === id) {
                result = task;
                return true;
            }
            var child = task.children.findById(id);
            if (child) {
                result = child;
                return true;
            }
        });
        return result;
    };


    // TODO: sometimes it's easier to get previous/parent from cache (data)
    TasksCollection.prototype.addAt = function (index, tasks) {
        var previous = this.getAt(index - 1),
            next = this.getAt(index);
        if (!utils.isArray(tasks)) {
            tasks = [tasks];
        }
        if (!tasks.length) {
            return;
        }
        tasks[0].set('previous', previous ? previous.getId() : undefined);
        tasks.forEach(function (task) {
            task.set('parent', this.parent ? this.parent.getId() : undefined);
        }.bind(this));
        next && next.set('previous', tasks[tasks.length - 1].getId());
        this.superclass.prototype.addAt.apply(this, arguments);
    };

    TasksCollection.prototype.showSortDialog = function () {
        TaskListSortModeDialog.show(this.list);
    };

    TasksCollection.prototype.showDeleted = function () {
        if (!ConnectivityManager.isOnline()) {
            utils.status.show('This action requires network connection');
        }
        this.proxy.request('load', ['true']).then(function (data) {
            var items = data.items || [];
            items = items.filter(function (task) {
                return task.deleted;
            });
            this.data = this._fromArray(items);
            this.list.view.renderTasks(true);
        }.bind(this));
    };

    TasksCollection.prototype._toPlainArray = function () {
        var result = [];
        this.each(function (task) {
            result.push(task);
            result = result.concat(task.children._toPlainArray());
        });
        return result;
    };

    //TODO: Taken from old implementation. This should be refactored, but I'm not sure how.
    //TODO: Check twice related stuff (refreshing the view, indenting/unindenting, adding and deletion)
    /**
     * Gets sort mode from the {@link TaskListSortModeManager} and returns tasks sorted correspondingly.
     * ONLY for rendering! No moving actions should be applied to the returned stuff!
     * @returns {TasksCollection|Task[]}
     */
    TasksCollection.prototype.getSorted = function () {
        var res;
        if (TaskListSortModeManager.isAlphabetical()) {
            res = this._toPlainArray().sort(function (a, b) {
                var res = (a.getName().toLowerCase() >= b.getName().toLowerCase());
                return res ? 1 : -1;
            });
            res.each = res.forEach; //TODO: OMG
        } else if (TaskListSortModeManager.isDueDate()) {
            res = this._toPlainArray().sort();
            res.each = res.forEach; //TODO: OMG #2
        } else {
            res = this;
        }
        return res;
    };

    module.exports = TasksCollection;

}());
