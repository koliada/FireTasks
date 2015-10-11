(function () {
    "use strict";

    var _$ = require('../DomHelper'),
        TaskListSortModeManager = require('../TaskListSortModeManager');

    var TaskListSortModeDialog = function () {
        this._dom = Object.create(null);
        this._dom.dialog = _$('#tasks-sort-mode')[0];
        this._dom.menu = this._dom.dialog.find('menu')[0];
        this._dom.btnSortTasksMyOrder = _$('#btn-sort-tasks-my-order')[0];
        this._dom.btnSortTasksAlphabetical = _$('#btn-sort-tasks-alphabetical')[0];
        this._dom.btnSortTasksDueDate = _$('#btn-sort-tasks-due-date')[0];
        this.visible = false;
        this._onButtonClickRef = this._onButtonClick.bind(this);
        this._initEvents();
    };

    TaskListSortModeDialog.prototype._initEvents = function () {
        this._dom.menu.on('click', 'button', this._onButtonClickRef);
    };

    TaskListSortModeDialog.prototype.onItemSelected = function (mode) {
        //Not overridden
    };

    TaskListSortModeDialog.prototype._onButtonClick = function (ev) {
        this.hide();
        switch (ev.target.id) {
            case this._dom.btnSortTasksMyOrder.id:
                this.onItemSelected(TaskListSortModeManager.getSortModes().myOrder);
                break;
            case this._dom.btnSortTasksAlphabetical.id:
                this.onItemSelected(TaskListSortModeManager.getSortModes().alphabetical);
                break;
            case this._dom.btnSortTasksDueDate.id:
                this.onItemSelected(TaskListSortModeManager.getSortModes().dueDate);
                break;
        }
    };

    TaskListSortModeDialog.prototype.show = function () {
        if (!this.visible) {
            this._dom.dialog.fadeIn();
            this.visible = true;
        }
        return this;
    };

    TaskListSortModeDialog.prototype.hide = function () {
        if (this.visible) {
            this._dom.dialog.fadeOut();
            this.visible = false;
            this._dom.menu.off('click', this._onButtonClickRef);
        }
        return this;
    };

    module.exports = TaskListSortModeDialog;

}());
