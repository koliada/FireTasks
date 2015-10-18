(function () {
    "use strict";

    var ActionsDialogSingleton = require('./ActionsDialogSingleton'),
        _list;

    function onShowDeleted() {
        _list.tasks.showDeleted();
    }

    function onSortTasks() {
        _list.tasks.showSortDialog();
    }

    function onShareTasks() {
        _list.tasks.share();
    }

    module.exports = {
        show: function (list) {
            _list = list;
            ActionsDialogSingleton.show('Tasks actions', [
                {
                    id: 'showDeleted',
                    text: 'Show deleted',
                    handler: onShowDeleted,
                    disabled: true
                },
                {
                    id: 'sortTasks',
                    text: 'Sort mode',
                    handler: onSortTasks
                },
                {
                    id: 'exportTasks',
                    text: 'Export task list',
                    handler: onShareTasks,
                    disabled: true
                }
            ]);
        },
        hide: ActionsDialogSingleton.hide
    };

}());
