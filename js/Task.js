/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";

    var Task = function (tasksCollection, taskData) {

        if (!TasksCollection.prototype.isPrototypeOf(tasksCollection)) {
            throw new TypeError('Task must be created with TasksCollection instance as first parameter');
        }

        if (!FT.isObject(taskData)) {
            throw new TypeError('Task must be created with task data object as second parameter');
        }

        if (FT.isBoolean(taskData.completed)) {
            taskData.completed = taskData.completed ? 'completed' : 'needsAction';
        }

        if (FT.isEmptyString(taskData.notes)) {
            delete taskData.notes;
        }

        BasicEntity.apply(this, arguments);

        this.collection = tasksCollection;
        this.account = this.collection.account;
        this.view = new TaskView(this/*, this.collection.parent ? this.collection.parent.view.getChildrenContainer() : ViewManager.getTasksContainer()*/);
        this.children = new TasksCollection(this.collection.list, [], this);
        this.inEditMode = false;
        this.snapshot = null;

        this.selected = (function (task) {
            var _selected = false;

            return function selected(value) {
                if (FT.isDefined(value)) {
                    value = Boolean(value);
                    if (_selected === value) {
                        return _selected;
                    }
                    _selected = value;
                    task.view.setSelected(value);
                    task.collection.onTaskSelected(task);
                }
                return _selected;
            };
        }(this));

        return this;
    };

    Task.prototype = Object.create(BasicEntity.prototype);
    Task.prototype.constructor = Task;

    Task.prototype.getSyncConfig = function (syncAction) {
        var instance = this;

        switch (syncAction) {
            case SynchronizationManager.actions.POST:
                return {
                    proxy: instance.collection.proxy,
                    method: "add",
                    data: {
                        title: instance.getName(),
                        status: instance.get('status'),
                        notes: instance.getNotes()
                    },
                    urlParams: [instance.collection.list.getId()]
                };
                break;
            case SynchronizationManager.actions.DELETE:
                return {
                    proxy: instance.collection.proxy,
                    method: "remove",
                    urlParams: [instance.collection.list.getId(), instance.getId()]
                };
                break;
            case SynchronizationManager.actions.UPDATE:
                return {
                    proxy: instance.collection.proxy,
                    method: "update",
                    urlParams: [instance.collection.list.getId(), instance.getId()],
                    data: instance._toRequest()
                };
                break;
        }
    };

    Task.prototype.hasNotes = function () {
        return Boolean(this.get('notes'));
    };

    // Specially for Handlebars
    Task.prototype.getNotes = function () {
        var notes = this.get('notes');
        return notes ? notes : '';
    };

    Task.prototype.isCompleted = function () {
        return this.get('status') === 'completed';
    };

    Task.prototype.hasChildren = function () {
        return this.children.data.length > 0;
    };

    Task.prototype.toggleSelected = function () {
        this.selected(!this.selected());
    };

    // TODO: get range
    Task.prototype.getPrevious = function () {
        return this.collection.getAt(this.getIndex() - 1);
    };

    Task.prototype.getParent = function () {
        return this.collection.parent;
    };

    /**
     *
     * @param [length]
     */
    Task.prototype.getFollowing = function (length) {
        var from = this.getIndex() + 1,
            to = length ? (from + length) : null;
        return this.collection.getRange(from, to);
    };

    Task.prototype.addChildren = function (tasks, index) {
        if (!FT.isArray(tasks)) {
            tasks = [tasks];
        }
        this.children.addAt(index, tasks);
        this._updatePreviousOfChild(index + 1, tasks[tasks.length - 1].getId());
        tasks.forEach(function (task) {
            task.setCollection(this.children);
            task.set('parent', this.getId());
        }.bind(this));
        return this;
    };

    Task.prototype._updatePreviousOfChild = function (index, taskId) {
        var nextChild = this.children.getAt(index);
        if (nextChild) {
            nextChild.set('previous', taskId);
        }
    };

    Task.prototype.toggleEditMode = function (enable) {
        enable = Boolean(enable);
        this.view.toggleEditMode(enable);
        this.inEditMode = enable;
        return this;
    };

    Task.prototype.makeSnapshot = function () {
        this.snapshot = FT.apply(Object.create(null), this.data);
        this.children.each(function (child) {
            child.makeSnapshot();
        });
    };

    Task.prototype.isDirty = function () {
        var dirty = JSON.stringify(this.data) !== JSON.stringify(this.snapshot);
        if (dirty) {
            this.set('_syncAction', SynchronizationManager.actions.UPDATE);
        }
        return dirty;
    };

    /**
     * @deprecated
     * @returns {Function}
     */
    Task.prototype.renderChildren = function () {
        var self = this;
        return function () {

            var str = '';

            self.children.each(function (task) {
                str += Mustache.render(task.view.template, task);
            });

            return str;
        }
    };

    Task.prototype.save = function () {
        return this.collection.list.save();
    };

    Task.prototype._fromForm = function (data) {
        // TODO: make actions transparent for API
        if (data.completed) {
            data.status = 'completed';
        } else {
            data.status = 'needsAction';
            data.completed = undefined;
        }
        if (FT.isEmptyString(data.notes)) {
            data.notes = undefined;
        }
        delete data.list;
        this.set(data);
        return this;
    };

    // TODO: get only delta (objective - reduce payload)
    Task.prototype._toRequest = function () {
        var obj = {
            title: this.getName(),
            status: this.get('status'),
            notes: this.getNotes()
        };
        if (!this.get('completed')) {
            obj.completed = null;
        }
        return obj;
    };

    Task.prototype.setCompleted = function (completed) {
        if (!FT.isDefined(completed)) {
            completed = this.view.getCompletionCheckBoxValue();
        }
        this.update({
            completed: completed
        });
    };

    Task.prototype.update = function (data) {
        if (FT.isEmptyObject(data)) {
            throw new Error('Unable to update task: no data passed');
        }

        if (data.list && data.list !== this.collection.list.getId()) {
            return this.moveToList(data.list);
        }

        var self = this,
            dataKeys = Object.keys(data),
            isMarkCompletedTask = dataKeys.length === 1 && dataKeys[0] === 'completed';

        data._syncAction = SynchronizationManager.actions.UPDATE;
        this._fromForm(data);

        return new Promise(function (resolve, reject) {
            self.save().then(function () {
                if (isMarkCompletedTask) {
                    self.view.markCompleted();
                } else {
                    self.view.update();
                }
                return SynchronizationManager.synchronize();
            }).then(resolve).catch(reject);
        });
    };

    // TODO: unindent children
    Task.prototype.remove = function () {
        return new Promise(function (resolve, reject) {
            this.markDeleted().save().then(function () {
                this.view.destroy();
                resolve();
            }.bind(this)).catch(reject);
        }.bind(this));
    };

    Task.prototype.indent = function () {
        return new Promise(function (resolve, reject) {
            try {
                var previous = this.getPrevious(),
                    followingTask = this.getFollowing(1)[0];
                if (!previous) {
                    return resolve("Maximum indentation reached");
                }
                previous.addChildren(this);
                followingTask && followingTask.set('previous', previous.getId());
                this.view.update();
                return resolve();
            } catch (e) {
                Logger.error(e);
                return reject(e);
            }
        }.bind(this));
    };

    Task.prototype.unindent = function () {
        return new Promise(function (resolve, reject) {
            try {
                var parent = this.getParent(),
                    followingTasks = this.getFollowing();
                if (!parent) {
                    return resolve('Nowhere to unindent');
                }
                //if (parent && parent.selected() && parent.getParent()) {
                //    return resolve('Moving child of a parent that is unindented is skipped');
                //}
                this.addChildren(followingTasks);
                this.setCollection(parent.collection);
                parent.collection.addAt(parent.getIndex() + 1, this);
                followingTasks.forEach(function (task) {
                    task.view.destroy();
                });
                this.view.update();
                return resolve();
            } catch (e) {
                Logger.error(e);
                reject(e);
            }
        }.bind(this));
    };

    Task.prototype.moveToList = function (listId) {
        return new Promise(function (resolve, reject) {
            this.account.lists.getById(listId).tasks.add().
                then(this.remove);
        }.bind(this));
    };

    scope.Task = Task;

}(window));
