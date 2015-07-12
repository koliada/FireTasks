/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";

    var AccountsCollection = function (app) {

        if (!FT.isDefined(app)) {
            throw new TypeError('app is not defined');
        }

        BasicCollection.apply(this, arguments);

        this.app = app;
        this.storage = new AccountsStorage(this);
        //this.setData([]);

        //this.data = ViewManager.observable([], '#lists');
        this.data = [];

        this.go2Initialized = GO2.init(FT.options);

        return this;
    };

    AccountsCollection.prototype = Object.create(BasicCollection.prototype);
    AccountsCollection.prototype.constructor = AccountsCollection;

    /**
     * Adds new account; initiates full sequence of login and fetching data
     * @returns {Promise}
     */
    AccountsCollection.prototype.add = function () {

        var TIMEOUT = 10,
            self = this;

        var getUserInfo = function (accessToken) {
            // We can't use Proxy here because we don't have account on this point yet
            // It should retry login with 'immediate' flag if userinfo request fails
            return new Promise(function (resolve, reject) {
                var request = new XMLHttpRequest({mozSystem: true, cache: false});
                request.timeout = Math.pow(TIMEOUT, 4);
                request.open('get', 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + accessToken, true);
                request.responseType = 'json';
                request.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
                request.onload = function () {
                    resolve(request.response || JSON.parse(request.responseText));
                };
                request.onerror = reject;
                request.send();
                return request;
            });
        };

        return new Promise(function (resolve, reject) {

            function login() {
                GO2.login(true, false);
            }

            // TODO: display progress stages
            var //authWaitDialog = new AuthWaitDialog(login),
                accountSetupDialog = new AccountSetupDialog();

            // Step 1: Getting access token for the user
            GO2.logout();
            GO2.onlogin = function (accessToken) {

                //authWaitDialog.hide();
                accountSetupDialog.show();

                // Step 2: Calling userinfo to get basic user information, most of all we need id and email
                return getUserInfo(accessToken).then(function (res) {
                    // Step 3: Checking if we've retrieved user's id (so desirable)
                    if (res && res.id) {
                        // Step 4: Creating new Account instance with retrieved info
                        var account = new Account(FT.accounts, res, accessToken);
                        // Step 5: Saving newly created account to the AccountsStorage
                        self.storage.save(account).then(function () {
                            // Step 6: Loading user's lists
                            return account.lists.load();
                        }).then(function () {
                            // Step 7: Loading tasks for every list
                            return account.lists.loadTasks();
                        }).then(function () {
                            // Step 9: Adding account to the lists view
                            //ListsView.registerAccount(account);
                            //ListsView.render.account(account);
                            //ListsView.render.listsOfAccount(account);

                            // Step 10: Updating account's "data" property and resolving promise
                            self.data.push(account);

                            // Step 11: Settings last active list
                            //return FT.getLastActiveList();
                            return ActiveListManager.init();
                        }).then(function () {
                            accountSetupDialog.hide();

                            // Step 12: Applying knockout bindings
                            //ViewManager.applyBindings(FT);

                            resolve(account);
                        }).catch(Logger.error);
                    } else {
                        Logger.error('userinfo failed');
                        reject('userinfo failed');
                    }
                }).catch(function (e) {
                    utils.status.show('Something went wrong :(\nRetrying...', 2000);
                    Logger.error('Login failed');
                    GO2.logout();
                    GO2.login(false, true);
                    //authWaitDialog.show();
                });
            };
            login();
            //authWaitDialog.show();
        });
    };

//AccountsCollection.prototype.getAt = function (index) {
//    "use strict";
//    var id = Object.keys(this.data)[index];
//    return this.data[id];
//};

    AccountsCollection.prototype.render = function () {
        this.data.forEach(function (account) {
            account.view.render();
        });
    };

    AccountsCollection.prototype.refresh = function () {
        var self = this;
        return new Promise(function (resolve, reject) {
            Promise.all(self.data.map(function (account) {
                return account.refresh();
            })).then(function () {
                FT.accounts.render();
                resolve();
            }).catch(reject);
        });
    };

    scope.AccountsCollection = AccountsCollection;

}(window));
