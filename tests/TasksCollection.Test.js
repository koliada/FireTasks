/*
 * Alexei Koliada 2015.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

describe('TasksCollection', function () {
	"use strict";

	var account,
		list,
		promise,
		listData = FT.apply({}, mocks.lists.items[0]);

	describe('new()', function () {
		it('should return new TasksCollection instance', function () {
			var accountsCollection = new AccountsCollection(FT);
			account = new Account(accountsCollection, FT.apply({}, mocks.userinfo), mocks.accessToken);
			list = new List(account.lists, listData);
			list.tasks.should.be.an.instanceOf(TasksCollection);
		});
		it('should have link to the account', function () {
			list.tasks.account.should.equal(account);
		});
		it('should have link to the List', function () {
			list.tasks.list.should.equal(list);
		});
		it('should have empty "data" array', function () {
			list.tasks.data.should.be.an('array');
			list.tasks.data.should.be.empty;
		});
		it('should have Proxy instance', function () {
			list.tasks.proxy.should.be.an.instanceOf(Proxy);
		});
		it('should throw an exception when called with wrong parameters', function () {
			List.should.throw(TypeError);
		});
	});
});
