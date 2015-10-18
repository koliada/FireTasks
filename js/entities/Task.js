(function () {
    "use strict";

    var BasicEntity = require('./BasicEntity'),
        EntitiesRegistry = require('./EntitiesRegistry'),
        TaskView = require('../views/TaskView'),
        SynchronizationManager = require('../SynchronizationManager'),
        TaskListSortModeManager = require('../TaskListSortModeManager'),
        utils = require('../utils'),
        Logger = utils.logger;

    var Task = function (tasksCollection, taskData) {
        if (!utils.isObject(taskData)) {
            throw new TypeError('Task must be created with task data object as second parameter');
        }

        if (utils.isBoolean(taskData.completed)) {
            taskData.completed = taskData.completed ? 'completed' : 'needsAction';
        }

        if (utils.isEmptyString(taskData.notes)) {
            delete taskData.notes;
        }

        this.superclass.apply(this, arguments);

        this.collection = tasksCollection;
        this.account = this.collection.account;
        this.view = new TaskView(this/*, this.collection.parent ? this.collection.parent.view.getChildrenContainer() : ViewManager.getTasksContainer()*/);
        this.children = new tasksCollection.constructor(this.getList(), [], this);
        this.inEditMode = false;
        this.snapshot = null;

        this.selected = (function (task) {
            var _selected = false;

            return function selected(value) {
                if (utils.isDefined(value)) {
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
    };

    utils.inherits(Task, BasicEntity);

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
                    urlParams: [instance.getList().getId(), instance.get('parent') || null, instance.get('previous') || null]
                };
                break;
            case SynchronizationManager.actions.DELETE:
                return {
                    proxy: instance.collection.proxy,
                    method: "remove",
                    urlParams: [instance.getList().getId(), instance.getId()]
                };
                break;
            case SynchronizationManager.actions.UPDATE:
                return {
                    proxy: instance.collection.proxy,
                    method: "update",
                    urlParams: [instance.getList().getId(), instance.getId()],
                    data: instance._toRequest()
                };
                break;
            case SynchronizationManager.actions.MOVE:
                return {
                    proxy: instance.collection.proxy,
                    method: "move",
                    urlParams: [instance.getList().getId(), instance.getId(), instance.get('parent') || null, instance.get('previous') || null]
                };
                break;
        }
    };

    Task.prototype.doPostSyncActions = function (syncAction, data) {
        var instance = this;
        switch (syncAction) {
            case SynchronizationManager.actions.POST:
                //TODO: Google API does not use `previous` field in Task resource, so we need to add it again manually
                var previous = instance.getPrevious();
                if (previous) {
                    data.previous = previous.getId();
                }
                return instance
                    .setData(data)
                    .save()
                    .then(instance.view.update.bind(instance.view));
                break;
            case SynchronizationManager.actions.DELETE:
                var list = this.getList();
                instance.collection.remove(instance);
                return list.save();
                break;
            case SynchronizationManager.actions.UPDATE:
                instance.set('_syncAction', undefined);
                return instance.save();
                break;
        }
    };

    // 404 on task requests means that list does not exist
    Task.prototype.onNotFound = function () {
        return this.getList().onNotFound();
    };

    Task.prototype.getList = function () {
        return this.collection.list;
    };

    Task.prototype.hasNotes = function () {
        return Boolean(this.get('notes'));
    };

    // Specially for Handlebars
    Task.prototype.getNotes = function () {
        var notes = this.get('notes');
        return notes ? notes : '';
    };

    // Specially for Handlebars
    Task.prototype.isSortable = function () {
        return TaskListSortModeManager.isMyOrder();
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
            to = length ? (from + length) : undefined;
        return this.collection.getRange(from, to);
    };

    Task.prototype.addChildren = function (tasks, index) {
        if (!utils.isArray(tasks)) {
            tasks = [tasks];
        }
        this.children.addAt(index, tasks);
        var last = tasks[tasks.length - 1];
        this._updatePreviousOfChild(index + 1, last ? last.getId() : undefined);
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
        this.snapshot = utils.clone(this.data);
        this.children.each(function (child) {
            child.makeSnapshot();
        });
    };

    Task.prototype.isDirty = function () {
        var dirty = !utils.plainObjectsEqual(this.data, this.snapshot);
        if (dirty && !this.get('_syncAction')) {
            console.log('isDirty: _syncAction updated', utils.clone(this.data), utils.clone(this.snapshot));
            this.set('_syncAction', SynchronizationManager.actions.MOVE);
        }
        this.children.each(function (child) {
            var res = child.isDirty();
            if (!dirty) {
                dirty = res;
            }
        });
        return dirty;
    };

    /**
     * Checks whether this task is descendant of the given parent {@link Task} within all ascending links
     * @param {Task} toCheck
     * @returns {boolean}
     */
    Task.prototype.isDeepDescendant = function (toCheck) {
        return this.getParent() && (this.getParent().isEqual(toCheck) || this.getParent().isDeepDescendant(toCheck));
    };

    Task.prototype.populateChildren = function () {
        var result = [];
        this.children.each(function (child) {
            result.push(child);
            child.children.each(function (child) {
                result = result.concat(child.populateChildren());
            });
        });
        return result;
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
        return this.getList().save();
    };

    Task.prototype._fromForm = function (data) {
        // TODO: make actions transparent for API
        if (data.completed) {
            data.status = 'completed';
        } else {
            data.status = 'needsAction';
            data.completed = undefined;
        }
        if (utils.isEmptyString(data.notes)) {
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
        if (!utils.isDefined(completed)) {
            completed = this.view.getCompletionCheckBoxValue();
        }
        this.update({
            completed: completed
        });
    };

    Task.prototype.update = function (data) {
        if (utils.isEmptyObject(data)) {
            throw new Error('Unable to update task: no data passed');
        }

        if (data.list && data.list !== this.collection.list.getId()) {
            return this.moveToList(data.list);
        }

        var dataKeys = Object.keys(data),
            isMarkCompletedTask = dataKeys.length === 1 && dataKeys[0] === 'completed';

        data._syncAction = SynchronizationManager.actions.UPDATE;
        this._fromForm(data);

        return this.save().then(function () {
            if (isMarkCompletedTask) {
                this.view.markCompleted();
            } else if (TaskListSortModeManager.isAlphabetical()) {
                this.collection.list.view.renderTasks();
            } else {
                this.view.update();
            }
            return SynchronizationManager.synchronize();
        }.bind(this));
    };

    Task.prototype.remove = function (doNotSave) {
        return new Promise(function (resolve, reject) {
            this.markDeleted();
            if (!doNotSave) {
                this.save()
                    .then(function () {
                        this.view.destroy();
                        resolve();
                    }.bind(this))
                    .catch(reject);
            }
            this.view.destroy();
            resolve();
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
                previous.addChildren(this, previous.children.getLength());
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

    Task.prototype.move = function (parent, previous) {
        if (parent) {
            parent.children.addAt(previous ? previous.getIndex() + 1 : 0, this);
            this.setCollection(parent.children); // TODO: move to addAt()
        }
        if (!parent && previous) {
            previous.collection.addAt(previous.getIndex() + 1, this);
            this.setCollection(previous.collection);
        }
        if (!parent && !previous) {
            this.set('parent', undefined);
            this.set('previous', undefined);
        }
        this.set('_syncAction', SynchronizationManager.actions.MOVE);
        var following = this.getFollowing();
        following[0] && following[0].set('previous', this.getId());
        return this.save();
    };

    Task.prototype.moveToList = function (targetList) {
        if (!targetList) {
            throw new TypeError('Unable to move task to another list: Invalid arguments');
        }
        return targetList.tasks.add(this).then(this.remove.bind(this));
    };

    Task.prototype.unindentChildren = function () {
        var tasks = this.children.data;

        if (tasks.length) {
            this.collection.addAt(this.getIndex() + 1, tasks);

            tasks.forEach(function (task) {
                task.setCollection(this.collection);
                task.view.update();
            }.bind(this));
        }

        return Promise.resolve();
    };

    EntitiesRegistry.registerEntityType('task', Task);

    module.exports = Task;

}());
