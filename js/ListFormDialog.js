/*
 * Alexei Koliada 2015.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";


    /**
     * @extends BasicFormDialog
     * @constructor
     */
    var ListFormDialog = function (entity) {

        this.dom = {};
        this.dom.dialog = _$('#list-form')[0];
        this.dom.header = this.dom.dialog.find('h1')[0];
        this.dom.btnClose = this.dom.dialog.find('#btn-list-form-back')[0];
        this.dom.btnOk = this.dom.dialog.find('#btn-list-form-ok')[0];
        this.dom.title = this.dom.dialog.find('[name="title"]')[0];
        this.dom.account = this.dom.dialog.find('[name="account"]')[0];

        this.fieldToFocus = this.dom.title;

        BasicFormDialog.apply(this, arguments);
    };

    ListFormDialog.prototype = Object.create(BasicFormDialog.prototype);
    ListFormDialog.prototype.constructor = ListFormDialog;

    ListFormDialog.prototype.onOk = function() {
        var title = this.dom.title.value.trim(),
            accountId = this.dom.account.value,
            list = this.entity;
        if (this.dom.title.validity.valid && !FT.isEmptyString(title)) {
            if (list) {
                if (list.getName() !== title) {
                    list.update({
                        title: title
                    });
                }
            } else {
                var account = FT.accounts.getById(accountId);
                if (account && account.lists && FT.isFunction(account.lists.add)) {
                    console.time('List Creation w/ request');
                    account.lists.add(title).then(function () {
                        console.timeEnd('List Creation w/ request');
                    });
                } else {
                    throw new Error('Could not find account or new list handler');
                }
            }
            this.hide();
        }
    };

    ListFormDialog.prototype.setAccountsSelector = function (activeAccount) {
        var accountsFragment = '';
        FT.accounts.data.forEach(function (account) {
            accountsFragment += '<option value="' + account.getId() + '"'
                + (activeAccount.isEqual(account) ? ' selected="selected"' : '') + '>'
                + account.getName() + '</option>';
        });
        if (accountsFragment.length > 0) {
            this.dom.account.innerHTML = accountsFragment;
        }
    };

    ListFormDialog.prototype.setValues = function () {

        /**
         * @this ListFormDialog
         * @param account
         */
        function onActiveAccountGot(account) {
            this.setAccountsSelector(account);
            this.dom.header.innerHTML = this.entity ? 'Rename Task List' : 'Create Task List';
            this.dom.btnOk.innerHTML = this.entity ? 'Rename' : 'Create';
            this.dom.title.value = this.entity ? this.entity.getName() : "";
        }

        return new Promise(function (resolve, reject) {
            if (this.entity) {
                onActiveAccountGot.call(this, this.entity.collection.account);
                resolve();
            } else {
                ActiveListManager.list().then(function (activeList) {
                    onActiveAccountGot.call(this, activeList.collection.account);
                    resolve();
                }.bind(this)).catch(reject);
            }
        }.bind(this));
    };

    scope.ListFormDialog = ListFormDialog;
}(window));
