(function () {
    "use strict";

    var AccountsCollection = require('./collections/AccountsCollection'),
        SynchronizationManager = require('./SynchronizationManager'),
        SettingsManager = require('./SettingsManager'),
        ActiveListManager = require('./ActiveListManager'),
        ListFormDialog = require('./dialogs/ListFormDialog'),
        TaskFormDialog = require('./dialogs/TaskFormDialog'),
        TaskListActionsDialog = require('./dialogs/TaskListActionsDialog'),
        EditMode = require('./EditMode'),
        utils = require('./utils'),
        constants = require('./constants');

    /**
     * Item (List/Task) element click handler
     * @param {Event} ev Event
     * @param {Element} itemEl 'a' element expected
     * @private
     */
    function _onItemClick(ev, itemEl) {
        var view = itemEl.parentNode.view;
        if (view && view.onClick) {
            view.onClick(ev, itemEl);
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
            utils.vibrate()
                .then(EditMode.activate.bind(EditMode, taskEl.view.instance));
        } else {
            throw new Error('Could not enter edit mode since no task instance was found');
        }
    }

    function _onNewListClick() {
        new ListFormDialog().show();
    }

    function _onNewTaskClick() {
        new TaskFormDialog().show();
    }

    function _onOpenSettings() {
        SettingsManager.showLayout();
    }

    function _onAppTitleClick() {
        constants.TASKS_LIST_ELEMENT.scrollToTop();
    }

    function _onSyncClick() {
        console.time('Complete reload and synchronization');
        AccountsCollection.getAccounts().refresh()
            .then(function () {
                //return SynchronizationManager.synchronize(); // TODO: no sense since storage is overridden
                return Promise.resolve();
            })
            .then(ActiveListManager.init)
            .then(function () {
                console.timeEnd('Complete reload and synchronization');
            })
            .catch(function (e) {
                throw new Error('Synchronization failed', e);
            });
    }

    function _onTaskListActionsClick() {
        var dialog = new TaskListActionsDialog();
        //TODO: remove inline require
        require('./ActiveListManager').list().then(function (list) {
            dialog.onSortTasks = function () {
                list.tasks.showSortDialog();
            };
            dialog.onShareTasks = function () {
                list.tasks.share();
            };
            dialog.show();
        });
    }

    // TODO: Get rid of jQuery
    /**
     * Handles DOM element sorting
     * Fires when user drops sortable task
     * @param {Object} el jQuery element
     */
    function onTaskSorted(el) {
        var instance = el.view.instance,
            parent = el.view.getParentViaDom(),
            previous = el.view.getPreviousViaDom();
        parent = parent && parent.instance;
        previous = previous && previous.instance;
        return instance.move(parent, previous);
    }

    // TODO: check relevance
    // not relevant
    // The main purpose of this observer was to notify descendants that they are rendered
    function _onTaskListMutate(mutations) {

        //TODO: make this flag external when native sortable implementation is done
        if (constants.TASKS_LIST_ELEMENT._isSorted) {
            return;
        }

        mutations.forEach(function (mutation) {
            if (mutation.type === 'childList' && mutation.removedNodes.length) {
                mutation.removedNodes.forEach(function (node) {
                    node.view && node.view.onRemoved();
                });
            }
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                mutation.addedNodes.forEach(function (node) {
                    node.view && node.view.onAdded();
                });
            }
        });
    }

    function _patchNodes() {
        constants.TASKS_LIST_ELEMENT.scrollToTop = function () {
            this.parentNode.parentNode.scrollTop = 0;
        };
    }

    function _initEvents() {
        constants.BTN_NEW_LIST_ELEMENT.on('click', _onNewListClick);
        constants.BTN_NEW_TASK_ELEMENT.on('click', _onNewTaskClick);
        constants.BTN_OPEN_SETTINGS_ELEMENT.on('click', _onOpenSettings);
        constants.BTN_SYNC_ELEMENT.on('click', _onSyncClick);
        constants.APP_TITLE_ELEMENT.on('click', _onAppTitleClick);
        constants.BTN_TASK_LIST_ACTIONS_ELEMENT.on('click', _onTaskListActionsClick);
        constants.LISTS_LIST_ELEMENT.on('click', '.' + constants.LIST_ITEM_CLASS + ' > a', _onItemClick);
        constants.TASKS_LIST_ELEMENT.on('click', '.' + constants.TASK_ITEM_CLASS + ' > a', _onItemClick);
        constants.LISTS_LIST_ELEMENT.on('contextmenu', '.' + constants.LIST_ITEM_CLASS, _onListContextMenu);
        constants.TASKS_LIST_ELEMENT.on('contextmenu', '.' + constants.TASK_ITEM_CLASS, _onTaskContextMenu);

        //noinspection JSCheckFunctionSignatures
        new MutationObserver(_onTaskListMutate).observe(constants.TASKS_LIST_ELEMENT, {
            childList: true,
            attributes: false,
            characterData: false,
            subtree: true,
            attributeOldValue: false,
            characterDataOldValue: false
        });
    }

    //TODO: get rid of jQuery
    function _initSortable() {
        $(constants.TASKS_LIST_ELEMENT).sortable({
            connectWith: $(constants.TASKS_LIST_ELEMENT),
            items: ".task-item",
            handle: ".task-handle",
            axis: "y",
            placeholder: "sortable-placeholder",
            scrollSensitivity: 70,
            cursor: "move",
            update: function (event, ui) {

                constants.TASKS_LIST_ELEMENT._isSorted = false;
                onTaskSorted(ui.item[0])
                    .then(function () {
                        SynchronizationManager.synchronize();
                    });
                //FT.setAutoFetch();
            },
            start: function (event, ui) {

                constants.TASKS_LIST_ELEMENT._isSorted = true;
                /* Disable Edit Mode */
                //EditMode.disable();
                //FT.stopAutoFetch();

                /* Collapse children nodes */
                var children = $(ui.item[0]).find('li');
                if (children.length > 0) {
                    $(ui.item[0]).find('.item-title').first().prepend('<span class="item-children-num">(+' + children.length + ' more)&nbsp;</span>');
                    children.hide();
                    $(this).sortable("refreshPositions");
                    $(ui.item[0]).css('height', 'auto');
                }

                /* Adjust placeholder height */
                $('.sortable-placeholder').css('height', parseInt(window.getComputedStyle(ui.item[0], null)['height']));
            },
            change: function (event, ui) {

                /*
                 Shift moved item to the level of the target placeholder
                 Adjusts item's width
                 */
                $(ui.item[0]).css('width', $(ui.placeholder[0]).css('width'));
                $(ui.item[0]).offset({left: $(ui.placeholder[0]).offset().left});
            },
            stop: function (event, ui) {

                /* Expand children nodes */
                var children = $(ui.item[0]).find('li');
                children.show();
                $(ui.item[0]).find('.item-children-num').remove();
                $(ui.item[0]).css('height', 'auto');
                $(this).sortable("refreshPositions");
            }
        });
    }

    function _init() {
        _patchNodes();
        _initEvents();
        _initSortable();
    }

    module.exports = {
        init: _init,
        onSyncClick: _onSyncClick
    };

}());
