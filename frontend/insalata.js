Raphael(function () {

    if( typeof Element.prototype.clearChildren === 'undefined' ) {
        Object.defineProperty(Element.prototype, 'clearChildren', {
          configurable: true,
          enumerable: false,
          value: function() {
            while(this.firstChild) this.removeChild(this.lastChild);
          }
        });
    }

    function makePolygonPath(x, y, N, side) {
        // draw a dot at the center point for visual reference
        //paper.circle(x, y, 3).attr("fill", "black");

        var path = "", n, temp_x, temp_y, angle;

        for (n = 0; n <= N; n += 1) {
            // the angle (in radians) as an nth fraction of the whole circle
            angle = n / N * 2 * Math.PI;

            // The starting x value of the point adjusted by the angle
            temp_x = x + Math.sin(angle) * side;
            // The starting y value of the point adjusted by the angle
            temp_y = y + Math.cos(angle) * side;

            // Start with "M" if it's the first point, otherwise L
            path += (n === 0 ? "M" : "L") + temp_x + "," + temp_y;
        }
        return path;
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

    var _state;

    var bonusMoveSoundCounter = 0;

    var _display = {
        cellSize: 25,
        sound: {
            selectLine: new Howl({ src: ['/assets/399934_1676145-lq.mp3'] }),
            hoverLine: new Howl({ src: ['/assets/338229_3972805-lq.mp3'] }),
            increaseScore: new Howl({ src: ['/assets/51715_113976-lq.mp3'] }),
            newPlay: new Howl({ src: ['/assets/240776_4107740-lq.mp3'] }),
            otherPlayerScoreIncrease: new Howl({ src: ['/assets/515643_10246545-lq.mp3'] }),
            completedGameNormal: new Howl({ src: ['/assets/432874_4157918-lq.mp3'] }),
            completedGameWinner: new Howl({ src: ['/assets/456966_6456158-lq.mp3'] }),
            saladCopBonus: new Howl({ src: ['/assets/361346_5506271-lq.mp3'] }),
            bonusMove: new Howl({ src: ['/assets/253172_4404552-lq.mp3'],
                                  onend: function () {
                                      bonusMoveSoundCounter--;
                                      if (bonusMoveSoundCounter > 0) {
                                          this.play();
                                      }
                                  }
                                }),
        },
    };
    _display.cell_w = Math.sqrt(3) * _display.cellSize;
    _display.cell_h = 2 * _display.cellSize;

    function updateFullSize(display) {
        display.holder = document.getElementById("holder");
        display.full_w = display.holder.clientWidth - 5;
        display.full_h = display.holder.clientHeight - 5;
        console.log('full size is', display.full_w, display.full_h);
    }
    updateFullSize(_display);

    //var r = Raphael("holder", 640, 480);
    var r = Raphael("holder", _display.full_w, _display.full_h);

    var gameShortCode = getGameShortCode();

    _display.cells = r.set();
    _display.edges = r.set();
    _display.edgesInteract = r.set();
    _display.icons = {};
    _display.glows = {};

    function updateViewBox(display) {
        var scale_w = display.full_w / display.board_w;
        var scale_h = display.full_h / display.board_h;

        var left_x = display.min_x;
        var right_x = display.max_x;
        if (scale_w > scale_h) {
            var target_w = scale_w / scale_h * display.board_w;
            var diff_w = target_w - display.board_w;
            left_x -= diff_w / 2;
            right_x += diff_w / 2;
        }
        r.setSize(display.full_w, display.full_h);
        r.setViewBox(left_x, display.min_y, right_x, display.max_y);
    }


    //var img = document.getElementById("bg");
    //img.style.display = "none";

    // draw the bg
    //r.image(img.src, 0, 0, 640, 480);

    var bannerElem = document.getElementById("banner");
    var bannerMsgElem = document.getElementById("bannermsg");

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

    function connectedToServer() {
        return (ws && ws.readyState == WebSocket.OPEN);
    }

    var scheme = "ws";
    if (document.location.protocol === "https:") {
        scheme += "s";
    }
    var ws;
    var reconnectInterval;
    tryConnect();

    function tryConnect() {
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

                        for (var selectable of document.querySelectorAll(".selectable")) {
                            addClass(selectable, "paused");
                        }
                    }
                };

                ws.onopen = function (event) {
                    console.log("connected");
                    clearBanner();
                    if (reconnectInterval) {
                        clearInterval(reconnectInterval);
                        reconnectInterval = undefined;

                        for (var selectable of document.querySelectorAll(".selectable.paused")) {
                            removeClass(selectable, "paused");
                        }
                    } else {
                        enquireGame({ gameShortCode });
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

                    } else if (inmsg.type === "enquiryResults") {
                        // if i'm already in this game, then just join it again.  otherwise show the join-section.
                        var enquiryState = inmsg.state;
                        findMe(enquiryState);
                        updateOtherPlayers(enquiryState);
                        if (enquiryState.me) {
                            joinGame({ gameShortCode });
                        } else {
                            removeClass(document.getElementById("join-section"), "hidden");
                            document.getElementById("name").focus();
                        }

                    } else if (inmsg.type === "joinedGame") {
                        updateState(inmsg.state);

                        populateDisplay(_display, _state);

                        updateOtherPlayers(_state);
                        addClass(document.getElementById("join-section"), "hidden");

                        if (_state.in_progress) {
                            updateScores(_state);
                            updateBoard(_state);

                            // FIXME: if allPlayersHaveMoved, then do these
                            makeSelected(_display, _state);
                            makeSelectable(_display, _state);
                            // else do this
                            //updateColors(_state);
                        } else {
                            if (_state.myPlayerIndex === 0) {
                                banner("Waiting for other players to join, click Start Game when ready!");
                            } else {
                                banner("Waiting for the game to start...");
                            }
                        }

                    } else if (inmsg.type === "newPlayerJoined") {
                        updateState(inmsg.state);

                        updateOtherPlayers(_state);

                    } else if (inmsg.type === "startedGame") {
                        updateState(inmsg.state);

                        clearBanner();

                        updateScores(_state);
                        updateBoard(_state);
                        updateOtherPlayers(_state);

                        makeSelected(_display, _state);
                        makeSelectable(_display, _state);

                    } else if (inmsg.type === "playerMoved") {
                        updateState(inmsg.state);

                        updateScores(_state);
                        updateBoard(_state);
                        updateOtherPlayers(_state);

                        if (_state.me.bonusLines > 0) {
                            makeSelected(_display, _state);
                            makeSelectable(_display, _state);
                        } else {
                            updateColors(_state);
                        }

                    } else if (inmsg.type === "newPlay") {
                        updateState(inmsg.state);

                        updateScores(_state);
                        updateBoard(_state);
                        updateOtherPlayers(_state);

                        makeSelected(_display, _state);
                        makeSelectable(_display, _state);

                        _display.sound.newPlay.play();

                    } else if (inmsg.type === "completedGame") {
                        updateState(inmsg.state);

                        updateScores(_state);
                        updateBoard(_state);
                        updateOtherPlayers(_state);

                        makeSelected(_display, _state);
                        updateColors(_state);

                        var maxScore = getMaxScore(_state.players);
                        var myScore = sumScore(_state.me.score);
                        if (myScore >= maxScore) {
                            banner("Game over!  Congratulations, you won!");
                            _display.sound.completedGameWinner.play();
                        } else {
                            var aheadOfMe = _state.players.map(player => sumScore(player.score)).filter(score => score > myScore).length;
                            var position = aheadOfMe + 1;
                            var positionDescription = "" + position;
                            if (position == 2) {
                                positionDescription += "nd";
                            } else if (position == 3) {
                                positionDescription += "rd";
                            } else {
                                positionDescription += "th";
                            }
                            banner("Game over!  You came " + positionDescription + "!");
                            _display.sound.completedGameNormal.play();
                        }

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


    function getMaxScore(players) {
        return players.map(player => sumScore(player.score)).reduce((a, b) => (a > b ? a : b));
    }



    function getGameShortCode() {
        var match;
        if (match = document.location.pathname.match(/^\/g\/(.*)$/)) {
            return match[1];
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

    function enquireGame({gameShortCode}) {
        sendMessage("enquireGame", { gameShortCode });
    }

    function startGame({gameShortCode}) {
        sendMessage("startGame", { gameShortCode });
    }

    function joinGame({gameShortCode, playerName}) {
        sendMessage("joinGame", { gameShortCode, playerName });
    }

    function sendMove({edgeIndex}) {
        sendMessage("doMove", { gameShortCode, move: edgeIndex });
    }


    function getPlayerId() {
        // this is pretty dodgy, oh well. js-cookie is the right way to do it.
        var match = document.cookie.match(/player_id=([0-9a-f-]*)/);
        if (match) {
            return match[1];
        }
    }

    function getPlayerIndex(players, id) {
        for (var playerIndex = 0; playerIndex < players.length; playerIndex++) {
            if (players[playerIndex].id === id) {
                return playerIndex;
            }
        }
        return -1;
    }

    function findMe(newState) {
        console.log(document.cookie);
        var player_id = getPlayerId();
        if (!player_id) {
            errorBanner("Unable to determine player_id, cannot proceed! :(");
            throw("ERROR: Unable to determine player_id, cannot proceed! :(");
        }
        console.log(player_id);
        newState.myPlayerIndex = getPlayerIndex(newState.players, player_id);
        if (newState.myPlayerIndex >= 0) {
            if (_state && newState.myPlayerIndex != _state.myPlayerIndex) {
                console.log("Glerk, my player index has changed! Hope that's ok...?", _state.myPlayerIndex, newState.myPlayerIndex);
            }
            newState.me = newState.players[newState.myPlayerIndex];
            document.getElementById("myname").innerHTML = "Welcome, " + newState.me.name + "!";
        }
    }

    function updateState(newState) {
        findMe(newState);
        if (_state) {
            if (_state.me && sumScore(newState.me.score) > sumScore(_state.me.score)) {
                _display.sound.increaseScore.play();
            }

            if (_state.me && newState.me.score.saladcop_bonus > 0 && _state.me.score.saladcop_bonus === 0) {
            //if (_state.me && newState.me.moves.length === 2) {  // for testing
                _display.sound.saladCopBonus.play();
                addClass(document.getElementById("saladcopbonus"), "appear");
                removeClass(document.getElementById("saladcopbonus"), "hidden");
                setTimeout(function () {
                    swapClass(document.getElementById("saladcopbonus"), "appear", "disappear");
                    setTimeout(function () {
                        addClass(document.getElementById("saladcopbonus"), "hidden");
                    }, 500);
                }, 2500);
            }

            if (_state.me && _state.me.bonusLines === 0 && newState.me.bonusLines > _state.me.bonusLines) {
                // Previously had no bonus lines.  So the last move was a regular move.  So these are all new bonusLines.
                bonusMoveSoundCounter = newState.me.bonusLines - _state.me.bonusLines;
                _display.sound.bonusMove.play();
            } else if (_state.me && _state.me.bonusLines > 0 && newState.me.bonusLines >= _state.me.bonusLines) {
                // Previously had bonus lines.  SO the last move was a bonus move.  So having the same number means I got 1.  Having 1 more means I got 2. etc.
                bonusMoveSoundCounter = newState.me.bonusLines - _state.me.bonusLines + 1;
                _display.sound.bonusMove.play();
            }

            for (var playerIndex = 0; playerIndex < newState.players.length; playerIndex++) {
                var newPlayer = newState.players[playerIndex];
                if (newState.me && newPlayer.id === newState.me.id) {
                    continue;
                }
                var player = _state.players[playerIndex];
                if (player && sumScore(newPlayer.score) > sumScore(player.score)) {
                    _display.sound.otherPlayerScoreIncrease.play();
                }
            }
        }
        if (newState.in_progress) {
            addClass(document.getElementById("startButton"), "hidden");
        }
        console.log(newState);
        _state = newState;
    }

    function sumScore(playerScore) {
        if (Array.isArray(playerScore)) {
            var total = 0;
            for (var subScore of playerScore) {
                total += sumScore(subScore);
            }
            return total;
        } else if (typeof(playerScore) === "object") {
            var total = 0;
            for (var subScoreKey of Object.keys(playerScore)) {
                total += sumScore(playerScore[subScoreKey]);
            }
            return total;
        } else {
            return playerScore;
        }
    }

    function updateBoard(state) {
        var playerState = state.me;

        for (var active_cell in playerState.active_cells) {
            /* not the best looking effect, but good enough for now i guess */
            addClass(_display.cells[active_cell].node, "highlight");
        }

        for (var connected_target in playerState.connected_targets) {
            addClass(_display.glows[connected_target].node, "highlight");
        }
        for (var connected_shop in playerState.connected_shops) {
            addClass(_display.glows[connected_shop].node, "highlight");
        }
    }

    function updateOtherPlayers(state) {
        for (var player of state.players) {
            if (state.me && player.id === state.me.id) {
                continue;
            }
            var playerEntry = document.getElementById(player.id);
            if (!playerEntry) {
                var otherPlayers = document.getElementById("other-players");
                playerEntry = document.createElement("li");
                playerEntry.setAttribute("id", player.id);
                otherPlayers.appendChild(playerEntry);
            }
            playerEntry.innerHTML = player.name + ": " + sumScore(player.score);
        }
    }

    function updateScores(state) {
        document.getElementById("score").innerHTML = sumScore(state.me.score);

        var current_round = state.round
        for(var i=0; i<=current_round; i++) {
            round_num = i+1;
            removeClass(document.getElementById("round"+round_num+"-message"), "hidden");
            document.getElementById("round"+round_num).innerHTML = state.me.score.target_rounds[i];
            //document.getElementById("jojo").innerHTML = "round"+round_num+"-message";
        }
        document.getElementById("houses").innerHTML = sumScore(state.me.score.shops_joined);
        document.getElementById("bonuses").innerHTML = sumScore(state.me.score.bonuses);
        if(state.me.score.saladcop_bonus != 0) {
            removeClass(document.getElementById("saladcop-message"), "hidden");
            document.getElementById("saladcop").innerHTML = state.me.score.saladcop_bonus;
        }

        document.getElementById("rounds-left").innerHTML = (state.round + 1) + "&nbsp;of&nbsp;" + state.board.numRounds;
        if (!state.in_progress && state.time_ended) {
            document.getElementById("moves-left").innerHTML = 0;
        } else {
            document.getElementById("moves-left").innerHTML = Math.floor(state.cards_left.length / 2) + 1;
        }
    }

    function getCurrentColors(state) {
        if (state.me.bonusLines > 0) {
            return [ "wild", "wild" ];
        } else {
            return state.plays[state.plays.length - 1];
        }
    }

    function updateColors(state) {
        var currentColors = getCurrentColors(state);
        if (state.me.bonusLines > 0) {
            removeClass(document.getElementById("bonus-moves-section"), "hidden");
            document.getElementById("bonus-moves").innerHTML = state.me.bonusLines;
        } else {
            addClass(document.getElementById("bonus-moves-section"), "hidden");
        }

        document.getElementById("color1").innerHTML = currentColors[0];
        document.getElementById("color2").innerHTML = currentColors[1];

        document.getElementById("patch1").className = "patch " + currentColors[0];
        document.getElementById("patch2").className = "patch " + currentColors[1];
    }

    function makeSelected(display, state) {
        for (var selected of state.me.moves) {
            addClass(_display.edges[selected].node, "selected");
            removeClass(_display.edges[selected].node, "unselected");
            removeClass(_display.edges[selected].node, "selectable");
            addClass(_display.edgesInteract[selected].node, "selected");
            removeClass(_display.edgesInteract[selected].node, "unselected");
            removeClass(_display.edgesInteract[selected].node, "selectable");
        }
    }

    function makeSelectable(display, state) {
        var currentColors = getCurrentColors(state);
        var color1 = currentColors[0];
        var color2 = currentColors[1];
        var query = ".unselected";
        if (color1 === "wild" && color2 === "wild") {
            // nothing, all edges are good
        } else if (color1 === "wild") {
            query += "." + color2;
        } else if (color2 === "wild") {
            query += "." + color1;
        } else {
            query += "." + color1 + "-" + color2;
        }
        for (var unselected of document.querySelectorAll(query)) {
            swapClass(unselected, "unselected", "selectable");
        }

        updateColors(state);
    }

    function finishSelecting() {
        var selectables = document.getElementsByClassName("selectable");
        while (selectables.length > 0) {
            swapClass(selectables[0], "selectable", "unselected");
        }
    }

    document.getElementById("startButton").onclick = function () {
        startGame({ gameShortCode });
    };

    function joinGameButton() {
        var nameElem = document.getElementById("name");
        if (!nameElem) {
            return;
        }
        var name = nameElem.value;
        if (!name) {
            nameElem.placeholder = "ENTER YOUR NAME";
            return;
        }
        nameElem.placeholder = "Enter your name";
        joinGame({ gameShortCode, playerName: name });
    };

    document.getElementById("joinButton").onclick = joinGameButton;
    document.getElementById("name").addEventListener("keyup", event => {
        if(event.key !== "Enter") return;
        document.querySelector("#joinButton").click();
        event.preventDefault();
    });

    function populateDisplay(display, state) {
        if (!state || !state.board || !state.board.cells || state.board.cells.length == 0) {
            errorBanner("invalid state, cannot setup display! :(");
            throw("ERROR: invalid state, cannot setup display! :(");
        }

        // Find board bounding box.
        display.min_x = state.board.cells[0].x;
        display.max_x = state.board.cells[0].x;
        display.min_y = state.board.cells[0].y;
        display.max_y = state.board.cells[0].y;
        for (var cell of state.board.cells) {
            if(cell.color === "undefined") continue;
            if (display.min_x > cell.x) display.min_x = cell.x;
            if (display.max_x < cell.x) display.max_x = cell.x;
            if (display.min_y > cell.y) display.min_y = cell.y;
            if (display.max_y < cell.y) display.max_y = cell.y;
        }

        // Adjust because the cell.x and cell.y values are the centers of the hexes.
        // Include an extra border of half cell width/height.
        display.min_x -= display.cell_w;
        display.max_x += display.cell_w;
        display.min_y -= display.cell_h;
        display.max_y += display.cell_h;
        display.board_w = display.max_x - display.min_x;
        display.board_h = display.max_y - display.min_y;

        updateViewBox(display);

        //if (ResizeObserver) {
        //    var resizeRequired = false;
        //    setTimeout(function () {
        //        new ResizeObserver(function () {
        //            console.log("resize");
        //            if (!resizeRequired) {
        //                console.log("resize banner");
        //                resizeRequired = true;
        //                errorBanner("window size changed, refresh the page...");
        //            }
        //        }).observe(_display.holder);
        //    }, 1000);
        //}


        var css = "";
        for (var cellColor in state.board.cellColors) {
            css += ".cell." + cellColor + " { fill: " + state.board.cellColors[cellColor].normal + "; } ";
            css += ".cell." + cellColor + ".highlight { fill: " + state.board.cellColors[cellColor].highlight + "; } ";
            css += ".patch." + cellColor + " { background-color: " + state.board.cellColors[cellColor].normal + "; } ";
            css += ".patch." + cellColor + ".highlight { background-color: " + state.board.cellColors[cellColor].highlight + "; } ";
        }
        var styleElement = document.createElement("style");
        styleElement.appendChild(document.createTextNode(css));
        document.getElementsByTagName("head")[0].appendChild(styleElement);

        if (state.myPlayerIndex === 0 && !state.in_progress) {
            // I get to say when the game starts
            removeClass(document.getElementById("startButton"), "hidden");
        }

        for (var cell of state.board.cells) {
            if(cell.color === "undefined") {
                // cell does not exist, skip drawing it
                display.cells.push(r.path(""));
                continue;
            }

            display.cells.push(r.path(makePolygonPath(cell.x, cell.y, 6, 25)).attr({"class": "cell " + cell.color}));
        }

        for (var edgeIndex = 0; edgeIndex < state.board.edges.length; edgeIndex++) {
            var edge = state.board.edges[edgeIndex];

            if(state.board.cells[edge[0]].color == "undefined" || state.board.cells[edge[1]].color == "undefined") {
                // one of these cells doesn't actually exist in this board, skip this line
                display.edges.push(r.path(""));
                display.edgesInteract.push(r.path(""));
                continue;
            }

            var path = "M" + state.board.cells[edge[0]].x + " " + state.board.cells[edge[0]].y +
                       "L" + state.board.cells[edge[1]].x + " " + state.board.cells[edge[1]].y;
            let line = r.path(path);
            var className = "unselected";
            className += " " + state.board.cells[edge[0]].color + "-" + state.board.cells[edge[1]].color;
            className += " " + state.board.cells[edge[0]].color;
            if (state.board.cells[edge[1]].color !== state.board.cells[edge[0]].color ) {
                className += " " + state.board.cells[edge[1]].color + "-" + state.board.cells[edge[0]].color;
                className += " " + state.board.cells[edge[1]].color;
            }
            line.attr("class", className);
            line.data("edgeIndex", edgeIndex);
            let lineInteract = r.path(path);
            //line.hover(function() {
            lineInteract.attr("class", className + " interact");
            lineInteract.hover(function() {
                if (hasClass(line.node, "selectable") && connectedToServer()) {
                    _display.sound.hoverLine.play();
                    addClass(line.node, "hover");
                }
            }, function() {
                if (hasClass(line.node, "selectable")) {
                    removeClass(line.node, "hover");
                }
            }).click(function() {
                if (hasClass(line.node, "selectable")) {
                    if (!connectedToServer()) {
                        errorBanner("Cannot move while not connected to server!");
                    } else {
                        _display.sound.selectLine.play();
                        swapClass(line.node, "selectable", "selected");
                        swapClass(lineInteract.node, "selectable", "selected");
                        //setTimeout(function () {
                            finishSelecting();
                        //}, 0);
                        var edgeIndex = line.data("edgeIndex");
                        //setTimeout(function () {
                            sendMove({edgeIndex});
                        //}, 0);
                    }
                }
            });

            display.edges.push(line);
            display.edgesInteract.push(lineInteract);
        }

        // draw the icons
        var iconSize = 25;
        for (var cell of state.board.cells) {
            var fileName="";
            switch(cell.contents) {
                case 'lettuce':
                    fileName = "lettuce.png"
                    break;
                case 'tomato':
                    fileName = "tomato.png"
                    break;
                case 'cucumber':
                    fileName = "cucumber.png"
                    break;
                case 'bowl':
                    fileName = "bowl.png"
                    break;
                case 'dressing':
                    fileName = "dressing.png"
                    break;
            }
            if (fileName != "") {
                display.glows[cell.num] = r.image("/assets/starburst.png", cell.x, cell.y, iconSize*1.8, iconSize*1.8).attr("class", "cell icon glow").translate(-iconSize*0.9, -iconSize*0.9);
                display.icons[cell.num] = r.image("/assets/"+fileName, cell.x, cell.y, iconSize, iconSize).attr("class", "cell icon").translate(-iconSize/2, -iconSize/2);
            }
        }

        // draw the houses
        for (var cell of state.board.cells) {
            var text = "";
            switch(cell.contents) {
                case 'shop0':
                    text = state.me.perm[0]
                    break;
                case 'shop1':
                    text = state.me.perm[1]
                    break;
                case 'shop2':
                    text = state.me.perm[2]
                    break;
                case 'shop3':
                    text = state.me.perm[3]
                    break;
                case 'shop4':
                    text = state.me.perm[4]
                    break;
                case 'shop5':
                    text = state.me.perm[5]
                    break;
                case 'shop6':
                    text = state.me.perm[6]
                    break;
                case 'shop7':
                    text = state.me.perm[7]
                    break;
                case 'shop8':
                    text = state.me.perm[8]
                    break;
                case 'shop9':
                    text = state.me.perm[9]
                    break;
            }
            if (text != "") {
                display.glows[cell.num] = r.image("/assets/starburst.png", cell.x, cell.y, iconSize*1.8, iconSize*1.8).attr("class", "cell icon glow").translate(-iconSize*0.9, -iconSize*0.9);
                display.icons[cell.num] = r.set();
                display.icons[cell.num].push(r.image("/assets/house.png", cell.x, cell.y, iconSize*1.2, iconSize*1.2).attr("class", "cell icon").translate(-iconSize*0.6, -iconSize*0.7));
                display.icons[cell.num].push(r.text(cell.x, cell.y, text).attr("font-size", "15px"));
            }
        }

        display.edgesInteract.toFront();
    }

});
/*
vim: et:ts=4:sw=4:si:ai:
*/
