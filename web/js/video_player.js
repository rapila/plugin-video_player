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
    },
    togglePlay: function (iframe) {
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
    },
    togglePlay: function (iframe) {
    }
};
var Controller = /** @class */ (function () {
    function Controller() {
        this.domains = {};
        this.players = {};
        this.playlists = [];
        this.videolists = [];
        this.domains['www.youtube.com'] = YouTubeDomain;
        this.domains['www.youtube-nocookie.com'] = YouTubeDomain;
        this.domains['vimeo.com'] = VimeoDomain;
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
            this.playlists.push(new PlayList(playlist, player));
        }
        var videolistElements = Array.prototype.slice.call(document.querySelectorAll('.video_list'));
        for (var _b = 0, videolistElements_1 = videolistElements; _b < videolistElements_1.length; _b++) {
            var videolist = videolistElements_1[_b];
            this.videolists.push(new VideoList(videolist));
        }
    };
    Controller.prototype.domainFor = function (element) {
        if (!element.dataset.domain) {
            throw new Error('Domain missing in element');
        }
        if (!(element.dataset.domain in this.domains)) {
            throw new Error("Don\u2019t know how to handle domain " + element.dataset.domain);
        }
        return this.domains[element.dataset.domain];
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
    Player.prototype.togglePlay = function (link) {
        this.currentDomain.togglePlay(this.element);
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
    function PlayList(element, player) {
        var _this = this;
        this.element = element;
        this.player = player;
        this.links = Array.prototype.slice.call(element.querySelectorAll('a'));
        var _loop_1 = function (link) {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                _this.player.switchTo(link);
            });
        };
        for (var _i = 0, _a = this.links; _i < _a.length; _i++) {
            var link = _a[_i];
            _loop_1(link);
        }
    }
    return PlayList;
}());
var VideoList = /** @class */ (function () {
    function VideoList(element) {
        this.element = element;
        this.iframes = Array.prototype.slice.call(element.querySelectorAll('iframe'));
        var _loop_2 = function (iframe) {
            var player = this_1.iframes[iframe.dataset.playerId];
            iframe.addEventListener('click', function (event) {
                event.preventDefault();
                player.togglePlay(iframe);
            });
        };
        var this_1 = this;
        for (var _i = 0, _a = this.iframes; _i < _a.length; _i++) {
            var iframe = _a[_i];
            _loop_2(iframe);
        }
    }
    return VideoList;
}());
window.addEventListener('load', function () {
    var controller = new Controller();
    controller.init();
}, false);
