(function () {
    "use strict";

    var _$ = require('../DomHelper');

    //TODO: make common dialog for menu dialogs
    var MoveTasksToDialog = function (activeList) {
        this._dom = Object.create(null);
        this._dom.dialog = _$('#tasks-move-to')[0];
        this._dom.menu = this._dom.dialog.find('menu')[0];
        this.activeList = activeList;
        this.listsCollection = this.activeList.collection;
        this.visible = false;
        this._onButtonClickRef = this._onButtonClick.bind(this);
        this._buildMenu();
        this._initEvents();
    };

    MoveTasksToDialog.prototype._initEvents = function () {
        this._dom.menu.on('click', 'button', this._onButtonClickRef);
    };

    MoveTasksToDialog.prototype._createListMenuItem = function (list) {
        return '<button data-id="' + list.getId() + '" class="prevent-default">' + list.getName() + '</button>';
    };

    MoveTasksToDialog.prototype._buildMenu = function () {
        this._dom.menu.innerHTML = '';
        var fragment = '';
        this.listsCollection.each(function (list) {
            if (!list.isEqual(this.activeList)) {
                fragment += this._createListMenuItem(list);
            }
        }, this);
        fragment += '<button class="prevent-default">Cancel</button>';
        this._dom.menu.innerHTML = fragment;
    };

    MoveTasksToDialog.prototype.onItemSelected = function (list) {
        //Not overridden
    };

    MoveTasksToDialog.prototype._onButtonClick = function (ev, el) {
        var listId = el.dataset.id,
            list = listId && this.listsCollection.getById(listId);
        this.hide();
        if (list) {
            this.onItemSelected(list);
        }
    };

    MoveTasksToDialog.prototype.show = function () {
        if (!this.visible) {
            this._dom.dialog.fadeIn();
            this.visible = true;
        }
        return this;
    };

    MoveTasksToDialog.prototype.hide = function () {
        if (this.visible) {
            this._dom.dialog.fadeOut();
            this.visible = false;
            this._dom.menu.off('click', this._onButtonClickRef);
        }
        return this;
    };

    module.exports = MoveTasksToDialog;

}());
