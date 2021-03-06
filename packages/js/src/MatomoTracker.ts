import { defaultOptions, TRACK_TYPES } from './constants'
import {
  CustomDimension,
  TrackEventParams,
  TrackLinkParams,
  TrackPageViewParams,
  TrackParams,
  TrackSiteSearchParams,
  UserOptions,
} from './types'

class MatomoTracker {
  constructor(userOptions: UserOptions) {
    const options = { ...defaultOptions, ...userOptions }
    if (!options.urlBase) {
      throw new Error('Matomo urlBase is required.')
    }

    MatomoTracker.initialize(options)
  }

  // Initializes the Matomo Tracker
  static initialize({ urlBase, siteId, trackerUrl, srcUrl }: UserOptions) {
    if (urlBase[urlBase.length - 1] !== '/') {
      urlBase = urlBase + '/'
    }

    window._paq = window._paq || []

    if (window._paq.length === 0) {
      window._paq.push(['setTrackerUrl', trackerUrl || `${urlBase}matomo.php`])
      window._paq.push(['setSiteId', siteId])

      // accurately measure the time spent on the last pageview of a visit
      window._paq.push(['enableHeartBeatTimer'])
      // measure outbound links and downloads
      // might not work accurately on SPAs because new links (dom elements) are created dynamically without a server-side page reload.
      window._paq.push(['enableLinkTracking'])

      const doc = document
      const scriptElement = doc.createElement('script')
      const scripts = doc.getElementsByTagName('script')[0]

      scriptElement.type = 'text/javascript'
      scriptElement.async = true
      scriptElement.defer = true
      scriptElement.src = srcUrl || `${urlBase}matomo.js`

      if (scripts && scripts.parentNode) {
        scripts.parentNode.insertBefore(scriptElement, scripts)
      }
    }
  }

  // Tracks events based on data attributes
  trackEvents() {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-matomo-event="click"]'),
    )
    if (elements.length) {
      elements.forEach((element) => {
        element.addEventListener('click', () => {
          const {
            matomoCategory,
            matomoAction,
            matomoName,
            matomoValue,
          } = element.dataset
          if (matomoCategory && matomoAction) {
            this.trackEvent({
              category: matomoCategory,
              action: matomoAction,
              name: matomoName,
              value: Number(matomoValue),
            })
          } else {
            throw new Error(
              `Error: data-matomo-category and data-matomo-action are required.`,
            )
          }
        })
      })
    }
  }

  // Tracks events
  // https://matomo.org/docs/event-tracking/#tracking-events
  trackEvent({
    category,
    action,
    name,
    value,
    ...otherParams
  }: TrackEventParams) {
    if (category && action) {
      this.track({
        data: [TRACK_TYPES.TRACK_EVENT, category, action, name, value],
        ...otherParams,
      })
    } else {
      throw new Error(`Error: category and action are required.`)
    }
  }

  // Tracks site search
  // https://developer.matomo.org/guides/tracking-javascript-guide#internal-search-tracking
  trackSiteSearch({
    keyword,
    category,
    count,
    ...otherParams
  }: TrackSiteSearchParams) {
    if (keyword) {
      this.track({
        data: [TRACK_TYPES.TRACK_SEARCH, keyword, category, count],
        ...otherParams,
      })
    } else {
      throw new Error(`Error: keyword is required.`)
    }
  }

  // Tracks outgoing links to other sites and downloads
  // https://developer.matomo.org/guides/tracking-javascript-guide#enabling-download-outlink-tracking
  trackLink({ href, linkType = 'link' }: TrackLinkParams) {
    window._paq.push([TRACK_TYPES.TRACK_LINK, href, linkType])
  }

  // Tracks page views
  // https://developer.matomo.org/guides/spa-tracking#tracking-a-new-page-view
  trackPageView(params: TrackPageViewParams) {
    this.track({ data: [TRACK_TYPES.TRACK_VIEW], ...params })
  }

  // Sends the tracked page/view/search to Matomo
  track({
    data = [],
    documentTitle = window.document.title,
    href = window.location.href,
    customDimensions = false,
  }: TrackParams) {
    if (data.length) {
      if (
        customDimensions &&
        Array.isArray(customDimensions) &&
        customDimensions.length
      ) {
        customDimensions.map((customDimension: CustomDimension) =>
          window._paq.push([
            'setCustomDimension',
            customDimension.id,
            customDimension.value,
          ]),
        )
      }

      window._paq.push(['setCustomUrl', href])
      window._paq.push(['setDocumentTitle', documentTitle])
      window._paq.push(data)
    }
  }
}

export default MatomoTracker
