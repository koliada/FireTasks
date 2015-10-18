(function () {
    "use strict";

    var ActionsDialogSingleton = require('./ActionsDialogSingleton'),
        ListFormDialog = require('./ListFormDialog'),
        _list;

    function onRenameList() {
        new ListFormDialog(_list).show();
    }

    function onDeleteList() {
        // TODO: use FFOS-specific dialog
        if (confirm("Delete List '" + _list.getName() + "'?")) {
            _list.delete();
        }
    }

    module.exports = {
        show: function (list) {
            _list = list;
            ActionsDialogSingleton.show(list.getName(), [
                {
                    id: 'renameList',
                    text: 'Rename task list',
                    handler: onRenameList
                },
                {
                    id: 'deleteList',
                    text: 'Delete task list',
                    handler: onDeleteList
                }
            ]);
        },
        hide: ActionsDialogSingleton.hide
    };
}());
