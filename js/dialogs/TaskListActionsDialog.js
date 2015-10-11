(function () {
    "use strict";

    var _$ = require('../DomHelper');

    var TaskListActionsDialog = function () {
        this._dom = Object.create(null);
        this._dom.dialog = _$('#tasks-actions')[0];
        this._dom.menu = this._dom.dialog.find('menu')[0];
        this._dom.btnSortTasks = _$('#btn-sort-tasks')[0];
        this._dom.btnShareTasks = _$('#btn-share-tasks')[0];
        this.visible = false;
        this._onButtonClickRef = this._onButtonClick.bind(this);
        this._initEvents();
    };

    TaskListActionsDialog.prototype._initEvents = function () {
        this._dom.menu.on('click', 'button', this._onButtonClickRef);
    };

    TaskListActionsDialog.prototype.onSortTasks = function () {
        //Not overridden
    };

    TaskListActionsDialog.prototype.onShareTasks = function () {
        //Not overridden
    };

    TaskListActionsDialog.prototype._onButtonClick = function (ev, el) {
        this.hide();
        switch (ev.target.id) {
            case this._dom.btnSortTasks.id:
                this.onSortTasks();
                break;
            case this._dom.btnShareTasks.id:
                this.onShareTasks();
                break;
        }
    };

    TaskListActionsDialog.prototype.show = function () {
        if (!this.visible) {
            this._dom.dialog.fadeIn();
            this.visible = true;
        }
        return this;
    };

    TaskListActionsDialog.prototype.hide = function () {
        if (this.visible) {
            this._dom.dialog.fadeOut();
            this.visible = false;
            this._dom.menu.off('click', this._onButtonClickRef);
        }
        return this;
    };

    module.exports = TaskListActionsDialog;

}());
