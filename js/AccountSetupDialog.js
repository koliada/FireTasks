/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

// TODO: migrate to DomHelper
var AccountSetupDialog = function () {
    "use strict";

    var dom = {
            dialog: $('#setup'),
            progress: $('#setup').find('progress').first()
        },
        visible;

    this.updateProgress = function () {

    };

    this.show = function () {
        if (visible) {
            return;
        }
        dom.dialog.removeClass('fade-out').addClass('fade-in');
        visible = true;
    };

    this.hide = function () {
        if (visible) {
            dom.dialog.removeClass('fade-in').addClass('fade-out');
            visible = false;
        }
    };

    return this;
};
