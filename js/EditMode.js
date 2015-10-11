(function () {
    "use strict";

    var ViewManager = require('./ViewManager'),
        MoveTasksToDialog = require('./dialogs/MoveTasksToDialog'),
        ActiveListManager = require('./ActiveListManager'),
        _$ = require('./DomHelper'),
        constants = require('./constants'),
        utils = require('./utils'),
        Logger = utils.logger;

    var _activated = false,
        _tasksCollection = null,
        _selectedTasks = [],
        _dom = {
            tasks: constants.TASKS_LIST_ELEMENT,
            el: _$('#edit-mode')[0],
            selectedTasksCounter: _$('#selected-tasks-count')[0],
            btnDeactivate: _$('#btn-edit-mode-close')[0],
            btnUnindent: _$('#btn-unindent-tasks')[0],
            btnIndent: _$('#btn-indent-tasks')[0],
            btnBatchMove: _$('#btn-move-tasks')[0],
            btnBatchDelete: _$('#btn-delete-tasks')[0]
        },
        _classes = {
            edit: 'edit',
            editMode: 'edit-mode'
        };

    function _toggleOverlay(show) {
        _dom.el.classList[show ? 'add' : 'remove'](_classes.edit);
    }

    function _toggleTasksRepresentation(enable) {
        function iterator(collection) {
            collection.each(function (task) {
                if (!enable) { // we must clear selection only when Edit Mode is deactivated
                    task.selected(false);
                }
                task.toggleEditMode(enable);
                iterator(task.children);
            });
        }

        iterator(_tasksCollection);
        _toggleTasksContainer(enable);
    }

    function _toggleTasksContainer(enable) {
        _dom.tasks.classList[enable ? 'add' : 'remove'](_classes.editMode);
    }

    function _onTaskSelected() {
        _selectedTasks = _tasksCollection.getSelected();
        var length = _selectedTasks.length;
        if (length) {
            _dom.selectedTasksCounter.innerHTML = length;
        } else {
            _deactivate();
        }
    }

    function _filterOutChildren(tasksArray) {
        return tasksArray.filter(function (task) {
            return !tasksArray.some(function (parent) {
                return task.isDeepDescendant(parent);
            });
        });
    }

    function _populateChildren(tasksArray) {
        var result = [];
        tasksArray = tasksArray.reverse();
        tasksArray.forEach(function (task) {
            result.push(task);
            result = result.concat(task.populateChildren());
        });
        return result;
    }

    function _activate(task) {
        if (!_activated) {
            console.time('Edit Mode activated');
            _tasksCollection = task.collection.getTopCollection();
            _tasksCollection.onTaskSelected = _onTaskSelected;
            _tasksCollection.makeSnapshots();
            task.selected(true);
            _toggleTasksRepresentation(true);
            _toggleOverlay(true);
            _activated = true;
            console.timeEnd('Edit Mode activated');
        }
    }

    function _deactivate() {
        if (_activated) {
            _activated = false;
            console.time('Edit Mode deactivated');
            _toggleTasksRepresentation(false);
            _toggleOverlay(false);
            console.timeEnd('Edit Mode deactivated');
            _tasksCollection.checkDirtinessAndSave().then(function (isDirty) {
                console.log('checkDirtinessAndSave->isDirty: ', isDirty);
                return isDirty ? SynchronizationManager.synchronize() : Promise.resolve();
            });
        }
    }

    function _isActivated() {
        return _activated;
    }

    function _onIndentUnindent(ev, el) {
        var action = el.dataset.action,
            selTasks = _selectedTasks.slice();

        if (action === 'unindent') {
            selTasks.reverse(); // Unindenting must start from children
        }

        // TODO: replace with iterators or whatever is there in ES2015
        function iterator() {
            var task = selTasks.shift();
            if (!task) {
                return Promise.resolve();
            }
            return task[action]().then(function () {
                return iterator();
            });
        }

        console.time('Tasks ' + action);
        iterator().then(function () {
            console.timeEnd('Tasks ' + action);
        }).catch(function (e) {
            Logger.error(e);
            Logger.info('[!] Action failed');
            console.timeEnd('Tasks ' + action);
        });
    }

    function _onBatchMove() {
        var selTasks;
        var action = 'moveToList';
        var moveToDialog = new MoveTasksToDialog(_tasksCollection.list);
        var targetList = null;

        function iterator() {
            var task = selTasks.shift();
            if (!task) {
                return Promise.resolve();
            }
            return task[action](targetList).then(function () {
                return iterator();
            });
        }

        moveToDialog.onItemSelected = function (list) {
            selTasks = _filterOutChildren(_selectedTasks.slice());
            targetList = list;
            console.time('Tasks ' + action);
            iterator().then(function () {
                console.timeEnd('Tasks ' + action);
                _deactivate();
                ActiveListManager.list(targetList);
            }).catch(function (e) {
                Logger.error(e);
                Logger.info('[!] Action failed');
                console.timeEnd('Tasks ' + action);
            });
        }.bind(this);

        moveToDialog.show();
    }

    function _onBatchDelete() {

        var selTasks = _selectedTasks.slice().reverse();
        var action = 'remove';

        // TODO: replace with iterators or whatever is there in ES2015
        // TODO: common method
        function iterator() {
            var task = selTasks.shift();
            if (!task) {
                return Promise.resolve();
            }
            return task.unindentChildren()
                .then(function () {
                    return task.remove(true);
                })
                .then(function () {
                    return iterator();
                });
        }

        if (confirm(_selectedTasks.length + ' selected tasks will be deleted. Continue?')) {

            console.time('Tasks ' + action);
            iterator().then(function () {
                console.timeEnd('Tasks ' + action);
                _deactivate();
            }).catch(function (e) {
                Logger.error(e);
                Logger.info('[!] Action failed');
                console.timeEnd('Tasks ' + action);
            });
        }
    }

    function _initEvents() {
        _dom.btnDeactivate.on('click', _deactivate);
        _dom.btnUnindent.on('click', _onIndentUnindent);
        _dom.btnIndent.on('click', _onIndentUnindent);
        _dom.btnBatchMove.on('click', _onBatchMove);
        _dom.btnBatchDelete.on('click', _onBatchDelete);
    }

    function _init() {
        _initEvents();
    }

    module.exports = {
        init: _init,
        activate: _activate,
        deactivate: _deactivate,
        isActivated: _isActivated
    }

}());
