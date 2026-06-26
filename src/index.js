import 'scrollable-component';
import * as unicodeEmoji from 'unicode-emoji';

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

const baseEmojiTemplate = document.createElement('template');
baseEmojiTemplate.innerHTML = `
  <div class="base-emoji">
    <button type="button" class="button"></button>
  </div>
`;

const baseEmojiVariationsTemplate = document.createElement('template');
baseEmojiVariationsTemplate.innerHTML = `
  <div class="variations-marker"></div>
  <div class="variations" tabindex="-1"></div>
`;

const emojiTemplate = document.createElement('template');
emojiTemplate.innerHTML = `
  <div class="emoji">
    <button type="button" class="button"></button>
  </div>
`;

export class EmojiPickerElement extends HTMLElement {

  static get observedAttributes() {
    return ['version'];
  }

  get selectedGroup() {
    return this.activeGroupKey;
  }

  constructor() {
    super();
    this.groups = new Map([
      [
        'search',
        {
          emoji: '🔎',
          title: 'Search an Emoji',
        }
      ],
      [
        'face-emotion',
        {
          emoji: '😀️',
          title: 'Smileys & Emotion',
        },
      ],
      [
        'food-drink',
        {
          emoji: '🥕️',
          title: 'Food & Drink',
        },
      ],
      [
        'animals-nature',
        {
          emoji: '🦜️',
          title: 'Nature & Animals',
        },
      ],
      [
        'activities-events',
        {
          emoji: '♟️',
          title: 'Activities & Events',
        },
      ],
      [
        'person-people',
        {
          emoji: '🧍️',
          title: 'People',
        },
      ],
      [
        'travel-places',
        {
          emoji: '✈️',
          title: 'Travel & Places',
        },
      ],
      [
        'objects',
        {
          emoji: '👒',
          title: 'Clothing & Objects',
        },
      ],
      [
        'symbols',
        {
          emoji: '💬️',
          title: 'Symbols',
        },
      ],
      [
        'flags',
        {
          emoji: '🚩',
          title: 'Flags',
        },
      ],
    ]);
    this.activeGroupKey = null;
    this.emojis = null;
    this.activeBaseEmoji = null;
    this.baseEmojiVariationsGap = 4;
    this.scrollToEmojiViewportMargin = 4;
    this.groupFilterElements = new Map();
    this.groupElements = new Map();
    this.baseEmojiElements = new Map();
    this.baseEmojiVariationsElements = new Map();

    // Global structure
    const emojiPickerContent = emojiPickerTemplate.content.cloneNode(true);
    this.emojiPicker = emojiPickerContent.querySelector('.emoji-picker');
    this.groupFiltersElement = this.emojiPicker.querySelector('.group-filters');
    this.contentElement = this.emojiPicker.querySelector('.content');
    this.resultsElement = this.contentElement.querySelector('.results');

    // Title/search bar
    const emojiTitleBarElement = this.emojiPicker.querySelector('.title-bar');
    this.titleElement = emojiTitleBarElement.querySelector('.title');
    this.searchInputElement = emojiTitleBarElement.querySelector('.search-input');
    this.searchInputElement.placeholder = 'Search an Emoji...';
    this.searchInputElement.addEventListener('input', () => {
      this.searchEmoji(this.searchInputElement.value);
    }, { passive: true });

    // Emoji filters
    for (const [groupKey, group] of this.groups) {
      const groupFilterContent = emojiGroupFilterTemplate.content.cloneNode(true);
      const groupFilterElement = groupFilterContent.querySelector('.group-filter');
      this.groupFilterElements.set(group, groupFilterElement);
      const groupFilterButton = groupFilterContent.querySelector('.button');
      groupFilterButton.innerHTML = group.emoji;
      groupFilterButton.setAttribute('title', group.title);
      groupFilterButton.addEventListener('click', () => {
        this.selectGroup(groupKey);
      }, { passive: true });
      this.groupFiltersElement.appendChild(groupFilterContent);

      // Emoji groups
      if (groupKey !== 'search') {
        const groupContent = emojiGroupTemplate.content.cloneNode(true);
        const groupElement = groupContent.querySelector('.group');
        this.groupElements.set(group, groupElement);
        this.resultsElement.appendChild(groupContent);
      }
    }

    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(emojiPickerContent);
    this.shadowRoot.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeVariationsPanel();
      }
    }, { passive: true });
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
      this.emojis = unicodeEmoji.getEmojisGroupedBy('category', {versionAbove: newValue});
      this.buildEmojis();
    }
  }

  buildEmojis() {
    this.closeVariationsPanel();
    this.baseEmojiElements = new Map();
    this.baseEmojiVariationsElements = new Map();
    for (const [groupKey, group] of this.groups) {
      if (groupKey !== 'search') {
        const groupElement = this.groupElements.get(group);
        groupElement.innerHTML = '';
        for (const baseEmoji of this.emojis[groupKey]) {
          const baseEmojiContent = baseEmojiTemplate.content.cloneNode(true);
          const baseEmojiElement = baseEmojiContent.querySelector('.base-emoji');
          this.baseEmojiElements.set(baseEmoji, baseEmojiElement);
          baseEmojiElement.addEventListener('focusout', (event) => {
            if (this.activeBaseEmoji) {
              const activeBaseEmojiElement = this.baseEmojiElements.get(this.activeBaseEmoji);
              if ((!event.relatedTarget || !activeBaseEmojiElement.contains(event.relatedTarget))) {
                this.closeVariationsPanel();
              }
            }
          }, { passive: true });
          const baseEmojiButton = baseEmojiContent.querySelector('.button');
          baseEmojiButton.innerHTML = baseEmoji.emoji;
          baseEmojiButton.setAttribute('title', baseEmoji.description);
          baseEmojiButton.addEventListener('click', () => {
            this.selectBaseEmoji(baseEmoji);
          }, { passive: true });
          baseEmojiButton.addEventListener('focus', () => {
            this.scrollToEmoji(baseEmojiElement);
          }, { passive: true });
          if (baseEmoji.variations) {
            baseEmojiElement.classList.add('has-variations');
            const baseEmojiVariationsContent = baseEmojiVariationsTemplate.content.cloneNode(true);
            const baseEmojiVariationsElement = baseEmojiVariationsContent.querySelector('.variations');
            this.baseEmojiVariationsElements.set(baseEmoji, baseEmojiVariationsElement);
            for (const emoji of [baseEmoji, ...baseEmoji.variations]) {
              if (emoji !== baseEmoji) {
                emoji.base = baseEmoji;
              }
              const emojiContent = emojiTemplate.content.cloneNode(true);
              const emojiElement = emojiContent.querySelector('.emoji');
              const emojiButton = emojiContent.querySelector('.button');
              emojiButton.innerHTML = emoji.emoji;
              emojiButton.setAttribute('title', emoji.description);
              emojiButton.addEventListener('click', () => {
                this.selectEmoji(emoji);
              }, { passive: true });
              emojiButton.addEventListener('focus', () => {
                this.scrollToEmoji(baseEmojiElement, emojiElement);
              }, { passive: true });
              baseEmojiVariationsElement.appendChild(emojiContent);
            }
            baseEmojiElement.appendChild(baseEmojiVariationsContent);
          }
          groupElement.appendChild(baseEmojiContent);
        }
      }
    }
    if (this.activeGroupKey === 'search') {
      this.searchEmoji(this.searchInputElement.value);
    }
  }

  setTranslation(translation) {
    if (translation.search && translation.search.inputPlaceholder) {
      this.searchInputElement.placeholder = translation.search.inputPlaceholder;
    }
    for (const [groupKey, group] of this.groups) {
      if (translation[groupKey]) {
        const groupFilterElement = this.groupFilterElements.get(group);
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
    if (this.activeGroupKey) {
      this.titleElement.innerHTML = this.groups.get(this.activeGroupKey).title;
    }
  }

  selectGroup(groupKey) {
    // Reset viewport
    if (this.activeBaseEmoji) {
      this.closeVariationsPanel();
    }
    if (this.activeGroupKey) {
      this.contentElement.scrollTop = 0;
    }

    // Reset search
    if (this.activeGroupKey === 'search') {
      this.clearSearch();
    }

    // Switch active state
    if (groupKey !== this.activeGroupKey) {

      // Reset previous group filter
      if (this.activeGroupKey) {
        const previousActiveGroup = this.groups.get(this.activeGroupKey);
        this.groupFilterElements.get(previousActiveGroup).classList.remove('active');
        if (this.activeGroupKey === 'search') {
          for (const groupElement of this.groupElements.values()) {
            groupElement.classList.remove('active');
          }
        }
        else {
          this.groupElements.get(previousActiveGroup).classList.remove('active');
        }
      }

      // Set new group filter
      this.activeGroupKey = groupKey;
      const activeGroup = this.groups.get(this.activeGroupKey);
      this.titleElement.innerHTML = activeGroup.title;
      this.groupFilterElements.get(activeGroup).classList.add('active');
      if (this.activeGroupKey === 'search') {
        this.titleElement.classList.add('hidden');
        this.searchInputElement.classList.remove('hidden');
        for (const groupElement of this.groupElements.values()) {
          groupElement.classList.add('active');
        }
      }
      else {
        this.titleElement.classList.remove('hidden');
        this.searchInputElement.classList.add('hidden');
        this.groupElements.get(activeGroup).classList.add('active');
      }
    }

    // Focus search input if needed
    if (this.activeGroupKey === 'search') {
      this.searchInputElement.focus();
    }
  }

  selectBaseEmoji(baseEmoji) {
    if (baseEmoji === this.activeBaseEmoji) {
      this.closeVariationsPanel();
    }
    else {
      if (baseEmoji.variations) {
        this.openVariationsPanel(baseEmoji);
      }
      else {
        this.selectEmoji(baseEmoji);
      }
    }
  }

  selectEmoji(emoji) {
    if (this.activeBaseEmoji) {
      this.closeVariationsPanel();
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
    if (this.searchInputElement.value !== query) {
      this.searchInputElement.value = query;
    }
    const searchTerms = query.toLowerCase().split(' ');
    this.contentElement.scrollTop = 0;
    for (const [baseEmoji, baseEmojiElement] of this.baseEmojiElements) {
      if(this.emojiMatchTerms(baseEmoji, searchTerms)) {
        baseEmojiElement.classList.remove('hidden');
      }
      else {
        baseEmojiElement.classList.add('hidden');
      }
    }
  }

  clearSearch() {
    this.searchInputElement.value = '';
    for (const [baseEmoji, baseEmojiElement] of this.baseEmojiElements) {
      baseEmojiElement.classList.remove('hidden');
    }
  }

  emojiMatchTerms(emoji, searchTerms) {
    return searchTerms.every((searchTerm) => {
      return emoji.description.toLowerCase().includes(searchTerm) || emoji.keywords.some((keyword) => {
        return keyword.toLowerCase().includes(searchTerm);
      });
    });
  }

  openVariationsPanel(baseEmoji) {
    if (this.activeBaseEmoji) {
      this.closeVariationsPanel();
    }
    this.activeBaseEmoji = baseEmoji;
    const baseEmojiElement = this.baseEmojiElements.get(this.activeBaseEmoji);
    this.resultsElement.classList.add('highlight');
    baseEmojiElement.classList.add('active');
    this.updateVariationsPanel();
  }

  closeVariationsPanel() {
    if (!this.activeBaseEmoji) {
      return;
    }
    const baseEmojiElement = this.baseEmojiElements.get(this.activeBaseEmoji);
    this.activeBaseEmoji = null;
    this.resultsElement.classList.remove('highlight');
    baseEmojiElement.classList.remove('active');
    this.updateVariationsPanel();
  }

  updateVariationsPanel() {
    this.resultsElement.style.paddingBottom = '';
    if (this.activeBaseEmoji) {
      const baseEmoji = this.baseEmojiElements.get(this.activeBaseEmoji);
      const baseEmojiVariationsElement = this.baseEmojiVariationsElements.get(this.activeBaseEmoji);

      // Horizontal alignment
      const minTargetCenteredX = (baseEmojiVariationsElement.offsetWidth / 2);
      const maxTargetCenteredX = this.resultsElement.clientWidth - (baseEmojiVariationsElement.offsetWidth / 2);
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
      const currentTop = this.resultsElement.offsetTop + baseEmoji.offsetTop;
      const currentBottom = currentTop + baseEmojiVariationsElement.offsetHeight;
      const targetTop = currentTop - baseEmojiVariationsElement.offsetHeight - this.baseEmojiVariationsGap;
      const targetBottom = currentBottom + baseEmoji.offsetHeight + this.baseEmojiVariationsGap;
      const minTargetTop = this.contentElement.scrollTop + this.resultsElement.offsetTop;
      const maxTargetBottom = this.contentElement.scrollTop + this.contentElement.offsetHeight;
      // Display the panel above the base emoji if it doesn't fit under without scrolling but does above
      if (targetBottom > maxTargetBottom && targetTop >= minTargetTop) {
        baseEmojiVariationsElement.style.top = `${- baseEmojiVariationsElement.offsetHeight - this.baseEmojiVariationsGap}px`;
      }
      // Otherwise display it under the base emoji
      else {
        baseEmojiVariationsElement.style.top = `${baseEmoji.offsetHeight + this.baseEmojiVariationsGap}px`;

        // Add padding to make overflowing content visible, if needed
        const maxContentBottom = this.resultsElement.offsetTop + this.resultsElement.clientHeight;
        if (targetBottom > maxContentBottom) {
          this.resultsElement.style.paddingBottom = `${targetBottom - maxContentBottom}px`;
        }

        // Scroll to make the maximum of the variations visible, if needed
        if (targetBottom > maxTargetBottom) {
          const maxScrollOffset = baseEmoji.offsetTop - this.contentElement.scrollTop - this.scrollToEmojiViewportMargin;
          const targetScrollOffset = targetBottom - maxTargetBottom + this.scrollToEmojiViewportMargin;
          this.contentElement.scrollTop += Math.min(maxScrollOffset, targetScrollOffset);
        }
      }
    }
  }

  scrollToEmoji(baseEmojiElement, emojiElement) {
    const minTop = this.contentElement.scrollTop + this.resultsElement.offsetTop + this.scrollToEmojiViewportMargin;
    const maxBottom = this.contentElement.scrollTop + this.contentElement.offsetHeight - this.scrollToEmojiViewportMargin;
    let currentTop;
    let currentBottom;
    if (emojiElement) {
      currentTop = this.resultsElement.offsetTop + baseEmojiElement.offsetTop + emojiElement.parentElement.offsetTop + emojiElement.offsetTop;
      currentBottom = currentTop + emojiElement.offsetHeight;
    }
    else {
      currentTop = this.resultsElement.offsetTop + baseEmojiElement.offsetTop;
      currentBottom = currentTop + baseEmojiElement.offsetHeight;
    }
    if (currentTop < minTop) {
      this.contentElement.scrollTop += currentTop - minTop;
    }
    else if (currentBottom > maxBottom) {
      this.contentElement.scrollTop += currentBottom - maxBottom;
    }
  }

  focusHeader() {
    this.groupFiltersElement.querySelector('button').focus();
  }

  focusContent(skipSearchInput = false) {
    if (this.activeGroupKey === 'search') {
      if (skipSearchInput) {
        this.resultsElement.querySelector('button').focus();
      }
      else {
        this.searchInputElement.focus();
      }
    }
    else {
      this.groupElements.get(this.activeGroupKey).querySelector('button').focus();
    }
  }
}

window.customElements.define('unicode-emoji-picker', EmojiPickerElement);
