/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

describe('AccountsStorage', function () {
    "use strict";

    var account,
        accountsCollection,
        promise,
        userData = FT.apply({}, mocks.userinfo),
        id = userData.id;

    describe('new()', function () {
        it('should return new AccountsStorage instance', function () {
            accountsCollection = new AccountsCollection(FT);
            account = new Account(accountsCollection, userData, mocks.accessToken);
            return accountsCollection.storage.should.be.an.instanceOf(AccountsStorage);
        });
        it('should have link to the AccountsCollection', function () {
            return accountsCollection.storage.collection.should.equal(accountsCollection);
        });
        it('should have a localforage instance', function () {
            // No way to check for LocalForage type, so this should be enough
            return accountsCollection.storage.engine._ready;
        });
        it('should throw an exception when called without Account instance as a parameter', function () {
            return AccountsStorage.should.throw(TypeError);
        });
    });

    describe('#save()', function () {
        it('should return a promise', function () {
            promise = accountsCollection.storage.save(account);
            return promise.should.be.instanceOf(Promise);
        });
        it('should save account to the storage', function () {
            return promise.should.eventually.deep.equal(account.data);
        });
        it('should set account\'s "lastStorageAction" to "save"', function () {
            return account.added().should.be.true;
        });
        it('should change account\'s "lastStorageAction" to "update" after next save', function (done) {
            accountsCollection.storage.save(account).then(function () {
                account.updated().should.be.true;
                done();
            }).catch(function (e) {
                console.error(e);
                done(e);
            });
        });
    });

    describe('#remove()', function () {
        it('should return a promise', function () {
            promise = accountsCollection.storage.remove(account);
            return promise.should.be.instanceOf(Promise);
        });
        it('should resolve promise with undefined', function () {
            return promise.should.become(undefined);
        });
    });

    describe('#getAccounts()', function () {
        before(function (done) {
            accountsCollection.storage.save(account).then(function () {
                done();
            });
        });
        it('should return a promise', function () {
            promise = accountsCollection.storage.getAccounts();
            return promise.should.be.instanceOf(Promise);
        });
        it('should resolve promise with an object of accounts', function () {
            return promise.should.eventually.be.an('object');
        });
        it('should update AccountsCollection', function () {
            return accountsCollection.data[id].data.should.deep.equal(userData);
        });

        //AccountsStorage.engine.setItem('test', 'ab').then(function() {
        //	console.log(arguments);
        //	AccountsStorage.engine.removeItem('test').then(function() {
        //		console.log(arguments);
        //		AccountsStorage.engine.getItem('test').then(function() {
        //			console.log(arguments);
        //		})
        //	});
        //});

        it('should return empty object if no accounts are present', function () {
            promise = accountsCollection.storage.engine.clear().then(function () {
                return accountsCollection.storage.getAccounts();
            });

            return promise.should.eventually.be.empty;
        });
    });
});
