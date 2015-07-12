/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

/**
 * Handles longpress/longtap events
 */
window.Longpress = (function () {

    'use strict';

    var longPressTimeout = null,
        longPressStarted = false,
        longPressPrevented = false,
        defaultDelay = 400,
        allowedMoveDistance = 5,
        startTime,
        duration;

    return {
        /**
         * Binds long press event handler
         * @param {Object} target Element to bind
         * @param {Number} [delay]
         * @param {Function} [onLongPress] callback to be called on long press; function(event, targetElement)
         * @param {Function} [onClick] callback to be called on click; function(event, targetElement)
         * @param {Function} [preventConditionCallback] callback to be called to check whether londpress should be suppressed
         */
        bindLongPressHandler: function (target, delay, onLongPress, onClick, preventConditionCallback) {

            var startPosition = {};

            delay = parseInt(delay) || defaultDelay;
            preventConditionCallback = (typeof preventConditionCallback === 'function') ? preventConditionCallback : function () {
                return false;
            };

            target.addEventListener('touchstart', onStart, false);
            target.addEventListener('mousedown', onStart, false);
            target.addEventListener('touchmove', onMove, false);

            function onStart(ev) {
                // TODO: investigate touchdown event appearance
                /* prevents second binding */
                if (longPressStarted || (ev.type === 'mousedown' && FT.isFFOS)) {
                    return;
                } else {
                    longPressStarted = true;
                }

                ev.stopPropagation();

                startTime = new Date().getTime();

                //if (ev.type === 'touchstart') {
                //    target.addEventListener('touchend', onEnd, false);
                //    startPosition = {
                //        x: ev.touches[0].screenX,
                //        y: ev.touches[0].screenY
                //    };
                //} else if (ev.type === 'mousedown') {
                //    target.addEventListener('mouseup', onEnd, false);
                //}

                if (preventConditionCallback()) {
                    longPressPrevented = true;
                    return;
                } else {
                    longPressPrevented = false;
                }

                longPressTimeout = setTimeout(function () {
                    if (Settings.get('vibrateOnLongPress')) {
                        window.navigator.vibrate(80);
                    }
                    unbind(ev);
                    onLongPress && onLongPress(ev);
                    //target.classList.add('longpress-ready');
                }, delay);
            }

            function onEnd(ev) {

                if (longPressPrevented) {
                    duration = delay - 1; // force click event
                } else if (!longPressStarted) {
                    return;
                } else {
                    duration = new Date().getTime() - startTime;
                }

                unbind(ev);

                if (duration >= delay) {
                    onLongPress && onLongPress(ev);
                } else {
                    onClick && onClick(ev);
                }
            }

            function unbind(ev) {
                clearReady();
                clearTimeout(longPressTimeout);
                longPressStarted = null;
                if (ev.type === 'touchstart' || ev.type === 'touchmove') {
                    target.removeEventListener('touchend', onEnd);
                } else if (ev.type === 'mousedown') {
                    target.removeEventListener('mouseup', onEnd);
                }
            }

            function onMove(ev) {
                /* Allows touch move on 5 pixels from start point not to kill long press action */
                if (Math.abs(ev.touches[0].screenX - startPosition.x) > allowedMoveDistance ||
                    Math.abs(ev.touches[0].screenY - startPosition.y) > allowedMoveDistance) {
                    unbind(ev);
                }
            }

            function clearReady() {
                setTimeout(function () {
                    var els = document.querySelectorAll('.longpress-ready');
                    for (var i = 0; i < els.length; i++) {
                        els[i].classList.remove('longpress-ready');
                    }
                }, 200);
            }
        },

        /**
         * Clears started events
         */
        unbind: function () {
            clearTimeout(longPressTimeout);
            longPressStarted = null;
        }
    }
}());
