import { defineScrollableComponent, isScrollableComponentDefined, whenScrollableComponentDefined } from 'scrollable-component';
import { getEmojisGroupedBy } from 'unicode-emoji';
import { TRANSLATIONS } from './translations';

const defaultVersion = '12.0';

const emojiPickerTemplate = document.createElement('template');
emojiPickerTemplate.innerHTML = `<style>{{COMPONENT_CSS}}</style>{{COMPONENT_HTML}}`;

const emojiGroupFilterTemplate = document.createElement('template');
emojiGroupFilterTemplate.innerHTML = `
  <div class="group-filter">
    <button type="button" class="button"></button>
  </div>
`;

const emojiGroupTemplate = document.createElement('template');
emojiGroupTemplate.innerHTML = `
  <div class="group"></div>
`;

const emojiTemplate = document.createElement('template');
emojiTemplate.innerHTML = `
  <div class="emoji">
    <button type="button" class="button"></button>
  </div>
`;

const emojiWithVariationsTemplate = document.createElement('template');
emojiWithVariationsTemplate.innerHTML = `
  <div class="emoji has-variations">
    <button type="button" class="button"></button>
    <div class="variations" tabindex="-1"></div>
  </div>
`;

export class EmojiPickerElement extends HTMLElement {

  static observedAttributes = ['version'];

  #groups = new Map(TRANSLATIONS);

  #activeGroupKey = null;
  #emojis = null;
  #activeBaseEmoji = null;
  #baseEmojiVariationsGap = 4;
  #scrollToEmojiViewportMargin = 4;
  #groupFilterElements = new Map();
  #baseEmojiElements = new Map();
  #baseEmojiVariationsElements = new Map();
  #renderFrameRequestId = null;

  #groupFiltersElement;
  #contentElement;
  #resultsElement;
  #backdropElement;
  #titleElement;
  #searchInputElement;

  get selectedGroup() {
    return this.#activeGroupKey;
  }

  constructor() {
    super();
    this.#buildComponent()
  }

  connectedCallback() {
    if (!this.hasAttribute('version')) {
      this.setAttribute('version', defaultVersion);
    }
    if (this.hasAttribute('default-group')) {
      this.selectGroup(this.getAttribute('default-group'));
    }
    else {
      this.selectGroup('face-emotion');
    }
  }

  attributeChangedCallback(attributeName, oldValue, newValue) {
    if (attributeName === 'version') {
      this.#emojis = getEmojisGroupedBy('category', {versionAbove: newValue});
      this.#buildEmojis();
    }
  }

  #buildComponent() {
    const emojiPickerContent = emojiPickerTemplate.content.cloneNode(true);
    const emojiPickerElement = emojiPickerContent.querySelector('.emoji-picker');

    this.#buildEmojiGroupFilters(emojiPickerElement);
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
      this.searchEmoji(this.#searchInputElement.value);
    }, { passive: true });
  }

  #buildEmojiGroupFilters(emojiPickerElement) {
    this.#groupFiltersElement = emojiPickerElement.querySelector('.group-filters');
    const groupFilterElements = [];
    for (const [groupKey, group] of this.#groups) {
      const groupFilterContent = emojiGroupFilterTemplate.content.cloneNode(true);
      const groupFilterElement = groupFilterContent.querySelector('.group-filter');
      this.#groupFilterElements.set(groupKey, groupFilterElement);
      const groupFilterButton = groupFilterContent.querySelector('.button');
      groupFilterButton.innerHTML = group.emoji;
      groupFilterButton.setAttribute('title', group.title);
      groupFilterButton.addEventListener('click', () => {
        this.selectGroup(groupKey);
      }, { passive: true });
      groupFilterElements.push(groupFilterElement);
    }
    this.#groupFiltersElement.replaceChildren(...groupFilterElements);
  }

  #buildContent(emojiPickerElement) {
    this.#contentElement = emojiPickerElement.querySelector('.content');
    this.#resultsElement = this.#contentElement.querySelector('.results');
    this.#backdropElement = this.#contentElement.querySelector('.backdrop');
  }

  #buildEmojis() {
    this.#closeVariationsPanel();
    this.#baseEmojiElements = new Map();
    this.#baseEmojiVariationsElements = new Map();

    const emojiElements = [];
    for (const [groupKey, group] of this.#groups) {
      if (groupKey !== 'search') {
        for (const baseEmoji of this.#emojis[groupKey]) {
          emojiElements.push(this.#buildBaseEmoji(baseEmoji));
        }
      }
    }
    this.#resultsElement.replaceChildren(...emojiElements);

    if (this.#activeGroupKey === 'search') {
      this.searchEmoji(this.#searchInputElement.value);
    }
  }

  #buildBaseEmoji(baseEmoji) {
    const baseEmojiTemplate = baseEmoji.variations ? emojiWithVariationsTemplate : emojiTemplate;
    const baseEmojiContent = baseEmojiTemplate.content.cloneNode(true);
    const baseEmojiElement = baseEmojiContent.querySelector('.emoji');
    this.#baseEmojiElements.set(baseEmoji, baseEmojiElement);
    baseEmojiElement.classList.add('hidden');
    baseEmojiElement.addEventListener('focusout', (event) => {
      if (this.#activeBaseEmoji) {
        const activeBaseEmojiElement = this.#baseEmojiElements.get(this.#activeBaseEmoji);
        if ((!event.relatedTarget || !activeBaseEmojiElement.contains(event.relatedTarget))) {
          this.#closeVariationsPanel();
        }
      }
    }, { passive: true });
    const baseEmojiButton = baseEmojiContent.querySelector('.button');
    baseEmojiButton.innerHTML = baseEmoji.emoji;
    baseEmojiButton.setAttribute('title', baseEmoji.description);
    baseEmojiButton.addEventListener('click', () => {
      this.#selectBaseEmoji(baseEmoji);
    }, { passive: true });
    baseEmojiButton.addEventListener('focus', () => {
      this.#scrollToEmoji(baseEmojiElement);
    }, { passive: true });

    if (baseEmoji.variations) {
      const emojiVariationsElement = baseEmojiContent.querySelector('.variations');
      this.#baseEmojiVariationsElements.set(baseEmoji, emojiVariationsElement);
      // Include base emoji when building variations panel
      const emojiVariationElements = [];
      for (const emojiVariation of [baseEmoji, ...baseEmoji.variations]) {
        // Add `base` attribute so that when we emit the "emoji-pick" event, when know the associated base emoji
        if (emojiVariation !== baseEmoji) {
          emojiVariation.base = baseEmoji;
        }
        emojiVariationElements.push(this.#buildEmojiVariation(emojiVariation));
      }
      emojiVariationsElement.replaceChildren(...emojiVariationElements);
    }

    return baseEmojiContent;
  }

  #buildEmojiVariation(emojiVariation) {
    const emojiVariationContent = emojiTemplate.content.cloneNode(true);
    const emojiVariationElement = emojiVariationContent.querySelector('.emoji');
    const emojiVariationButton = emojiVariationContent.querySelector('.button');
    emojiVariationButton.innerHTML = emojiVariation.emoji;
    emojiVariationButton.setAttribute('title', emojiVariation.description);
    emojiVariationButton.addEventListener('click', () => {
      this.#selectEmoji(emojiVariation);
    }, { passive: true });
    emojiVariationButton.addEventListener('focus', () => {
      this.#scrollToEmoji(emojiVariation, emojiVariationElement);
    }, { passive: true });
    return emojiVariationContent;
  }


  setTranslation(translation) {
    if (translation.search && translation.search.inputPlaceholder) {
      this.#searchInputElement.placeholder = translation.search.inputPlaceholder;
    }
    for (const [groupKey, group] of this.#groups) {
      if (translation[groupKey]) {
        const groupFilterElement = this.#groupFilterElements.get(groupKey);
        if (translation[groupKey].emoji) {
          group.emoji = translation[groupKey].emoji;
          groupFilterElement.querySelector('.button').innerHTML = group.emoji;
        }
        if (translation[groupKey].title) {
          group.title = translation[groupKey].title;
          groupFilterElement.querySelector('.button').setAttribute('title', group.title);
        }
      }
    }
    if (this.#activeGroupKey) {
      this.#titleElement.innerHTML = this.#groups.get(this.#activeGroupKey).title;
    }
  }

  selectGroup(groupKey) {
    this.#resetViewport();
    this.#selectGroupFilter(groupKey);
    this.#selectGroupResults(groupKey);
    this.#activeGroupKey = groupKey;
  }

  #resetViewport() {
    if (this.#activeBaseEmoji) {
      this.#closeVariationsPanel();
    }
    if (this.#activeGroupKey) {
      this.#contentElement.scrollTop = 0;
    }
  }

  #selectGroupFilter(groupKey) {
    if (groupKey === this.#activeGroupKey) {
      return;
    }

    // Update active group filter
    if (this.#activeGroupKey) {
      this.#groupFilterElements.get(this.#activeGroupKey).classList.remove('active');
    }
    this.#groupFilterElements.get(groupKey).classList.add('active');


    // Update title
    this.#titleElement.innerHTML = this.#groups.get(groupKey).title;
    if (groupKey === 'search') {
      this.#titleElement.classList.add('hidden');
      this.#searchInputElement.classList.remove('hidden');
    }
    else{
      this.#titleElement.classList.remove('hidden');
      this.#searchInputElement.classList.add('hidden');
    }
  }

  #selectGroupResults(groupKey) {
    // Reset search
    if (groupKey === 'search') {
      this.#searchInputElement.focus();
      this.clearSearch();
    }
    // Display correct emojis based on the active group
    else if (groupKey !== this.#activeGroupKey) {
      const emojiVisibilityChanges = Array.from(this.#baseEmojiElements.entries()).reduce((acc, [baseEmoji, baseEmojiElement]) => {
        if (baseEmoji.category === groupKey) {
          acc.visible.push(baseEmojiElement)
        }
        else {
          acc.hidden.push(baseEmojiElement)
        }
        return acc;
      }, { visible: [], hidden: [] });
      this.#renderEmojiVisibilityChanges(emojiVisibilityChanges);
    }
  }

  #selectBaseEmoji(baseEmoji) {
    if (baseEmoji === this.#activeBaseEmoji) {
      this.#closeVariationsPanel();
    }
    else {
      if (baseEmoji.variations) {
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
    if (this.#searchInputElement.value !== query) {
      this.#searchInputElement.value = query;
    }
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

  clearSearch() {
    this.#searchInputElement.value = '';
    const emojiVisibilityChanges = {
      visible: Array.from(this.#baseEmojiElements.values()),
      hidden: [],
    };
    this.#renderEmojiVisibilityChanges(emojiVisibilityChanges);
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
    this.#updateVariationsPanel();
  }

  #updateVariationsPanel() {
    this.#resultsElement.style.paddingBottom = '';
    if (this.#activeBaseEmoji) {
      const baseEmoji = this.#baseEmojiElements.get(this.#activeBaseEmoji);
      const baseEmojiVariationsElement = this.#baseEmojiVariationsElements.get(this.#activeBaseEmoji);

      // Horizontal alignment
      const minTargetCenteredX = (baseEmojiVariationsElement.offsetWidth / 2);
      const maxTargetCenteredX = this.#resultsElement.clientWidth - (baseEmojiVariationsElement.offsetWidth / 2);
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
      const currentTop = this.#resultsElement.offsetTop + baseEmoji.offsetTop;
      const currentBottom = currentTop + baseEmojiVariationsElement.offsetHeight;
      const targetTop = currentTop - baseEmojiVariationsElement.offsetHeight - this.#baseEmojiVariationsGap;
      const targetBottom = currentBottom + baseEmoji.offsetHeight + this.#baseEmojiVariationsGap;
      const minTargetTop = this.#contentElement.scrollTop + this.#resultsElement.offsetTop;
      const maxTargetBottom = this.#contentElement.scrollTop + this.#contentElement.offsetHeight;
      // Display the panel above the base emoji if it doesn't fit under without scrolling but does above
      if (targetBottom > maxTargetBottom && targetTop >= minTargetTop) {
        baseEmojiVariationsElement.style.top = `${- baseEmojiVariationsElement.offsetHeight - this.#baseEmojiVariationsGap}px`;
      }
      // Otherwise display it under the base emoji
      else {
        baseEmojiVariationsElement.style.top = `${baseEmoji.offsetHeight + this.#baseEmojiVariationsGap}px`;

        // Add padding to make overflowing content visible, if needed
        const maxContentBottom = this.#resultsElement.offsetTop + this.#resultsElement.clientHeight;
        if (targetBottom > maxContentBottom) {
          this.#resultsElement.style.paddingBottom = `${targetBottom - maxContentBottom}px`;
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
    const minTop = this.#contentElement.scrollTop + this.#resultsElement.offsetTop + this.#scrollToEmojiViewportMargin;
    const maxBottom = this.#contentElement.scrollTop + this.#contentElement.offsetHeight - this.#scrollToEmojiViewportMargin;
    let currentTop;
    let currentBottom;
    if (emojiElement) {
      currentTop = this.#resultsElement.offsetTop + baseEmojiElement.offsetTop + emojiElement.parentElement.offsetTop + emojiElement.offsetTop;
      currentBottom = currentTop + emojiElement.offsetHeight;
    }
    else {
      currentTop = this.#resultsElement.offsetTop + baseEmojiElement.offsetTop;
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
    this.#groupFiltersElement.querySelector('button').focus();
  }

  focusContent(skipSearchInput = false) {
    if (this.#activeGroupKey === 'search' && !skipSearchInput) {
      this.#searchInputElement.focus();
    }
    else {
      this.#contentElement.querySelector('.results > .emoji:not(.hidden) > button').focus();
    }
  }

  #renderEmojiVisibilityChanges(emojiVisibilityChanges) {
    // We split the load over multiple frames to make the component visualy more responsive
    if (this.#renderFrameRequestId !== null) {
      cancelAnimationFrame(this.#renderFrameRequestId);
    }
    // First frame, hide everything
    this.#renderFrameRequestId = requestAnimationFrame(() => {
      this.#renderFrameRequestId = null;
      emojiVisibilityChanges.hidden.forEach((baseEmojiElement) => {
        baseEmojiElement.classList.add('hidden');
      });
      // Second frame, show first 120 emojis
      this.#renderFrameRequestId = requestAnimationFrame(() => {
        this.#renderFrameRequestId = null;
        emojiVisibilityChanges.visible.splice(0, 120).forEach((baseEmojiElement) => {
          baseEmojiElement.classList.remove('hidden');
        });
        // Third frame, show the rest of the emojis
        this.#renderFrameRequestId = requestAnimationFrame(() => {
          this.#renderFrameRequestId = null;
          emojiVisibilityChanges.visible.forEach((baseEmojiElement) => {
            baseEmojiElement.classList.remove('hidden');
          });
        });
      });
    });
  }
}


const defaultTag = 'unicode-emoji-picker';

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
