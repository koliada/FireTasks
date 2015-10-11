/*
 * Alexei Koliada 2015.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";

    scope.HTMLImportManager = (function () {
        function getImportedHTMLLinks() {
            return _$('link[rel="import"]');
        }

        function importedHTMLContents() {
            return getImportedHTMLLinks().map(function (link) {
                return link.import;
            });
        }

        function searchThroughImportedContents(selector, startFrom) {
            var nodeList = [],
                importedHTMLContents = importedHTMLContents();
            if (!_$.isDocumentElement(startFrom) && importedHTMLContents) {
                importedHTMLContents.forEach(function (document) {
                    var result = (document !== startFrom) && _$(selector, document);
                    if (result) {
                        nodeList = nodeList.concat(result);
                    }
                });
            }
            return nodeList;
        }

        function getLinkContent(link) {

            //if (link.import) {
            //    return link.import;
            //}

            var request = new XMLHttpRequest();
            request.open('GET', link.href, false);  // `false` makes the request synchronous
            request.send(null);

            if (request.status === 200) {
                var fragment = document.createDocumentFragment(),
                    div = document.createElement('div');
                div.innerHTML = request.responseText;
                return fragment.appendChild(div).children;
            }
        }

        function processImportedContents() {
            console.time('Templates import');
            var fragment = document.createDocumentFragment();
            getImportedHTMLLinks().forEach(function (link) {
                //var content = getLinkContent(link),
                //    title = content.head.querySelector('title').innerHTML;
                //if (title) {
                //    fragment.appendChild(document.createComment(title));
                //}
                getLinkContent(link).clone().forEach(function (child) {
                    fragment.appendChild(child);
                });
                link.parentNode.removeChild(link);
            });
            document.body.appendChild(fragment);
            console.timeEnd('Templates import');
        }

        processImportedContents();
    }());
}(window));
