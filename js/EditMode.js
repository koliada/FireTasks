/*
 * Alexei Koliada 2015.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";

    scope.EditMode = (function () {

        var _activated = false,
            _tasksCollection = null,
            _selectedTasks = [],
            _dom = {
                tasks: ViewManager.getTasksContainer(),
                el: _$('#edit-mode')[0],
                selectedTasksCounter: _$('#selected-tasks-count')[0],
                btnDeactivate: _$('#btn-edit-mode-close')[0],
                btnUnindent: _$('#btn-unindent-tasks')[0],
                btnIndent: _$('#btn-indent-tasks')[0],
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

        function _filterOutChildren(tasksCollection) {
            var result = [];
            tasksCollection.forEach(function (task) {
                if (!~result.indexOf(task.getParent())) {
                    result.push(task);
                }
            });
            return result;
        }

        function _activate(task) {

            if (!Task.prototype.isPrototypeOf(task)) {
                throw new ReferenceError('Unable to activate Edit Mode - invalid task instance passed');
            }

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
                console.time('Edit Mode deactivated');
                _toggleTasksRepresentation(false);
                _toggleOverlay(false);
                _activated = false;
                console.timeEnd('Edit Mode deactivated');
                _tasksCollection.checkDirtinessAndSave().then(SynchronizationManager.synchronize);
            }
        }

        function _isActivated() {
            return _activated;
        }

        function _onIndentUnindent(ev, el) {
            var action = el.dataset.action,
                selTasks = _selectedTasks.slice(0);

            if (action === 'unindent') {
                selTasks.reverse(); // Unindenting must start from children
            }

            // TODO: replace with iterators or whatever is there in ES2015
            function iterator() {
                var task = selTasks.splice(0, 1)[0];
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

        function _onBatchDelete() {

            var selTasks = _selectedTasks.slice(0).reverse();

            // TODO: replace with iterators or whatever is there in ES2015
            // TODO: common method
            function iterator() {
                var task = selTasks.splice(0, 1)[0];
                if (!task) {
                    return Promise.resolve();
                }
                return task.remove().then(function () {
                    return iterator();
                });
            }

            if (confirm(_selectedTasks.length + ' selected tasks will be deleted. Continue?')) {

                console.time('Tasks ' + action);
                iterator().then(function () {
                    console.timeEnd('Tasks ' + action);
                    SynchronizationManager.synchronize();
                }).catch(function (e) {
                    Logger.error(e);
                    Logger.info('[!] Action failed');
                    console.timeEnd('Tasks ' + action);
                });

                //var promises = [];
                //_selectedTasks.reverse().forEach(function (task) {
                //    promises.push(task.remove());
                //});
                //Promise.all(promises)
                //    .then(SynchronizationManager.synchronize);
                _deactivate();
            }
        }

        function _initEvents() {
            _dom.btnDeactivate.on('click', _deactivate);
            _dom.btnUnindent.on('click', _onIndentUnindent);
            _dom.btnIndent.on('click', _onIndentUnindent);
            _dom.btnBatchDelete.on('click', _onBatchDelete);
        }

        function _init() {
            _initEvents();
        }

        return {
            init: _init,
            activate: _activate,
            deactivate: _deactivate,
            isActivated: _isActivated
        }
    }());

}(window));
