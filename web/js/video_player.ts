interface Domain {
	switchVideo(iframe : HTMLIFrameElement, id : string, timecode : string) : void;
	seekTo(iframe : HTMLIFrameElement, timecode : string) : void;
}

const YouTubeDomain : Domain = {
	switchVideo(iframe, id, timecode) {
		if(!iframe.contentWindow) {
			return;
		}
		iframe.contentWindow.postMessage(JSON.stringify({
			event: 'command',
			func: 'loadVideoById',
			args: [id, parseInt(timecode, 10)]
		}), '*');
	},
	seekTo(iframe, timecode) {
		if(!iframe.contentWindow) {
			return;
		}
		iframe.contentWindow.postMessage(JSON.stringify({
			event: 'command',
			func: 'seekTo',
			args: [parseInt(timecode, 10)]
		}), '*');
	}
};

const VimeoDomain : Domain = {
	switchVideo(iframe, id, timecode) {
		if(!iframe.contentWindow) {
			return;
		}
		iframe.contentWindow.postMessage({
			method: 'loadVideo',
			value: id
		}, iframe.src);
	},
	seekTo(iframe, timecode) {
		if(!iframe.contentWindow) {
			return;
		}
		iframe.contentWindow.postMessage({
			method: 'setCurrentTime',
			value: parseInt(timecode, 10)
		}, iframe.src);
	}
};

class Controller {
	private domains : {
		[domain : string] : Domain
	} = {};

	private players : {
		[playerId : string] : Player
	} = {};

	private playlists : PlayList[] = [];

	constructor() {
		this.domains['www.youtube.com'] = YouTubeDomain;
		this.domains['www.youtube-nocookie.com'] = YouTubeDomain;
		this.domains['vimeo.com'] = VimeoDomain;
	}

	public init() {
		const playerElements = Array.prototype.slice.call(document.querySelectorAll('iframe[data-player-id]'));
		for(const player of playerElements) {
			const playerId = player.dataset.playerId as string;
			this.players[playerId] = new Player(player, playerId, this);
		}
	
		const playlistElements = Array.prototype.slice.call(document.querySelectorAll('.play_list[data-player-id]'));
		for(const playlist of playlistElements) {
			const player = this.players[playlist.dataset.playerId];
			if(!player) {
				console.error(new Error(`Player with id ${playlist.dataset.playerId} was not found`));
				continue;
			}
			this.playlists.push(new PlayList(playlist, player));
		}
	}

	public domainFor(element : HTMLAnchorElement | HTMLIFrameElement) {
		if(!element.dataset.domain) {
			throw new Error('Domain missing in element');
		}
		if(!(element.dataset.domain in this.domains)) {
			throw new Error(`Don’t know how to handle domain ${element.dataset.domain}`);
		}
		return this.domains[element.dataset.domain];
	}
}

class Player {
	private currentDomain : Domain;
	private currentVideoId : string;

	constructor(
		private element : HTMLIFrameElement,
		private playerId : string,
		private controller : Controller
	) {
		this.currentDomain = controller.domainFor(element);
		this.currentVideoId = this.videoIdFor(element);
	}

	public switchTo(link : HTMLAnchorElement) {
		const oldDomain = this.currentDomain;
		this.currentDomain = this.controller.domainFor(link);
		if(oldDomain !== this.currentDomain) {
			this.element.src = link.dataset.embedCode as string;
			return;
		}
		const time = link.dataset.time || '0';
		const oldVideoId = this.currentVideoId;
		this.currentVideoId = this.videoIdFor(link);
		if(oldVideoId !== this.currentVideoId) {
			this.currentDomain.switchVideo(this.element, this.currentVideoId, time);
			return;
		}
		this.currentDomain.seekTo(this.element, time);
	}

	private videoIdFor(element : HTMLAnchorElement | HTMLIFrameElement) {
		if(!element.dataset.videoId) {
			throw new Error('Video ID missing in element');
		}
		return element.dataset.videoId;

	}
}

class PlayList {
	private links : HTMLAnchorElement[];

	constructor(private element : HTMLElement, private player : Player) {
		this.links = Array.prototype.slice.call(element.querySelectorAll('a'));
		for(const link of this.links) {
			link.addEventListener('click', event => {
				event.preventDefault();
				this.player.switchTo(link);
			});
		}
	}
}

window.addEventListener('load', () => {
	const controller = new Controller();
	controller.init();
}, false);
