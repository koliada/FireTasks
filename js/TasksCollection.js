/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";


    var TasksCollection = function (list, data, parent) {

        if (!List.prototype.isPrototypeOf(list)) {
            throw new TypeError('TasksCollection must be created with List instance as first parameter');
        }

        if (FT.isDefined(parent) && !Task.prototype.isPrototypeOf(parent)) {
            throw new TypeError('parent task must be instance of Task');
        }

        BasicCollection.apply(this, arguments);

        /**
         * @type {Task|null}
         */
        this.parent = parent || null;

        /**
         * @type List
         */
        this.list = list;

        /**
         *
         * @type {Account}
         */
        this.account = this.list.account;
        this.data = FT.isArray(data) ? this.fromArray(data) : [];
        this.proxy = (this.parent) ? null : new Proxy(this.account, {
            load: {
                method: 'GET',
                url: 'https://www.googleapis.com/tasks/v1/lists/' + this.list.getId() + '/tasks'
            },
            add: {
                method: 'POST',
                url: 'https://www.googleapis.com/tasks/v1/lists/${0}/tasks'
            },
            remove: {
                method: 'DELETE',
                url: 'https://www.googleapis.com/tasks/v1/lists/${0}/tasks/${1}'
            },
            update: {
                method: 'PATCH',
                url: 'https://www.googleapis.com/tasks/v1/lists/${0}/tasks/${1}'
            }
        });

        return this;
    };

    TasksCollection.prototype = Object.create(BasicCollection.prototype);
    TasksCollection.prototype.constructor = TasksCollection;

    TasksCollection.prototype.fromArray = function (tasks) {

        if (!FT.isArray(tasks)) {
            throw new TypeError('data must be an array')
        }

        for (var i = 0; i < tasks.length; i++) {
            tasks[i] = new Task(this, tasks[i]);
            tasks[i].children = new TasksCollection(this.list, tasks[i].get('children'), tasks[i]);
            delete tasks[i].data.children;
        }

        return tasks;
    };

    TasksCollection.prototype.load = function () {

        /**
         * Builds tasks tree from fetched data
         * @link http://blog.tcs.de/creating-trees-from-sql-queries-in-javascript/
         * @param {Object} options
         * @returns {Array}
         */
        function makeTree(options) {
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
        }

        var self = this,
            result = [];
        return new Promise(function (resolve, reject) {
            self.proxy.request('load').then(function (data) {
                data.items = data.items || [];
                data = makeTree({q: data.items});
                //data.forEach(function (task) {
                //   result.push(new Task(self, task));
                //});
                //self.setData(self.fromArray(data));
                self.data = self.fromArray(data);
                return self.list.save();
            }).then(function () {
                resolve(self.data);
            }).catch(function (request) {
                reject(request);
            });
        });
    };

    TasksCollection.prototype.toStorage = function () {
        return this.data.map(function (task) {
            var result = task.data;
            //FT.iterate(task.data, function (value, key) {
            //    result[key] = value;
            //});
            if (task.hasChildren()) {
                result.children = task.children.toStorage();
            }
            return result;
        });
    };

    // TODO: consume Task as well
    // TODO: add children as well (for the Task being moved from another list)
    // TODO: parameter to not to start synchronization immediately
    TasksCollection.prototype.add = function (data) {
        var task;

        try {
            task = new Task(this, {
                id: FT.generateID(),
                title: data.title,
                status: data.completed ? 'completed' : 'needsAction', // TODO: make actions transparent for API
                notes: data.notes,
                _syncAction: SynchronizationManager.actions.POST
            });
            this.data.unshift(task); // first position
            return task.save()
                .then(function () {
                    if (this.list.selected()) {
                        task.view.renderTemplate(); // no need to use prepareTaskFragment()
                        task.view.render();
                    }
                    return Promise.resolve();
                }.bind(this));
        } catch (e) {
            Logger.error("List creation failed:", e);
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
            return Promise.resolve();
            //return this.list.save();
        } else {
            return Promise.resolve();
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

    scope.TasksCollection = TasksCollection;

}(window));
