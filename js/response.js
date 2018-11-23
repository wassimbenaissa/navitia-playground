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
var summary;
var extended;
var map;
var storage;
var autocomplete;
var utils;
var request;

var response = {};

response.setStatus = function(message, status, start_time) {
    var res = $('<span/>').text('Status: ').append(message);
    res.append(utils.htmlEncode(sprintf(' (%s)', status)));
    if (typeof start_time === 'number') {
        var duration = new Date().getTime() - start_time;
        res.append(sprintf(', display duration: %dms', duration));
    }
    $('#status').html(res);
};

response.responseCollectionName = function(json) {
    if (! (json instanceof Object)) { return null; }
    var key = null;
    var notCollectionKeys = ['disruptions', 'links', 'feed_publishers', 'exceptions', 'notes', 'warnings', 'tickets'];
    for (var k in json) {
        if ($.isArray(json[k]) &&
            $.inArray(k, notCollectionKeys) === -1) {
            key = k;
        }
    }
    // disruptions may be an object list only if there is no other object list
    if (key === null && 'disruptions' in json) {
        key = 'disruptions';
    }
    return key;
};

response.makeObjectButton = function(name, handle) {
    // TODO call handle on toggle
    return $('<label>')
        .addClass('objectButton')
        .append($('<input type="checkbox">').change(handle))
        .append($('<span>').html(name));
};

response.makeObjectButtonHandle = function(selector, renderHandle) {
    return function() {
        var div = $(this).closest('div.object').children('div.data').children(selector);
        if ($(this).is(':checked')) {
            div.hide();
            div.html(renderHandle());
            div.slideDown(600);
            if (! $(this).hasClass('noAnimation')) {
                $('html, body').animate({ scrollTop: div.offset().top }, 600);
            }
        } else {
            div.slideUp(600, function() {
                div.children().trigger('npg:remove');
                div.empty();
            });
        }
    };
};

response.render = function(context, json, type, key, idx) {
    var name = key;
    if (typeof idx === 'number') { name += sprintf('[%s]', idx); }
    name = context.makeLink(key, json, name);

    var head = $('<div class="head">');
    head.append($('<div class="name">').html(name));
    head.append($('<div class="summary">').html(summary.run(context, type, json)));
    var button = $('<div class="button">');
    if (extended.hasExtended(context, type, json)) {
        button.append(
            response.makeObjectButton(
                'Ext',
                response.makeObjectButtonHandle('div.extended', function() {
                    return extended.run(context, type, json);
                })
            )
        );
    }
    if (map.hasMap(context, type, json)) {
        button.append(
            response.makeObjectButton(
                'Map',
                response.makeObjectButtonHandle('div.map', function() {
                    return map.run(context, type, json);
                })
            )
        );
    }
    button.append(
        response.makeObjectButton(
            '{ }',
            response.makeObjectButtonHandle('div.code', function() {
                return renderjson(json);
            })
        )
    );
    head.append(button);

    var data = $('<div class="data">')
        .append($('<div class="extended">').hide())
        .append($('<div class="map">').hide())
        .append($('<div class="code">').hide());

    var result = $('<div class="object">');
    result.append(head);
    result.append(data);
    return result;
};

response.Context = function(data) {
    // the token, used to create links
    var token = URI(window.location).search(true).token;

    // the regex corresponding to the thing that should be replacced
    // in a templated link
    var templateRegex = /\{.*\.id\}/;

    // the link map: type -> template
    this.links = {};
    if (data instanceof Object && 'links' in data && $.isArray(data.links)) {
        var self = this;
        data.links.forEach(function(link) {
            if (! link.templated) { return; }
            if (link.type === 'related') { return; }
            if (! link.href.match(templateRegex)) { return; }
            self.links[utils.getType(link.type)] = link.href;
        });
    }

    this.makeHref = function(href) {
        var res = sprintf('?request=%s', encodeURIComponent(href));
        if (token) {
            res += sprintf('&token=%s', encodeURIComponent(token));
        }
        return res;
    };

    this.makeLink = function(k, obj, name) {
        var key = utils.getType(k);
        if (typeof name === 'string') { name = utils.htmlEncode(name); }
        if (! (key in this.links) || ! ('id' in obj)) {
            return $('<span/>').html(name);
        }
        var href = this.links[key].replace(templateRegex, obj.id);
        return $('<a>').attr('href', this.makeHref(href)).html(name);
    };

    var minDurationColor = {};
    if (data instanceof Object && 'isochrones' in data && $.isArray(data.isochrones)) {
        var min_duration = data.isochrones.map(function(isochrone) { return isochrone.min_duration; });
        var max_isochrone = data.isochrones.length;
        var scale = max_isochrone > 1 ? max_isochrone - 1 : 1;
        for (var i = 0; i < max_isochrone; i ++) {
            var ratio = i / scale;
            minDurationColor[min_duration[i]] = utils.computeColorFromRatio(ratio);
        }
    }
    this.getColorFromMinDuration = function(minDuration, alpha) {
        var color = minDurationColor[minDuration] || {red: 0, green: 0, blue: 0};
        return utils.toCssColor(color, alpha);
    };

    this.followInternalLink = function(link) {
        if (link.internal !== true) { return null; }
        if (!(link.rel in data)) { return null; }
        var index = data[link.rel].findIndex(function(elt) { return elt.id === link.id; });
        if (index === -1) { return null; }
        return {
            path: sprintf('response.%s[%i]', link.rel, index),
            obj: data[link.rel][index],
        };
    };
};

response.manageFile = function() {
    function readSingleFile(event) {
        event.preventDefault();
        event.stopPropagation();
        var files = event.target.files || event.originalEvent.dataTransfer.files;
        if (!files || !files[0]) { return; }
        var file = files[0];
        var reader = new FileReader();
        reader.onload = function(event) {
            try {
                var data = JSON.parse(event.target.result);
                $('#status').text(sprintf('Status: file "%s" loaded', file.name));
                $('#data').html(response.render(new response.Context(data), data, 'response', 'response'));
                $('#data input').first().click();
            } catch (e) {
                $('#status').text(
                    sprintf('Status: error while loading file "%s": %s', file.name, e)
                );
            }
        };
        reader.readAsText(file);
        $('#file-input').val(null);// be sure to have next change
    }

    $('#file-input').change(readSingleFile);
    $(document)
        .on('dragover', false)
        .on('dragleave', false)
        .on('drop', readSingleFile);
};

response.manageUrl = function() {
    var req = request.parseUrl();
    if (req === null) {
        $('#status').html('Status: no request');
        return;
    }
    var start_time = new Date().getTime();
    $.ajax({
        headers: utils.manageToken(req.token),
        url: req.request,
        dataType: 'json',
    }).then(
        function(data, status, xhr) {
            response.setStatus(xhr.statusText, xhr.status, start_time);
            $('#data').html(response.render(new response.Context(data), data, 'response', 'response'));
            $('#data input').first().addClass('noAnimation');
            $('#data input').first().click();
            $('html, body').animate({ scrollTop: $('#response').offset().top }, 600);
            if (! storage.getToken(req.api)) {
                storage.saveToken(req.api, req.token);
            }
            // update the drop list of autocompletion for API
            autocomplete.apiAutocomplete();
        },
        function(xhr, status, error) {
            response.setStatus(utils.errorMessage(req.request, xhr, status, error),
                               xhr.status,
                               start_time);
            $('#data').html(response.render(new response.Context(xhr.responseJSON), xhr.responseJSON, 'response', 'response'));
            $('#data input').last().click();
            utils.notifyOnError('Response', req.request, xhr, status, error);
        }
    );
};

// renderjson config
$(document).ready(function() {
    renderjson.set_show_to_level(1);
    renderjson.set_max_string_length(60);
    renderjson.set_sort_objects(true);
});
