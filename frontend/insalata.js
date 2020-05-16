Raphael(function () {

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

    //var img = document.getElementById("bg");
    //img.style.display = "none";

    var r = Raphael("holder", 640, 480);

    // draw the bg
    //r.image(img.src, 0, 0, 640, 480);

    var scheme = "ws";
    if (document.location.protocol === "https:") {
        scheme += "s";
    }
    var ws = new WebSocket(scheme + "://" + document.location.host + "/ws");

    ws.onerror = function (event) {
        console.log(event);
        document.getElementById("errorbanner").append("ERROR: Unable to connect to server, try reloading");
    };

    function getGameShortCode() {
        var match;
        if (match = document.location.pathname.match(/^\/g\/(.*)$/)) {
            return match[1];
        }
    }

    ws.onopen = function (event) {
        console.log("connected");
        var match;
        if (document.location.pathname === '/') {
            // need to create a game
            createGame({/*board_id*/});
            // on successful response from this, redirect
        } else if (gameShortCode = getGameShortCode()) {
            joinGame({ gameShortCode, playerName: "you" });
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

        } else if (inmsg.type === "joinedGame") {
            updateState(inmsg.state);

            populateDisplay(_display, _state);

            updateScores(_state);
            updateBoard(_state);

            makeSelected(_display, _state);
            makeSelectable(_display, _state);

        } else if (inmsg.type === "newPlay") {
            updateState(inmsg.state);

            updateScores(_state);
            updateBoard(_state);

            makeSelected(_display, _state);
            makeSelectable(_display, _state);

        } else {
            console.log("Unknown message", inmsg);
        }
    };


    function sendMessage(type, info) {
        var msg = Object.assign({ auth: 1, type }, info);
        console.log("sending", msg);
        ws.send(JSON.stringify(msg));
    }

    function createGame({boardId}) {
        // FIXME: board_id
        sendMessage("createGame");
    }

    function joinGame({gameShortCode, playerName}) {
        sendMessage("joinGame", { gameShortCode, playerName });
    }

    function sendMove({edgeIndex}) {
        gameShortCode = getGameShortCode();
        sendMessage("doMove", { gameShortCode, move: edgeIndex });
    }


    var _state;

    var _display = {
        cellSize: 25,
        cells: r.set(),
        edges: r.set(),
        edgesInteract: r.set(),
        icons: {},
        glows: {},
        sound: {
            selectLine: new Howl({ src: ['/assets/399934_1676145-lq.mp3'] }),
            hoverLine: new Howl({ src: ['/assets/338229_3972805-lq.mp3'] }),
            increaseScore: new Howl({ src: ['/assets/51715_113976-lq.mp3'] }),
        },
    };
    _display.w = Math.sqrt(3) * _display.cellSize;
    _display.h = 2 * _display.cellSize;

    function updateState(newState) {
        if (_state) {
            if (sumScore(newState.players[0].score) > sumScore(_state.players[0].score)) {
                _display.sound.increaseScore.play();
            }
        }

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
        var playerState = state.players[0];

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

    function updateScores(state) {
        document.getElementById("score").innerHTML = sumScore(state.players[0].score);
    }

    function getCurrentColors(state) {
        return state.plays[state.plays.length - 1];
    }

    function updateColors(state) {
        var currentColors = getCurrentColors(state);

        document.getElementById("color1").innerHTML = currentColors[0];
        document.getElementById("color2").innerHTML = currentColors[1];
    }

    function makeSelected(display, state) {
        for (var selected of state.players[0].moves) {
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

    function populateDisplay(display, state) {
        var css = "";
        for (var cellColor in state.board.cellColors) {
            css += ".cell." + cellColor + " { fill: " + state.board.cellColors[cellColor].normal + "; } ";
            css += ".cell." + cellColor + ".highlight { fill: " + state.board.cellColors[cellColor].highlight + "; } ";
        }
        var styleElement = document.createElement("style");
        styleElement.appendChild(document.createTextNode(css));
        document.getElementsByTagName("head")[0].appendChild(styleElement);

        for (var cell of state.board.cells) {
            display.cells.push(r.path(makePolygonPath(cell.x, cell.y, 6, 25)).attr({"class": "cell " + cell.color}));
        }

        for (var edgeIndex = 0; edgeIndex < state.board.edges.length; edgeIndex++) {
            var edge = state.board.edges[edgeIndex];

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
                if (hasClass(line.node, "selectable")) {
                    _display.sound.hoverLine.play();
                    addClass(line.node, "hover");
                }
            }, function() {
                if (hasClass(line.node, "selectable")) {
                    removeClass(line.node, "hover");
                }
            }).click(function() {
                if (hasClass(line.node, "selectable")) {
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
                case 'shopA':
                    text = "A"
                    break;
                case 'shopB':
                    text = "B"
                    break;
                case 'shopC':
                    text = "C"
                    break;
                case 'shopD':
                    text = "D"
                    break;
                case 'shopE':
                    text = "E"
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
