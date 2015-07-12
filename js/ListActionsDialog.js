/*
 * Alexei Koliada 2015.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

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
                onRenameList(ev);
                break;
            case ids.btnDeleteList:
                onDeleteList();
                break;
        }
        ev.preventDefault();
        _hide();
    }

    dom.dialog.on("click", "button", onButtonClicked);

    return {
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
