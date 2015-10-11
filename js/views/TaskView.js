(function () {
    "use strict";

    var BasicView = require('./BasicView'),
        TaskListSortModeManager = require('../TaskListSortModeManager'),
        TaskFormDialog = require('../dialogs/TaskFormDialog'),
        EditMode = require('../EditMode'),
        utils = require('../utils'),
        constants = require('../constants');

    var TaskView = function (task, getParentEl) {
        this.super.apply(this, arguments);
        this.template = constants.TASK_TEMPLATE_ELEMENT.innerHTML;
    };

    utils.inherits(TaskView, BasicView);

    TaskView.prototype.getChildrenContainer = function () {
        return this.domElements[0].find('ol')[0];
    };

    TaskView.prototype.getCheckboxForCompletion = function () {
        return this.domElements[0].find('input[type="checkbox"].' + constants.CHECKBOX_FOR_COMPLETION_CLASS)[0];
    };

    TaskView.prototype.getCheckboxForEditMode = function () {
        return this.domElements[0].find('input[type="checkbox"].' + constants.CHECKBOX_FOR_EDIT_MODE_CLASS)[0];
    };

    TaskView.prototype.getCompletionCheckBoxValue = function () {
        return this.getCheckboxForCompletion().checked;
    };

    TaskView.prototype.onClick = function (ev) {
        if (ev.target.classList.contains(constants.CHECKBOX_CLASS)) {
            return; // ignoring label click
        }
        if (ev.target.tagName === 'INPUT' && ev.target.type === "checkbox" && ev.target.classList.contains(constants.CHECKBOX_FOR_COMPLETION_CLASS)) {
            this.instance.setCompleted();
        } else {
            if (EditMode.isActivated()) {
                this.instance.toggleSelected();
            } else {
                new TaskFormDialog(this.instance).show();
            }
        }
    };

    /**
     * Prepares documentFragment for the task including children
     */
    TaskView.prototype.prepareTaskFragment = function () {
        var fragment,
            childrenContainer;
        this.renderTemplate();
        fragment = this.createFragment();
        if (TaskListSortModeManager.isMyOrder() && this.instance.hasChildren()) {
            childrenContainer = this.getChildrenContainer();
            this.instance.children.each(function (child) {
                childrenContainer.appendChild(child.view.prepareTaskFragment());
            });
        }
        return fragment;
    };

    TaskView.prototype.getParentEl = function () {
        var parent = this.instance.getParent();
        return parent ? parent.view.getChildrenContainer() : constants.TASKS_LIST_ELEMENT;
    };

    TaskView.prototype.getParentViaDom = function () {
        var parent = this.domElements[0].parentNode;
        while (!(parent.view || parent === constants.TASKS_LIST_ELEMENT)) {
            parent = parent.parentNode;
        }
        return parent.view || null;
    };

    TaskView.prototype.getPreviousViaDom = function () {
        var previous = this.domElements[0].previousElementSibling;
        return (previous && previous.view) || null;
    };

    TaskView.prototype.render = function () {
        if (this.rendered) {
            throw new Error("TaskView: Already rendered");
        }
        var index = this.instance.getIndex(),
            parentEl = this.getParentEl();
        parentEl.insertBefore(this.prepareTaskFragment(), parentEl.children[index]);
        this.rendered = true;
        return this;
    };

    TaskView.prototype.onRemoved = function () {
        this.rendered = false;
        this.instance.children.each(function (child) {
            child.view.onRemoved();
        });
        return true;
    };

    TaskView.prototype.onAdded = function () {
        this.rendered = true;
        this.instance.children.each(function (child) {
            child.view.onAdded();
        });
    };

    TaskView.prototype.markCompleted = function (completed) {
        if (!utils.isDefined(completed)) {
            completed = this.getCompletionCheckBoxValue();
        }
        this.domElements[0].classList[completed ? 'add' : 'remove'](constants.COMPLETED_TASK_CLASS);
    };

    TaskView.prototype.toggleEditMode = function (enable) {
        if (enable) {
            this.getCheckboxForCompletion().parentNode.hide();
            this.getCheckboxForEditMode().parentNode.show('inline-block');
        } else {
            this.getCheckboxForEditMode().parentNode.hide();
            this.getCheckboxForCompletion().parentNode.show();
        }
    };

    TaskView.prototype.setSelected = function (selected) {
        this.getCheckboxForEditMode().checked = Boolean(selected);
        this.domElements[0].classList[selected ? 'add' : 'remove'](constants.SELECTED_TASK_CLASS);
        this.selected = selected;
        return this;
    };

    TaskView.prototype.toggleSelected = function () {
        return this.setSelected(!this.selected);
    };

    TaskView.prototype.update = function () {
        if (this.rendered) {
            this.destroy();
            this.renderTemplate();
            this.render();
        }
        return this;
    };

    module.exports = TaskView;

}());
