// Copyright (c) 2016 CanalTP
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
var summary;
var utils;

var extended = {};

// the object that contains the function to make the extended views
extended.make = {};

extended.make.response = function(context, json) {
    var result = $('<div class="list"/>');

    if ('full_response' in json) {
        result.append(response.render(context, json.full_response, 'response', 'full_response'));
    }

    if (Array.isArray(json.links) && json.links.length) {
        result.append(response.render(context, json.links, 'links', 'links'));
    }

    if(json.address) {
        // We can have a single address if we use the '/coord/{long;lat}' endpoint
        result.append(response.render(context, json.address, 'address', 'address'));
    } else {
        // Let's try to deduce the response type
        var key = response.responseCollectionName(json);
        var objs = key ? json[key] : [];
        var type = utils.getType(key);
        if (type) {
            objs.forEach(function(obj, i) {
                result.append(response.render(context, obj, type, key, i));
            });
        }
        
        if (type !== 'disruption' && $.isArray(json.disruptions)) {
            json.disruptions.forEach(function(disruption, i) {
                result.append(response.render(context, disruption, 'disruption', 'disruptions', i));
            });
        }
    }

    (json.notes || []).forEach(function(note, i) {
        result.append(response.render(context, note, 'note', 'notes', i));
    });

    (json.feed_publishers || []).forEach(function(feed_publisher, i) {
        result.append(response.render(context, feed_publisher, 'contributor', 'feed_publishers', i));
    });

    (json.warnings || []).forEach(function(warning, i) {
        result.append(response.render(context, warning, 'warning', 'warnings', i));
    });

    if (json.context) {
        result.append(response.render(context, json.context, 'context', 'context'));
    }

    return result;
};

extended.make.journey = function(context, json) {
    var result = $('<div class="list"/>');
    if (Array.isArray(json.links) && json.links.length) {
        result.append(response.render(context, json.links, 'links', 'links'));
    }
    if ('tags' in json && json.tags.length > 0) {
        result.append(response.render(context, json.tags, 'tags', 'tags'));
    }
    if (json.co2_emission && json.co2_emission.value) {
        result.append(response.render(context, json.co2_emission, 'co2_emission', 'co2_emission'));
    }
    if (json.distances) {
        result.append(response.render(context, json.distances, 'distances', 'distances'));
    }

    if (json.from) {
        result.append(response.render(context, json.from, 'place', 'from'));
    }
    if (json.to) {
        result.append(response.render(context, json.to, 'place', 'to'));
    }
    if (json.sections) {
        json.sections.forEach(function(section, i) {
            result.append(response.render(context, section, 'section', 'sections', i));
        });
    }
    return result;
};

extended.make.section = function(context, json) {
    var result = $('<div class="list"/>');
    if (Array.isArray(json.links) && json.links.length) {
        result.append(response.render(context, json.links, 'links', 'links'));
    }
    if (json.display_informations &&
        Array.isArray(json.display_informations.links) &&
        json.display_informations.links.length) {
        result.append(response.render(context, json.display_informations.links, 'links', 'display_informations.links'));
    }
    if (json.display_informations &&
        Array.isArray(json.display_informations.equipments) &&
        json.display_informations.equipments.length) {
        result.append(response.render(context,
                                      json.display_informations.equipments,
                                      'equipments',
                                      'display_informations.equipments'));
    }
    if (json.co2_emission && json.co2_emission.value) {
        result.append(response.render(context, json.co2_emission, 'co2_emission', 'co2_emission'));
    }
    if (json.from) {
        result.append(response.render(context, json.from, 'place', 'from'));
    }
    if (json.to) {
        result.append(response.render(context, json.to, 'place', 'to'));
    }
    if (json.path) {
        result.append(response.render(context, json, 'path', 'path'));
    }
    (json.ridesharing_journeys || []).forEach(function(j, i) {
        result.append(response.render(context, j, 'journey', 'ridesharing_journeys', i));
    });
    if (json.stop_date_times) {
        json.stop_date_times.forEach(function(stop_date_time, i) {
            result.append(response.render(context, stop_date_time, 'stop_date_time', 'stop_date_times', i));
        });
    }
    return result;
};

extended.make.stop_schedule = function(context, json) {
    return extended.defaultStopSchedule(context, json);
};

extended.make.route_schedule = function(context, json) {
    var result = $('<div class="list"/>');
    if (Array.isArray(json.links) && json.links.length) {
        result.append(response.render(context, json.links, 'links', 'links'));
    }
    if (Array.isArray(json.display_informations.links) && json.display_informations.links.length) {
        result.append(response.render(context, json.display_informations.links, 'links', 'display_informations.links'));
    }
    result.append(response.render(context, json.table, 'table', 'table'));
    return result;
};

extended.make.departure = function(context, json) {
    var result = $('<div class="list"/>');
    if (Array.isArray(json.links) && json.links.length) {
        result.append(response.render(context, json.links, 'links', 'links'));
    }
    if (Array.isArray(json.display_informations.links) && json.display_informations.links.length) {
        result.append(response.render(context, json.display_informations.links, 'links', 'display_informations.links'));
    }
    result.append(response.render(context, json.route, 'route', 'route'));
    result.append(response.render(context, json.stop_point, 'stop_point', 'stop_point'));
    return result;
};
extended.make.arrival = extended.make.departure;

extended.make.table = function(context, json) {
    var result = $('<div class="table"/>');
    var table = $('<table/>');
    // Add the data rows
    json.rows.forEach(function(route_schedule) {
        var row = $('<tr/>');
        var cellName = $('<td />').addClass('stop-point');
        cellName.text(route_schedule.stop_point.name);
        row.append(cellName);
        route_schedule.date_times.forEach(function(route_schedule) {
            var cellValue = $('<td />').addClass('time');
            cellValue.html(summary.formatTime(route_schedule.date_time));
            row.append(cellValue);
        });
        table.append(row);
    });
    result.append(table);
    return result;
};

extended.make.poi = function(context, json) {
    var result = extended.defaultExtended(context, 'poi', json);
    if (json.stands) {
        result.append(response.render(context, json.stands, 'stands', 'stands'));
    }
    if (json.car_park) {
        result.append(response.render(context, json.car_park, 'car_park', 'car_park'));
    }
    return result;
};

extended.make.stop_point = function(context, json) {
    var result = extended.defaultExtended(context, 'stop_point', json);
    if (Array.isArray(json.equipments) && json.equipments.length) {
        result.append(response.render(context, json.equipments, 'equipments', 'equipments'));
    }
    return result;
};

extended.make.disruption = function(context, json) {
    var res = $('<div class="list"/>');
    (json.application_patterns || []).forEach(function(obj, i) {
        res.append(response.render(context, obj, 'application_pattern', 'application_patterns', i));
    });

    if (json.application_periods) {
        res.append(response.render(context,
                                   json.application_periods,
                                   'application_periods',
                                   'application_periods'));
    }
    (json.messages || []).forEach(function(obj, i) {
        res.append(response.render(context, obj, 'message', 'messages', i));
    });
    (json.impacted_objects || []).forEach(function(obj, i) {
        res.append(response.render(context, obj, 'impacted_object', 'impacted_objects', i));
    });
    return res;
};

extended.make.impacted_object = function(context, json) {
    var res = $('<div class="list"/>');
    if (json.impacted_section) {
        res.append(response.render(context, json.impacted_section, 'impacted_section', 'impacted_section'));
    }
    res.append(response.render(context, json.pt_object, 'pt_object', 'pt_object'));
    if ($.isArray(json.impacted_stops)) {
        json.impacted_stops.forEach(function(obj, i) {
            res.append(response.render(context, obj, 'impacted_stop', 'impacted_stops', i));
        });
    }
    return res;
};

extended.make.impacted_section = function(context, json) {
    var res = $('<div class="list"/>')
        .append(response.render(context, json.from, 'pt_object', 'from'))
        .append(response.render(context, json.to, 'pt_object', 'to'));
    (json.routes || []).forEach(function(obj, i) {
        res.append(response.render(context, obj, 'route', 'routes', i));
    });
    return res;
};

extended.make.connection = function(context, json) {
    return $('<div class="list"/>')
        .append(response.render(context, json.origin, 'stop_point', 'origin'))
        .append(response.render(context, json.destination, 'stop_point', 'destination'));
};

extended.make.links = function(context, json) {
    var res = $('<div class="list"/>');
    json.forEach(function(link) {
        var obj = context.followInternalLink(link);
        if (obj) {
            res.append(response.render(context, obj.obj, utils.getType(link.rel), '> ' + obj.path));
        }
    });
    return res;
};

extended.make.line_report = function(context, json) {
    var res = $('<div class="list"/>');
    res.append(response.render(context, json.line, 'line', 'line'));
    json.pt_objects.forEach(function(obj, i) {
        res.append(response.render(context, obj, 'pt_object', 'pt_objects', i));
    });
    return res;
};

extended.make.vehicle_journey = function(context, json) {
    var res = extended.defaultExtended(context, 'vehicle_journey', json);
    (json.stop_times || []).forEach(function(obj, i) {
        res.append(response.render(context, obj, 'stop_time', 'stop_times', i));
    });
    return res;
};

extended.make.equipment_report = function(context, json) {
    var res = $('<div/>');
    (json.stop_area_equipments || []).forEach(function(obj, i) {
        res.append(response.render(context, obj, 'stop_area_equipment', 'stop_area_equipments', i));
    });
    return res;
};

extended.make.stop_area_equipment = function(context, json) {
    var res = extended.defaultExtended(context, 'equipment_details', json);
    (json.equipment_details || []).forEach(function(obj, i) {
        res.append(response.render(context, obj, 'equipment_detail', 'equipment_details', i));
    });
    return res;
};

extended.make.path = function(context, json) {
    var res = extended.defaultExtended(context, 'paths', json);
    (json.path || []).forEach(function(obj, i) {
        res.append(response.render(context, obj, 'instruction', 'paths', i));
    });
    return res;
};

extended.make.terminus_schedule = function(context, json) {
    return extended.defaultStopSchedule(context, json);
};

extended.defaultStopSchedule = function(context, json) {
    var result = $('<div class="list"/>');
    if (Array.isArray(json.links) && json.links.length) {
        result.append(response.render(context, json.links, 'links', 'links'));
    }
    if (Array.isArray(json.display_informations.links) && json.display_informations.links.length) {
        result.append(response.render(context, json.display_informations.links, 'links', 'display_informations.links'));
    }
    if (json.first_datetime) {
        result.append(response.render(context, json.first_datetime, 'date_time', 'first_datetime'));
    }
    if (json.last_datetime) {
        result.append(response.render(context, json.last_datetime, 'date_time', 'last_datetime'));
    }
    json.date_times.forEach(function(date_time, i) {
        result.append(response.render(context, date_time, 'date_time', 'date_times', i));
    });
    return result;
};

//
// add your extended view by adding:
//   extended.make.{type} = function(context, json) { ... }

extended.defaultExtended = function(context, type, json) {
    var result = $('<div class="list"/>');
    if (Array.isArray(json.links) && json.links.length) {
        result.append(response.render(context, json.links, 'links', 'links'));
    }
    if (Array.isArray(json.codes) && json.codes.length) {
        result.append(response.render(context, json.codes, 'codes', 'codes'));
    }
    for (var key in json) {
        if (! (utils.getType(key) in context.links)) { continue; }
        if ($.isArray(json[key])) {
            json[key].forEach(function(obj, i) {
                result.append(response.render(context, obj, utils.getType(key), key, i));
            });
        } else {
            result.append(response.render(context, json[key], utils.getType(key), key));
        }
    }
    return result;
};

extended.has = {};
extended.has.section = function(context, json) {
    return Boolean(json.from) || Boolean(json.to) || Boolean(json.stop_date_times);
};
extended.has.poi = function(context, json) {
    return extended.hasDefaultExtended(context, json);
};
extended.has.links = function(context, json) {
    for (var i = 0; i < json.length; ++i) {
        if (context.followInternalLink(json[i])) {
            return true;
        }
    }
    return false;
};
extended.hasDefaultExtended = function(context, json) {
    if (! (json instanceof Object)) { return false; }
    if (Array.isArray(json.links) && json.links.length) { return true; }
    if (Array.isArray(json.codes) && json.codes.length) { return true; }
    for (var key in json) {
        if (utils.getType(key) in context.links) { return true; }
    }
    return false;
};

extended.hasExtended = function(context, type, json) {
    try {
        if (type in extended.make) {
            if (type in extended.has) {
                return extended.has[type](context, json);
            }
            return true;
        }
        return extended.hasDefaultExtended(context, json);
    } catch (e) {
        console.log(sprintf('hasExtended(%s) thows an exception:', type));// jshint ignore:line
        console.log(e);// jshint ignore:line
    }
    return false;
};

// main method
extended.run = function(context, type, json) {
    try {
        if (type in this.make) { return this.make[type](context, json); }
        return extended.defaultExtended(context, type, json);
    } catch (e) {
        console.log(sprintf('extended(%s) thows an exception:', type));// jshint ignore:line
        console.log(e);// jshint ignore:line
        return 'Error in extended view construction';
    }
};
