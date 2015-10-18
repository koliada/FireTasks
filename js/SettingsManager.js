(function () {
    "use strict";

    var Mustache = require('mustache'),
        SettingsStorage = require('./storage/SettingsStorage'),
        AccountsCollection = require('./collections/AccountsCollection'),
        AccountSettingsDialog = require('./dialogs/AccountSettingsDialog'),
        AboutDialog = require('./dialogs/AboutDialog'),
        ActiveListManager = require('./ActiveListManager'),
        ConnectivityManager = require('./ConnectivityManager'),
        utils = require('./utils'),
        _$ = require('./DomHelper');

    var _dom = Object.create(null),
        _storage = new SettingsStorage(this),
        _visible = false,
        _storageKeyGeneral = 'general',
        _settingIdKey = 'settingId',
        _settingClass = 'setting-item',

        _cache = {
            general: {},
            accounts: {}
        },

        _activeAccountSettingsRef = null,
        _buttonsHandlers = Object.create(null),

        _settingTemplates = {
            container: {
                template: _$('#setting-container-template')[0].innerHTML
            },
            button: {
                template: _$('#setting-button-template')[0].innerHTML
            },
            boolean: {
                template: _$('#setting-boolean-template')[0].innerHTML
            },
            select: {
                template: _$('#setting-select-template')[0].innerHTML
            }
        };

    _dom.layout = _$('#settings-layout')[0];
    _dom.accountSettingsLayout = _$('#account-settings-layout')[0];
    _dom.btnCloseLayout = _$('#btn-settings-back')[0];
    _dom.settingsList = _dom.layout.find('article > section[data-type="list"]')[0];

    var _generalSettings = [
        {
            itemId: 'accountsContainer',
            type: 'container',
            text: 'Accounts',
            items: [
                {
                    itemId: 'addAccountBtn',
                    type: 'button',
                    text: 'Add Account',
                    handler: _onAddAccount
                }
            ]
        },
        {
            itemId: 'deviceInteractionContainer',
            type: 'container',
            text: 'Device Interaction',
            items: [
                {
                    itemId: 'vibrateOnLongPress',
                    type: 'boolean',
                    text: 'Vibrate on long press',
                    default: true
                }
            ]
        },
        {
            itemId: 'miscellaneousContainer',
            type: 'container',
            text: 'Miscellaneous',
            items: [
                {
                    itemId: 'ignoreCompletedTasks',
                    type: 'boolean',
                    text: 'Ignore completed tasks',
                    description: 'When sharing task list',
                    default: true
                }
            ]
        },
        {
            itemId: 'aboutContainer',
            type: 'container',
            text: 'About',
            items: [
                {
                    itemId: 'help',
                    type: 'button',
                    href: 'https://github.com/koliada/FireTasks/wiki',
                    text: 'Help',
                    description: 'Wiki on GitHub'
                },
                {
                    itemId: 'feedback',
                    type: 'button',
                    href: 'https://github.com/koliada/FireTasks/issues',
                    text: 'Feedback',
                    description: 'Issues on GitHub'
                },
                {
                    itemId: 'donate',
                    type: 'button',
                    text: 'Donate',
                    handler: _openDonateLayout
                },
                {
                    itemId: 'pleaseRate',
                    type: 'button',
                    href: 'https://marketplace.firefox.com/app/fire-tasks',
                    text: 'Please rate',
                    description: 'Go to Marketplace'
                },
                {
                    itemId: 'about',
                    type: 'button',
                    text: 'About',
                    handler: _openAboutLayout
                }
            ]
        }
    ];

    var _accountSettings = [
        {
            itemId: 'synchronizationContainer',
            type: 'container',
            text: 'Synchronization',
            items: [
                {
                    itemId: 'automaticSynchronization',
                    type: 'boolean',
                    text: 'Automatic Synchronization',
                    description: 'When Fire Tasks starts and when a task gets changed',
                    default: true
                },
                {
                    itemId: 'periodicallySynchronize',
                    type: 'select',
                    text: 'Periodically synchronize',
                    description: 'Refresh offline data when app is running',
                    options: [
                        {value: "0", text: 'Never'},
                        {value: "60", text: 'Once a minute'},
                        {value: "300", text: 'Every 5 minutes'}
                    ],
                    default: "60"
                }
            ]
        },
        {
            itemId: 'accountActionsContainer',
            type: 'container',
            text: 'Account Actions',
            items: [
                {
                    itemId: 'logout',
                    type: 'button',
                    text: 'Remove Account',
                    handler: _removeAccount
                }
            ]
        }
    ];

    function _onAddAccount() {
        if (!ConnectivityManager.isOnline()) {
            utils.status.show('You are offline so it is impossible to add an account');
            return;
        }
        return AccountsCollection.getAccounts().add().then(function (account) {
            if (account.added()) {
                return _populateCache()
                    .then(_setDefaults)
                    .then(_saveAccountsData)
                    .then(_buildMainLayout)
                    .then(ActiveListManager.init);
            }
            if (account.updated()) {
                utils.status.show("Account " + account.getName() + " was not added because it already exists", 5000);
                return Promise.resolve();
            }
            return Promise.resolve();
        });
    }

    function _removeAccount() {
        if (confirm('This will remove account and related data from Fire Tasks. Continue?')) {
            if (_activeAccountSettingsRef) {
                return _activeAccountSettingsRef.account.remove()
                    .then(function () {
                        _removeAccountButton(_activeAccountSettingsRef.account);
                        return _activeAccountSettingsRef.dialog.hide(true);
                    })
                    .then(function () {
                        return _removeAccountData(_activeAccountSettingsRef.account);
                    });
            } else {
                return Promise.reject('No account');
            }
        }
    }

    //noinspection JSUnusedLocalSymbols
    function _openAccountSettings(ev, el) {
        var accountId = el.dataset[_settingIdKey],
            account = AccountsCollection.getAccounts().getById(accountId),
            dialog = new AccountSettingsDialog(account, function () {
                return _rootRenderer(utils.clone(_accountSettings), function (item) {
                    return utils.isDefined(_cache.accounts[accountId][item.itemId]) ? _cache.accounts[accountId][item.itemId] : item.default;
                });
            });
        _activeAccountSettingsRef = {account: account, dialog: dialog};
        dialog.applyCallback = _applyAccountSettings;
        dialog.show();
    }

    function _removeAccountButton(account) {
        var el = _dom.settingsList.find('.' + _settingClass + '[data-setting-id="' + account.getId() + '"]')[0].parentNode;
        el.parentNode.removeChild(el);
    }

    function _addAccountsSettingsItems(generalSettings) {
        AccountsCollection.getAccounts().each(function (account) {
            generalSettings[0].items.push({
                itemId: account.getId(),
                type: 'button',
                text: account.getName(),
                description: 'Google',
                handler: _openAccountSettings
            });
        });
    }

    function _onBtnClick(ev, el) {
        var settingId = el.dataset[_settingIdKey],
            handler = _buttonsHandlers[settingId];
        if (handler) {
            handler(ev, el);
        }
    }

    function _get(key) {
        var value = _cache.general[key];
        return Promise.resolve(value);
    }

    function _saveGeneralData() {
        return _storage.save(_storageKeyGeneral, _cache.general);
    }

    function _getGeneralData() {
        return _storage.get(_storageKeyGeneral);
    }

    function _getAccountData(account) {
        return _storage.get(account.getId());
    }

    function _saveAccountData(account) {
        var accountId = account.getId();
        return _storage.save(accountId, _cache.accounts[accountId]);
    }

    function _saveAccountsData() {
        return Promise.all(AccountsCollection.getAccounts().getAll().map(function (account) {
            return _saveAccountData(account);
        }));
    }

    function _removeAccountData(account) {
        return _storage.remove(account.getId());
    }

    function _set(key, value) {
        if (!utils.isDefined(key) || !utils.isDefined(value)) {
            throw new ReferenceError('Unable to set setting: invalid arguments');
        }
        _cache.general[key] = value;
        return new Promise(function (resolve, reject) {
            _saveGeneralData()
                .then(function () {
                    resolve(_cache.general[key]);
                }).catch(reject);
        });
    }

    function _remove(key) {
        if (_cache.general[key]) {
            delete _cache.general[key];
            return new Promise(function (resolve, reject) {
                _saveGeneralData()
                    .then(function () {
                        resolve(_cache.general);
                    }).catch(reject);
            });
        } else {
            Promise.resolve();
        }
    }

    function _extractValueFromEl(el) {
        if (el.nodeName === 'INPUT') {
            switch (el.type) {
                case "number":
                    return parseInt(el.value);
                case "checkbox":
                    return el.checked;
                default:
                    return el.value;
            }
        }
        if (el.nodeName === 'SELECT') {
            return el.value;
        }
    }

    function _applyChanges() {
        var settingsItems = _dom.settingsList.find('.' + _settingClass);
        settingsItems.forEach(function (el) {
            var itemId = el.dataset[_settingIdKey],
                value = _extractValueFromEl(el);
            if (utils.isDefined(value)) {
                _cache.general[itemId] = value;
            }
        });
        return _saveGeneralData();
    }

    function _applyAccountSettings(account, settingsItems) {
        settingsItems.forEach(function (el) {
            var itemId = el.dataset[_settingIdKey],
                value = _extractValueFromEl(el);
            if (utils.isDefined(value)) {
                _cache.accounts[account.getId()][itemId] = value;
            }
        });
        return _saveAccountData(account);
    }

    function _showLayout() {
        if (!_visible) {
            _buildMainLayout()
                .then(function () {
                    _visible = true;
                    _dom.layout.fadeIn();
                });
        }
    }

    function _hideLayout() {
        if (_visible) {
            if (AccountsCollection.getAccounts().getLength() === 0) {
                utils.status.show("Please add an account to start work");
                return Promise.resolve();
            }
            //_checkAccountsPresence();
            return _applyChanges()
                .then(function () {
                    _visible = false;
                    _dom.layout.fadeOut();
                    return Promise.resolve();
                });
        } else {
            return Promise.resolve();
        }
    }

    function _renderer() {
        if (this.type === 'select') { //TODO: Array.prototype.find()
            for (var i = 0; i < this.options.length; i++) {
                if (this.options[i].value === this.value) {
                    this.options[i].selected = true;
                }
            }
        }
        if (this.type === 'button') {
            _buttonsHandlers[this.itemId] = this.handler;
        }
        return Mustache.render(_settingTemplates[this.type].template, this);
    }

    function _rootRenderer(settings, valueGetter) {
        var html = '';
        settings.forEach(function (setting) {
            if (setting.type === 'container') {
                setting.childrenRenderer = _renderer;
                setting.valueGetter = valueGetter;
                setting.items.forEach(function (item) {
                    item.value = valueGetter(item);
                });
            }
            html += _renderer.call(setting);
        });
        return html;
    }

    function _buildMainLayout() {
        console.time('SettingsManager#buildLayout');
        var generalSettings = utils.clone(_generalSettings);
        _addAccountsSettingsItems(generalSettings);
        _dom.settingsList.innerHTML = _rootRenderer(generalSettings, function (item) {
            return utils.isDefined(_cache.general[item.itemId]) ? _cache.general[item.itemId] : item.default
        });
        console.timeEnd('SettingsManager#buildLayout');
        return Promise.resolve();
    }

    function _populateCache() {
        return _getGeneralData()
            .then(function (settings) {
                _cache.general = settings;
                return Promise.resolve();
            })
            .then(function () {
                return Promise.all(AccountsCollection.getAccounts().getAll().map(function (account) {
                    return _getAccountData(account);
                }));
            })
            .then(function (accountsData) {
                accountsData.forEach(function (data, idx) {
                    _cache.accounts[AccountsCollection.getAccounts().getAt(idx).getId()] = data;
                });
                return Promise.resolve();
            });
    }

    function _setDefaults() {
        function iterator(cacheObj, settings) {
            settings.forEach(function (setting) {
                if (setting.type !== 'container') {
                    if (!utils.isDefined(cacheObj[setting.itemId]) && utils.isDefined(setting.default)) {
                        cacheObj[setting.itemId] = setting.default;
                    }
                } else {
                    iterator(cacheObj, setting.items);
                }
            });
        }

        iterator(_cache.general, _generalSettings);
        AccountsCollection.getAccounts().each(function (account) {
            iterator(_cache.accounts[account.getId()], _accountSettings);
        });
        return Promise.resolve();
    }

    function _openAboutLayout() {
        AboutDialog.show();
    }

    function _openDonateLayout() {
        utils.showInDevelopmentTooltip();
    }

    function _initListeners() {
        _dom.btnCloseLayout.on('click', _hideLayout);
        _dom.settingsList.on('click', 'a', _onBtnClick);
        _dom.accountSettingsLayout.on('click', 'a', _onBtnClick);
    }

    function _init() {
        return _populateCache()
            .then(_setDefaults)
            .then(_saveGeneralData)
            .then(_saveAccountsData)
            .then(_initListeners);
    }

    module.exports = {
        init: _init,
        get: _get,
        set: _set,
        remove: _remove,
        showLayout: _showLayout
    };
}());
