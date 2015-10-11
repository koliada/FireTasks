/*
 * Alexei Koliada 2015.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";

    scope.NavigationManager = (function () {

        var _registry = Object.create(null);

        function _showLayoutDependencies(deps) {
            deps && deps.forEach(function (dep) {
                if (_registry[dep]) {
                    _showLayoutDependencies(_registry[dep].dependencies);
                    _registry[dep].show();
                }
            });
        }

        //TODO: OH SHI~
        // Reinventing the wheel, because, you know, we're here because of learning
        function _onHashChanged(ev) {
            var regex = /(#.*)/gi,
                oldHash = ev.oldURL.match(regex)[0].substring(1),
                newHash = ev.newURL.match(regex)[0].substring(1),
                oldHashArray = oldHash.split('/'),
                newHashArray = newHash.split('/');

            if (newHash && _registry[newHash]) {
                _showLayoutDependencies(_registry[newHash].dependencies);
                _registry[oldHash] && _registry[oldHash].hide(); //TODO: add _current layout data and ask it to navigate away
                _registry[newHash].show();
            } else {
                oldHashArray.forEach(function (hash) {
                    _registry[hash] && _registry[hash].hide();
                });
            }

            return;

            if (newHash[0] === '/') {
                if (oldHashArray[oldHashArray.length - 1] === newHash.substring(1)) {
                    //_registry[oldHashArray[oldHashArray.length - 1]].hide();
                    location.href = '#' + (oldHashArray[oldHashArray.length - 2] || '');
                    return;
                }
                if (!oldHash) {
                    location.href = '#' + newHash.substring(1);
                } else {
                    location.href = '#' + oldHash + newHash;
                }
            } else {
                var last = _registry[newHashArray[newHashArray.length - 1]],
                    oneBeforeLast = _registry[newHashArray[newHashArray.length - 2]];
                last && last.show();
                oneBeforeLast && oneBeforeLast.hide();

                oldHashArray.forEach(function (hash) {
                    _registry[hash] && _registry[hash].hide();
                });
            }
        }

        function _onPopStateChanged(event) {
            var state = event.state,
                hash = window.location.hash,
                entry = _registry[hash],
                currentEntry = _registry[history.state];
            if (currentEntry) {
                currentEntry.hide.dependencies && currentEntry.hide.dependencies.forEach(function (dep) {
                    _registry[dep] && _registry[dep].show.fn();
                });
                currentEntry.hide.fn();
            }
            if (entry) {
                entry.show.dependencies && entry.show.dependencies.forEach(function (dep) {
                    _registry[dep] && _registry[dep].hide.fn();
                });
                entry.show.fn();
            }
            history.replaceState(hash, "", null);
        }

        function _registerRoute(name, config) {
            _registry[name] = config;
        }

        function _init() {
            //window.addEventListener('hashchange', _onHashChanged, false);
            window.addEventListener('popstate', _onPopStateChanged, false);
            //_$('body')[0].on('click', 'a', function (ev, el) {
            //    ev.preventDefault();
            //    var target = el.dataset.target;
            //    if (target) {
            //        history.pushState(target, "", '#' + target);
            //        location.href = '#' + target;
            //    }
            //    ev.stopPropagation();
            //});
            history.replaceState('#drawer', "", null);
            return Promise.resolve();
        }

        return {
            init: _init,
            registerRoute: _registerRoute
        }
    }());
}(window));
