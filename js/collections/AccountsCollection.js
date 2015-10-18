(function () {
    "use strict";

    var utils = require('../utils'),
        Logger = utils.logger,
        BasicCollection = require('./BasicCollection'),
        BasicStorage = require('../storage/BasicStorage'),
        AccountsStorage = require('../storage/AccountsStorage'),
        AccountSetupDialog = require('../dialogs/AccountSetupDialog'),
        Proxy = require('../Proxy'),
        options = require('../options'),
        Account = null,
        collection = null;

    var AccountsCollection = function () {
        this.super.apply(this, arguments);

        this.storage = new AccountsStorage(this);
        this.data = [];

        this.go2Initialized = global.GO2.init(options);
    };

    utils.inherits(AccountsCollection, BasicCollection);

    /**
     * Adds new account; initiates full sequence of login and fetching data
     * @returns {Promise}
     */
    AccountsCollection.prototype.add = function () {
        return new Promise(function (resolve, reject) {

            var messages = {
                userInfo: 'getting user info...',
                lists: 'retrieving lists...',
                tasks: 'retrieving tasks...',
                finalizing: 'finalizing...'
            };

            var listsLength, tick, progressValue = 0;
            var GO2 = global.GO2;

            function login() {
                GO2.login(true, false);
            }

            function updateProgress(data) {
                if (data.kind === "tasks#taskLists") {
                    AccountSetupDialog.setDescription(messages.lists);
                    listsLength = data.items.length;
                    tick = 100 / listsLength;
                    AccountSetupDialog.setProgress(100);
                }
                if (data.kind === "tasks#tasks") {
                    progressValue += tick;
                    AccountSetupDialog.setDescription(messages.tasks);
                    AccountSetupDialog.setProgress(Math.floor(progressValue));
                }
            }

            // Step 1: Getting access token for the user
            GO2.logout();
            GO2.init(options); //TODO: make common method
            GO2.onlogin = function (accessToken) {
                AccountSetupDialog.setDescription(messages.userInfo);
                AccountSetupDialog.show();

                // Step 2: Calling userinfo to get basic user information, most of all we need id and email
                return Proxy.getUserInfo(accessToken).then(function (res) {
                    AccountSetupDialog.setProgress(100);
                    // Step 3: Checking if we've retrieved user's id (so desirable)
                    if (res && res.id) {
                        var account = this.getById(res.id);
                        if (account) {
                            account.lastStorageAction = BasicStorage.statuses().updated; //TODO: seems not enough legit
                            AccountSetupDialog.hide();
                            resolve(account);
                        } else {
                            // Step 4: Creating new Account instance with retrieved info
                            account = new Account(collection, res, accessToken);
                            AccountSetupDialog.setDescription(messages.lists);
                            AccountSetupDialog.setProgress(0);
                            // Step 5: Saving newly created account to the AccountsStorage
                            account.save()
                                // Step 6: Loading lists, tasks and saving them to storage
                                .then(account.lists.load.bind(account.lists, updateProgress))
                                .then(function () {
                                    AccountSetupDialog.setProgress(100);
                                    AccountSetupDialog.setDescription(messages.finalizing);
                                    // Step 7: Adding account to collection
                                    this.data.push(account);
                                    // Step 8: Rendering accounts and lists
                                    collection.render();

                                    AccountSetupDialog.hide();
                                    resolve(account);
                                }.bind(this))
                                .catch(Logger.error);
                        }
                    } else {
                        console.error('Getting user info has failed - I don\'t see an ID');
                        reject('Getting user info has failed - I don\'t see an ID');
                    }
                }.bind(this))
                    .catch(function (error) {
                        console.error('User adding has failed', error);
                        AccountSetupDialog.hide();
                        reject(error);
                    });
            }.bind(this);
            login();
        }.bind(this));
    };

    AccountsCollection.prototype.render = function () {
        this.data.forEach(function (account) {
            account.view.render();
        });
    };

    /**
     *
     * @returns {Promise}
     */
    AccountsCollection.prototype.refresh = function () {
        return utils.waterfall(this.data.map(function (account) {
            return function () {
                console.log('Account data refresh started:', account.getName());
                return account.refresh().then(function () {
                    console.log('Account data refresh completed:', account.getName());
                });
            };
        })).then(function () {
            collection.render();
        });
    };

    AccountsCollection.prototype.populateCache = function () {
        return this.storage.getAccounts(function (value) {
            this.data.push(new Account(this, value));
        }.bind(this));
    };

    // We need lazy initialization to avoid circular dependency on this module
    function loadAccountDependency() {
        Account = require('../entities/Account'); // yeees, this little nasty dependency breaks all the things eventually
    }

    module.exports = {
        //TODO: rename?
        getAccounts: function () {
            if (!collection) {
                loadAccountDependency();
                collection = new AccountsCollection();
            }
            return collection;
        },

        isPrototypeOf: function (obj) {
            return AccountsCollection.prototype.isPrototypeOf(obj);
        },

        findList: function (list) {
            var result = null;
            if (!list) {
                return result;
            }
            collection.data.some(function (account) {
                var foundList = account.lists.getById(list.id);
                if (foundList) {
                    result = foundList;
                    return true;
                }
            });
            return result;
        },

        getFirstList: function () {
            return collection.data[0].lists.data[0];
        }
    };

    Object.freeze(module.exports);

}());
