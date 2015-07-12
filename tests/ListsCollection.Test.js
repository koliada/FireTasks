/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

describe('ListsCollection', function () {
	"use strict";

	var account,
		accountsCollection,
		promise,
		userData = FT.apply({}, mocks.userinfo);

	describe('new()', function () {
		it('should return new ListsCollection instance', function () {
			accountsCollection = new AccountsCollection(FT);
			account = new Account(accountsCollection, userData, mocks.accessToken);
			return account.lists.should.be.an.instanceOf(ListsCollection);
		});
		it('should have link to the account', function () {
			return account.lists.account.should.equal(account);
		});
		it('should have empty "data" array', function () {
			account.lists.data.should.be.an('array');
			return account.lists.data.should.be.empty;
		});
		it('should have ListsStorage instance', function () {
			return account.lists.storage.should.be.an.instanceOf(ListsStorage);
		});
		it('should have Proxy instance', function () {
			return account.lists.proxy.should.be.an.instanceOf(Proxy);
		});
		it('should throw an exception when called without Account instance as a parameter', function () {
			return ListsCollection.should.throw(TypeError);
		});
	});

	describe('#load()', function () {
		accountsCollection = new AccountsCollection(FT);
		var account = new Account(accountsCollection, userData, FT.apply({}, mocks.accessToken)),
			lists = mocks.lists,
			token = account.getToken();

		before(function () {
			this.server = mocks.createServer(['tokeninfo', 'lists'], token);
		});
		after(function () {
			this.server.restore();
		});
		it('should return a promise', function () {
			promise = account.lists.load();
			return promise.should.be.instanceOf(Promise);
		});
		it('should resolve promise with an array of List instances', function () {
			return promise.should.eventually.be.an('array');
		});
		it('should update "data" property with loaded lists', function () {
			//account.lists.data.should.not.be.empty;
			return account.lists.data[0].should.be.instanceOf(List);
		});
	});
});
