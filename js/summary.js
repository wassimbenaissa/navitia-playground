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
var pictos;
var utils;

var summary = {};

summary.make = {};

summary.make.response = function(context, json) {
    if (! json) {
        return 'Error: response is not JSon';
    }
    if ('message' in json) {
        return sprintf('Message: %s', json.message);
    }
    if ('error' in json && json.error && 'message' in json.error) {
        return sprintf('Error: %s', json.error.message);
    }
    var result = '';
    var key = response.responseCollectionName(json);
    if (key) {
        result = result + sprintf(' %s %s ', json[key].length, key);
    }
    if ('pagination' in json) {
        var p = json.pagination;
        var first_number = p.start_page * p.items_per_page + 1;
        result = result + sprintf('(%s-%s of %s results)',
            first_number,
            first_number + p.items_on_page - 1,
            p.total_result);
    }
    return result;
};

summary.make.journey = function(context, json) {
    var res = $('<span>').append(summary.formatTime(json.departure_date_time));
    function add(s) {
        res.append(' > ');
        $('<span/>').addClass('mode-and-code').append(s).appendTo(res);
    }

    if ('sections' in json) {
        var first_section_mode = null;
        var last_section_mode = null;
        json.sections.forEach(function(s) {
            switch (s.type) {
            case 'public_transport':
            case 'on_demand_transport':
                if (! first_section_mode) {
                    first_section_mode = last_section_mode;
                }
                last_section_mode = null;
                break;
            case 'crow_fly':
            case 'street_network':
                if (s.duration) {
                    switch (s.mode) {
                    case 'bike': last_section_mode = 'bike'; break;
                    case 'car': last_section_mode = 'car'; break;
                    case 'ridesharing': last_section_mode = 'ridesharing'; break;
                    case 'taxi': last_section_mode = 'taxi'; break;
                    case 'walking':
                        if (! last_section_mode) { last_section_mode = 'walking'; }
                        break;
                    }
                }
                break;
            case 'bss_rent':
            case 'bss_put_back':
                last_section_mode = 'bss';
                break;
            }
        });

        if (first_section_mode) {
            add(pictos.makeSnPicto(first_section_mode));
        }
        var stayIn = false;
        json.sections.forEach(function(s) {
            if (s.type === 'ridesharing') {
                var ridesharing = $('<span>').append(pictos.makeSnPicto('ridesharing'));
                var infos = s.ridesharing_informations;
                if (infos.driver && infos.driver.image) {
                    ridesharing.append(pictos.makeImgFromUrl(infos.driver.image, infos.driver.alias));
                }
                add(ridesharing);
                return;
            }
            if (s.type === 'transfer' && s.transfer_type === 'stay_in') {
                stayIn = true;
            }
            if ($.inArray(s.type, ['public_transport', 'on_demand_transport']) === -1) { return; }
            if (stayIn) {
                res.append('&thinsp;').append(summary.makeLineCode(s.display_informations));
                stayIn = false;
            } else {
                add(summary.makePhysicalModesFromSection(s)
                    .append(summary.makeLineCode(s.display_informations)));
            }
        });
        if (last_section_mode) {
            add(pictos.makeSnPicto(last_section_mode));
        }
    } else {
        // isochron
        add(summary.run(context, 'place', json.from));
        add(sprintf('%s transfer(s)', json.nb_transfers));
        add(summary.run(context, 'place', json.to));
    }
    add(summary.formatTime(json.arrival_date_time));

    if ('durations' in json) {
        if (json.durations.total) {
            $('<span/>')
                .addClass('section-additional-block')
                .append($('<img>').addClass('picto').attr('src', 'img/duration.svg'))
                .append(' ' + utils.durationToString(json.durations.total))
                .appendTo(res);
        }
        ['walking', 'bike', 'car', 'ridesharing'].forEach(function(mode) {
            if (!json.durations[mode]) { return; }
            $('<span/>')
                .addClass('section-additional-block')
                .append(pictos.makeSnPicto(mode))
                .append(utils.durationToString(json.durations[mode]))
                .appendTo(res);
        });
    }

    if (json.status) {
        $('<span/>')
            .addClass('section-additional-block')
            .append('status: ' + utils.htmlEncode(json.status))
            .appendTo(res);
    }

    return res;
};

summary.make.isochrone = function(context, json) {
    var res = $('<span>');
    if ('from' in json) {
      res.append(sprintf('from %s, ', utils.htmlEncode(json.from.name)));
    }
    if ('to' in json) {
      res.append(sprintf('to %s, ', utils.htmlEncode(json.to.name)));
    }
    if ('min_duration' in json && 'max_duration' in json) {
        $('<span/>')
            .addClass('with-bg-color')
            .css('background-color', context.getColorFromMinDuration(json.min_duration, 0.25))
            .text(sprintf('duration: [%s, %s]',
                          utils.durationToString(json.min_duration),
                          utils.durationToString(json.max_duration)))
            .appendTo(res);
    } else {
        res.text('no summary');
    }
    return res;
};

summary.make.heat_map = function(context, json) {
    var res = $('<span>');
    if ('from' in json) {
      res.append(sprintf('from %s, ', utils.htmlEncode(json.from.name)));
    } else if ('to' in json) {
      res.append(sprintf('to %s, ', utils.htmlEncode(json.to.name)));
    } else {
        res.text('no summary');
    }
    return res;
};

summary.make.links = function(context, json) {
    var res = $('<span>');
    function makeName(link) {
        var name = link.type;
        if (link.rel) { name = link.rel; }
        var internal = context.followInternalLink(link);
        if (internal) { name = internal.path; }
        if (link.templated) { return sprintf('{%s}', name); }
        return name;
    }
    if ($.isArray(json)) {
        json.forEach(function(link) {
            res.append(' ');
            if (link.id) {
                context.makeLink(link.type, link, makeName(link)).appendTo(res);
            } else if (link.href) {
                $('<a>')
                    .attr('href', context.makeHref(link.href))
                    .text(makeName(link))
                    .appendTo(res);
            } else {
                res.append(makeName(link));
            }
        });
    } else {
        res.append('Links is not an array!');
    }
    return res;
};

summary.make.codes = function(context, json) {
    var text = json.map(function(code) {
        return sprintf('%s: %s', code.type, code.value);
    }).join(', ');
    return $('<span>').text(text);
};

summary.make.warning = function(context, json) {
    return $('<span>').text(json.message);
};

summary.make.pt_object = summary.make.place = function(context, json) {
    var res = $('<span>')
        .text(json.embedded_type)
        .append(': ')
        .append(summary.run(context, json.embedded_type, json[json.embedded_type]));
    if ('distance' in json) {
        res.append(sprintf(' at %dm', json.distance));
    }
    return res;
};

summary.make.table = function(context, json) {
    return $('<span>').text(sprintf('%d vehicle journeys, %d stop points',
                                    json.headers.length,
                                    json.rows.length));
};

summary.make.section = function(context, section) {
    var res = $('<span>');
    var pt = false;

    switch (section.type) {
    case 'street_network': res.append(pictos.makeSnPicto(section.mode)); break;
    case 'ridesharing': res.append(pictos.makeSnPicto('ridesharing')); break;
    case 'bss_rent':
        res.append(pictos.makeSnPicto('bss')).append(' rent');
        break;
    case 'bss_put_back':
        res.append(pictos.makeSnPicto('bss')).append(' put back');
        break;
    case 'leave_parking':
        res.append(pictos.makeSnPicto('car')).append(' leave parking');
        break;
    case 'transfer':
        if (section.transfer_type === 'walking') {
            res.append(pictos.makeSnPicto('walking'));
        } else {
            res.append(document.createTextNode(section.transfer_type));
        }
        break;
    case 'on_demand_transport':
        res.append(section.type + ' ');
        pt = true;
        res.append(summary.makeRoutePoint(context, section));
        break;
    case 'public_transport':
        pt = true;
        res.append(summary.makeRoutePoint(context, section));
        break;
    case 'crow_fly':
        if (section.duration) {
            res.append(pictos.makeSnPicto(section.mode));
            res.append(sprintf(' (%s)', section.type));
        } else {
            res.append(section.type);
        }
        break;
    default: res.append(section.type); break;
    }

    if ('from' in section) {
        res.append(sprintf(' from <strong>%s</strong>', utils.htmlEncode(section.from.name)));
    }
    if (pt) {
        res.append(summary.makeSectionTime(section.departure_date_time,
                                           section.base_departure_date_time));
    }
    if ('to' in section) {
        res.append(sprintf(' to <strong>%s</strong>', utils.htmlEncode(section.to.name)));
    }
    if (pt) {
        res.append(summary.makeSectionTime(section.arrival_date_time,
                                           section.base_arrival_date_time));
    }
    if ('duration' in section) {
        res.append(sprintf(' during %s', utils.durationToString(section.duration)));
    }
    if (section.data_freshness && section.data_freshness !== 'base_schedule') {
        res.append(sprintf(' (%s)', section.data_freshness));
    }
    if (section.ridesharing_informations) {
        var infos = section.ridesharing_informations;
        if (infos.driver) {
            if (infos.driver.image) {
                res.append(', driver: ');
                res.append(pictos.makeImgFromUrl(infos.driver.image, infos.driver.alias));
            }
            if (infos.driver.gender && infos.driver.gender === 'male') {
                res.append(' Mr.&nbsp;');
            } else if (infos.driver.gender && infos.driver.gender === 'female') {
                res.append(' Ms.&nbsp;');
            }
            if (infos.driver.alias) {
                res.append(sprintf(' %s', infos.driver.alias));
            }
            if (infos.driver.rating &&
                infos.driver.rating.value &&
                infos.driver.rating.scale_max &&
                infos.driver.rating.scale_min &&
                infos.driver.rating.count) {
                res.append(sprintf(' %f/%f (%d reviews), ',
                                   infos.driver.rating.value - infos.driver.rating.scale_min,
                                   infos.driver.rating.scale_max - infos.driver.rating.scale_min,
                                   infos.driver.rating.count));
            }
        }
        if (infos.seats) {
            if (infos.seats.available) {
                res.append(sprintf(', available seats: %d', infos.seats.available));
            }
            if (infos.seats.total) {
                res.append(sprintf(', total seats %d', infos.seats.total));
            }
        }
        if (infos.network && infos.operator) {
            res.append(utils.htmlEncode(sprintf(', network: %s, operator: %s', infos.network, infos.operator)));
        }
    }
    return res;
};

summary.make.region = function(context, region) {
    var res = $('<span/>').text(region.id + (region.name ? sprintf(' (%s)', region.name) : ''));
    var now = new Date();
    var begin = utils.makeDate(region.start_production_date);
    var end = utils.makeDate(region.end_production_date);
    var remaining_days = Math.round((end - now) / 1000 / 60 / 60 / 24);
    if (region.error && region.error.value) {
        res.append(sprintf(', <span class="error">error: %s</span>', utils.htmlEncode(region.error.value)));
    } else if (region.status !== 'running') {
        res.append(sprintf(', <span class="error">status: %s</span>', utils.htmlEncode(region.status)));
    } else if (now < begin || end < now) {
        res.append(sprintf(', <span class="outofdate">out-of-date [%s, %s]</span>',
                           utils.formatDate(begin),
                           utils.formatDate(end)));
    } else if (remaining_days <= 21) {
        res.append(sprintf(', <span class="almost_outofdate">%sd remaining</span>', remaining_days));
    }
    return res;
};

summary.make.line = function(context, line) {
    var code = $('');
    if (line.code) {
        code = $('<span>')
            .addClass('with-bg-color')
            .append(line.code);
        summary.setColors(code, line);
    }
    return $('<span>')
        .append(pictos.makePtPicto(line.physical_modes))
        .append(code)
        .append(' ')
        .append(document.createTextNode(line.name));
};

summary.make.stop_date_time = function(context, stop_time) {
    var sum = summary.run(context, 'stop_point', stop_time.stop_point);
    var res = $('<span>')
        .append(summary.makeImpactedTime(stop_time.arrival_date_time,
                                         stop_time.base_arrival_date_time))
        .append(' > ')
        .append(summary.makeImpactedTime(stop_time.departure_date_time,
                                         stop_time.base_departure_date_time))
        .append(' ')
        .append(sum);
    return res;
};

summary.make.stop_time = function(context, stop_time) {
    var sum = summary.run(context, 'stop_point', stop_time.stop_point);
    var res = $('<span>')
        .append(summary.formatTime(stop_time.arrival_time))
        .append(' > ')
        .append(summary.formatTime(stop_time.departure_time))
        .append(' ')
        .append(sum);
    return res;
};

summary.make.departure = function(context, json) {
    var res = $('<span>');
    res.append(summary.makeImpactedTime(json.stop_date_time.departure_date_time,
                                        json.stop_date_time.base_departure_date_time));
    res.append(': ');
    res.append(summary.makeRoutePoint(context, json));
    res.append(' (' + json.stop_date_time.data_freshness + ')');
    return res;
};

summary.make.arrival = function(context, json) {
    var res = $('<span>');
    res.append(summary.makeImpactedTime(json.stop_date_time.arrival_date_time,
                                        json.stop_date_time.base_arrival_date_time));
    res.append(': ');
    res.append(summary.makeRoutePoint(context, json));
    res.append(' (' + json.stop_date_time.data_freshness + ')');
    return res;
};

summary.make.stop_schedule = function(context, json) {
    return summary.makeRoutePoint(context, json);
};

summary.make.date_time = function(context, json) {
    var res = $('<span>');
    res.append(summary.makeImpactedTime(json.date_time, json.base_date_time));
    res.append(' (' + json.data_freshness + ')');
    return res;
};

summary.make.route_schedule = function(context, json) {
    return summary.makeRoutePoint(context, json);
};

summary.make.physical_mode = function(context, json) {
    return $('<span/>')
        .append(pictos.makePtPicto(json))
        .append(document.createTextNode(' ' + json.name));
};

summary.make.connection = function(context, json) {
    return $('<span/>').text(sprintf('%s > %s, duration: %s, display_duration: %s',
                                     json.origin.id,
                                     json.destination.id,
                                     utils.durationToString(json.duration),
                                     utils.durationToString(json.display_duration)));
};

summary.make.tags = function(context, json) {
    return $('<span/>').text(json.join(', '));
};

summary.make.contributor = function(context, json) {
    var res = $('<span/>');
    var url = json.url ? json.url : json.website;
    if (url && typeof url === 'string') {
        if (url.indexOf('://') === -1) { url = 'http://' + url; }
        res.append($('<a/>').attr('href', url).text(json.name));
    } else {
        res.text(json.name);
    }
    if (json.license) {
        res.append(', license: ' + utils.htmlEncode(json.license));
    }
    return res;
};

summary.make.dataset = function(context, json) {
    return $('<span/>').text(sprintf('%s (%s - %s): [%s, %s]',
        json.description,
        json.realtime_level,
        json.system,
        summary.formatDatetime(json.start_validation_date),
        summary.formatDatetime(json.end_validation_date)
    ));
};

summary.make.stands = function(context, json) {
    return  $('<span/>').text(sprintf(
        'bikes: %d, places: %d, total: %d',
        json.available_bikes,
        json.available_places,
        json.total_stands
    ));
};

summary.make.car_park = function(context, json) {
    return $.map(['available', 'occupied', 'available_PRM', 'occupied_PRM',
            'total_places'],
        function(value) {
            if (value in json) {
                return sprintf('%s: %d', value, json[value]);
            }
    }).join(', ');
};

summary.make.disruption = function(context, json) {
    var res = $('<span/>');
    res.append($('<span/>').css('color', json.severity.color).text(json.severity.name));
    if (json.severity && json.severity.effect) {
        res.append(', effect: ' + utils.htmlEncode(json.severity.effect));
    }
    if (json.status) { res.append(', status: ' + utils.htmlEncode(json.status)); }
    if (json.cause) { res.append(', cause: ' + utils.htmlEncode(json.cause)); }
    if (json.tags && json.tags.length) { res.append(', tags: ' + json.tags); }
    return res;
};

summary.make.message = function(context, json) {
    var res = $('<span/>');
    if (json.channel.content_type === 'text/html') {
        res.html(json.text);
    } else {
        res.text(json.text);
    }
    res.prepend(sprintf('%s: ', utils.htmlEncode(json.channel.name)));
    return res;
};

summary.make.application_pattern = function(context, json) {
    var res = $('<span/>');
    var begin = utils.makeDate(json.application_period.begin);
    var end = utils.makeDate(json.application_period.end);
    var week = utils.formatWeek(json.week_pattern);

    res.text(sprintf('since %s until %s on %s', utils.formatDate(begin), utils.formatDate(end), week));
    res.append(' in ');
    res.append(summary.run(context, 'time_slots', json.time_slots));
    return res;
};

summary.make.time_slots = function(context, json) {
    var text = json.map(function(time_slot) {
        return sprintf('%s-%s', utils.formatTime(time_slot.begin), utils.formatTime(time_slot.end));
    }).join(' or ');
    return $('<span>').text(text);
};

summary.make.application_periods = function(context, json) {
    var res = $('<span/>');
    var text = json.map(function(period) {
        return sprintf('[%s, %s]',
                       summary.formatDatetime(period.begin),
                       summary.formatDatetime(period.end));
    }).join(' ∪ ');
    res.text(text);
    return res;
};

summary.make.impacted_object = function(context, json) {
    var res = $('<span>');
    if (json.impacted_section && json.pt_object.line && json.pt_object.line.code) {
        res.append('line section: ');
        var code = $('<span>')
            .addClass('with-bg-color')
            .append(json.pt_object.line.code);
        summary.setColors(code, json.pt_object.line);
        res.append(code);
        res.append(' ');
        res.append(utils.htmlEncode(json.impacted_section.from.name));
        res.append(' > ');
        res.append(utils.htmlEncode(json.impacted_section.to.name));
    } else if (json.impacted_section) {
        res.append('line section: ');
        res.append(summary.run(context, 'pt_object', json.pt_object));
        res.append(', impacted section: ');
        res.append(summary.run(context, 'impacted_section', json.impacted_section));
    } else {
        res.append(summary.run(context, 'pt_object', json.pt_object));
    }
    return res;
};

summary.make.impacted_section = function(context, json) {
    var res = $('<span>');
    res.append(summary.run(context, 'pt_object', json.from));
    res.append(' > ');
    res.append(summary.run(context, 'pt_object', json.to));

    return res;
};

summary.make.impacted_stop = function(context, json) {
    var res = $('<span>');
    res.append(summary.run(context, 'stop_point', json.stop_point));
    res.append(': ');
    res.append(summary.makeImpactedTime(json.amended_arrival_time, json.base_arrival_time));
    res.append(' > ');
    res.append(summary.makeImpactedTime(json.amended_departure_time, json.base_departure_time));
    if (json.cause) { res.append(utils.htmlEncode(', cause: ' + json.cause)); }
    return res;
};

summary.make.co2_emission = function(context, json) {
    return $('<span/>').html(sprintf('CO<sub>2</sub>:&nbsp;%.0f&nbsp;%s', json.value, json.unit));
};

summary.make.distances = function(context, json) {
    var res = $('<span/>');
    var equipments = ['walking', 'bike', 'car', 'ridesharing'];
    equipments.forEach(function(key) {
        if(json[key]) {
          $('<span>')
              .addClass('section-additional-block')
              .append(pictos.makeSnPicto(key))
              .append(utils.makeDistanceSummary(json[key]))
              .appendTo(res);
        }
    });
    return res;
};

summary.make.equipments = function(context, json) {
    var res = $('<span/>');
    json.forEach(function(equipment) {
        pictos.makeEquipmentPicto(equipment).appendTo(res);
        res.append(' ');
    });
    return res;
};

summary.make.poi = function(context, json) {
    var res = $('<span/>');
    if (json.poi_type && json.poi_type.name) {
        res.append(json.poi_type.name + ': ');
    }
    res.append(json.label);
    if (json.stands) {
        res.append(', stands: ');
        if (!json.stands.status || json.stands.status === 'open') {
            res.append(summary.run(context, 'stands', json.stands));
        } else {
            res.append($('<span/>')
                        .addClass('stands-status')
                        .addClass(json.stands.status)
                        .text(json.stands.status));
        }
    }

    if (json.car_park) {
        res.append(', car park: ');
        res.append(summary.run(context, 'car_park', json.car_park));
    }
    return res;
};

summary.make.traffic_report = function(context, json) {
    var r = $.map(json, function(obj, key) {
        if (obj.length) {
            return sprintf('%d %s', obj.length, key);
        }
    });
    if (r.length) {
        return sprintf('network %s: %s', json.network.name, r.join(', '));
    } else {
        return sprintf('network %s: no disruption', json.network.name);
    }
};

summary.make.line_report = function(context, json) {
    return $('<span>')
        .append('line: ')
        .append(summary.run(context, 'line', json.line))
        .append(sprintf(', %d pt_objects', json.pt_objects.length));
};

summary.make.equipment_report = function(context, json) {
    return $('<span>')
        .append('line: ')
        .append(summary.run(context, 'line', json.line))
        .append(sprintf(', %d stop_area_equipments', (json.stop_area_equipments || []).length));
};

summary.make.terminus_schedule = function(context, json) {
    return summary.makeRoutePoint(context, json);
};

summary.make.free_floating = function(context, json) {
    var res = $('<span/>');
    function add(s, n) {
        res.append(sprintf(', %s: ',s));
        $('<span/>')
            .addClass('gray-and-bold')
            .text(sprintf('%s', n))
        .appendTo(res);
    }
    res.append(sprintf('%s', json.type));
    add('provider', json.provider_name);
    res.append(', distance: ');
    $('<span/>')
        .addClass('gray-and-bold')
        .text(sprintf('%s m', json.distance))
    .appendTo(res);
    if (json.public_id) {
        add('public id', json.public_id);
    }
    if (json.battery) {
        add('battery', json.battery);
    }
    return res;
};

summary.make.stop_area_equipment = function(context, json) {
    var equip_details = (json.equipment_details || []);
    var res = $('<span>')
        .append('stop_area: ')
        .append(summary.run(context, 'stop_area', json.stop_area))
        .append(sprintf(', %d equipments', equip_details.length));

    var unavailable_equipments = equip_details.filter(function(o){
        return o.current_availability.status === 'unavailable';
    }).length;
    if(unavailable_equipments) {
        res.append($('<span/>').addClass('unavailable').text(' ('+unavailable_equipments+' unavailable)'));
    }

    return res;
};

summary.make.equipment_detail = function(context, json) {
    var res = $('<span/>')
        .append(json.name || json.id).append(', ')
        .append('type: '+ json.embedded_type);

    var cur_avail = json.current_availability;
    if (cur_avail) {
        if(cur_avail.status) {
            var status_class = ['unavailable', 'available'].find(function(o){ return o === cur_avail.status;}) || 'unknown';
            res.append(', status: ');
            res.append($('<span/>').addClass(status_class).text(cur_avail.status));
        }
        if(cur_avail.cause){
            res.append(', cause : ' + utils.htmlEncode(cur_avail.cause.label));
        }
        if(cur_avail.effect) {
            res.append(', effect : ' + utils.htmlEncode(cur_avail.effect.label));
        }
    }
    return res;
};

summary.make.path = function(context, json) {
    var res = $('<span>')
        .append(pictos.makeSnPicto(json.mode))
        .append(' > ')
        .append(sprintf('%d paths', json.path.length));
    return res;
};

summary.make.instruction = function(context, path_item) {
    var res = $('<span>');
        if (path_item.instruction) {
            res.append(path_item.instruction);
        } else {
            if (path_item.direction === parseInt('0',10)) {
                res.append('Continue on ');
            } else if (path_item.direction < parseInt('0', 10)){
                res.append('Turn left onto ');
            } else {
                res.append('Turn right onto ');
            }
            if (path_item.name === '') {
                $('<span/>')
                    .addClass('street')
                    .text('Street Name Unknown')
                .appendTo(res);
            } else {
                $('<span/>')
                    .addClass('street')
                    .text(path_item.name)
                .appendTo(res);
            }
            res.append('. Go for ');
            $('<span/>')
                .addClass('length')
                .text(sprintf('%s m.',path_item.length))
            .appendTo(res);
        }
        res.append(' (duration: ');
        res.append(path_item.duration);
        res.append(' s)');
    return res;
};

summary.make.note = function(context, json) {
    return json.value;
};

summary.make.context = function(context, json) {
    var res = $('<span>').text(sprintf('current datetime: %s, timezone: %s',
                                       summary.formatDatetime(json.current_datetime),
                                       json.timezone));
    if (json.car_direct_path && json.car_direct_path.co2_emission.value) {
        res.append(sprintf(', car '));
        res.append(summary.run(context, 'co2_emission', json.car_direct_path.co2_emission));
    }
    return res;
};

// add your summary view by adding:
//   summary.make.{type} = function(context, json) { ... }

summary.setColors = function(elt, json) {
    if ('color' in json) {
        elt.css('background-color', '#' + json.color);
        elt.css('color', utils.getTextColor(json));
    }
};

summary.defaultSummary = function(context, type, json) {
    if (! (json instanceof Object)) { return 'Invalid object'; }

    var res = $('<span/>');
    if ('physical_modes' in json && $.isArray(json.physical_modes)) {
        json.physical_modes.forEach(function(mode) {
            res.append(pictos.makePtPicto(mode));
        });
    }
    if ('label' in json) {
        res.append(document.createTextNode(json.label));
    } else if ('name' in json) {
        res.append(document.createTextNode(json.name));
    } else if ('id' in json) {
        res.append(document.createTextNode(json.id));
    } else {
        res.append('no summary');
    }
    return res;
};

summary.formatDatetime = function(datetime) {
    if (typeof datetime !== 'string') { return 'none'; }
    var formated = datetime.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
                                    '$1-$2-$3 $4:$5:$6');
    if (formated.slice(-2) === '00') {
        return formated.slice(0, -3);
    } else {
        return formated;
    }
};

summary.formatTime = function(datetime) {
    if (datetime.length === 6) {
        var formated = datetime.replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3');
        if (formated.slice(-2) === '00') {
            return formated.slice(0, -3);
        } else {
            return formated;
        }
    }
    return summary.formatDatetime(datetime).split(' ')[1];
};

summary.makeSectionTime = function(dt, baseDt) {
    var res = $('<span/>');
    res.append(' at ');
    if (baseDt && baseDt !== dt) {
        res.append($('<span/>').addClass('old-datetime').text(summary.formatTime(baseDt)));
    }
    res.append(sprintf(' %s', summary.formatTime(dt)));
    return res;
};

summary.makeImpactedTime = function(amended, base) {
    var res = $('<span/>');
    if (base && base !== amended) {
        res.append($('<span/>').addClass('old-datetime').text(summary.formatTime(base)));
        res.append(' ');
    }
    if (amended) {
        res.append(utils.htmlEncode(summary.formatTime(amended)));
    }
    return res;
};

summary.makePhysicalModesFromSection = function(section) {
    if ('links' in section) {
        var pms = section.links
            .map(function(o) {
                if (o.type === 'physical_mode') {
                    return { id: o.id, name: section.display_informations.physical_mode };
                } else {
                    return null;
                }
            });
        return pictos.makePtPicto(pms);
    }
};

summary.makeLineCode = function(display_informations) {
    if (! display_informations.code) { return $(''); }
    var elt = $('<span>')
        .addClass('with-bg-color')
        .append(display_informations.code);
    summary.setColors(elt, display_informations);
    return elt;
};

summary.makeRoutePoint = function(context, json) {
    var res = $('<span/>');
    if ('route' in json) {
        res.append(pictos.makePtPicto(json.route.physical_modes));
    } else if ('links' in json && 'display_informations' in json) {
        res.append(summary.makePhysicalModesFromSection(json));
    }
    res.append(summary.makeLineCode(json.display_informations));
    res.append(' > ');
    res.append(json.display_informations.direction);
    if (json.stop_point) {
        res.append(' at ');
        res.append(summary.run(context, 'stop_point', json.stop_point));
    }
    return res;
};

summary.run = function(context, type, json) {
    var res;
    try {
        if (type in summary.make) {
            res = summary.make[type](context, json);
        } else {
            res = summary.defaultSummary(context, type, json);
        }
    } catch (e) {
        console.log(sprintf('summary(%s) thows an exception:', type));// jshint ignore:line
        console.log(e);// jshint ignore:line
        res = 'summary error';
    }
    if (res instanceof jQuery) {
        return res.get(0);
    } else if (typeof res === 'string') {
        return $('<span>').text(res).get(0);
    }
    return res;
};
