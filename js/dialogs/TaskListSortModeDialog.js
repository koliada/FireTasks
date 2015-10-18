(function () {
    "use strict";

    var ActionsDialogSingleton = require('./ActionsDialogSingleton'),
        TaskListSortModeManager = require('../TaskListSortModeManager'),
        _list;

    function onItemSelected (mode) {
        TaskListSortModeManager.set(mode).then(function () {
            _list.view.renderTasks();
        }.bind(this));
    }

    //TODO: use radio group
    module.exports = {
        show: function (list) {
            _list = list;
            ActionsDialogSingleton.show('Set sort mode', [
                {
                    id: 'showDeleted',
                    text: 'My order',
                    handler: onItemSelected.bind(null, TaskListSortModeManager.getSortModes().myOrder)
                },
                {
                    id: 'sortTasks',
                    text: 'Alphabetical (experimental)',
                    handler: onItemSelected.bind(null, TaskListSortModeManager.getSortModes().alphabetical)
                },
                {
                    id: 'exportTasks',
                    text: 'Due date',
                    handler: onItemSelected.bind(null, TaskListSortModeManager.getSortModes().dueDate),
                    disabled: true
                }
            ]);
        },
        hide: ActionsDialogSingleton.hide
    };

}());
