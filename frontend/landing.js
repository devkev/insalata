
    if( typeof Element.prototype.clearChildren === 'undefined' ) {
        Object.defineProperty(Element.prototype, 'clearChildren', {
          configurable: true,
          enumerable: false,
          value: function() {
            while(this.firstChild) this.removeChild(this.lastChild);
          }
        });
    }

    function _getClasses(node) {
        var classes = {};
        if (typeof(node.classList) !== "undefined") {
            for (var aClass of node.classList) {
                classes[aClass] = 1;
            }
        }
        return classes;
    }

    function _setClasses(node, newClasses) {
        node.setAttribute("class", Object.keys(newClasses).join(" "));
    }

    function addClass(node, className) {
        var classes = _getClasses(node);
        classes[className] = true;
        _setClasses(node, classes);
    }

    function removeClass(node, className) {
        var classes = _getClasses(node);
        delete classes[className];
        _setClasses(node, classes);
    }

    function swapClass(node, removeClassName, addClassName) {
        var classes = _getClasses(node);
        delete classes[removeClassName];
        classes[addClassName] = true;
        _setClasses(node, classes);
    }

    function hasClass(node, className) {
        var classes = _getClasses(node);
        return !!classes[className];
    }


    /////////////////////////////////////////////////////////////////

    var scheme = "ws";
    if (document.location.protocol === "https:") {
        scheme += "s";
    }
    var ws;
    var reconnectInterval;

    function connectedToServer() {
        return (ws && ws.readyState == WebSocket.OPEN);
    }

    var bannerElem;
    var bannerMsgElem;

    function clearBanner() {
        addClass(bannerElem, "hidden");
        bannerMsgElem.clearChildren();
        removeClass(bannerElem, "error");
    }

    function banner(msg) {
        removeClass(bannerElem, "error");
        bannerMsgElem.append(msg);
        removeClass(bannerElem, "hidden");
    }

    function errorBanner(msg) {
        addClass(bannerElem, "error");
        bannerMsgElem.append("ERROR:" + msg);
        removeClass(bannerElem, "hidden");
    }

    function errorBannerIfNotSet(msg) {
        if (!bannerMsgElem.hasChildNodes()) {
            errorBanner(msg);
        }
    }

    function tryConnect() {
        bannerElem = document.getElementById("banner");
        bannerMsgElem = document.getElementById("bannermsg");

        console.log("Trying to connect...");
        if (!ws || ws.readyState == WebSocket.CLOSING || ws.readyState == WebSocket.CLOSED) {
            try {
                ws = new WebSocket(scheme + "://" + document.location.host + "/ws");

                ws.onerror = function (event) {
                    console.log(event);
                    errorBannerIfNotSet("Unable to connect to server, trying to reconnect...");
                    if (!reconnectInterval) {
                        reconnectInterval = setInterval(tryConnect, 1000);
                    }
                };

                ws.onclose = function (event) {
                    console.log(event);
                    errorBannerIfNotSet("Lost connection to server, trying to reconnect...");
                    if (!reconnectInterval) {
                        reconnectInterval = setInterval(tryConnect, 1000);
                    }
                };

                ws.onopen = function (event) {
                    console.log("connected");
                    clearBanner();
                    if (reconnectInterval) {
                        clearInterval(reconnectInterval);
                        reconnectInterval = undefined;
                    } else {
                        // need to create a game
                        createGame({/*board_id*/});
                        // on successful response from this, redirect
                    }
                };

                ws.onmessage = function (event) {
                    var inmsg = {};
                    try {
                        inmsg = JSON.parse(event.data);
                    } catch (error) {
                        console.log("Unable to parse data from server: " + event.data);
                        return;
                    }

                    console.log("received", inmsg);
                    if (inmsg.type === "createdGame") {
                        var newurl = window.location.href;
                        if (newurl[newurl.length - 1] !== '/') {
                            newurl += "/";
                        }
                        newurl += "g/" + inmsg.state.shortcode;
                        window.location.href = newurl;

                    } else {
                        console.log("Unknown message", inmsg);
                        if (inmsg.error === true) {
                            errorBanner(JSON.stringify(inmsg));
                        }
                    }
                };

            } catch (e) {
                errorBanner("Unable to connect to server, trying to reconnect...");
            }
        }
    }

    function sendMessage(type, info) {
        var msg = Object.assign({ type }, info);
        console.log("sending", msg);
        ws.send(JSON.stringify(msg));
    }

    function createGame({boardId}) {
        // FIXME: board_id
        sendMessage("createGame");
    }

/*
vim: et:ts=4:sw=4:si:ai:
*/
