"use strict";
// Generate with `tsc`, watch with `tsc -w`
var YouTubeDomain = {
    switchVideo: function (iframe, id, timecode) {
        if (!iframe.contentWindow) {
            return;
        }
        iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'loadVideoById',
            args: [id, parseInt(timecode, 10)]
        }), '*');
    },
    seekTo: function (iframe, timecode) {
        if (!iframe.contentWindow) {
            return;
        }
        iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [parseInt(timecode, 10)]
        }), '*');
    }
};
var VimeoDomain = {
    switchVideo: function (iframe, id, timecode) {
        if (!iframe.contentWindow) {
            return;
        }
        iframe.contentWindow.postMessage({
            method: 'loadVideo',
            value: id
        }, iframe.src);
    },
    seekTo: function (iframe, timecode) {
        if (!iframe.contentWindow) {
            return;
        }
        iframe.contentWindow.postMessage({
            method: 'setCurrentTime',
            value: parseInt(timecode, 10)
        }, iframe.src);
    }
};
var Controller = /** @class */ (function () {
    function Controller() {
        this.domains = {
            'www.youtube.com': YouTubeDomain,
            'www.youtube-nocookie.com': YouTubeDomain,
            'vimeo.com': VimeoDomain,
        };
        this.players = {};
        this.playlists = [];
    }
    Controller.prototype.init = function () {
        var playerElements = Array.prototype.slice.call(document.querySelectorAll('iframe[data-player-id]'));
        for (var _i = 0, playerElements_1 = playerElements; _i < playerElements_1.length; _i++) {
            var player = playerElements_1[_i];
            var playerId = player.dataset.playerId;
            this.players[playerId] = new Player(player, playerId, this);
        }
        var playlistElements = Array.prototype.slice.call(document.querySelectorAll('.play_list[data-player-id]'));
        for (var _a = 0, playlistElements_1 = playlistElements; _a < playlistElements_1.length; _a++) {
            var playlist = playlistElements_1[_a];
            var player = this.players[playlist.dataset.playerId];
            if (!player) {
                console.error(new Error("Player with id " + playlist.dataset.playerId + " was not found"));
                continue;
            }
            this.playlists.push(new PlayList(playlist, player, this));
        }
    };
    Controller.prototype.domainFor = function (element) {
        var domain = element.dataset.domain;
        if (!domain) {
            throw new Error('Domain missing in element');
        }
        if (!(domain in this.domains)) {
            throw new Error("Don\u2019t know how to handle domain " + element.dataset.domain);
        }
        return this.domains[domain];
    };
    Controller.prototype.switchVideo = function (link, player, source) {
        player.switchTo(link);
        for (var _i = 0, _a = this.playlists; _i < _a.length; _i++) {
            var playlist = _a[_i];
            playlist.updateHighlight(playlist === source ? link : undefined);
        }
    };
    return Controller;
}());
var Player = /** @class */ (function () {
    function Player(element, playerId, controller) {
        this.element = element;
        this.playerId = playerId;
        this.controller = controller;
        this.currentDomain = controller.domainFor(element);
        this.currentVideoId = this.videoIdFor(element);
    }
    Player.prototype.switchTo = function (link) {
        var oldDomain = this.currentDomain;
        this.currentDomain = this.controller.domainFor(link);
        if (oldDomain !== this.currentDomain) {
            this.element.src = link.dataset.embedCode;
            return;
        }
        var time = link.dataset.time || '0';
        var oldVideoId = this.currentVideoId;
        this.currentVideoId = this.videoIdFor(link);
        if (oldVideoId !== this.currentVideoId) {
            this.currentDomain.switchVideo(this.element, this.currentVideoId, time);
            return;
        }
        this.currentDomain.seekTo(this.element, time);
    };
    Player.prototype.videoIdFor = function (element) {
        if (!element.dataset.videoId) {
            throw new Error('Video ID missing in element');
        }
        return element.dataset.videoId;
    };
    return Player;
}());
var PlayList = /** @class */ (function () {
    function PlayList(element, player, contoller) {
        var _this = this;
        this.element = element;
        this.player = player;
        this.contoller = contoller;
        this.links = Array.prototype.slice.call(element.querySelectorAll('a'));
        var _loop_1 = function (link) {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                _this.contoller.switchVideo(link, _this.player, _this);
            });
        };
        for (var _i = 0, _a = this.links; _i < _a.length; _i++) {
            var link = _a[_i];
            _loop_1(link);
        }
    }
    PlayList.prototype.updateHighlight = function (link) {
        this.links
            .filter(function (ln) { return link !== ln; })
            .forEach(function (ln) {
            ln.classList.remove('is_active');
        });
        if (link) {
            link.classList.add('is_active');
        }
    };
    return PlayList;
}());
window.addEventListener('load', function () {
    var controller = new Controller();
    controller.init();
}, false);
