(function () {
    "use strict";

    var BasicView = require('./BasicView'),
        constants = require('../constants'),
        utils = require('../utils');

    var AccountView = function (account, getParentEl) {
        this.super.apply(this, arguments);
        this.template = constants.ACCOUNT_TEMPLATE_ELEMENT.innerHTML;
        this.renderTemplate();
    };

    utils.inherits(AccountView, BasicView);

    AccountView.prototype.getListsContainer = function () {
        return this.domElements[1];
    };

    AccountView.prototype.render = function () {
        this.destroy();

        var fragment = document.createDocumentFragment(),
            selfFragment = this.createFragment();

        this.instance.lists.each(function (list) {
            fragment.appendChild(list.view.createFragment());
        });
        this.getListsContainer().appendChild(fragment);

        constants.LISTS_LIST_ELEMENT.appendChild(selfFragment);
    };

    module.exports = AccountView;
}());
