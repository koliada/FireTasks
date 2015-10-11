var _$ = require('../DomHelper'),
    ListFormDialog = require('./ListFormDialog');

//TODO: I'd like to have common action dialog to which I pass a list of actions and their handlers
var ListActionsDialog = (function () {
    "use strict";

    var dom = {},
        ids = {
            btnRenameList: 'btn-rename-list',
            btnDeleteList: 'btn-delete-list'
        },
        visible,
        _list;

    dom.dialog = _$('#list-actions')[0];
    dom.title = dom.dialog.find('header')[0];
    dom.btnDeleteList = dom.dialog.find('#' + ids.btnDeleteList);

    function _hide() {
        if (visible) {
            dom.dialog.fadeOut();
            visible = false;
        }
    }

    function onRenameList() {
        new ListFormDialog(_list).show();
    }

    function onDeleteList() {
        // TODO: use FFOS-specific dialog
        if (confirm("Delete List '" + _list.getName() + "'?")) {
            _list.remove();
        }
    }

    function onButtonClicked(ev) {
        switch (ev.target.id) {
            case ids.btnRenameList:
                onRenameList();
                break;
            case ids.btnDeleteList:
                onDeleteList();
                break;
        }
        ev.preventDefault();
        _hide();
    }

    dom.dialog.on("click", "button", onButtonClicked);

    module.exports = {
        show: function (list) {
            if (visible) {
                return;
            }
            _list = list;
            dom.title.innerHTML = list.getName();
            dom.btnDeleteList[0].disabled = !list.isDeletable();
            dom.dialog.fadeIn();
            visible = true;
        },

        hide: _hide
    };
}());
