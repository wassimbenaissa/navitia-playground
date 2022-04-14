// Copyright (c) 2016 Hove
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

'use strict';

// fake includes
var response;
var storage;
var summary;
var utils;
var d3;

var map = {};

var jawg = '9bHKgmlnYBVN0RILGGVn9t5mV1htebujO8fvecasKWZPb1apHmEFD9nOpWLjrYM7';

map.DrawSectionOption = {
    DRAWSTART: 2, // 10
    DRAWEND: 1, // 01
    DRAWBOTH: 3, // 11
    DRAWNEITHER: 0 // 00
};
map._should_draw_section_start = function(option) {
    return option & 2;// jshint ignore:line
};
map._should_draw_section_end = function(option) {
    return option & 1;// jshint ignore:line
};
map.STARTTEXT = 'Start';
map.ENDTEXT = 'End';
map.makeFeatures = {
    region: function(context, json) {
        if (json.shape) {
            var geoJsonShape = wkt2geojson(json.shape);
            return map._makePolygon(context, 'region', geoJsonShape, json, '#008ACA');
        }
        return [];
    },
    section: function(context, json, draw_section_option) {
        var style = {};
        if (json.display_informations && json.display_informations.color) {
            style.color = '#' + json.display_informations.color;
        }
        switch (json.type) {
        case 'street_network':
            switch (json.mode) {
            case 'bike':
                return map._makeBikeStreetInfo(context, 'section', json)
                    .concat(map._makeStopTimesMarker(context, json, style, draw_section_option));
            case 'taxi': style = map.taxiStyle; break;
            case 'car': style = map.carStyle; break;
            case 'carnopark': style = map.carStyle; break;
            case 'walking': style = map.walkingStyle; break;
            case 'ridesharing': style = map.ridesharingStyle; break;
            }
            break;
        case 'transfer':
            switch (json.transfer_type) {
            case 'guaranteed': style = map.carStyle; break;
            case 'extension': style = map.bikeStyle; break;
            case 'walking': style = map.walkingStyle; break;
            }
            break;
        case 'ridesharing': style = map.ridesharingStyle; break;
        case 'crow_fly': style = map.crowFlyStyle; break;
        }
        if (draw_section_option === undefined) {
            draw_section_option = map.DrawSectionOption.DRAWBOTH;
        }
        return map._makeString(context, 'section', json, style)
            .concat(map.makeFeatures.vias(context, json))
            .concat(map._makeStringViaToPt(context,'section', json, map.crowFlyStyle))
            .concat(map._makeStopTimesMarker(context, json, style, draw_section_option));
    },
    line: function(context, json) {
        return map._makeString(context, 'line', json, json);
    },
    journey: function(context, json) {
        if (! ('sections' in json)) { return []; }
        var bind = function(s, i, array) {
            var draw_section_option = map.DrawSectionOption.DRAWNEITHER;
            if ( i === 0) {
                draw_section_option |= map.DrawSectionOption.DRAWSTART;// jshint ignore:line
            }
            if ( i === (array.length -1) ) {
                draw_section_option |= map.DrawSectionOption.DRAWEND;// jshint ignore:line
            }
            return map.makeFeatures.section(context, s, draw_section_option);
        };
        return utils.flatMap(json.sections, bind);
    },
    isochrone: function(context, json) {
        if (! ('geojson' in json)) { return []; }
        var color = context.getColorFromMinDuration(json.min_duration);
        return map._makePolygon(context, 'isochrone', json.geojson, json, color)
            .concat(map._makeStopTimesMarker(context, json, {}, map.DrawSectionOption.DRAWBOTH));
    },
    heat_map: function(context, json) {
        if (! ('heat_matrix' in json)) { return []; }
        var scale = 0;
        json.heat_matrix.lines.forEach(function(lines) {
            lines.duration.forEach(function(duration) {
                if (duration !== null) {
                    scale = Math.max(duration, scale);
                }
            });
        });
        var local_map = [];
        json.heat_matrix.lines.forEach(function(lines/*, i*/) {
            lines.duration.forEach(function(duration, j) {
                var color;
                if (duration !== null) {
                    var ratio = duration / scale;
                    color = utils.getColorFromRatio(ratio);
                } else {
                    color = '#000000';
                    // for the moment, we don't want to print the null duration squares because
                    // it impacts the performances of the navigator.
                    return;
                }
                var rectangle = [
                    [json.heat_matrix.line_headers[j].cell_lat.max_lat, lines.cell_lon.max_lon],
                    [json.heat_matrix.line_headers[j].cell_lat.min_lat, lines.cell_lon.min_lon]
                ];
                local_map.push(map._makePixel(context, 'heat_map', rectangle, json, color, duration));
            });
        });
        var draw_section_option = map.DrawSectionOption.DRAWBOTH;
        return local_map.concat(map._makeStopTimesMarker(context, json, {}, draw_section_option));
    },
    address: function(context, json) {
        return map._makeMarker(context, 'address', json);
    },
    administrative_region: function(context, json) {
        return map._makeMarker(context, 'administrative_region', json);
    },
    stop_area: function(context, json) {
        return map._makeMarker(context, 'stop_area', json);
    },
    stop_point: function(context, json) {
        return map._makeMarker(context, 'stop_point', json).concat(map._makeMarkerForAccessPoint(context, json));
    },
    place: function(context, json) {
        return map._makeMarker(context, 'place', json);
    },
    pt_object: function(context, json) {
        return map.getFeatures(context, json.embedded_type, json[json.embedded_type]);
    },
    poi: function(context, json) {
        return map._makeMarker(context, 'poi', json);
    },
    free_floating: function(context, json) {
        return map._makeMarker(context, 'free_floating', json);
    },
    access_point: function(context, json) {
        var icon = map._makeAccessPointIcon(json);
        return map._makeMarker(context, 'access_point', json, null, null, icon);
    },
    connection: function(context, json) {
        return utils.flatMap([json.origin, json.destination], function(json) {
            return map._makeMarker(context, 'stop_point', json);
        });
    },
    via: function(context, json) {
        var icon = map._makeAccessPointIcon(json);
        return map._makeMarker(context, 'via', json, null, null, icon);
    },
    vias: function(context, json) {
        if (! json.vias) {
            return [];
        }
        var draw_entrance = false;
        var draw_exit = false;
        if (json.path[json.path.length - 1].via_uri){
            draw_entrance = true;
        }
        if (json.path[0].via_uri){
            draw_exit = true;
        }
        var bind = function(ap) {
            var new_ap = utils.deepClone(ap || {});
            new_ap.draw_entrance = draw_entrance;
            new_ap.draw_exit = draw_exit;
            return map.makeFeatures.via(context, new_ap);
        };
        return utils.flatMap(json.vias, bind);
    },
    vehicle_position: function(context, json) {
        if (! json.vehicle_journey_positions) { return []; }
        var bind = function(s) {
            return map.makeFeatures.vehicle_journey_position(context, s);
        };
        return utils.flatMap(json.vehicle_journey_positions, bind);
    },
    vehicle_journey_position: function(context, json) {
        return map._makeMarker(context, 'vehicle_position', json);
    },
    response: function(context, json) {
        var key = response.responseCollectionName(json);
        if (key === null) {
            return [];
        }
        var type = utils.getType(key);
        if (!(type in map.makeFeatures)) {
            return [];
        }
        var bind = function(s) {
            return map.makeFeatures[type](context, s);
        };
        return utils.flatMap(json[key].slice().reverse(), bind);
    },
    // TODO: implement when geojson_index is available
    elevations: function() {
        return [];
    }
};

map.hasMap = function(context, type, json) {
    return map.getFeatures(context, type, json).length !== 0 || map.makeElevationGraph[type] instanceof Function;
};

map.getFeatures = function(context, type, json) {
    if (! (map.makeFeatures[type] instanceof Function)) { return []; }
    if (! (json instanceof Object)) { return []; }
    try {
        return map.makeFeatures[type](context, json);
    } catch (e) {
        console.log(sprintf('map.makeFeatures[%s] thows an exception:', type));// jshint ignore:line
        console.log(e);// jshint ignore:line
        return [];
    }
};

map._makeTileLayers = function() {
    var copyOSM = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    var courtesy = function(name) {
        return sprintf('%s & %s', copyOSM, name);
    };
    var makeStamenTileLayer = function(name) {
        return L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/' + name + '/{z}/{x}/{y}.png', {
            subdomains: 'abcd',
            attribution: courtesy('<a href="http://maps.stamen.com">Stamen Design</a>'),
            detectRetina: true
        });
    };
    return {
        'Bright': L.tileLayer('https://tile.jawg.io/8030075a-bdf3-4b3a-814e-e28ab5880b40/{z}/{x}/{y}.png?access-token=' + jawg, {
            attribution: courtesy('<a href="https://www.jawg.io" target="_blank">&copy; Jawg</a> - ' +
                '<a href="https://www.openstreetmap.org" target="_blank">&copy; OpenStreetMap</a>&nbsp;contributors'),
            detectRetina: true
        }),
        'Dark': L.tileLayer('https://tile.jawg.io/d3fdb780-a086-4c52-ba10-40106332bd0c/{z}/{x}/{y}.png?access-token=' + jawg, {
            attribution: courtesy('<a href="https://www.jawg.io" target="_blank">&copy; Jawg</a> - ' +
                '<a href="https://www.openstreetmap.org" target="_blank">&copy; OpenStreetMap</a>&nbsp;contributors'),
            detectRetina: true
        }),
        'HOT': L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: courtesy('<a href="http://hot.openstreetmap.org/">Humanitarian OpenStreetMap Team</a>'),
            detectRetina: true
        }),
        'Hydda': L.tileLayer('https://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png', {
            attribution: courtesy('<a href="http://openstreetmap.se/">OpenStreetMap Sweden</a>'),
            detectRetina: true
        }),
        'Mapnik': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: copyOSM,
            detectRetina: true
        }),
        'Terrain': L.tileLayer('https://tile.jawg.io/d3fdb780-a086-4c52-ba10-40106332bd0c/{z}/{x}/{y}.png?access-token=' + jawg , {
            attribution: courtesy('<a href="https://www.jawg.io" target="_blank">&copy; Jawg</a> - ' +
                '<a href="https://www.openstreetmap.org" target="_blank">&copy; OpenStreetMap</a>&nbsp;contributors'),
            detectRetina: true
        }),
        'Toner': makeStamenTileLayer('toner-lite'),
        'Watercolor': makeStamenTileLayer('watercolor'),
    };
};

map._getDefaultLayerName = function() {
    var saved = storage.getLayer();
    if (saved) { return saved; }
    return 'Bright';
};

map.createMap = function(handle) {
    var div = $('<div/>');

    // setting for default path of images used by leaflet
    L.Icon.Default.imagePath = 'lib/img/leaflet/dist/images/';
    div.addClass('leaflet');
    var m = L.map(div.get(0), {renderer: L.canvas()});
    var tileLayers = map._makeTileLayers();
    tileLayers[map._getDefaultLayerName()].addTo(m);
    L.control.layers(tileLayers).addTo(m);
    m.on('baselayerchange', storage.saveLayer);
    L.control.scale().addTo(m);
    var bounds = handle(m);

    // Cleanly destroying the map
    div.on('npg:remove', function() { m.remove(); });

    // GPS location
    var circle = L.circle([0,0], {
        radius: 100,
    });
    m.on('locationfound', function(e) {
        circle.setRadius(e.accuracy / 2)
            .setStyle({color: '#3388ff'})
            .setLatLng(e.latlng)
            .bindPopup(sprintf('%.5f;%.5f ±%dm', e.latlng.lng, e.latlng.lat, e.accuracy));
    });
    m.on('locationerror', function(e) {
        circle.setStyle({color: 'red'}).bindPopup(e.message);
    });
    m.on('unload', function() { m.stopLocate(); });
    m.locate({enableHighAccuracy: true, watch: true});

    m.on('moveend', function() { storage.saveBounds(m.getBounds()); });

    setTimeout(function() {
        if (bounds) { m.fitBounds(bounds); } else { m.fitWorld(); }
        circle.addTo(m); // workaround for https://github.com/Leaflet/Leaflet/issues/4978
    }, 100);

    return div;
};

map.makeElevationGraph = {};

map.makeElevationGraph.elevations = function(context, json) {
        var data = json;

        if (!data) {
            return;
        }

        var div_elevation = $('<div/>');
        div_elevation.addClass('elevation');

        var height = 100;
        var margin =  10;

        var svg = d3.select(div_elevation.get(0)).append('svg')
            .attr('class', 'elevation-svg')
            .append('g')
            .attr('transform', 'translate(20, 20)');

        svg.append('text')
            .attr('class', 'elevation-title')
            .style('font-weight', 'bold')
            .style('text-anchor', 'center')
            .attr('x', '50%')
            .attr('y', 0)
            .text('Elevation Graph');

        svg.append('text')
            .attr('class', 'elevation-label')
            .attr('x', 10)
            .attr('y', 140)
            .text('Distance from start (m)');

        svg.append('text')
            .attr('class', 'elevation-label')
            .attr('x', 10)
            .attr('y', 0)
            .text('Height (m)');

        // define the line
        // set the ranges
        var xScale = d3.scaleLinear().range([0, 1000]);
        var yScale = d3.scaleLinear().range([height, 0]);

        // Scale the range of the data
        xScale.domain(d3.extent(data, function(d) { return d.distance_from_start;}));
        yScale.domain([d3.min(data, function(d) { return d.elevation; }) / 1.2,
            d3.max(data, function(d) { return d.elevation; }) * 1.2]);
        

        var xAxis = d3.axisBottom(xScale);
        var yAxis = d3.axisLeft(yScale);

        var xGrid = xAxis.ticks(5).tickFormat('');
        var yGrid = yAxis.ticks(5).tickFormat('');

        // add the X gridlines
        svg.append('g')
            .attr('class', 'grid x')
            .attr('transform', sprintf('translate(%s, %s)', margin, height));

        // add the Y gridlines
        svg.append('g')
            .attr('class', 'grid y')
            .attr('transform', sprintf('translate(%s, 0)', margin));

        // add the valueline path.
        svg.append('path')
            .data([data])
            .attr('class', 'elevation-line')
            .attr('transform', sprintf('translate(%s, 0)', margin));

        // add the X Axis
        svg.append('g')
            .attr('class', 'axis x');

        // add the Y Axis
        svg.append('g')
            .attr('class', 'axis y');

        // to make it responsive
        var draw_elevation = function (){
            // It's impossible(?) to get the div's width, since it's not yet added to DOM...
            // the default width is set to 1600 as a good guess...
            var width = div_elevation.width() || 1600;

            // Scale the range of the data
            xScale.domain(d3.extent(data, function(d) { return d.distance_from_start;}));
            xScale.range([0, width - 50]);

            xGrid.tickSize(-height);
            svg.select('.grid.x')
                .call(xGrid);

            yGrid.tickSize(-(width - 50));
            svg.select('.grid.y')
                .call(yGrid);

            svg.select('.axis.x')
                .attr('transform', sprintf('translate(%s, %s)', margin, height))
                .call(d3.axisBottom(xScale));

            svg.select('.axis.y')
                .attr('transform', sprintf('translate(%s, 0)', margin))
                .call(d3.axisLeft(yScale));

            var valueline = d3.line()
                .x(function(d) { return xScale(d.distance_from_start); })
                .y(function(d) { return yScale(d.elevation); });

            svg.selectAll('.elevation-line').attr('d', valueline);
        };

        d3.select(window).on('resize', draw_elevation);
        draw_elevation();
        return div_elevation;
};

map.getElevationGraph = function(context, type, json) {
    if (! (map.makeElevationGraph[type] instanceof Function)) { return; }
    if (! (json instanceof Object)) { return; }
    try {
        return map.makeElevationGraph[type](context, json);
    } catch (e) {
        console.log(sprintf('map.makeFeatures[%s] thows an exception:', type));// jshint ignore:line
        console.log(e);// jshint ignore:line
    }
};

map.run = function(context, type, json) {
    var features = [];
    var div_elevation;
    var div = $('<div/>');

    // Draw elevations
    if ((div_elevation = map.getElevationGraph(context, type, json))) {
        div.append(div_elevation);
        // TODO: remove return once geojson_index is available
        return div;
    }

    if ((features = map.getFeatures(context, type, json)).length) {
        var div_map = map.createMap(function(m) {
            return L.featureGroup(features).addTo(m).getBounds();
        });
        div.append(div_map);
        return div;
    } else {
        var div_nomap = $('<div/>');
        div_nomap.addClass('noMap');
        div_nomap.append('No map');
        return div_nomap;
    }
};

map._makeMarkerForAccessPoint = function(context, sp) {
    if (! sp.access_points){
        return [];
    }
    var bind = function(ap) {
        ap = utils.deepClone(ap || {});
        ap.draw_entrance = ap.is_entrance;
        ap.draw_exit = ap.is_exit;
        var icon = map._makeAccessPointIcon(ap);
        var marker =  map._makeMarker(context, 'via', ap, null, null, icon);

        var style1 = utils.deepClone(map.crowFlyStyle);
        style1.color = 'white';
        style1.weight = 7;
        style1.opacity = 10;
        style1.dashArray =  '0, 12';
        var style2 = utils.deepClone(map.crowFlyStyle);
        style2.weight = 5;
        style2.opacity = 10;
        style2.dashArray =  '0, 12';

        var from = ap.coord;
        var to = sp.coord;

        return marker.concat([
            L.polyline([from, to], style1),
            L.polyline([from, to], style2)
        ]);
    };
    return utils.flatMap(sp.access_points, bind);
};

map._makeAccessPointIcon = function(json) {
    var iconUrl;
    if (json.draw_entrance && json.draw_exit) {
        iconUrl = 'img/pictos/EntranceExitMarker.png';
    } else if (json.draw_entrance) {
        iconUrl =  'img/pictos/EntranceMarker.png';
    } else if (json.draw_exit) {
        iconUrl =  'img/pictos/ExitMarker.png';
    } else if (json.is_entrance && json.is_exit) {
        iconUrl = 'img/pictos/EntranceExitMarker.png';
    } else if (json.is_entrance) {
        iconUrl = 'img/pictos/EntranceMarker.png';
    } else if (json.is_exit) {
        iconUrl = 'img/pictos/ExitMarker.png';
    } else {
        return;
    }
    return L.icon({
        iconUrl:      iconUrl,
        iconSize:     [32, 42.1],
        iconAnchor:   [16, 42.1], // point of the icon which will correspond to marker's location
    });
};

map._makeMarker = function(context, type, json, style, label, icon) {
    var lat, lon;
    var obj = json;
    switch (type){
    case 'stop_date_time':
        obj = json.stop_point;
        lat = obj.coord.lat;
        lon = obj.coord.lon;
        break;
    case 'place':
        lat = json[json.embedded_type].coord.lat;
        lon = json[json.embedded_type].coord.lon;
        break;
    case 'via':
        lat = json.access_point.coord.lat;
        lon = json.access_point.coord.lon;
        break;
    default:
        if (!json.coord){
            return [];
        }
        lat = json.coord.lat;
        lon = json.coord.lon;
    }

    var sum = summary.run(context, type, json);
    var t = type === 'place' ? json.embedded_type : type;
    var marker;
    if (! style) {
        if (icon) {
            marker = L.marker([lat, lon], {icon: icon});
        } else {
            marker = L.marker([lat, lon]);
        }
    } else {
        style = utils.deepClone(style || {});
        delete style.dashArray;
        if (! style.color) { style.color = '#000000'; }
        style.opacity = 1;
        style.fillColor = 'white';
        style.fillOpacity = 1;
        marker = L.circleMarker([lat, lon], style);
        marker.setRadius(5);
    }
    if (label) {
        marker.bindTooltip(label, {permanent: true, opacity: 1});
    }
    return [marker.bindPopup(map._makeLink(context, t, obj, sum)[0])];
};

map.bikeStyle = { color: '#a3ab3a', dashArray: '0, 8' };
map.bikeStyleNoCycleLane = { color: '#ed2939', dashArray: '0, 8' };
map.bikeStyleSharedCycleWay = { color: '#ff7b00', dashArray: '0, 8' };
map.bikeStyleDedicatedCycleWay = { color: '#fee832', dashArray: '0, 8' };
map.bikeStyleSeparatedCycleWay = { color: '#006b3e', dashArray: '0, 8' };
map.carStyle = { color: '#c9731d', dashArray: '0, 8' };
map.taxiStyle = { color: '#297e52', dashArray: '0, 8' };
map.walkingStyle = { color: '#298bbc', dashArray: '0, 8' };
map.ridesharingStyle = { color: '#6e3ea8', dashArray: '0, 8' };
map.crowFlyStyle = { color: '#6e3ea8', dashArray: '0, 8' };

map._getCoordFromPlace = function(place) {
    if (place && place[place.embedded_type] && place[place.embedded_type].coord) {
        return place[place.embedded_type].coord;
    }
    return null;
};

map._makeStringViaToPt = function(context, type, json, style) {
    if (! json.vias || json.vias.length === 0) {
        return [];
    }
    var from;
    var to;

    // At the moment, we have only one via in PathItem
    if (json.path[json.path.length - 1].via_uri){
        from = json.vias[0].access_point.coord;
        to = map._getCoordFromPlace(json.to);
    }
    if (json.path[0].via_uri){
        from = map._getCoordFromPlace(json.from);
        to = json.vias[0].access_point.coord;
    }

    var style1 = utils.deepClone(style);
    style1.color = 'white';
    style1.weight = 7;
    style1.opacity = 1;
    style1.dashArray =  '0, 10';
    var style2 = utils.deepClone(style);
    style2.weight = 5;
    style2.opacity = 1;
    style2.dashArray =  '0, 10';

    var sum =  summary.run(context, type, json);

    return [
        L.polyline([from, to], style1),
        L.polyline([from, to], style2).bindPopup(sum)
    ];
};

map._makeSubGeojson = function(geojson, start, end) {
    var res = utils.deepClone(geojson);
    res.coordinates = geojson.coordinates.slice(start, end+1);
    return res;
};

map._pushCycleLaneStyle = function(context, type, json, sub_geojson, street_info, cycle_lane_type_styles, style, line) {
    var sum = summary.run(context, type, json);
    if (street_info.cycle_path_type in cycle_lane_type_styles) {
        sum.append(' (', street_info.cycle_path_type, ')');
        cycle_lane_type_styles[street_info.cycle_path_type].weight = 5;
        cycle_lane_type_styles[street_info.cycle_path_type].opacity = 1;
        line.push(
            L.geoJson(sub_geojson, { style: style }),
            L.geoJson(sub_geojson, { style: cycle_lane_type_styles[street_info.cycle_path_type] }).bindPopup(sum)
        );
    }
};

map._makeBikeStreetInfo = function(context, type, json) {
    var cycleLaneTypeStyles = {
        'no_cycle_lane': map.bikeStyleNoCycleLane,
        'shared_cycle_way': map.bikeStyleSharedCycleWay,
        'separated_cycle_way': map.bikeStyleSeparatedCycleWay,
        'dedicated_cycle_way': map.bikeStyleDedicatedCycleWay
    };

    var styleWhite = utils.deepClone(map.bikeStyleNoCycleLane);
    styleWhite.color = 'white';
    styleWhite.weight = 7;
    styleWhite.opacity = 1;

    var line = [];
    var subGeojson;
    var newJson;

    if (json.street_informations && json.street_informations.length && json.geojson && json.geojson.coordinates.length) {
        var fromOffset = json.street_informations[0].geojson_offset;

        for (var idx = 1; idx < json.street_informations.length; idx++) {
            var streetInfo = json.street_informations[idx - 1];
            var offset = json.street_informations[idx].geojson_offset;

            subGeojson = map._makeSubGeojson(json.geojson, fromOffset, offset);
            newJson = utils.deepClone(json);
            newJson.streetInfo = streetInfo;
            map._pushCycleLaneStyle(context, type, newJson, subGeojson, streetInfo, cycleLaneTypeStyles, styleWhite, line);
            fromOffset = offset;
        }

        subGeojson = map._makeSubGeojson(json.geojson, fromOffset, json.geojson.coordinates.length);
        newJson = utils.deepClone(json);
        newJson.streetInfo = json.street_informations[json.street_informations.length-1];
        map._pushCycleLaneStyle(context, type, newJson, subGeojson, newJson.streetInfo, cycleLaneTypeStyles, styleWhite, line);
    }
    return line;
};

map._makeString = function(context, type, json, style) {
    style = utils.deepClone(style || {});
    if (! style.color) { style.color = '#000000'; }
    if (style.color.match(/^[0-9A-Fa-f]{6}$/)) { style.color = '#' + style.color; }
    var sum = summary.run(context, type, json);
    var from = map._getCoordFromPlace(json.from);
    var to = map._getCoordFromPlace(json.to);

    var style1 = utils.deepClone(style);
    style1.color = 'white';
    style1.weight = 7;
    style1.opacity = 1;
    var style2 = utils.deepClone(style);
    style2.weight = 5;
    style2.opacity = 1;

    if (json.geojson && json.geojson.coordinates.length) {
        return [
            L.geoJson(json.geojson, { style: style1 }),
            L.geoJson(json.geojson, { style: style2 }).bindPopup(sum)
        ];
    } else if (from && to) {
        return [
            L.polyline([from, to], style1),
            L.polyline([from, to], style2).bindPopup(sum)
        ];
    } else {
        return [];
    }
};

map._makeStopTimesMarker = function(context, json, style, draw_section_option) {
    var stopTimes = json.stop_date_times;
    var markers = [];
    if (stopTimes) {
        // when section is PT
        stopTimes.forEach(function(st, i) {
            var label = null;
            if (i === 0 &&
                map._should_draw_section_start(draw_section_option)) {
                label = map.STARTTEXT;
            }else if (i === (stopTimes.length -1 ) &&
                      map._should_draw_section_end(draw_section_option)) {
                label = map.ENDTEXT;
            }
            markers = markers.concat(map._makeMarker(context, 'stop_date_time', st, style, label));
        });
    } else {
        // when section is Walking
        var from = json.from;
        var to = json.to;
        var label_from = null;
        var label_to = null;
        if (from && map._should_draw_section_start(draw_section_option)) {
            label_from = map.STARTTEXT;
            markers.push(map._makeMarker(context, 'place', from, style, label_from)[0]);
        }
        if (to && map._should_draw_section_end(draw_section_option)) {
            label_to = map.ENDTEXT;
            markers.push(map._makeMarker(context, 'place', to, style, label_to)[0]);
        }
    }
    return markers;
};
map._makePolygon = function(context, type, geoJsonCoords, json, color) {
    var sum = summary.run(context, type, json);
    // TODO use link when navitia has debugged the ticket NAVITIAII-2133
    var link = map._makeLink(context, type, json, sum)[0];
    return [
        L.geoJson(geoJsonCoords, {
            color:  '#555555',
            opacity: 1,
            weight: 0.5,
            fillColor: color,
            fillOpacity: 0.25
        }).bindPopup(link)
    ];
};
map._makeLink = function(context, type, obj, name) {
    return context.makeLink(type, obj, name);
};
map._makePixel = function(context, type, PolygonCoords, json, color, duration) {
    var sum = 'not accessible';
    if (duration !== null) {
        sum = sprintf('duration: %s', utils.durationToString(duration));
    }
    return L.rectangle(PolygonCoords, {
        smoothFactor: 0,
        color:  '#555555',
        opacity: 0,
        weight: 0,
        fillColor: color,
        fillOpacity: 0.25
    }).bindPopup(sum);
};
