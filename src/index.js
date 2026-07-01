import { defineScrollableComponent, isScrollableComponentDefined, whenScrollableComponentDefined } from 'scrollable-component';
import { getEmojisGroupedBy } from 'unicode-emoji';
import { TABS } from './tabs';

const defaultVersion = '12.0';
const defaultTag = 'unicode-emoji-picker';
const defaultTabKey = 'face-emotion';

const emojiPickerTemplate = document.createElement('template');
emojiPickerTemplate.innerHTML = '<style>{{index.css}}</style>{{emoji-picker.html}}';

const emojiTabTemplate = document.createElement('template');
emojiTabTemplate.innerHTML = '{{emoji-tab.html}}';

const emojiTemplate = document.createElement('template');
emojiTemplate.innerHTML = '{{emoji.html}}';

const emojiWithVariationsTemplate = document.createElement('template');
emojiWithVariationsTemplate.innerHTML = '{{emoji-with-variations.html}}';

const emojiVariationTemplate = document.createElement('template');
emojiVariationTemplate.innerHTML = '{{emoji-variation.html}}';

export class EmojiPickerElement extends HTMLElement {

  static observedAttributes = ['version', 'disable-variations'];

  #tabs = new Map(TABS);

  #selectedTabKey = null;
  #emojis = null;
  #activeBaseEmoji = null;
  #baseEmojiVariationsGap = 4;
  #scrollToEmojiViewportMargin = 4;
  #tabElements = new Map();
  #baseEmojiElements = new Map();
  #baseEmojiVariationsElements = new Map();
  #renderFrameRequestId = null;
  #variationsDisabled = false;
  #isConnected = false;

  #tabsElement;
  #contentElement;
  #emojisElement;
  #backdropElement;
  #titleElement;
  #searchInputElement;
  #firstEmojiElement;
  #intersectionObserver;

  get selectedTab() {
    return this.#selectedTabKey;
  }

  constructor() {
    super();
    this.#buildComponent();
  }

  connectedCallback() {
    if (!this.hasAttribute('version')) {
      this.setAttribute('version', defaultVersion);
    }

    this.#buildEmojis();
    this.#isConnected = true;

    if (this.hasAttribute('default-tab')) {
      this.selectTab(this.getAttribute('default-tab'));
    }
    else {
      this.selectTab('face-emotion');
    }
  }

  disconnectedCallback() {
    this.#intersectionObserver.disconnect();
  }

  attributeChangedCallback(attributeName, oldValue, newValue) {
    if (attributeName === 'version') {
      this.#emojis = getEmojisGroupedBy('category', { versionAbove: newValue ?? defaultVersion });
    }
    else if (attributeName === 'disable-variations') {
      this.#variationsDisabled = newValue === 'true';
    }
    if (this.#isConnected) {
      this.#buildEmojis();
    }
  }

  #buildComponent() {
    const emojiPickerContent = emojiPickerTemplate.content.cloneNode(true);
    const emojiPickerElement = emojiPickerContent.querySelector('.emoji-picker');

    this.#buildEmojiTabs(emojiPickerElement);
    this.#buildTitleBar(emojiPickerElement);
    this.#buildContent(emojiPickerElement);

    this.attachShadow({mode: 'open'});
    this.shadowRoot.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.#closeVariationsPanel();
      }
    }, { passive: true });
    this.shadowRoot.appendChild(emojiPickerContent);
  }

  #buildTitleBar(emojiPickerElement) {
    const emojiTitleBarElement = emojiPickerElement.querySelector('.title-bar');
    this.#titleElement = emojiTitleBarElement.querySelector('.title');
    this.#searchInputElement = emojiTitleBarElement.querySelector('.search-input');
    this.#searchInputElement.placeholder = 'Search an Emoji...';
    this.#searchInputElement.addEventListener('input', () => {
      this.#searchEmoji(this.#searchInputElement.value);
    }, { passive: true });
  }

  #buildEmojiTabs(emojiPickerElement) {
    this.#tabsElement = emojiPickerElement.querySelector('.tabs');
    const tabElements = [];
    for (const [tabKey, tab] of this.#tabs) {
      const tabContent = emojiTabTemplate.content.cloneNode(true);
      const tabElement = tabContent.querySelector('.tab');
      this.#tabElements.set(tabKey, tabElement);
      const tabButton = tabContent.querySelector('button');
      tabButton.innerHTML = tab.emoji;
      tabButton.setAttribute('title', tab.title);
      tabButton.addEventListener('click', () => {
        this.selectTab(tabKey);
      }, { passive: true });
      tabElements.push(tabElement);
    }
    this.#tabsElement.replaceChildren(...tabElements);
  }

  #buildContent(emojiPickerElement) {
    this.#contentElement = emojiPickerElement.querySelector('.content');
    this.#emojisElement = this.#contentElement.querySelector('.emojis');
    this.#backdropElement = this.#contentElement.querySelector('.backdrop');
    this.#intersectionObserver = new IntersectionObserver((entries) => {
      this.#load(entries);
    }, {
      root: this.#contentElement,
      thresholds: [0],
      rootMargin: '80px',
    });
  }

  #buildEmojis() {
    this.#closeVariationsPanel();
    this.#baseEmojiElements = new Map();
    this.#baseEmojiVariationsElements = new Map();

    const emojiElements = [];
    for (const [tabKey, tab] of this.#tabs) {
      if (tabKey !== 'search') {
        for (const baseEmoji of this.#emojis[tabKey]) {
          emojiElements.push(this.#buildBaseEmoji(baseEmoji));
        }
      }
    }
    this.#emojisElement.replaceChildren(...emojiElements);
    if (this.#selectedTabKey) {
      this.#reloadSelectedTab();
    }
  }

  #buildBaseEmoji(baseEmoji) {
    const baseEmojiTemplate = baseEmoji.variations && !this.#variationsDisabled ? emojiWithVariationsTemplate : emojiTemplate;
    const baseEmojiContent = baseEmojiTemplate.content.cloneNode(true);
    const baseEmojiElement = baseEmojiContent.querySelector('.emoji');
    this.#baseEmojiElements.set(baseEmoji, baseEmojiElement);
    baseEmojiElement.addEventListener('focusout', (event) => {
      if (this.#activeBaseEmoji) {
        const activeBaseEmojiElement = this.#baseEmojiElements.get(this.#activeBaseEmoji);
        if ((!event.relatedTarget || !activeBaseEmojiElement.contains(event.relatedTarget))) {
          this.#closeVariationsPanel();
        }
      }
    }, { passive: true });
    const baseEmojiButton = baseEmojiContent.querySelector('button');
    baseEmojiButton.innerHTML = baseEmoji.emoji;
    baseEmojiButton.setAttribute('title', baseEmoji.description);
    baseEmojiButton.addEventListener('click', () => {
      this.#selectBaseEmoji(baseEmoji);
    }, { passive: true });
    baseEmojiButton.addEventListener('focus', () => {
      this.#scrollToEmoji(baseEmojiElement);
    }, { passive: true });

    if (baseEmoji.variations && !this.#variationsDisabled) {
      const emojiVariationsElement = baseEmojiContent.querySelector('.variations');
      this.#baseEmojiVariationsElements.set(baseEmoji, emojiVariationsElement);
      // Include base emoji when building variations panel
      const emojiVariationElements = [];
      for (const emojiVariation of [baseEmoji, ...baseEmoji.variations]) {
        // Add `base` attribute so that when we emit the "emoji-pick" event, when know the associated base emoji
        if (emojiVariation !== baseEmoji) {
          emojiVariation.base = baseEmoji;
        }
        emojiVariationElements.push(this.#buildEmojiVariation(baseEmojiElement, emojiVariation));
      }
      emojiVariationsElement.replaceChildren(...emojiVariationElements);
    }

    return baseEmojiContent;
  }

  #buildEmojiVariation(baseEmojiElement, emojiVariation) {
    const emojiVariationContent = emojiVariationTemplate.content.cloneNode(true);
    const emojiVariationElement = emojiVariationContent.querySelector('.emoji');
    const emojiVariationButton = emojiVariationContent.querySelector('button');
    emojiVariationButton.innerHTML = emojiVariation.emoji;
    emojiVariationButton.setAttribute('title', emojiVariation.description);
    emojiVariationButton.addEventListener('click', () => {
      this.#selectEmoji(emojiVariation);
    }, { passive: true });
    emojiVariationButton.addEventListener('focus', () => {
      this.#scrollToEmoji(baseEmojiElement, emojiVariationElement);
    }, { passive: true });
    return emojiVariationContent;
  }


  setTranslation(translation) {
    if (translation.search && translation.search.inputPlaceholder) {
      this.#searchInputElement.placeholder = translation.search.inputPlaceholder;
    }
    for (const [tabKey, tab] of this.#tabs) {
      if (translation[tabKey]) {
        const tabElement = this.#tabElements.get(tabKey);
        if (translation[tabKey].emoji) {
          tab.emoji = translation[tabKey].emoji;
          tabElement.querySelector('button').innerHTML = tab.emoji;
        }
        if (translation[tabKey].title) {
          tab.title = translation[tabKey].title;
          tabElement.querySelector('button').setAttribute('title', tab.title);
        }
      }
    }
    if (this.#selectedTabKey) {
      this.#titleElement.innerHTML = this.#tabs.get(this.#selectedTabKey).title;
    }
  }

  selectTab(tabKey) {
    this.#resetViewport();
    this.#updateTabsAndTitle(tabKey);
    if (tabKey === 'search') {
      this.#searchInputElement.focus();
      this.#clearSearch();
    }
    else if (tabKey !== this.#selectedTabKey) {
      this.#updateEmojis(tabKey);
    }
    this.#selectedTabKey = tabKey;
  }

  #reloadSelectedTab() {
    this.#resetViewport();
    if (this.#selectedTabKey === 'search') {
      this.#searchEmoji(this.#searchInputElement.value);
    }
    else {
      this.#updateEmojis(this.#selectedTabKey);
    }
  }

  #resetViewport() {
    if (this.#activeBaseEmoji) {
      this.#closeVariationsPanel();
    }
    if (this.#selectedTabKey) {
      this.#contentElement.scrollTop = 0;
    }
  }

  #updateTabsAndTitle(tabKey) {
    // Update active tab
    if (this.#selectedTabKey) {
      const previousTabElement = this.#tabElements.get(this.#selectedTabKey);
      previousTabElement.classList.remove('active');
      previousTabElement.part.remove('active');
      previousTabElement.querySelector('button').part.remove('active');
    }
    const currentTabElement = this.#tabElements.get(tabKey);
    currentTabElement.classList.add('active');
    currentTabElement.part.add('active');
    currentTabElement.querySelector('button').part.add('active');


    // Update title
    this.#titleElement.innerHTML = this.#tabs.get(tabKey).title;
    if (tabKey === 'search') {
      this.#titleElement.classList.add('hidden');
      this.#searchInputElement.classList.remove('hidden');
    }
    else{
      this.#titleElement.classList.remove('hidden');
      this.#searchInputElement.classList.add('hidden');
    }
  }

  #clearSearch() {
    this.#searchInputElement.value = '';
    const emojiVisibilityChanges = {
      visible: Array.from(this.#baseEmojiElements.values()),
      hidden: [],
    };
    this.#renderEmojiVisibilityChanges(emojiVisibilityChanges);
  }

  #searchEmoji(query) {
    this.#contentElement.scrollTop = 0;
    const searchTerms = query.toLowerCase().split(' ');
    const emojiVisibilityChanges = Array.from(this.#baseEmojiElements.entries()).reduce((acc, [baseEmoji, baseEmojiElement]) => {
      if (this.#emojiMatchTerms(baseEmoji, searchTerms)) {
        acc.visible.push(baseEmojiElement)
      }
      else {
        acc.hidden.push(baseEmojiElement)
      }
      return acc;
    }, { visible: [], hidden: [] });
    this.#renderEmojiVisibilityChanges(emojiVisibilityChanges);
  }

  #updateEmojis(tabKey) {
    const emojiVisibilityChanges = Array.from(this.#baseEmojiElements.entries()).reduce((acc, [baseEmoji, baseEmojiElement]) => {
      if (baseEmoji.category === tabKey) {
        acc.visible.push(baseEmojiElement)
      }
      else {
        acc.hidden.push(baseEmojiElement)
      }
      return acc;
    }, { visible: [], hidden: [] });
    this.#renderEmojiVisibilityChanges(emojiVisibilityChanges);
  }

  #selectBaseEmoji(baseEmoji) {
    if (baseEmoji === this.#activeBaseEmoji) {
      this.#closeVariationsPanel();
    }
    else {
      if (baseEmoji.variations && !this.#variationsDisabled) {
        this.#openVariationsPanel(baseEmoji);
      }
      else {
        this.#selectEmoji(baseEmoji);
      }
    }
  }

  #selectEmoji(emoji) {
    if (this.#activeBaseEmoji) {
      this.#closeVariationsPanel();
    }
    this.dispatchEvent(new CustomEvent(
        'emoji-pick',
        {
          detail: emoji,
          bubbles: false,
        }
    ));
  }

  searchEmoji(query) {
    if (this.#selectedTabKey !== 'search') {
      return;
    }
    if (this.#searchInputElement.value !== query) {
      this.#searchInputElement.value = query;
    }
    this.#searchEmoji(query)
  }

  clearSearch() {
    if (this.#selectedTabKey !== 'search') {
      return;
    }
    this.#clearSearch();
  }

  #emojiMatchTerms(emoji, searchTerms) {
    return searchTerms.every((searchTerm) => {
      return emoji.description.toLowerCase().includes(searchTerm) || emoji.keywords.some((keyword) => {
        return keyword.toLowerCase().includes(searchTerm);
      });
    });
  }

  #openVariationsPanel(baseEmoji) {
    if (this.#activeBaseEmoji) {
      this.#closeVariationsPanel();
    }
    this.#activeBaseEmoji = baseEmoji;
    const baseEmojiElement = this.#baseEmojiElements.get(this.#activeBaseEmoji);
    this.#backdropElement.classList.remove('hidden');
    baseEmojiElement.classList.add('active');
    baseEmojiElement.querySelector('button').part.add('active');
    this.#updateVariationsPanel();
  }

  #closeVariationsPanel() {
    if (!this.#activeBaseEmoji) {
      return;
    }
    const baseEmojiElement = this.#baseEmojiElements.get(this.#activeBaseEmoji);
    this.#activeBaseEmoji = null;
    this.#backdropElement.classList.add('hidden');
    baseEmojiElement.classList.remove('active');
    baseEmojiElement.querySelector('button').part.remove('active');
    this.#updateVariationsPanel();
  }

  #updateVariationsPanel() {
    this.#emojisElement.style.paddingBottom = '';
    if (this.#activeBaseEmoji) {
      const baseEmoji = this.#baseEmojiElements.get(this.#activeBaseEmoji);
      const baseEmojiVariationsElement = this.#baseEmojiVariationsElements.get(this.#activeBaseEmoji);

      // Horizontal alignment
      const minTargetCenteredX = (baseEmojiVariationsElement.offsetWidth / 2);
      const maxTargetCenteredX = this.#emojisElement.clientWidth - (baseEmojiVariationsElement.offsetWidth / 2);
      const currentCenteredX = baseEmoji.offsetLeft + baseEmojiVariationsElement.offsetLeft + (baseEmojiVariationsElement.offsetWidth / 2);
      let targetCenteredX = baseEmoji.offsetLeft + (baseEmoji.offsetWidth / 2);
      // Left overflow
      if (targetCenteredX < minTargetCenteredX) {
        targetCenteredX = minTargetCenteredX;
      }
      // Right overflow
      else if (targetCenteredX > maxTargetCenteredX) {
        targetCenteredX = maxTargetCenteredX;
      }
      baseEmojiVariationsElement.style.transform = `translateX(${targetCenteredX - currentCenteredX}px)`;

      // Vertical alignment
      const currentTop = this.#emojisElement.offsetTop + baseEmoji.offsetTop;
      const currentBottom = currentTop + baseEmojiVariationsElement.offsetHeight;
      const targetTop = currentTop - baseEmojiVariationsElement.offsetHeight - this.#baseEmojiVariationsGap;
      const targetBottom = currentBottom + baseEmoji.offsetHeight + this.#baseEmojiVariationsGap;
      const minTargetTop = this.#contentElement.scrollTop + this.#emojisElement.offsetTop;
      const maxTargetBottom = this.#contentElement.scrollTop + this.#contentElement.offsetHeight;
      // Display the panel above the base emoji if it doesn't fit under without scrolling but does above
      if (targetBottom > maxTargetBottom && targetTop >= minTargetTop) {
        baseEmojiVariationsElement.style.top = `${- baseEmojiVariationsElement.offsetHeight - this.#baseEmojiVariationsGap}px`;
      }
      // Otherwise display it under the base emoji
      else {
        baseEmojiVariationsElement.style.top = `${baseEmoji.offsetHeight + this.#baseEmojiVariationsGap}px`;

        // Add padding to make overflowing content visible, if needed
        const maxContentBottom = this.#emojisElement.offsetTop + this.#emojisElement.clientHeight;
        if (targetBottom > maxContentBottom) {
          this.#emojisElement.style.paddingBottom = `${targetBottom - maxContentBottom}px`;
        }

        // Scroll to make the maximum of the variations visible, if needed
        if (targetBottom > maxTargetBottom) {
          const maxScrollOffset = baseEmoji.offsetTop - this.#contentElement.scrollTop - this.#scrollToEmojiViewportMargin;
          const targetScrollOffset = targetBottom - maxTargetBottom + this.#scrollToEmojiViewportMargin;
          this.#contentElement.scrollTop += Math.min(maxScrollOffset, targetScrollOffset);
        }
      }
    }
  }

  #scrollToEmoji(baseEmojiElement, emojiElement) {
    const minTop = this.#contentElement.scrollTop + this.#emojisElement.offsetTop + this.#scrollToEmojiViewportMargin;
    const maxBottom = this.#contentElement.scrollTop + this.#contentElement.offsetHeight - this.#scrollToEmojiViewportMargin;
    let currentTop;
    let currentBottom;
    if (emojiElement) {
      currentTop = this.#emojisElement.offsetTop + baseEmojiElement.offsetTop + emojiElement.parentElement.offsetTop + emojiElement.offsetTop;
      currentBottom = currentTop + emojiElement.offsetHeight;
    }
    else {
      currentTop = this.#emojisElement.offsetTop + baseEmojiElement.offsetTop;
      currentBottom = currentTop + baseEmojiElement.offsetHeight;
    }
    if (currentTop < minTop) {
      this.#contentElement.scrollTop += currentTop - minTop;
    }
    else if (currentBottom > maxBottom) {
      this.#contentElement.scrollTop += currentBottom - maxBottom;
    }
  }

  focusHeader() {
    this.#tabsElement.querySelector('button').focus();
  }

  focusContent(skipSearchInput = false) {
    if (this.#selectedTabKey === 'search' && (!skipSearchInput || !this.#firstEmojiElement)) {
      this.#searchInputElement.focus();
    }
    else if (this.#firstEmojiElement) {
      this.#firstEmojiElement.querySelector('button').focus();
    }
    else {
      this.focusHeader();
    }
  }

  #renderEmojiVisibilityChanges(emojiVisibilityChanges) {
    // Remember the first visible emoji so we can focus it easily
    this.#firstEmojiElement = emojiVisibilityChanges.visible[0];

    // Unobserve all hidden emojis
    emojiVisibilityChanges.hidden.forEach((baseEmojiElement) => {
      if (baseEmojiElement.classList.contains('hidden')) {
        return;
      }
      baseEmojiElement.classList.add('hidden');
      baseEmojiElement.classList.remove('lazy-load');
      this.#intersectionObserver.unobserve(baseEmojiElement);
    });

    // Observe all visible emojis to lazy load them when they intersect with the viewport
    emojiVisibilityChanges.visible.forEach((baseEmojiElement, index) => {
      if (!baseEmojiElement.classList.contains('hidden')) {
        return;
      }
      baseEmojiElement.classList.add('lazy-load');
      baseEmojiElement.classList.remove('hidden');
      this.#intersectionObserver.observe(baseEmojiElement);
    });
  }

  #load(entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.remove('lazy-load');
      }
      else if (!entry.target.classList.contains('active') && !entry.target.classList.contains('hidden')) {
        entry.target.classList.add('lazy-load');
      }
    }
  }
}

export function defineUnicodeEmojiPicker() {
  if (!isScrollableComponentDefined()) {
    defineScrollableComponent();
  }
  window.customElements.define(defaultTag, EmojiPickerElement);
}

export function isUnicodeEmojiPickerDefined() {
  return isScrollableComponentDefined() && !!window.customElements.get(defaultTag);
}

export async function whenUnicodeEmojiPickerDefined() {
  await whenScrollableComponentDefined();
  return await window.customElements.whenDefined(defaultTag);
}
