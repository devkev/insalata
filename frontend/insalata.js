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

/*
    var r = Raphael("holder", 600, 540);
    
    r.image(img.src, 140, 140, 320, 240);
    r.image(img.src, 140, 380, 320, 240).attr({
        transform: "s1-1",
        opacity: .5
    });
    r.rect(0, 380, 600, 160).attr({
        fill: "90-#333-#333",
        stroke: "none",
        opacity: .5
    });
*/
    var r = Raphael("holder", 640, 480);

	// draw the bg
    //r.image(img.src, 0, 0, 640, 480);

	//var animdur = 1000;
	//var animdur = 500;
	var animdur = 750;

	//var animeasing = "ease-in-out";
	var animeasing = "linear";

	var anim = Raphael.animation({ "stroke": "#f00"}, animdur, animeasing).repeat(Infinity);

	var animfwd = Raphael.animation({ "stroke": "#f00"}, animdur, animeasing, function(el) {
		//lines.animate(animbck);
		dummy.animate(animbck);
		lines.animateWith(dummy, animbck, animbck);
	}).delay(animdur).repeat(Infinity);
	var animbck = Raphael.animation({ "stroke": "#00f"}, animdur, animeasing, function(el) {
	//	//lines.animate(animfwd);
	//	dummy.animate(animfwd);
	//	//lines.animateWith(dummy, animfwd, animfwd);
	});

    var cellSize = 25;
    var w = Math.sqrt(3) * cellSize;
    var h = 2 * cellSize;
    var topLeft = { x: cellSize, y: cellSize };
    var numCells = { x: 10, y: 10 };
    var cells = [];
    var edges = [];
    var colors = [ "red", "green", "blue" ];
    for (var row = 0; row < numCells.y; row++) {
        for (var col = 0; col < numCells.x; col++) {
            cells.push({ x: topLeft.x + col*w + (row%2?w/2:0), y: topLeft.y + row*h*3/4, color: colors[Math.floor(Math.random()*3)]});
            if (col > 0) {
                edges.push([cells.length-1, cells.length-1 - 1]);
            }
            if (row > 0) {
                edges.push([cells.length-1, cells.length-1 - numCells.x]);
            }
            if (row > 0 && (col > 0 || row%2)) {
                edges.push([cells.length-1, cells.length-1 - numCells.x + (row%2?1:-1)]);
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

	function selectline(line) {
        line.attr("class", "selected");
        lines.exclude(line);
        selectedlines.push(line);
    }

	function makeline(path) {
		var line = r.path(path);
		line.hover(function() {
			if (line.attr("class") == "selectable") {
				hoverLineSound.play();
			}
		}).click(function() {
			if (line.attr("class") == "selectable") {
				selectLineSound.play();
                selectline(line);

				var selectables = document.getElementsByClassName("selectable");
				while (selectables.length > 0) {
					selectables[0].setAttribute("class", "unselected");
				}
				setTimeout(function () {
					lines.attr({"class": "selectable"});
				}, 2000);
			} else {
				//lines.attr({"class": "selectable"});
			}
		});
		return line;
	}

	function makepath(edge) {
        return "M" + cells[edge[0]].x + " " + cells[edge[0]].y +
               "L" + cells[edge[1]].x + " " + cells[edge[1]].y;
    }


	var lines = r.set();

    for (var edge of edges) {
        lines.push(makeline(makepath(edge)));
    }

	var selectedlines = r.set();
    selectline(lines[numCells.x-1]);
    selectline(lines[numCells.x-1]);
    selectline(lines[0]);
    selectline(lines[0]);
    selectline(lines[1]);

	//var dummy = r.path("M0 0");
	//lines.attr({"stroke": "#00f", "stroke-width": "5px"});
	lines.attr({"class": "selectable"});

	selectedlines.attr({"class": "selected"});

//	dummy.animate(animfwd);
//	lines.animateWith(dummy, animfwd, animfwd);

	//var circle = r.circle(50, 40, 10);
	//// Sets the fill attribute of the circle to red (#f00)
	//circle.attr("fill", "#f00");

	//// Sets the stroke attribute of the circle to white
	//circle.attr("stroke", "#fff");
});

