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

    ws.onopen = function (event) {
        console.log("connected");
        joinGame({ gameShortCode: "", playerName: "you" });
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
        if (inmsg.type === "joinedGame") {
            _state = inmsg.state;

            populateDisplay(_display, _state);

            makeSelected(_display, _state);
            makeSelectable(_display, _state);

        } else if (inmsg.type === "newPlay") {
            _state = inmsg.state;

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

    function joinGame({gameShortCode, playerName}) {
        sendMessage("joinGame", { gameShortCode, playerName });
    }

    function sendMove({edgeIndex}) {
        sendMessage("doMove", { gameid: 1, move: edgeIndex });
    }


    var _state = {
        _id: 1,
        shortcode: "",
        board: {},
        in_progress: true,
        time_started: new Date(),
        time_ended: null,
        move_timeout: 30000,
        num_events: 0,
        num_players: 1,
        players: [
            { name: "you", score: 0, auth_cookie_id: 0, moves: [] },
        ],
        plays: [],
    };

    var _display = {
        cellSize: 25,
        cells: r.set(),
        edges: r.set(),
        selectLineSound: new Howl({ src: ['399934_1676145-lq.mp3'] }),
        hoverLineSound: new Howl({ src: ['338229_3972805-lq.mp3'] }),
    };
    _display.w = Math.sqrt(3) * _display.cellSize;
    _display.h = 2 * _display.cellSize;

    function randomColor(board) {
        var colors = Object.keys(board.colors);
        return colors[Math.floor(Math.random()*colors.length)];
    }
    function randomColorOrWild(board) {
        var colorsOrWild = Object.keys(board.colors);
        colorsOrWild.push("wild");
        return colorsOrWild[Math.floor(Math.random()*colorsOrWild.length)];
    }

    function generateRandomPlay(state) {
        state.plays.push( [ randomColorOrWild(state.board), randomColorOrWild(state.board) ] );
    }

    function getCurrentColors(state) {
        return state.plays[state.plays.length - 1];
    }

    function generateRandomBoard(display, board) {
        var topLeft = { x: display.cellSize, y: display.cellSize };
        var numCells = { x: 10, y: 10 };
        for (var row = 0; row < numCells.y; row++) {
            for (var col = 0; col < numCells.x; col++) {
                board.cells.push({ x: topLeft.x + col*display.w + (row%2?display.w/2:0), y: topLeft.y + row*display.h*3/4, color: randomColor(board)});
                if (col > 0) {
                    board.edges.push([board.cells.length-1, board.cells.length-1 - 1]);
                }
                if (row > 0) {
                    board.edges.push([board.cells.length-1, board.cells.length-1 - numCells.x]);
                    if (row%2) {
                        if (col < numCells.x - 1) {
                            board.edges.push([board.cells.length-1, board.cells.length-1 - numCells.x + 1]);
                        }
                    } else {
                        if (col > 0) {
                            board.edges.push([board.cells.length-1, board.cells.length-1 - numCells.x - 1]);
                        }
                    }
                }
            }
        }
	board.cells[0].contents = "tomato";
	board.cells[10].contents = "lettuce";
	board.cells[33].contents = "bowl";
	board.cells[27].contents = "dressing";
	board.cells[12].contents = "cucumber";
    }

    function makeSelected(display, state) {
        for (var selected of state.players[0].moves) {
            addClass(_display.edges[selected].node, "selected");
            removeClass(_display.edges[selected].node, "unselected");
            removeClass(_display.edges[selected].node, "selectable");
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
    }

	function selectLine(line) {
        swapClass(line.node, "selectable", "selected");
    }

	function finishSelecting() {
        var selectables = document.getElementsByClassName("selectable");
        while (selectables.length > 0) {
            swapClass(selectables[0], "selectable", "unselected");
        }
    }

	function makeLine(board, edgeIndex, edge) {
		var line = r.path("M" + board.cells[edge[0]].x + " " + board.cells[edge[0]].y +
                          "L" + board.cells[edge[1]].x + " " + board.cells[edge[1]].y);
        var className = "unselected";
        className += " " + board.cells[edge[0]].color + "-" + board.cells[edge[1]].color;
        className += " " + board.cells[edge[0]].color;
        if (board.cells[edge[1]].color !== board.cells[edge[0]].color ) {
            className += " " + board.cells[edge[1]].color + "-" + board.cells[edge[0]].color;
            className += " " + board.cells[edge[1]].color;
        }
        line.attr("class", className);
        line.data("edgeIndex", edgeIndex);
		line.hover(function() {
			if (hasClass(line.node, "selectable")) {
				_display.hoverLineSound.play();
			}
		}).click(function() {
			if (hasClass(line.node, "selectable")) {
				_display.selectLineSound.play();
                selectLine(line);
				//setTimeout(function () {
                    finishSelecting();
                //}, 0);
                var edgeIndex = line.data("edgeIndex");
				//setTimeout(function () {
                    sendMove({edgeIndex});
                //}, 0);
			}
		});
		return line;
	}

    function populateDisplay(display, state) {
        for (var cell of state.board.cells) {
            display.cells.push(r.path(makePolygonPath(cell.x, cell.y, 6, 25)).attr({"class": "cell " + cell.color}));
        }

        for (var edgeIndex = 0; edgeIndex < state.board.edges.length; edgeIndex++) {
            var edge = state.board.edges[edgeIndex];
            display.edges.push(makeLine(state.board, edgeIndex, edge));
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
				r.image("../assets/"+fileName, cell.x, cell.y, iconSize, iconSize).attr("class", "cell icon").translate(-iconSize/2, -iconSize/2);
			}
	    }
        //r.image("../assets/tomato.png", state.board.cells[10].x, state.board.cells[10].y, iconSize, iconSize).attr("class", "cell icon").translate(-iconSize/2, -iconSize/2);
        //r.image("../assets/lettuce.png", 15+display.w, 15, 20, 20);
        //r.image("../assets/tomato.png", 15+display.w, 15+1.5*display.h, 20, 20);
    }

});

