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
var storage;
var summary;
var response;
var request;
var utils;
var map;

var autocomplete = {};

autocomplete._paramValueEverywhere = [
    'depth', 'count', 'forbidden_uris[]', 'filter', 'bss_stands'
];

autocomplete._collections = [
    'addresses', 'commercial_modes', 'companies', 'contributors', 'coord', 'coverage',
    'datasets', 'disruptions', 'lines', 'networks', 'places', 'poi_types', 'pois',
    'physical_modes', 'routes', 'stop_areas', 'stop_points', 'vehicle_journeys'
];

autocomplete._additionalFeatures = [
    'departures', 'journeys', 'places_nearby', 'pt_objects', 'route_schedules',
    'stop_schedules', 'arrivals', 'isochrones', 'heat_maps', 'traffic_reports',
    'line_reports', 'equipment_reports'
];

autocomplete._paramJourneyCommon = [
    'from', 'to', 'datetime','traveler_type', 'data_freshness',
    'first_section_mode[]', 'last_section_mode[]', 'allowed_id[]'
].concat(autocomplete._paramValueEverywhere);

autocomplete._depArrParams = [
    'from_datetime', 'duration', 'data_freshness'
].concat(autocomplete._paramValueEverywhere);

autocomplete._schedulesParams = [
    'from_datetime', 'duration', 'items_per_schedule', 'data_freshness'
].concat(autocomplete._paramValueEverywhere);

autocomplete._placesParams = [
    'q', 'type[]', 'admin_uri[]', 'from'
].concat(autocomplete._paramValueEverywhere);

autocomplete._fallbackMode = ['walking', 'car', 'bike', 'bss'];

autocomplete._booleanValues = ['true', 'false'];

autocomplete.autocompleteTree = {
    pathKey: {
        empty : ['coverage', 'places', 'coord'],
        all : autocomplete._collections,
    },
    features: {
        all: autocomplete._collections.concat(autocomplete._additionalFeatures),
    },
    paramKey: {
        arrivals: autocomplete._depArrParams,
        coord: autocomplete._paramValueEverywhere,
        coverage: autocomplete._paramValueEverywhere,
        departures: autocomplete._depArrParams,
        journeys: ['datetime_represents'].concat(autocomplete._paramJourneyCommon),
        isochrones: ['max_duration', 'min_duration', 'boundary_duration[]'].concat(autocomplete._paramJourneyCommon),
        heat_maps: ['max_duration', 'resolution'].concat(autocomplete._paramJourneyCommon),
        lines: autocomplete._paramValueEverywhere,
        places_nearby: autocomplete._placesParams,
        places: autocomplete._placesParams,
        pois: ['distance'].concat(autocomplete._paramValueEverywhere),
        pt_objects: ['q', 'type[]'].concat(autocomplete._paramValueEverywhere),
        stop_areas: autocomplete._paramValueEverywhere,
        stop_points: autocomplete._paramValueEverywhere,
        routes: autocomplete._paramValueEverywhere,
        route_schedules: autocomplete._schedulesParams,
        stop_schedules: autocomplete._schedulesParams,
        empty: autocomplete._paramValueEverywhere,
    },
    paramValue : {
        traveler_type : ['luggage', 'standard', 'fast_walker', 'slow_walker'],
        datetime_represents : ['arrival', 'departure'],
        data_freshness: ['base_schedule', 'adapted_schedule', 'realtime'],
        debug: autocomplete._booleanValues,
        wheelchair: autocomplete._booleanValues,
        disable_geojson: autocomplete._booleanValues,
        bss_stands: autocomplete._booleanValues,
        'first_section_mode[]': autocomplete._fallbackMode,
        'last_section_mode[]': autocomplete._fallbackMode,
    }
};

autocomplete.apiAutocomplete = function() {
    var input = $('#api input.api');
    var apis = storage.getApis();
    autocomplete._customAutocompleteHelper(input, apis, {
        close: request.setSaveTokenButtonStatus,
        select: function (event, ui) {
            $(input).val(ui.item.value);
            $('#token input.token').val(storage.getToken(ui.item.value));
        }
    });
};

autocomplete.valueAutoComplete = function (input, key) {
    var manualFallback = function() {
        // if no autocomplete is available, we use the old static autocomplete system
        if (utils.isDatetimeType(key)) {
            autocomplete._makeDatetime(input);
        } else if (key in autocomplete.autocompleteTree.paramValue){
            autocomplete._customAutocompleteHelper(input, autocomplete.autocompleteTree.paramValue[key]);
        } else if (autocomplete.staticAutocompleteTypes.indexOf(key) > -1) {
            autocomplete.staticAutocomplete(input, key);
        } else if (key in autocomplete.dynamicAutocompleteTypes) {
            autocomplete.dynamicAutocomplete(input, key);
        }
    };
    // we use the swagger definition only for the parameters
    if (! $(input).hasClass('parameters')) {
        return manualFallback();
    }
    autocomplete.swaggerAutocomplete({
        input: input,
        extractResult: function(swagger_response) {
            var param = swagger_response.get.parameters.find(function(e) { return e.name === key; });
            if (! param) {
                manualFallback();
                return null;
            }
            param = param.type === 'array' ? param.items : param;
            if (param.format === 'date-time' || param.format === 'navitia-date-time') {
                autocomplete._makeDatetime(input);
                return null;
            }
            if (param.type === 'boolean') {
                return autocomplete._booleanValues;
            }
            if (param.format === 'place') {
                new autocomplete.Place().autocomplete(input);
                return null;
            }
            if (param.format === 'pt-object') {
                new autocomplete.PtObject().autocomplete(input);
                return null;
            }
            if ('enum' in param) {
                return param.enum;
            }

            manualFallback();
            return null;
        },
        onError: manualFallback
    });
};

autocomplete.getSwaggerParams = function(swagger) {
    return $.map(swagger.get.parameters, function (p) {
        if (p.in !== 'query') {
            return null;
        }
        return p.name;
    });
};

autocomplete.swaggerAutocomplete = function(args) {
    var input = args.input;
    var old_req = '';
    var old_token = '';
    var handle = function() {
        var token = $('#token input.token').val();
        var urlElements = request.urlElements();
        var req = urlElements.api + urlElements.path + '/' + urlElements.feature + '?schema=true';
        if (req !== old_req || token !== old_token) {
            old_req = req;
            old_token = token;
            if ($(input).autocomplete('instance')) {
                // be sure that out-of-date autocompletion will not be active
                $(input).autocomplete('destroy');
            }
            $(input).parent().find('.tooltips').empty();
            $.ajax({
                headers: utils.manageToken(token),
                dataType: 'json',
                method: 'OPTIONS',
                url: req
            }).done(function(data) {
                    var res = args.extractResult(data);
                    if (res === null) {
                        //nothing to do
                        return;
                    }
                    res = res.sort();
                    $(input).autocomplete({
                        close: function() { request.updateUrl($(input)[0]); },
                        select: function(event, ui) { $(input).val(ui.item.value).change(); },
                        source: res,
                        minLength: 0,
                        scroll: true,
                        delay: 0
                    });
                    $(input).autocomplete('enable');
                    if ($(input).is(':focus') && $(input).autocomplete('instance')) {
                        $(input).autocomplete('search', '');
                    }
                }
            ).fail(function(data, status, error) {
                if (data.responseText !== '') {
                    utils.notifyOnError('Autocomplete', req, data, status, error);
                    console.warn('error on swagger call for req ' + req, data, error);// jshint ignore:line
                }
                args.onError(data);
            });
        } else if ($(input).is(':focus') && $(input).autocomplete('instance')) {
            $(input).autocomplete('search', '');
        }
    };
    handle();
    $(input).focus(handle);
};

autocomplete.paramKey = function(input, type) {
    autocomplete.swaggerAutocomplete({
        input: input,
        extractResult: function(swagger_response) {
            return autocomplete.getSwaggerParams(swagger_response);
        },
        onError: function() {
            // if no autocomplete is available, we use the old static autocomplete system
            // TODO: when all navitia api are defined by swagger, we can remove this
            var feature = $('#featureInput').val();
            var source = autocomplete.autocompleteTree[type][feature] || autocomplete.autocompleteTree[type].empty || [];
            autocomplete._customAutocompleteHelper(input, source, {
                select: function(event, ui) { $(input).val(ui.item.value).change(); }
            });
        }
    });
};

autocomplete.addKeyAutocomplete = function(input, type) {
    var source;
    if (type === 'pathKey' && ! $('#pathFrame').find('.value').length) {
        source = this.autocompleteTree[type].empty;
    } else if (type === 'paramKey'){
        return autocomplete.paramKey(input, type);
    } else {
        source = this.autocompleteTree[type].all;
    }
    source = source || [];
    autocomplete._customAutocompleteHelper(input, source, {
        select: function(event, ui) { $(input).val(ui.item.value).change(); }
    });
};

autocomplete.staticAutocompleteTypes = [
    'coverage',
    'physical_modes',
    'poi_types',
];

autocomplete.staticAutocomplete = function(input, staticType) {
    var old_req = '';
    var old_token = '';
    var handle = function() {
        var api = $('#api input.api').val();
        var token = $('#token input.token').val();
        var cov = request.getCoverage();
        var req = api +  '/coverage/';
        if (staticType !== 'coverage') {
            req +=  cov + '/' + staticType;
        }
        req += '?disable_geojson=true';
        if (req !== old_req || token !== old_token) {
            old_req = req;
            old_token = token;
            autocomplete.updateStaticAutocomplete(input, staticType, req, token);
        } else if ($(input).is(':focus') && $(input).autocomplete('instance')) {
            $(input).autocomplete('search', '');
        }
    };
    handle();
    $(input).focus(handle);
};

autocomplete.updateStaticAutocomplete = function(input, staticType, req, token) {
    if ($(input).autocomplete('instance')) {
        // be shure that out-of-date autocompletion will not be active
        $(input).autocomplete('destroy');
    }
    $(input).parent().find('.tooltips').empty();
    $.ajax({
        headers: utils.manageToken(token),
        dataType: 'json',
        url: req,
        success: function(data) {
            var res = [];
            staticType = (staticType==='coverage') ? 'regions' :  staticType;
            data[staticType].forEach(function(elt) {
                var s = summary.run(new response.Context(data), utils.getType(staticType), elt);
                res.push({ value: elt.id, label: s.textContent, desc: s });
            });
            res = res.sort(function(a, b) {
                if (a.label < b.label) { return -1; }
                if (a.label > b.label) { return 1; }
                return 0;
            });
            $(input).autocomplete({
                close: function() { request.updateUrl($(input)[0]); },
                source: res,
                minLength: 0,
                scroll: true,
                delay: 0
            }).autocomplete('instance')._renderItem = function(ul, item) {
                return $('<li>').append(item.desc).appendTo(ul);
            };
            $(input).autocomplete('enable');
            if ($(input).is(':focus') && $(input).autocomplete('instance')) {
                $(input).autocomplete('search', '');
            }
        },
        error: function(data, status, error) {
            utils.notifyOnError('Autocomplete', req, data, status, error);
        }
    });
};

autocomplete.getUrlWithCov = function() {
    var url = $('#api input.api').val();
    var cov = request.getCoverage();
    url += cov ? ('/coverage/' + cov) : '';
    return url;
};

autocomplete.AbstractObject = function(types) {
    this.types = types || [];
};
autocomplete.AbstractObject.prototype.autocompleteUrl = function(term) {
    var url = autocomplete.getUrlWithCov();
    url += '/' + this.api + '?display_geojson=false&q=' + encodeURIComponent(term);
    this.types.forEach(function(type) {
        url += '&type[]=' + type;
    });
    return url;
};
autocomplete.AbstractObject.prototype.objectUrl = function(term) {
    var url = autocomplete.getUrlWithCov();
    url += '/' + this.api + '/' + encodeURIComponent(term) + '?display_geojson=false';
    return url;
};
autocomplete.AbstractObject.prototype.source = function(urlMethod) {
    if (urlMethod === undefined) { urlMethod = 'autocompleteUrl'; }
    var self = this;
    return function(req, res) {
        var token = $('#token input.token').val();
        var url = self[urlMethod](req.term);
        if (! url) { return res([]); }
        $.ajax({
            url: url,
            headers: utils.manageToken(token),
            success: function (data) {
                var result = [];
                var key = response.responseCollectionName(data);
                var search = key ? data[key] : [];
                var type = utils.getType(key);
                if (search) {
                    search.forEach(function(s) {
                        var sum = summary.run(new response.Context(data), type, s);
                        result.push({ value: s.id, label: sum });
                    });
                }
                res(result);
            },
            error: function(data, status, error) {
                res([]);
                utils.notifyOnError('Autocomplete', url, data, status, error);
            }
        });
    };
};
autocomplete.AbstractObject.prototype.describe = function(elt) {
    $(elt).autocomplete('option', 'source', this.source('objectUrl'));
    $(elt).autocomplete('search');
    $(elt).autocomplete('option', 'source', this.source());
};
autocomplete.AbstractObject.prototype.autocomplete = function (elt) {
    var self = this;
    $(elt).autocomplete({
        delay: 200,
        close: function() { request.updateUrl($(elt)[0]); },
        source: self.source()
    }).focus(function() {
        self.describe(this);
    }).hover(function() {
        if (! $(this).is(':focus')) { self.describe(this); }
    }, function() {
        if (! $(this).is(':focus')) { $(this).autocomplete('close'); }
    }).autocomplete('instance')._renderItem = function(ul, item) {
        return $('<li>').append(item.label).appendTo(ul);
    };
};

autocomplete.PtObject = function(types) {
    autocomplete.AbstractObject.call(this, types);
};
autocomplete.PtObject.prototype = Object.create(autocomplete.AbstractObject.prototype);
autocomplete.PtObject.prototype.api = 'pt_objects';
autocomplete.PtObject.prototype.objectUrl = function(term) {
    // /pt_objects/{pt_object.id} is not supported yet by navitia,
    // using the type if there is no ambiguity.
    if (this.types.length === 1) {
        var url = autocomplete.getUrlWithCov();
        url += '/' + this.types[0] + 's/' + encodeURIComponent(term) + '?display_geojson=false';
        return url;
    }
    return null;
};

autocomplete.Place = function(types) {
    autocomplete.AbstractObject.call(this, types);
};
autocomplete.Place.prototype = Object.create(autocomplete.AbstractObject.prototype);
autocomplete.Place.prototype.api = 'places';
autocomplete.Place.prototype.autocomplete = function(elt) {
    if (!this.types.length || this.types.indexOf('address') !== -1) {
        var tooltips = $(elt).parent().find('.tooltips');

        $('<button/>')
            .html('<img src="img/pictos/MapMarker.svg" alt="map">')
            .click(function() {
                var div = $('<div/>').appendTo('body');
                map.createMap(function(m) {
                    m.on('click', function(e) {
                        var coord = sprintf('%.5f;%.5f', e.latlng.lng, e.latlng.lat);
                        $(elt).val(coord).select();
                        div.children().trigger('npg:remove');
                        div.remove();
                    });
                    return storage.getBounds();
                }).css({
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: '100%',
                }).appendTo(div);
                utils.notifyInfo('Click on the map to set the location.');
            }).prependTo(tooltips);

        $('<button/>')
            .html('<img src="img/pictos/Location.svg" alt="location">')
            .click(function() {
                utils.notifyInfo('Getting current position...');
                navigator.geolocation.getCurrentPosition(function(pos) {
                    var coord = sprintf('%.5f;%.5f', pos.coords.longitude, pos.coords.latitude);
                    utils.notifyInfo('Got location: ' + coord);
                    $(elt).val(coord).select();
                }, function(error) {
                    utils.notifyWarn(sprintf('geolocation error: %s', error.message));
                }, {
                    enableHighAccuracy: false,
                    timeout: 60000,//1min
                    maximumAge: 300000,//5min
                });
            }).prependTo(tooltips);
    }
    return autocomplete.AbstractObject.prototype.autocomplete.call(this, elt);
};

autocomplete.dynamicAutocompleteTypes = {
    'addresses': new autocomplete.Place(['address']),
    'administrative_regions': new autocomplete.Place(['administrative_region']),
    'commercial_modes': new autocomplete.PtObject(['commercial_mode']),
    'coord': new autocomplete.Place(['address']),
    'forbidden_uris[]': new autocomplete.PtObject(),
    'allowed_id[]': new autocomplete.PtObject(),
    'lines': new autocomplete.PtObject(['line']),
    'networks': new autocomplete.PtObject(['network']),
    'places': new autocomplete.Place(),
    'pois': new autocomplete.Place(['poi']),
    'routes': new autocomplete.PtObject(['route']),
    'stop_areas': new autocomplete.Place(['stop_area']),
    'stop_points': new autocomplete.Place(['stop_point']),
    'from': new autocomplete.Place(),
    'to': new autocomplete.Place(),
};

autocomplete.dynamicAutocomplete = function (elt, dynamicType) {
    autocomplete.dynamicAutocompleteTypes[dynamicType].autocomplete(elt);
};

autocomplete._customAutocompleteHelper = function(input, source, customOptions) {
    if (source.length && source[0] instanceof Object) {
        source = source.sort(function(a, b) {
            if (a.value < b.value) { return -1; }
            if (a.value > b.value) { return 1; }
            return 0;
        });
    } else {
        source = source.sort();
    }
    var options = {
        close: function() { request.updateUrl($(input)[0]); },
        source: source,
        minLength: 0,
        scroll: true,
        delay: 0
    };
    if (customOptions) { $.extend(true, options, customOptions); }
    $(input).autocomplete(options).focus(function() {
        if ($(input).autocomplete('instance')) {
            $(this).autocomplete('search', '');
        }
    });
    if ($(input).is(':focus')) {
        $(input).focus();
    }
};

autocomplete._makeDatetime = function(elt) {
    $(elt).datetimepicker({
        dateFormat: 'yymmdd',
        timeFormat: 'HHmmss',
        timeInput: true,
        separator: 'T',
        controlType: 'select',
        oneLine: true,
    });
    if ($(elt).is(':focus')) {
        // we need to get the focus again to update the datepicker
        $(elt).focus();
    }
};

$(document).ready(function() {
    // We want to do whatever we want by hand!
    $.datepicker._doKeyPress = function () { return true; };
});
