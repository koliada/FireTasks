(function () {
    "use strict";

    var BasicView = require('./BasicView'),
        ListActionsDialog = require('../dialogs/ListActionsDialog'),
        utils = require('../utils'),
        constants = require('../constants');

    var ListView = function (list, getParentEl) {
        this.super.apply(this, arguments);
        this.template = constants.LIST_TEMPLATE_ELEMENT.innerHTML;
        this.renderTemplate();
    };

    utils.inherits(ListView, BasicView);

    ListView.prototype.setActive = function (active) {
        this.domElements[0].classList[active ? 'add' : 'remove'](constants.ACTIVE_LIST_ITEM_CLASS);
    };

    ListView.prototype.onClick = function () {
        this.instance.setActive();
    };

    ListView.prototype.onContextMenu = function () {
        utils.vibrate();
        ListActionsDialog.show(this.instance);
    };

    /**
     * deprecated
     */
    ListView.prototype.onLongPress = function () {
        ListActionsDialog.show(this.instance);
    };

    ListView.prototype.render = function () {
        if (this.rendered) {
            throw new Error("ListView: Already rendered");
        }
        var index = this.instance.getIndex();
        this.getParentEl().insertBefore(this.createFragment(), this.getParentEl().children[index]);
        this.rendered = true;
        return this;
    };

    //TODO: List view is not the obvious place for this
    ListView.prototype.renderTasks = function () {
        console.time('renderTasks');
        constants.TASKS_LIST_ELEMENT.innerHTML = '';
        constants.TASKS_LIST_ELEMENT.scrollToTop();

        var fragment = document.createDocumentFragment();
        this.instance.tasks.getSorted().each(function (task) {
            fragment.appendChild(task.view.prepareTaskFragment());
        });
        constants.TASKS_LIST_ELEMENT.appendChild(fragment);
        console.timeEnd('renderTasks');
        return this;
    };

    ListView.prototype.update = function () {
        this.destroy();
        this.renderTemplate();
        this.render();

        return this;
    };

    module.exports = ListView;

}());
