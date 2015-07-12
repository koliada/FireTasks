/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

describe('BasicStorage', function () {
    "use strict";

    var TestStorage = function () {
        "use strict";

        BasicStorage.apply(this, arguments);
        this.tableName = 'test';
        this.createEngine();

        return this;
    };

    describe('.statuses()', function () {
        it('should return non-empty object', function () {
            var statuses = BasicStorage.statuses();
            return statuses.should.be.an('object').that.should.not.be.empty;
        });
    });

    describe('new()', function () {

        var instance;

        TestStorage.prototype = Object.create(BasicStorage.prototype);
        TestStorage.prototype.constructor = TestStorage;

        it('should provide basic class for separate storage instances', function () {
            instance = new TestStorage();
            instance.should.respondTo('createEngine');
        });
    });

    describe('#createEngine()', function () {
        it('should properly create new engine for descendant', function () {
            var instance = new TestStorage();
            instance.engine._config.name.should.equal('test');
        });
    });
});
