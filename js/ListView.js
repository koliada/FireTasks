/*
 * Alexei Koliada 2015.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";


    var ListView = function (list, getParentEl) {

        if (!List.prototype.isPrototypeOf(list)) {
            throw new TypeError('ListView must be created with List instance as a first parameter');
        }

        //if (!Element.prototype.isPrototypeOf(parentEl)) {
        //    throw new TypeError('ListView must be created with Element as a second parameter');
        //}

        BasicView.apply(this, arguments);

        this.template = ViewManager.getListTemplate();
        //this.html = Mustache.render(this.template, this.instance);
        this.renderTemplate();

        return this;
    };

    ListView.prototype = Object.create(BasicView.prototype);
    ListView.prototype.constructor = ListView;

    ListView.prototype.setActive = function (active) {
        this.domElements[0].classList[active ? 'add' : 'remove'](ListView.classes.activeList);
    };

    ListView.prototype.onClick = function () {
        this.instance.setActive();
    };

    ListView.prototype.onContextMenu = function () {
        FT.vibrate();
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

    ListView.prototype.renderTasks = function () {
        ViewManager.getTasksContainer().innerHTML = '';
        ViewManager.getTasksContainer().scrollToTop();

        var fragment = document.createDocumentFragment();
        this.instance.tasks.each(function (task) {
            fragment.appendChild(task.view.prepareTaskFragment());
        });
        ViewManager.getTasksContainer().appendChild(fragment);
        return this;
    };

    ListView.prototype.update = function () {
        //var fragment, i,
        //    domElements = this.domElements.slice(); // clone, will be overridden
        //this.renderTemplate();
        //fragment = this.createFragment();
        //for (i = 0; i < fragment.children.length; i++) {
        //    this.getParentEl().replaceChild(fragment.children[i], domElements[i]);
        //}

        this.destroy();
        this.renderTemplate();
        this.render();

        return this;
    };

    ListView.classes = {
        listItem: 'list-item',
        activeList: 'list-selected'
    };

    scope.ListView = ListView;

}(window));
