(function () {
    "use strict";

    var _$ = require('./DomHelper');

    var constants = {

        // Classes
        LIST_ITEM_CLASS: 'list-item',
        ACTIVE_LIST_ITEM_CLASS: 'list-selected',
        TASK_ITEM_CLASS: 'task-item',
        CHECKBOX_CLASS: 'pack-checkbox',
        COMPLETED_TASK_CLASS: 'completed',
        SELECTED_TASK_CLASS: 'selected',
        CHECKBOX_FOR_COMPLETION_CLASS: 'for-completion',
        CHECKBOX_FOR_EDIT_MODE_CLASS: 'for-edit-mode',

        // DOM elements
        SIDEBAR_ELEMENT: _$('[data-type="sidebar"]')[0],
        LISTS_LIST_ELEMENT: _$('#lists')[0],
        BTN_NEW_LIST_ELEMENT: _$('#btn-new-list')[0],
        BTN_OPEN_SETTINGS_ELEMENT: _$('#btn-settings')[0],
        BTN_SYNC_ELEMENT: _$('#btn-sync-lists')[0],

        DRAWER_ELEMENT: _$('#drawer')[0],
        APP_TITLE_ELEMENT: _$('#drawer > header > h1')[0],
        TASKS_LIST_ELEMENT: _$('#tasks ol')[0],
        ACTIVE_LIST_TITLE_ELEMENT: _$('#active-list-title')[0],

        BTN_NEW_TASK_ELEMENT: _$('#btn-new-task')[0],
        BTN_TASK_LIST_ACTIONS_ELEMENT: _$('#btn-tasks-actions')[0],

        ACCOUNT_TEMPLATE_ELEMENT: _$('#account-template')[0],
        LIST_TEMPLATE_ELEMENT: _$('#list-template')[0],
        TASK_TEMPLATE_ELEMENT: _$('#task-template')[0]
    };

    Object.freeze(constants);

    module.exports = constants;
}());
