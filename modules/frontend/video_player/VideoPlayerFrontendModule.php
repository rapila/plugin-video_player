<?php
class VideoPlayerFrontendModule extends FrontendModule {

	
	public static $DISPLAY_MODES = array('player', 'play_list', 'player_with_play_list', 'video_list');
	
	public $aAcceptedProviders = array();
		
	const MODE_SELECT_KEY = 'display_mode';
	
	const PLAYER_ID_PREFIX = 'player_id_';

	public static function acceptedProviders() {
		return Settings::getSetting('video_player', 'domains', array());;
	}
	
	public function cachedFrontend($bIsPreview = false) {
		ResourceIncluder::defaultIncluder()->addResource('video_player.js');
		return parent::cachedFrontend($bIsPreview);
	}

	public function renderFrontend() {
		$this->aPlayerProviders = Settings::getSetting('video_player', 'domains', array());
		$aOptions = $this->widgetData();

		if(!isset($aOptions[self::MODE_SELECT_KEY])) {
			return null;
		}
		switch($aOptions[self::MODE_SELECT_KEY]) {
			case 'player':
				return $this->renderPlayer($aOptions['link_id'], $aOptions['link_category_id'], $aOptions['sort_field']);
			case 'player_with_play_list':
				return $this->renderPlayerWithPlayList($aOptions['link_id'], $aOptions['link_category_id'], $aOptions['sort_field']);
			case 'play_list':
				return $this->renderPlayList($aOptions['link_id'], $aOptions['link_category_id'], $aOptions['sort_field']);
			case 'video_list':
				return $this->renderVideoList($aOptions['link_category_id'], $aOptions['sort_field']);
		}
	}

	private static function getLinkOrFirstInList($iLinkId, $iLinkCategoryId, $sSortField) {
		// Link when its given
		$oLink = LinkQuery::create()->findPk($iLinkId);
		// Get first link, dynamically, better if list and sort by are changed by configuration
		if($oLink === null) {
			$oLink = self::getLinksQuery($iLinkCategoryId, $sSortField)->findOne();
		}
		if($oLink) {
			return $oLink;
		}
	}

	public function renderPlayer($iLinkId, $iLinkCategoryId, $sSortField) {
		$oLink = self::getLinkOrFirstInList($iLinkId, $iLinkCategoryId, $sSortField);
		if(!$oLink) {
			return;
		}
		$oPlayerTemplate = $this->constructTemplate('player');
		$this->renderPlayerContent($oLink, $oPlayerTemplate);
		return $oPlayerTemplate;
	}

	public function renderPlayerContent($oLink, $oTemplate) {
		$oTemplate->replaceIdentifier('title', $oLink->getName());
		$oTemplate->replaceIdentifier('player_id', self::PLAYER_ID_PREFIX.$oLink->getId());
		$sDomain = self::domainFromUrl($oLink->getUrl());
		$oTemplate->replaceIdentifier('domain', $sDomain);		
		$oTemplate->replaceIdentifier('src', self::embedCodeFromUrl($oLink->getUrl(), $sDomain));
		$oTemplate->replaceIdentifier('video_id', self::videoIdFromUrl($oLink->getUrl(), $sDomain));
	}

	// playlist is normally used together with a player already filled
	public function renderPlaylist($iLinkId, $iLinkCategoryId, $sSortField) {
		$oLink = self::getLinkOrFirstInList($iLinkId, $iLinkCategoryId, $sSortField);

		$oPlayListTemplate = $this->constructTemplate('play_list');
		$oItemPrototype = $this->constructTemplate('play_list_item');
		$aLinks = self::getLinksQuery($iLinkCategoryId, $sSortField)->find();
		$iActivLinkId = $oLink ? $oLink->getId() : null;
		foreach($aLinks as $i => $oLink) {
			if($iActivLinkId === null && $i === 0) {
				$iActivLinkId = $oLink->getId();
			}
			if($i === 0) {
				$oPlayListTemplate->replaceIdentifier('player_id',  self::PLAYER_ID_PREFIX.$iActivLinkId);
			}
			$oItemTemplate = clone $oItemPrototype;
			$sUrlWithoutScheme = preg_replace('#^https?://#', '', rtrim($oLink->getUrl(),'/'));
			$oItemTemplate->replaceIdentifier('href', '//'.$sUrlWithoutScheme);
			$oItemTemplate->replaceIdentifier('name', $oLink->getName());
			$sDomain = self::domainFromUrl($oLink->getUrl());
			$oItemTemplate->replaceIdentifier('domain', $sDomain);
			$oItemTemplate->replaceIdentifier('embed_code', self::embedCodeFromUrl($oLink->getUrl(), $sDomain));
			$oItemTemplate->replaceIdentifier('is_in_player', $iActivLinkId === $oLink->getId());
			$oItemTemplate->replaceIdentifier('time', self::timeFromUrl($oLink->getUrl(), $sDomain));
			$oItemTemplate->replaceIdentifier('video_id', self::videoIdFromUrl($oLink->getUrl(), $sDomain));

			$oPlayListTemplate->replaceIdentifierMultiple('items', $oItemTemplate);
			$i++;
		}
		return $oPlayListTemplate;
	}

	public function renderPlayerWithPlayList($iLinkId, $iLinkCategoryId, $sSortByAsc) {
		$oLink = self::getLinkOrFirstInList($iLinkId, $iLinkCategoryId, $sSortField);
		if(!$oLink) {
			return;
		}
		$oPlayerWithListTemplate = $this->constructTemplate('player_with_play_list');
		$this->renderPlayerContent($oLink, $oPlayerWithListTemplate);
		$oPlayerWithListTemplate->replaceIdentifier('play_list', $this->renderPlaylist($iLinkId, $iLinkCategoryId, $sSortByAsc));
		return $oPlayerWithListTemplate;
	}

	public function renderVideoList($iLinkCategoryId, $sSortField) {
		$oLinks = self::getLinksQuery($iLinkCategoryId, $sSortField)->find();
		$oListTemplate = $this->constructTemplate('list');
		if(count($oLinks) === 0) {
			if($oListTemplate->hasIdentifier('no_result_message')) {
				$oListTemplate->replaceIdentifier('no_result_message', 'Uups, kein Video gefunden!');
				return $oListTemplate;
			}
			return null;
		}
		$oItemPrototype = $this->constructTemplate('list_item');
		foreach($oLinks as $i => $oLink) {
			$oItemTemplate = clone $oItemPrototype;

			$sDomain = self::domainFromUrl($oLink->getUrl());
			$sEmbedCode = self::embedCodeFromUrl($oLink->getUrl(), $sDomain);
			$oItemTemplate->replaceIdentifier('src', $sEmbedCode);
			$oItemTemplate->replaceIdentifier('embed_code', $sEmbedCode);
			$oItemTemplate->replaceIdentifier('domain', $sDomain);
			$oItemTemplate->replaceIdentifier('video_id', self::videoIdFromUrl($oLink->getUrl(), $sDomain));

			$oListTemplate->replaceIdentifierMultiple('items', $oItemTemplate);
		}
		return $oListTemplate;
	}

	public static function getLinksQuery($iLinkCategoryId, $sSortField='sort') {
		$oQuery = LinkQuery::create()->filterByLinkCategoryId($iLinkCategoryId);
		self::filterbyAcceptedProviders($oQuery);
		if($sSortField == null) {
			$sSortField = 'sort';
		}
		$sSortBy = StringUtil::camelize("order_by_$sSortField");
		$oQuery->$sSortBy('asc');
		return $oQuery;
	}

	public static function filterbyAcceptedProviders($oQuery) {
		foreach(VideoPlayerFrontendModule::acceptedProviders() as $i => $sDomain) {
			if($i === 0) {
				$oQuery->filterByUrl("%$sDomain%", Criteria::LIKE);
			} else {
				$oQuery->_or()->filterByUrl("%$sDomain%", Criteria::LIKE);
			}
		}
	}

	// extract domain from url
	public static function domainFromUrl($sUrl) {
		$aResult = parse_url($sUrl);
		return $aResult['host'];
		// $aNames = explode(".", $aResult['host']);
		// // add 'dummy' subdomain if not exists for easy processing
		// if(count($aNames) < 3) {
		// 	array_unshift($aNames, "www");
		// }
		// return $aNames[count($aNames)-2] . "." . $aNames[count($aNames)-1];
	}

	// extract video id from url
	public static function videoIdFromUrl($sVideoUrl, $sDomain=null) {
		$sVideoId = '';
		$aMatches = array();
		// consider domain first?
		if(preg_match('%(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/ ]{11})%i', $sVideoUrl, $aMatches)) {
			$sVideoId = $aMatches[1];
		} elseif (preg_match('%^https?:\/\/(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)(?:[?]?.*)$%im', $sVideoUrl, $aMatches)) {
			$sVideoId = $aMatches[3];
		}
		return $sVideoId;
	}

	// extract time from url
	public static function timeFromUrl($sVideoUrl, $sDomain) {
		// make sure formats like t=1m15s are converted into t=75s
		if(preg_match_all('/t=(.*?)$/', $sVideoUrl, $aMatches)){
			return $aMatches[1][0];
		}
		return '';
	}

	// prepare embed code for domain
	public static function embedCodeFromUrl($sUrl, $sDomain) {
		// handle required player parameter per domain
		$aParams = array();
		if(strpos($sDomain, 'youtube.com')) {
			$aParams = array('enablejsapi'=> '1', 'rel' => '0');
		}
		$sEmbedLink = self::ensureEmbedLink($sUrl, $sDomain);
		if(count($aParams) > 0) {
			return self::completeQueryParameters($sEmbedLink, $aParams);
		}
		return $sEmbedLink;
	}

	// always make an embed link (youtube, others need to be implemented)
	public static function ensureEmbedLink($sUrl, $sDomain = null) {
		$sEmbedIdentifier = '';
		if($sDomain === 'www.youtube.com') {
			$sEmbedIdentifier='embed';
		} else if($sDomain === 'vimeo.com') {
			$sEmbedIdentifier='video';
			$sDomain = "player.$sDomain";
		}
		if(strpos($sUrl, $sEmbedIdentifier)) {
			return $sUrl;
		}
		$iVideoId = self::videoIdFromUrl($sUrl, $sDomain);
		return "//$sDomain/$sEmbedIdentifier/$iVideoId";
	}

	// overwrite write domain specific query params if necessary
	public static function completeQueryParameters($sUrl, $aOverrideParameters = array()) {
		$aParts = explode('?', $sUrl);
		if(!isset($aParts[1])) {
			$sDomainPath = $sUrl;
		} else {
			$sDomainPath = $aParts[0];
		}
		$sQuery = parse_url($sUrl, PHP_URL_QUERY);
		parse_str($sQuery, $aParams);
		foreach($aParams as $sName => $sValue) {
			if(!isset($aOverrideParameters[$sName])) {
				$aOverrideParameters[$sName] = $sValue;
			}
		}
		return $sDomainPath.LinkUtil::prepareLinkParameters($aOverrideParameters);
	}

	public function getSaveData($mData) {
		ReferencePeer::removeReferences($this->oLanguageObject);
		if(isset($mData['link_id']) && $mData['link_id'] != null) {
			$oLink = LinkQuery::create()->findPk($mData['link_id']);
			ReferencePeer::addReference($this->oLanguageObject, $oLink);
		}
		return parent::getSaveData($mData);
	}
}