/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

describe('List', function () {
	"use strict";

	var account,
		list,
		promise,
		listData = FT.apply({}, mocks.lists.items[0]);

	describe('new()', function () {
		it('should return new List instance', function () {
			var accountsCollection = new AccountsCollection(FT);
			account = new Account(accountsCollection, FT.apply({}, mocks.userinfo), mocks.accessToken);
			list = new List(account.lists, listData);
			return list.should.be.an.instanceOf(List);
		});
		it('should have link to the account', function () {
			return account.lists.account.should.equal(account);
		});
		it('should have properly fulfilled "data" property', function () {
			return list.data.should.deep.equal(listData);
		});
		it('should have TasksCollection instance', function () {
			return list.tasks.should.be.an.instanceOf(TasksCollection);
		});
		it('should have link to the ListsCollection', function () {
			return list.collection.should.be.an.instanceOf(ListsCollection);
		});
		it('should throw an exception when called with wrong parameters', function () {
			return List.should.throw(TypeError);
		});
	});
});
