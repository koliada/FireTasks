(function () {
    "use strict";

    var entityTypes = Object.create(null);

    module.exports = {
        registerEntityType: function (type, constructor) {
            entityTypes[type] = constructor;
        },
        isEntityType: function (type, object) {
            return entityTypes[type].prototype.isPrototypeOf(object);
        }
    };
}());
