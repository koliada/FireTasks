/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

/**
 * DOM processor for the Lists sidebar
 * Handles account and lists rendering and events processing
 */
var ListsView = (function () {
    "use strict";

    var _dom = {
        sidebar: _$('[data-type="sidebar"]')[0],
        lists: _$('#lists')[0],
        btnNewList: _$('#btn-new-list')[0],
        listFormDialog: _$('#list-form')[0]
    };
    var _classes = {
        accountItem: 'account-item',
        listItem: 'list-item',
        listSelected: 'list-selected'
    };
    var _ACTIONS = {
        add: 'add',
        edit: 'rename'
    };
    var _accountsRegistry = {};
    var _activeList = null;
    var _bindingsApplied = false;

    /**
     * List Form Dialog custom methods
     */
    !_$.noUI && FT.apply(_dom.listFormDialog, {
        btnClose: _$('#btn-list-form-back')[0],
        btnOk: _$('#btn-list-form-ok')[0],
        header: _dom.listFormDialog.find('h1')[0],
        listTitle: _dom.listFormDialog.find('[name="title"]')[0],
        account: _dom.listFormDialog.find('[name="account"]')[0],
        initListeners: function () {
            this.btnClose.on('click', this.onCancel.bind(this));
            this.btnOk.on('click', this.onOk.bind(this));
        },
        init: function () {
            this.initListeners();
        },

        /**
         * Initiates list of accounts
         */
        setAccounts: function () {
            var accountsFragment = '';
            FT.iterate(_activeList.account.collection.data, function (account) {
                accountsFragment += '<option value="' + account.getId() + '"'
                + ((account.getId() === _activeList.account.getId()) ? ' selected="selected"' : '') + '>'
                + account.getName() + '</option>';
            });
            if (accountsFragment.length > 0) {
                this.account.innerHTML = accountsFragment;
            }
        },

        /**
         * Shows the dialog
         * @param config
         * @param {String} config.action
         * @param {Function} config.callback
         * @param [config.listId]
         * @param [config.formData]
         */
        show: function (config) {
            if (!FT.isDefined(config.action) || !FT.isDefined(config.callback)) {
                throw new Error('action or callback is not defined');
            }
            var self = this;
            FT.iterate(config.formData, function (value, key) {
                if (self[key]) {
                    self[key].value = value;
                }
            });
            this.setAccounts();
            this.action = config.action;
            this.listId = config.listId;
            this.header.innerHTML = (config.action === _ACTIONS.add) ? 'Create Task List' : 'Rename Task List';
            this.btnOk.innerHTML = (config.action === _ACTIONS.add) ? 'Create' : 'Rename';
            this.callback = config.callback;
            this.fadeIn();
            this.listTitle.focus();
        },
        hide: function () {
            this.fadeOut();
        },
        onCancel: function () {
            this.hide();
            this.callback(false);
        },
        onOk: function () {
            var title = this.listTitle.value,
                account = this.account.value;
            if (this.listTitle.validity.valid && !FT.isEmptyString(title)) {
                this.callback({
                    account: account,
                    title: title
                });
                this.hide();
            }
        }
    });

    function _initEvents() {
        _dom.btnNewList.on('click', _onNewListClick);
        _dom.lists.on('click', '.' + _classes.listItem, _onListClick);
        _dom.lists.on('contextmenu', '.' + _classes.listItem, _onListContextMenu);
    }

    function _init() {
        //_initEvents();
        //_dom.listFormDialog.init();
    }

    /**
     * Registers account internally in ListsView
     * @param {Account} account
     * @private
     */
    function _registerAccount(account) {
        if (!Account.prototype.isPrototypeOf(account)) {
            throw new TypeError('Account instance expected as an argument')
        }
        if (!ListsCollection.prototype.isPrototypeOf(account.lists)) {
            throw new TypeError('Account instance does not have proper ListsCollection')
        }
        _accountsRegistry[account.getId()] = account;
    }

    function _isAccountRegistered(account) {
        return FT.isDefined(_accountsRegistry[account.getId()]);
    }

    function _validateAccount(account) {
        if (!Account.prototype.isPrototypeOf(account)) {
            throw new TypeError('Account validation: not an Account instance');
        }

        if (!_isAccountRegistered(account)) {
            throw new Error('Account is not registered. Use ListsView.registerAccount()');
        }
    }

    /**
     * List element click handler
     * @param {Element} listEl
     * @private
     */
    function _onListClick(listEl) {
        var listId = listEl.dataset.id,
            accountId = listEl.dataset.accountId,
            account = _accountsRegistry[accountId];

        if (account && account.lists && FT.isFunction(account.lists.onListClick)) {
            account.lists.onListClick(listId)
        } else {
            throw new Error('Could not find account or click handler');
        }
    }

    function _onListContextMenu(listEl) {
        var listId = listEl.dataset.id,
            accountId = listEl.dataset.accountId,
            account = _accountsRegistry[accountId];

        if (confirm('Remove list?')) {
            if (account && account.lists && FT.isFunction(account.lists.remove)) {
                account.lists.remove(listId)
            } else {
                throw new Error('Could not find account or remove list handler');
            }
        }
    }

    function _onNewListClick() {
        _dom.listFormDialog.show({
            action: _ACTIONS.add,
            formData: {
                listTitle: ''
            },
            callback: function (values) {
                if (values) {
                    var account = _accountsRegistry[values.account];
                    if (account && account.lists && FT.isFunction(account.lists.add)) {
                        account.lists.add(values.title)
                    } else {
                        throw new Error('Could not find account or new list handler');
                    }
                }
            }
        });
    }

    //exports.renderNoAccount = function () {
    //    var fragment = document.createDocumentFragment(),
    //        h2 = document.createElement('h2');
    //    h2.dataset.id = 'no-accounts';
    //    h2.innerHTML = 'No accounts';
    //    fragment.appendChild(h2);
    //    exports.appendToLists(fragment);
    //};

    /**
     * Renders DOM element for the given account
     * @param account
     * @private
     */
    function _renderElementOfAccount(account) {
        try {
            _validateAccount(account);
        } catch (e) {
            throw e;
        }

        if (_$.noUI) {
            return;
        }

        if (_getElementOfAccount(account)) {
            Logger.warn('Account element already exists');
            return;
        }
        var fragment = document.createDocumentFragment(),
            childElements = _createElementForAccount(account);
        fragment.appendChild(childElements[0]);
        fragment.appendChild(childElements[1]);
        _appendToElementOfLists(fragment);
    }

    /**
     * Renders lists of the given account
     * @param {Account} account
     * @private
     */
    function _renderElementsOfLists(account) {
        try {
            _validateAccount(account);
        } catch (e) {
            throw e;
        }

        if (_$.noUI) {
            return;
        }

        var fragment = document.createDocumentFragment();

        if (account.lists.data.length === 0) {
            return;
        }

        account.lists.data.forEach(function (list) {
            fragment.appendChild(_createElementForList(account, list));
        });

        _appendToElementOfAccount(account, fragment);
    }

    function _renderElementOfList(account, list, index) {
        try {
            _validateAccount(account);
            List.validateInstance(list);
        } catch (e) {
            throw e;
        }

        if (_$.noUI) {
            return;
        }

        index = index || 0;
        _appendToElementOfAccount(account, _createElementForList(account, list), index);
    }

    function _removeElementOfList(account, list) {
        try {
            _validateAccount(account);
            List.validateInstance(list);
        } catch (e) {
            throw e;
        }

        if (_$.noUI) {
            return;
        }

        _removeFromElementOfAccount(account, _getElementOfList(list).parentNode);
    }

    function _getElementOfAccount(account) {
        return _dom.lists.find('.' + _classes.accountItem + '[data-id="' + account.getId() + '"]')[0];
    }

    /**
     * Gets node for list
     * @param {List} list
     * @returns {Node} a
     * @private
     */
    function _getElementOfList(list) {
        return _dom.lists.find('.' + _classes.listItem + '[data-id="' + list.getId() + '"]')[0];
    }

    /**
     * Gets node for active list
     * @returns {Node} a
     * @private
     */
    function _getElementOfActiveList() {
        return _dom.lists.find('.' + _classes.listItem + '.' + _classes.listSelected)[0];
    }

    function _appendToElementOfLists(fragment) {
        _dom.lists.appendChild(fragment);
    }

    function _appendToElementOfAccount(account, fragment, index) {
        var ul = _getElementOfAccount(account).nextSibling;
        if (FT.isNumber(index) && ul.childNodes[index]) {
            ul.insertBefore(fragment, ul.childNodes[index]);
        } else {
            ul.appendChild(fragment);
        }
    }

    function _removeFromElementOfAccount(account, fragment) {
        _getElementOfAccount(account).nextSibling.removeChild(fragment);
    }

    function _createElementForAccount(account) {
        var h2 = document.createElement('h2'),
            ul = document.createElement('ul');
        h2.classList.add(_classes.accountItem);
        h2.dataset.id = account.getId();
        h2.innerHTML = account.getName();
        return [h2, ul];
    }

    function _createElementForList(account, list) {
        var classList = [_classes.listItem];

        if (list.selected) {
            classList.push('list-selected');
        }

        var li = document.createElement('li');
        li.innerHTML = '<a data-id="' + list.getId() + '" data-account-id="' + account.getId() + '" draggable="false" oncontextmenu="return(false);" class="' + classList.join(', ') + '">' + list.getName() + '</a>';

        return li;
    }

    /**
     * Marks list element as active by adding special class
     * @param {List} list
     * @param {Boolean} [scrollIntoView]
     * @private
     */
    function _markListActive(list, scrollIntoView) {

        try {
            List.validateInstance(list);
        } catch (e) {
            throw e;
        }

        var lastActiveEl = _getElementOfActiveList(),
            targetEl = _getElementOfList(list);
        lastActiveEl && lastActiveEl.classList.remove(_classes.listSelected);
        targetEl.classList.add(_classes.listSelected);
        _activeList = list;
        if (scrollIntoView) {
            //targetEl.scrollIntoView(true);
        }
    }

    //function _applyBindings(viewModel) {
    //    if (!_bindingsApplied) {
    //        ko.cleanNode(_dom.sidebar);
    //        ko.applyBindings(viewModel, _dom.sidebar);
    //        _bindingsApplied = true;
    //    }
    //}

    return {
        init: _init,
        registerAccount: _registerAccount,
        render: {
            account: _renderElementOfAccount,
            listsOfAccount: _renderElementsOfLists,
            list: _renderElementOfList
        },
        remove: {
            list: _removeElementOfList
        },
        markListActive: _markListActive,
        //applyBindings: _applyBindings
    };
}());
