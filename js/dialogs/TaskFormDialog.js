(function () {
    "use strict";

    var _$ = require('../DomHelper'),
        BasicFormDialog = require('./BasicFormDialog'),
        ActiveListManager = require('../ActiveListManager'),
        AccountsCollection = require('../collections/AccountsCollection'),
        utils = require('../utils');

    /**
     * @extends BasicFormDialog
     * @param entity
     * @constructor
     */
    var TaskFormDialog = function (entity) {

        this.dom = {};
        this.dom.dialog = _$('#task-form')[0];
        this.dom.header = this.dom.dialog.find('h1')[0];
        this.dom.btnClose = this.dom.dialog.find('#btn-task-form-back')[0];
        this.dom.btnDelete = this.dom.dialog.find('#btn-task-form-delete')[0];
        this.dom.btnOk = this.dom.dialog.find('#btn-task-form-ok')[0];
        this.dom.title = this.dom.dialog.find('[name="title"]')[0];
        this.dom.completed = this.dom.dialog.find('[name="completed"]')[0];
        this.dom.notes = this.dom.dialog.find('[name="notes"]')[0];
        this.dom.list = this.dom.dialog.find('[name="list"]')[0];

        this.fieldToFocus = this.dom.title;

        this.super.apply(this, arguments);

        this.onDeleteRef = this.onDelete.bind(this);
        this.dom.btnDelete.on('click', this.onDeleteRef);
    };

    utils.inherits(TaskFormDialog, BasicFormDialog);

    TaskFormDialog.prototype.onOk = function () {
        var title = this.dom.title.value.trim(),
            completed = this.dom.completed.checked,
            notes = this.dom.notes.value.trim(),
            listId = this.dom.list.value,
            task = this.entity;
        if (this.dom.title.validity.valid && !utils.isEmptyString(title)) {
            if (task) {
                task.update({
                    title: title,
                    completed: completed,
                    notes: notes,
                    list: listId
                });
            } else {
                ActiveListManager.list().then(function (list) {
                    list = (list.getId() === listId) ? list : list.collection.getById(listId);
                    if (list) {
                        console.time('Task Creation w/ request');
                        list.tasks.add({
                            title: title,
                            completed: completed,
                            notes: notes
                        }).then(SynchronizationManager.synchronize)
                            .then(function () {
                                console.timeEnd('Task Creation w/ request');
                            });
                    } else {
                        throw new Error('Could not find target list');
                    }
                });
            }
            this.hide();
        }
    };

    // Clean-ups event listeners
    TaskFormDialog.prototype.afterHide = function () {
        this.dom.btnDelete.off('click', this.onDeleteRef);
    };

    TaskFormDialog.prototype.setListsSelector = function (activeList) {
        var accountsFragment = '';
        activeList.collection.each(function (list) {
            accountsFragment += '<option value="' + list.getId() + '"'
                + (activeList.isEqual(list) ? ' selected="selected"' : '') + '>'
                + list.getName() + '</option>';
        });
        if (accountsFragment.length > 0) {
            this.dom.list.innerHTML = accountsFragment;
        }
    };

    TaskFormDialog.prototype.setValues = function () {

        /**
         * @this TaskFormDialog
         * @param list
         */
        function onActiveListGot(list) {
            this.setListsSelector(list);
            this.dom.header.innerHTML = this.entity ? 'Edit Task' : 'Create Task';
            this.dom.btnDelete.setStyle('display', this.entity ? 'block' : 'none');
            this.dom.btnOk.innerHTML = this.entity ? 'Update' : 'Create';
            this.dom.title.value = this.entity ? this.entity.getName() : "";
            this.dom.completed.checked = this.entity ? this.entity.isCompleted() : false;
            this.dom.notes.value = this.entity ? this.entity.getNotes() : "";
        }

        return new Promise(function (resolve, reject) {
            if (this.entity) {
                onActiveListGot.call(this, this.entity.collection.list);
                resolve();
            } else {
                ActiveListManager.list().then(function (activeList) {
                    onActiveListGot.call(this, activeList);
                    resolve();
                }.bind(this)).catch(reject);
            }
        }.bind(this));
    };

    TaskFormDialog.prototype.onDelete = function () {
        if (confirm("Delete Task '" + this.entity.getName() + "'?")) {
            this.entity.remove()
                .then(SynchronizationManager.synchronize);
            this.hide();
        }
    };

    module.exports = TaskFormDialog;
}());
