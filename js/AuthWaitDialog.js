/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

var AuthWaitDialog = function (loginFn) {
    "use strict";

    if (!FT.isDefined(loginFn)) {
        throw new TypeError('AuthWaitDialog should be created with loginFn function as first argument');
    }

    var dom = {
            dialog: $('#auth-wait-dialog'),
            btnReopenDialog: $('#btn-auth-wait-reopen-dialog')
        },
        visible = false;

    this.show = function () {
        if (visible) {
            return;
        }
        dom.dialog.removeClass('fade-out').addClass('fade-in');
        visible = true;
        dom.btnReopenDialog.on('click', function () {
            loginFn();
        });
    };

    this.hide = function () {
        if (visible) {
            dom.dialog.removeClass('fade-in').addClass('fade-out');
            dom.btnReopenDialog.off();
            visible = false;
        }
    };

    return this;
};
