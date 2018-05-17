<?php
class VideoPlayerFrontendConfigWidgetModule extends FrontendConfigWidgetModule {

	public function getDisplayModes() {
		$aResult = array();

		// Display modes
		$aResult['display_modes'] = array();
		foreach(VideoPlayerFrontendModule::$DISPLAY_MODES as $sDisplayMode) {
			$aResult['display_modes'][$sDisplayMode] = TranslationPeer::getString('video_player.display_option.'.$sDisplayMode, null, StringUtil::makeReadableName($sDisplayMode));
		}

		// Sort fields
		$aResult['sort_fields'] = array();
		foreach(array('name', 'sort') as $sName) {
			$aResult['sort_fields'][$sName] = ucfirst($sName);
		}

		// Link Categories
		$aVideoLinkCategories = LinkCategoryQuery::create()->orderByName()->select(array('Id', 'Name'))->find()->toArray();
		$aResult['video_link_categories'] = array();
		foreach($aVideoLinkCategories as $aLinkCategory) {
			$aResult['video_link_categories'][$aLinkCategory['Id']] = $aLinkCategory['Name'];
		}
		return $aResult;
	}

	public function getLinkOptions($sLinkCategoryId, $sSortField) {
		$oQuery = VideoPlayerFrontendModule::getLinksQuery($sLinkCategoryId, $sSortField);
		$oQuery->select(array('Id', 'Name'));
		return WidgetJsonFileModule::jsonOrderedObject($oQuery->find()->toKeyValue('Id', 'Name'));
	}

	public function relatedLinks($iLinkCategoryId, $sSortBy = 'sort') {
		if($iLinkCategoryId == null) {
			return array();
		}
		$oQuery = VideoPlayerFrontendModule::getLinksQuery($iLinkCategoryId, $sSortBy);
		return $oQuery->select(array('Id', 'Name'))->find();
	}

	public function renderPreview($aPostData) {
		$oLink = LinkQuery::create()->findPk($aPostData['link_id']);
		if(!$oLink) {
			return '';
		}
		// TODO: make sure $sSource handled different apis (youtube, vimeo, ?)
		$sSource = VideoPlayerFrontendModule::completeQueryParameters(VideoPlayerFrontendModule::ensureEmbedLink($oLink->getUrl(), VideoPlayerFrontendModule::domainFromUrl($oLink->getUrl())));
		$oHtmlTmpl = $this->constructTemplate('html');
		$oHtmlTmpl->replaceIdentifier('src', $sSource);
		return $oHtmlTmpl->render();
	}

}