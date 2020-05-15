function NGon(x, y, N, side) {
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
Raphael(function () {
    //var img = document.getElementById("bg");
    //img.style.display = "none";

	var selectLineSound = new Howl({
	  src: ['399934_1676145-lq.mp3']
	});

	var hoverLineSound = new Howl({
	  src: ['338229_3972805-lq.mp3']
	});

    var r = Raphael("holder", 640, 480);

	// draw the bg
    //r.image(img.src, 0, 0, 640, 480);

	//var animdur = 1000;
	//var animdur = 500;
	var animdur = 750;

	//var animeasing = "ease-in-out";
	var animeasing = "linear";

    var colors = [ "red", "green", "blue" ];
    var colorsOrWild = Array.from(colors);
    colorsOrWild.push("wild");

    function randomColor() {
        return colors[Math.floor(Math.random()*colors.length)];
    }
    function randomColorOrWild() {
        return colorsOrWild[Math.floor(Math.random()*colorsOrWild.length)];
    }

    var color1;
    var color2;

    function chooseColors() {
        //color1 = "green";
        //color2 = "blue";
        //color1 = randomColor();
        //color2 = randomColor();
        color1 = randomColorOrWild();
        color2 = randomColorOrWild();
    }

    var cellSize = 25;
    var w = Math.sqrt(3) * cellSize;
    var h = 2 * cellSize;
    var topLeft = { x: cellSize, y: cellSize };
    var numCells = { x: 10, y: 10 };
    var cells = [];
    var edges = [];
    for (var row = 0; row < numCells.y; row++) {
        for (var col = 0; col < numCells.x; col++) {
            cells.push({ x: topLeft.x + col*w + (row%2?w/2:0), y: topLeft.y + row*h*3/4, color: randomColor()});
            if (col > 0) {
                edges.push([cells.length-1, cells.length-1 - 1]);
            }
            if (row > 0) {
                edges.push([cells.length-1, cells.length-1 - numCells.x]);
                if (row%2) {
                    if (col < numCells.x - 1) {
                        edges.push([cells.length-1, cells.length-1 - numCells.x + 1]);
                    }
                } else {
                    if (col > 0) {
                        edges.push([cells.length-1, cells.length-1 - numCells.x - 1]);
                    }
                }
            }
        }
    }

	// draw the icons
    r.image("../assets/lettuce.png", 15, 15, 20, 20);
    r.image("../assets/lettuce.png", 15+w, 15, 20, 20);
    r.image("../assets/tomato.png", 15+w, 15+1.5*h, 20, 20);



    for (var cell of cells) {
        r.path(NGon(cell.x, cell.y, 6, 25)).attr({"class": "cell " + cell.color});
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


    function makeselectable() {
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

	function selectline(line) {
        swapClass(line, "selectable", "selected");
    }

	function finishselecting() {
        var selectables = document.getElementsByClassName("selectable");
        while (selectables.length > 0) {
            swapClass(selectables[0], "selectable", "unselected");
        }
    }

	function makeline(edge) {
		var line = r.path("M" + cells[edge[0]].x + " " + cells[edge[0]].y +
                          "L" + cells[edge[1]].x + " " + cells[edge[1]].y);
        var className = "unselected";
        className += " " + cells[edge[0]].color + "-" + cells[edge[1]].color;
        className += " " + cells[edge[0]].color;
        if (cells[edge[1]].color !== cells[edge[0]].color ) {
            className += " " + cells[edge[1]].color + "-" + cells[edge[0]].color;
            className += " " + cells[edge[1]].color;
        }
        line.attr("class", className);
		line.hover(function() {
			if (hasClass(line.node, "selectable")) {
				hoverLineSound.play();
			}
		}).click(function() {
			if (hasClass(line.node, "selectable")) {
                console.log("click");
				selectLineSound.play();
                selectline(line.node);
                finishselecting();

				setTimeout(function () {
                    chooseColors();
                    makeselectable();
				}, 1000);
			} else {
				//lines.attr({"class": "selectable"});
			}
		});
		return line;
	}

	var lines = r.set();
    for (var edge of edges) {
        lines.push(makeline(edge));
    }

    chooseColors();
    makeselectable();

    selectline(lines[numCells.x-1].node);
    selectline(lines[numCells.x-1].node);
    selectline(lines[0].node);
    selectline(lines[0].node);
    selectline(lines[1].node);

});

