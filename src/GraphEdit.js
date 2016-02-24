$(document).ready(function(){
 
    // function to show our popups
 
    // function to close our popups
    function closePopup(){
        $('.overlay-bg, .help-popup').hide(); //hide the overlay
    }
    // show popup when you click on the link
    $('#help-button').click(function(event){
        event.preventDefault(); // disable normal link function so that it doesn't refresh the page
        var selectedPopup = $(this).data('showpopup'); //get the corresponding popup to show
        var docHeight = $(document).height(); //grab the height of the page
        var scrollTop = $(window).scrollTop(); //grab the px value from the top of the page to where you're scrolling
        $('.overlay-bg').show().css({'height' : docHeight}); //display your popup background and set height to the page height
        $('.help-popup').show().css({'top':scrollTop+20+'px'});
    });
   
    // hide popup when user clicks on close button or if user clicks anywhere outside the container
    $('.close-btn, .overlay-bg').click(function(){
        closePopup();
    });
     
    // hide the popup when user presses the esc key
    $(document).keyup(function(e) {
        if (e.keyCode == 27) { // if user presses esc key
            closePopup();
        }
    });
});


function GraphEdit(d3, _, map, graph, parameters) {
    var mode = "explore", // "edit"
        mousedownVertex,
        temporaryVertices = [],
        temporaryEdges = [];

    // Prepare svg elements
    // var svg = d3.select("#map")
    //        .append("svg")
    //        .attr("width", parameters.width)
    //        .attr("height", parameters.height);
    var svg = d3.select(map.getPanes().overlayPane)
        .append("svg")
        .attr("width", 960)
        .attr("height", 500);

    var segmentContainer = svg.append("g").attr("class", "leaflet-zoom-hide"),
        temporaryDomContainer = svg.append("g").attr("class", "leaflet-zoom-hide"),
        vertexContainer = svg.append("g").attr("class", "leaflet-zoom-hide");

    //var collection = {"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[0,90],[-360,90],[-360,-90],[0,-90],[0,90]]]}}]};
    //var transform = d3.geo.transform({point: projectPoint}),
    //    path = d3.geo.path().projection(transform);
    //
    //var feature = g.selectAll("path")
    //    .data(collection.features)
    //    .enter().append("path");

    map.on("viewreset", update);
    map.on("move", function () {
        // Translate the SVG.
        var transform = d3.select('.leaflet-map-pane').style('transform'),
            translation = transform.split(",").map(function(x) { return x.trim().replace(")", ""); });
        var x = parseInt(translation[translation.length - 2], 10),
            y =  parseInt(translation[translation.length - 1], 10);
        svg.style({"left": -x + "px", "top": -y + "px"});
        segmentContainer.attr("transform", "translate(" + x + "," + y + ")");
        temporaryDomContainer.attr("transform", "translate(" + x + "," + y + ")");
        vertexContainer.attr("transform", "translate(" + x + "," + y + ")");
    });


    //function projectPoint(x, y) {
    //    var point = map.latLngToLayerPoint(new L.LatLng(y, x));
    //    this.stream.point(point.x, point.y);
    //}

    // Define behaviors and attributes
    var dragEdge = d3.behavior.drag()
            .origin(function (d) { return d; })
            .on("dragstart", startedDraggingEdge)
            .on("drag", draggingEdge)
            .on("dragend", endedDraggingEdge),
        dragVertex = d3.behavior.drag()
            .origin(function(d) { return d; })
            .on("dragstart", startedDraggingVertex)
            .on("drag", draggingVertex)
            .on("dragend", endedDraggingVertex),
        edgeCoordinates = {
            x1: function (edge) {
                var point = map.latLngToLayerPoint(new L.LatLng(edge.source.lat, edge.source.lng));
                return point.x;
            },
            y1: function (edge) {
                var point = map.latLngToLayerPoint(new L.LatLng(edge.source.lat, edge.source.lng));
                return point.y;
            },
            x2: function (edge) {
                var point = map.latLngToLayerPoint(new L.LatLng(edge.target.lat, edge.target.lng));
                return point.x;
            },
            y2: function (edge) {
                var point = map.latLngToLayerPoint(new L.LatLng(edge.target.lat, edge.target.lng));
                return point.y;
            }
        },
        vertexCoordinate = {
            cx: function (d) {
                var point = map.latLngToLayerPoint(new L.LatLng(d.lat, d.lng));
                return point.x;
            },
            cy: function (d) {
                var point = map.latLngToLayerPoint(new L.LatLng(d.lat, d.lng));
                return point.y;
            }
        };
    $(document).keypress(function(event) {
        key = String.fromCharCode(event.which);
        if (key == 'a') {
            mode = "explore";
        } else if (key == 's') {
            mode = "draw";
            console.log(mode)
        } else if (key == 'd') {
            mode = "edit";
        } else if (key == 'f') {
            mode = "delete";
        }
    })
    // Attach callbacks
    svg.on("mouseup", mouseUp)
        .on("mousemove", mouseMove)
        .on("mousedown", mouseDown);
    /*d3.selectAll('.mode-radio-labels').selectAll('input')
        .on("click", function () {
          mode = d3.select(this).property("value");
        });
    */
    /*
     * A callback for a mouse event
     * @param d
     */
    function mouseDown () {
        if (mode == "draw" || mode == "edit" || mode == "delete") {
            d3.event.stopPropagation();
        }

    }
    function mouseUp () {
        if (mode == "draw") {
            d3.event.stopPropagation();
            var offset = {
                x: parseInt(d3.select(this).style("left").replace("px", ""), 10),
                y: parseInt(d3.select(this).style("top").replace("px", ""), 10)
                },
                point = map.layerPointToLatLng(new L.Point(d3.mouse(this)[0] + offset.x, d3.mouse(this)[1] + offset.y));
            if (mousedownVertex) {
                // Create a new vertex and a new edge
                var newVertex = graph.addVertex(graph.getUniqueVertexId(), point.lng, point.lat);
                graph.addEdge(graph.getUniqueEdgeId(), mousedownVertex, newVertex);
            } else {
                // Create a new vertex
                graph.addVertex(graph.getUniqueVertexId(), point.lng, point.lat);
           }
            mousedownVertex = null;
            temporaryVertices.splice(0, temporaryVertices.length);  // Empty an array. http://stackoverflow.com/questions/1232040/how-to-empty-an-array-in-javascript
            temporaryEdges.splice(0, temporaryEdges.length);
        } else if (mode == "edit") {
            // d3.event.stopPropagation();
        } else if (mode == "delete") {
            // d3.event.stopPropagation();
        }

        update();
    }

    function mouseMove() {
        if (mode == "draw") {
            if (temporaryVertices.length == 2) {
                var offset = {
                        x: parseInt(d3.select(this).style("left").replace("px", ""), 10),
                        y: parseInt(d3.select(this).style("top").replace("px", ""), 10)
                    },
                    point = map.layerPointToLatLng(new L.Point(d3.mouse(this)[0] + offset.x, d3.mouse(this)[1] + offset.y));
                temporaryVertices[1].x = d3.mouse(this)[0] + offset.x;
                temporaryVertices[1].y = d3.mouse(this)[1] + offset.y;
                temporaryVertices[1].lat = point.lat;
                temporaryVertices[1].lng = point.lng;
            }
        }
    }

    /**
     * A callback for dragstart event
     * http://bl.ocks.org/mbostock/6123708
     * http://stackoverflow.com/questions/13657687/drag-behavior-returning-nan-in-d3
     * @param d
     */
    function startedDraggingVertex(d) {
        if (mode == "edit") {
            d3.event.sourceEvent.stopPropagation();
            d3.select(this).classed("dragging", true);
        }
    }

    /**
     * A callback for a vertex drag event.
     * @param d
     */
    function draggingVertex(d) {
        if (mode == "edit") {
            // Update node coordinates
            d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);

            var vertex = graph.getVertex(d.id),
                edges = vertex.getEdges();

            _.each(edges, function (e) {
                var point = map.layerPointToLatLng(new L.Point(d.x, d.y));
                if (e.source.id === d.id) {
                    e.source.x = d.x;
                    e.source.y = d.y;
                    e.source.lat = point.lat;
                    e.source.lng = point.lng;
                } else {
                    e.target.x = d.x;
                    e.target.y = d.y;
                    e.target.lat = point.lat;
                    e.target.lng = point.lng;
                }
            });
        }
        update();
    }

    /**
     * A callback for the vertex dragend event.
     * @param d
     */
    function endedDraggingVertex() {
        if (mode == "edit") {
            d3.event.sourceEvent.stopPropagation();
            d3.select(this).classed("dragging", false);
        }
        update();
    }

    function startedDraggingEdge() {
        if (mode == "edit") {
            d3.event.sourceEvent.stopPropagation();
            d3.select(this).classed("dragging", true);
        }
        update();
    }

    /**
     * A callback function for the edge drag event.
     * @param d
     */
    function draggingEdge(d) {
        if (mode == "edit") {
            d3.select(this)
                .attr("x1", d.source.x += d3.event.dx)
                .attr("y1", d.source.y += d3.event.dy)
                .attr("x2", d.target.x += d3.event.dx)
                .attr("y2", d.target.y += d3.event.dy);

            var sourceLatLng = map.layerPointToLatLng(new L.Point(d.source.x, d.source.y));
            var targetLatLng = map.layerPointToLatLng(new L.Point(d.target.x, d.target.y));
            d.source.lat = sourceLatLng.lat;
            d.source.lng = sourceLatLng.lng;
            d.target.lat = targetLatLng.lat;
            d.target.lng = targetLatLng.lng;
        }

        update();
    }

    function endedDraggingEdge(d) {
        if (mode == "edit") {
            d3.select(this).classed("dragging", false);
        }
        update();
    }

    // Reference
    // http://bl.ocks.org/rkirsling/5001347
    var vertexEvents = {
        mouseover: function (d) {
            d3.select(".point-" + d.point.id).classed("active", true);
        },
        mouseout: function (d) {
            d3.select(".point-" + d.point.id).classed("active", false);
        },
        mousedown: function (d) {
            if (mode == "draw") {
                var temporaryVertex1 = _.clone(d),
                    temporaryVertex2 = _.clone(d);
                mousedownVertex = d;

                temporaryVertices.push(temporaryVertex1);
                temporaryVertices.push(temporaryVertex2);
                temporaryEdges.push(new Edge(-1, temporaryVertex1, temporaryVertex2));
            }
        },
        mouseup: function (d) {
            // Draw a new edge between two nodes
            if (mode == "draw") {
                d3.event.stopPropagation();
                if (mousedownVertex && mousedownVertex != d) {
                    graph.addEdge(graph.getUniqueEdgeId(), mousedownVertex, d);
                }
            } else if (mode == "delete") {
                graph.removeVertex(d.id);
            }
            temporaryVertices.splice(0, temporaryVertices.length);
            temporaryEdges.splice(0, temporaryEdges.length);
            mousedownVertex = null;
        }
    };

    var edgeEvents = {
        "mouseover": function () {
            d3.select(this).classed("active", true);
        },
        "mouseout": function () {
            d3.select(this).classed("active", false);
        },
        mouseup: function (d) {
            if (mode == "delete") {
                graph.removeEdge(d.id);
            }
        }
    };

    /**
     * A method to render stuff.
     */
    var line, circle, temporaryLine, temporaryPath, temporaryCircle, path, point, clips;
    function update() {
        for (var i = graph.vertices.length - 1; i >= 0; i--) {
            var point = map.latLngToLayerPoint(new L.LatLng(graph.vertices[i].lat, graph.vertices[i].lng));
            graph.vertices[i].x = point.x;
            graph.vertices[i].y = point.y;
        }
        // Render Segments
        var voronoi = d3.geom.voronoi()
            .x(function(d) {return d.x})
            .y(function(d) {return d.y})
            .clipExtent([[0, 0], [960, 500]]);
        
        line = segmentContainer.selectAll("line")
            .data(graph.edges);
        line.enter().append("line")
            .attr("stroke-width", 3)
            .attr("x1", function(d) {return d.source.x})
            .attr("x2", function(d) {return d.target.x})
            .attr("y1", function(d) {return d.source.y})
            .attr("y2", function(d) {return d.target.y})
            .on(edgeEvents)
            .call(dragEdge);

        /*
        clips = vertexContainer.append('g')
            .attr("id", "point-clips");
        clips.selectAll("clipPath")
            .data(graph.vertices)
            .enter()
            .append("clipPath")
            .attr("id", function(d, i) {return "clip-" + i})
            .append("svg:circle")
            .attr("r", 20)
            .attr("cx", function(d) {return d.x})
            .attr("cy", function(d) {return d.y})
            .attr("fill", "steelBlue")
            .attr("opacity", 1);
        paths = vertexContainer.append('g')
            .attr("id", "point-paths");
        paths.selectAll("path")
            .data(d3.geom.voronoi(graph.vertices))
            .enter().append("path")
            .attr("id", function(d,i) { 
                return "path-"+i; })
            .attr("clip-path", function(d,i) { return "url(#clip-"+i+")"; })
            .style("fill", "red")
            .style('fill-opacity', 0.4)
            .style("stroke", "white");
        points = vertexContainer.append('g')
            .attr("id", "points");
        
        points.selectAll("circle")
            .data(graph.vertices)
            .enter().append("circle")
            .attr("id", function(d, i) { 
                return "point-"+i; })
            .attr("r", 2)
            .attr('stroke', 'none');
        */
        var clips = vertexContainer.append("g").attr("id", "clips");
        var paths = vertexContainer.append("g").attr("id", "paths");
        var points = vertexContainer.append("g").attr("id", "points");

        clips.selectAll("clipPath")
            .data(graph.vertices)
            .enter().append("clipPath")
            .attr("id", function(d, i) {return "clip-" + i})
            .append("circle")
            .attr("fill", "steelblue")
            .style("opacity", 1)
            .attr("r", 20)
            .attr("cx", function(d) {return d.x})
            .attr("cy", function(d) {return d.y});
        paths.selectAll("path")
             .data(voronoi(graph.vertices))
             .enter().append("path")
             .attr("d", function(d) {return "M" + d.join("L") + "Z"})
             .attr("class", function(d, i) {return "voronoi-" + i;})
             .attr("clip-path", function(d,i) {return "url(#clip-" + i + ")";})
             .style("fill", "red")
             .style("stroke", "white")
             .style("fill-opacity", .4)
             .style("pointer-events", "all")
             .on(vertexEvents)
             .call(dragVertex);
        points.selectAll("circle")
            .data(graph.vertices)
            .enter().append("circle")
            .attr("fill", "black")
            .attr("r", 2)
            .attr("cx", function(d) {console.log("hi");return d.x})
            .attr("cy", function(d) {return d.y});
        /*circle = vertexContainer.selectAll("circle")
            .data(graph.vertices);
        circle.enter().append("circle")
            .attr("fill", "steelblue")
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .attr("r", 12)
            .style("opacity", .2)
            .on(vertexEvents)
            .call(dragVertex);
        circle.exit().remove();
        */
        vertexContainer.selectAll('circle').data(graph.vertices).attr(vertexCoordinate)
        //circle.selectAll('circle').data(graph.vertices).attr(vertexCoordinate);
        //backCircle.selectAll('circle').data(graph.vertices).attr(vertexCoordinate);
        // line.attr(edgeCoordinates);

        temporaryLine = temporaryDomContainer.selectAll("line")
            .data(temporaryEdges);
        temporaryLine.enter().append("line")
            .attr("stroke-width", 3);
        temporaryLine.exit().remove();


        temporaryCircle = temporaryDomContainer.selectAll("circle")
            .data(temporaryVertices);
        temporaryPath = temporaryDomContainer.selectAll("path")
            .data(voronoi(temporaryVertices))
            .enter().append("path")
            .attr("d", function(d) {return "M" + d.join("L") + "Z"})

         temporaryCircle.enter().append("circle")
             .attr("fill", "orange")
             .attr("stroke", "white")
             .attr("stroke-width", 2)
             .attr("r", 6);
         temporaryCircle.exit().remove();
         temporaryCircle.attr(vertexCoordinate);
         temporaryLine.attr(edgeCoordinates);
    }

    update();
    return {
        update: update
    };
}
