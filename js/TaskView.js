/*
 * Alexei Koliada 2015.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";


    var TaskView = function (task, getParentEl) {

        if (!Task.prototype.isPrototypeOf(task)) {
            throw new TypeError('TaskView must be created with Task instance as a first parameter');
        }

        //if (!Element.prototype.isPrototypeOf(parentEl)) {
        //    throw new TypeError('TaskView must be created with Element as a second parameter');
        //}

        BasicView.apply(this, arguments);

        this.template = ViewManager.getTaskTemplate();
        //this.html = Handlebars.compile(this.template)(this.instance);
        //this.createDocumentFragment();

        return this;
    };

    TaskView.prototype = Object.create(BasicView.prototype);
    TaskView.prototype.constructor = TaskView;

    TaskView.prototype.getChildrenContainer = function () {
        return this.domElements[0].find('ol')[0];
    };

    TaskView.prototype.getCheckboxForCompletion = function () {
        return this.domElements[0].find('input[type="checkbox"].' + TaskView.classes.checkboxForCompletion)[0];
    };

    TaskView.prototype.getCheckboxForEditMode = function () {
        return this.domElements[0].find('input[type="checkbox"].' + TaskView.classes.checkboxForEditMode)[0];
    };

    TaskView.prototype.getCompletionCheckBoxValue = function () {
        return this.getCheckboxForCompletion().checked;
    };

    TaskView.prototype.onClick = function (ev) {
        if (ev.target.classList.contains(TaskView.classes.checkbox)) {
            return; // ignoring label click
        }
        if (ev.target.tagName === 'INPUT' && ev.target.type === "checkbox" && ev.target.classList.contains(TaskView.classes.checkboxForCompletion)) {
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
        if (this.instance.hasChildren()) {
            childrenContainer = this.getChildrenContainer();
            this.instance.children.each(function (child) {
                childrenContainer.appendChild(child.view.prepareTaskFragment());
            });
        }
        return fragment;
    };

    TaskView.prototype.getParentEl = function () {
        var parent = this.instance.getParent();
        return parent ? parent.view.getChildrenContainer() : ViewManager.getTasksContainer();
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
        if (!FT.isDefined(completed)) {
            completed = this.getCompletionCheckBoxValue();
        }
        this.domElements[0].classList[completed ? 'add' : 'remove'](TaskView.classes.completed);
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
        this.domElements[0].classList[selected ? 'add' : 'remove'](TaskView.classes.selected);
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

    //TaskView.prototype.indent = function () {
    //    var node = this.domElements[0];
    //    var prev = node.previousElementSibling;
    //};

    TaskView.classes = {
        taskItem: 'task-item',
        checkbox: 'pack-checkbox',
        completed: 'completed',
        selected: 'selected',
        checkboxForCompletion: 'for-completion',
        checkboxForEditMode: 'for-edit-mode'
    };

    scope.TaskView = TaskView;

}(window));
