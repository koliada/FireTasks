/*
 * Alexei Koliada 2015.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

var AccountView = function (account, getParentEl) {
    "use strict";

    if (!Account.prototype.isPrototypeOf(account)) {
        throw new TypeError('AccountView must be created with Account instance as a first parameter');
    }

    //if (!Element.prototype.isPrototypeOf(parentEl)) {
    //    throw new TypeError('AccountView must be created with Element as a second parameter');
    //}

    BasicView.apply(this, arguments);

    this.template = ViewManager.getAccountTemplate().innerHTML;
    //this.html = Mustache.render(this.template, this.instance);
    this.renderTemplate();

    return this;
};

AccountView.prototype = Object.create(BasicView.prototype);
AccountView.prototype.constructor = AccountView;

AccountView.prototype.getListsContainer = function () {
    "use strict";
    return this.domElements[1];
};

AccountView.prototype.render = function () {
    "use strict";

    this.destroy();

    var fragment = document.createDocumentFragment(),
        selfFragment = this.createFragment();

    this.instance.lists.each(function (list) {
        fragment.appendChild(list.view.createFragment());
    });
    this.getListsContainer().appendChild(fragment);

    ViewManager.getListsContainer().appendChild(selfFragment);

    //this.add();
};
