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
    var ListFormDialog = function (entity) {

        this.dom = {};
        this.dom.dialog = _$('#list-form')[0];
        this.dom.header = this.dom.dialog.find('h1')[0];
        this.dom.btnClose = this.dom.dialog.find('#btn-list-form-back')[0];
        this.dom.btnOk = this.dom.dialog.find('#btn-list-form-ok')[0];
        this.dom.title = this.dom.dialog.find('[name="title"]')[0];
        this.dom.account = this.dom.dialog.find('[name="account"]')[0];

        this.fieldToFocus = this.dom.title;

        this.super.apply(this, arguments);
    };

    utils.inherits(ListFormDialog, BasicFormDialog);

    ListFormDialog.prototype.onOk = function () {
        var title = this.dom.title.value.trim(),
            accountId = this.dom.account.value,
            list = this.entity;
        if (this.dom.title.validity.valid && !utils.isEmptyString(title)) {
            this.hide();
            if (list) {
                if (list.getName() !== title) {
                    return list.update({
                        title: title
                    });
                }
            } else {
                var account = AccountsCollection.getAccounts().getById(accountId);
                if (account && account.lists && utils.isFunction(account.lists.add)) {
                    return account.lists.add(title);
                } else {
                    throw new Error('Could not find account or new list handler');
                }
            }
        }
    };

    ListFormDialog.prototype.setAccountsSelector = function (activeAccount) {
        var accountsFragment = '';
        AccountsCollection.getAccounts().each(function (account) {
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

        //TODO: remove when moving list is implemented
        function setAccountSelectorDisabled(disable) {
            if (disable) {
                this.dom.account.setAttribute("disabled", "disabled");
            } else {
                this.dom.account.removeAttribute("disabled");
            }
        }

        return new Promise(function (resolve, reject) {
            if (this.entity) {
                onActiveAccountGot.call(this, this.entity.collection.account);
                setAccountSelectorDisabled.call(this, true);
                resolve();
            } else {
                ActiveListManager.list().then(function (activeList) {
                    onActiveAccountGot.call(this, activeList.collection.account);
                    setAccountSelectorDisabled.call(this, false);
                    resolve();
                }.bind(this)).catch(reject);
            }
        }.bind(this));
    };

    module.exports = ListFormDialog;
}());
