/*
 * Alexei Koliada 2015.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

var ViewManager = (function () {
    "use strict";

    var _dom = {
        sidebar: _$('[data-type="sidebar"]')[0],
        lists: _$('#lists')[0],
        btnNewList: _$('#btn-new-list')[0],
        btnSync: $('#btn-sync-lists')[0],

        drawer: _$('#drawer')[0],
        appTitle: _$('#drawer > header > h1')[0],
        tasks: _$('#tasks ol')[0],
        activeListTitle: _$('#active-list-title')[0],

        btnNewTask: _$('#btn-new-task')[0],

        accountTemplate: _$('#account-template')[0],
        listTemplate: _$('#list-template')[0],
        taskTemplate: _$('#task-template')[0]
    };

    /**
     * Item (List/Task) element click handler
     * @param {Event} ev Event
     * @param {Element} itemEl 'li' element expected
     * @private
     */
    function _onItemClick(ev, itemEl) {
        if (itemEl.view && itemEl.view.onClick) {
            itemEl.view.onClick(ev, itemEl);
        } else {
            throw new Error('Could not find bound view or click handler');
        }
    }

    function _onListContextMenu(ev, listEl) {
        if (listEl.view && listEl.view.onContextMenu) {
            listEl.view.onContextMenu();
        } else {
            throw new Error('Could not find bound view or click handler');
        }
    }

    function _onTaskContextMenu(ev, taskEl) {
        if (taskEl.view && taskEl.view.instance) {
            FT.vibrate();
            EditMode.activate(taskEl.view.instance);
        } else {
            throw new Error('Could not enter edit mode since no task instance was found');
        }
    }

    /**
     * @deprecated
     */
    function _onListLongPress(ev, listEl) {
        if (listEl.view && listEl.view.onLongPress) {
            listEl.view.onLongPress();
        } else {
            throw new Error('Could not find bound view or long press handler');
        }
    }

    function _onNewListClick() {
        new ListFormDialog().show();
    }

    function _onNewTaskClick() {
        new TaskFormDialog().show();
    }

    function _onAppTitleClick() {
        ViewManager.getTasksContainer().scrollToTop();
    }

    function onSyncClick() {
        console.time('Complete reload and synchronization');
        FT.accounts.refresh().then(function () {
            //return SynchronizationManager.synchronize(); // TODO: no sense since storage is overridden
            return Promise.resolve();
        }).then(ActiveListManager.init).then(function () {
            console.timeEnd('Complete reload and synchronization');
        }).catch(function () {
            throw new Error('Synchronization failed');
        });
    }

    // not relevant
    function _onTaskListMutate(mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'childList' && mutation.removedNodes.length) {
                mutation.removedNodes.forEach(function (node) {
                    node.view.onRemoved();
                });
            } else if (mutation.type === 'childList' && mutation.addedNodes.length) {
                mutation.addedNodes.forEach(function (node) {
                    node.view.onAdded();
                });
            }
        });
    }

    function _initEvents() {
        _dom.btnNewList.on('click', _onNewListClick);
        _dom.btnNewTask.on('click', _onNewTaskClick);
        _dom.appTitle.on('click', _onAppTitleClick);
        _dom.btnSync.on('click', onSyncClick);
        _dom.lists.on('click', '.' + ListView.classes.listItem, _onItemClick);
        _dom.tasks.on('click', '.' + TaskView.classes.taskItem, _onItemClick);
        _dom.lists.on('contextmenu', '.' + ListView.classes.listItem, _onListContextMenu);
        _dom.tasks.on('contextmenu', '.' + TaskView.classes.taskItem, _onTaskContextMenu);
        //_dom.lists.on('longpress', '.' + _classes.listItem, _onListLongPress);

        //noinspection JSCheckFunctionSignatures
        new MutationObserver(_onTaskListMutate).observe(_dom.tasks, {
            childList: true,
            attributes: false,
            characterData: false,
            subtree: true,
            attributeOldValue: false,
            characterDataOldValue: false
        });
    }

    function _patchNodes() {
        _dom.tasks.scrollToTop = function () {
            this.parentNode.parentNode.scrollTop = 0;
        };
    }

    function _init() {
        _patchNodes();
        _initEvents();
    }

    return {
        init: _init,

        getSidebar: function () {
            return _dom.sidebar;
        },

        getListsContainer: function () {
            return _dom.lists;
        },

        getTasksContainer: function () {
            return _dom.tasks;
        },

        getAccountTemplate: function () {
            return _dom.accountTemplate;
        },

        getListTemplate: function () {
            return _dom.listTemplate.innerHTML;
        },

        getTaskTemplate: function () {
            return _dom.taskTemplate.innerHTML;
        },

        getActiveListElement: function () {
            return _dom.activeListTitle;
        }
    };

}());
