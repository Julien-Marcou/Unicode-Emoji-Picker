import 'scrollable-component';
import * as unicodeEmoji from 'unicode-emoji';

const defaultVersion = '12.0';

const emojiPickerTemplate = document.createElement('template');
emojiPickerTemplate.innerHTML = `
  <style>
    * {
      box-sizing: border-box;
    }
    :host {
      --min-width: 15.3em; /* 6 emojis wide */
      --min-height: 11.5em; /* 4 emojis tall */
      --max-width: 23.95em; /* 11 emojis wide */
      --max-height: 23.75em; /* 10 emojis tall */

      --fill-color: #fff;
      --text-color: #111;
      --border-radius: 10px;
      --box-shadow: 0 8px 30px 0 rgba(0, 0, 0, 0.2), 0 2px 6px 2px rgba(0, 0, 0, 0.15);
      --transition: 150ms cubic-bezier(0, 0, .2, .1);
      --emoji-font-family: apple color emoji, segoe ui emoji, noto color emoji, android emoji, emojisymbols, emojione mozilla, twemoji mozilla, segoe ui symbol;

      --filters-border-width: 1px;
      --filters-border-color: #e4e4e4;
      --filter-fill-color: transparent;
      --filter-fill-color-hover: #e9e9e9;
      --filter-border-radius: 8px;
      --filter-active-marker-border-width: 4px;
      --filter-active-marker-border-color: #aaa;

      --content-scrollbar-thumb-fill-color: #d7d7d7;
      --content-scrollbar-thumb-fill-color-hover: #aaa;

      --title-bar-fill-color: rgba(255, 255, 255, 0.95);
      --search-input-padding: 0.35em 0.4em 0.55em;
      --search-input-border-width: 0 0 4px 0;
      --search-input-border-color: #e4e4e4;
      --search-input-border-color-hover: #222;

      --emoji-fill-color: transparent;
      --emoji-fill-color-hover: transparent;
      --emoji-border-width: 4px;
      --emoji-border-color: transparent;
      --emoji-border-color-hover: #d7d7d7;
      --emoji-border-radius: 8px;

      --variations-backdrop-fill-color: rgba(255, 255, 255, 0.7);
      --variations-fill-color: var(--fill-color);
      --variations-border-radius: var(--border-radius);
      --variations-box-shadow: 0 2px 5px 0 rgba(0, 0, 0, .2), 0 1px 3px 0 rgba(0, 0, 0, .2);
      --emoji-variation-marker-size: 8px;
      --emoji-variation-marker-border-width: 4px;
      --emoji-variation-marker-border-color: #d7d7d7;
      --emoji-variation-marker-border-color-hover: #aaa;

      display: block;
      min-width: var(--min-width);
      min-height: calc(var(--min-height) + var(--filters-border-width) + 3em);
      width: var(--max-width);
      height: calc(var(--max-height) + var(--filters-border-width) + 3em);
      max-width: 100vw;
      max-height: 100vh;
      overflow: hidden;
      background-color: var(--fill-color);
      color: var(--text-color);
      font-size: 24px;
      border-radius: var(--border-radius);
      box-shadow: var(--box-shadow);
    }
    :host([filters-position="left"]),
    :host([filters-position="right"]) {
      min-width: calc(var(--min-width) + var(--filters-border-width) + 3em);
      min-height: var(--min-height);
      width: calc(var(--max-width) + var(--filters-border-width) + 3em);
      height: var(--max-height);
    }

    /* Default button style */
    .button {
      cursor: pointer;
      padding: 0;
      border: 0 none;
      outline: none;
      color: inherit;
      font-size: 1em;
      line-height: 1em;
      font-family: var(--emoji-font-family);
      -webkit-appearance: button;
    }
    .button::-moz-focus-inner {
      border: 0 none;
    }

    /* Root element */
    .emoji-picker {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }
    :host([filters-position="bottom"]) .emoji-picker {
      flex-direction: column-reverse;
    }
    :host([filters-position="left"]) .emoji-picker {
      flex-direction: row;
    }
    :host([filters-position="right"]) .emoji-picker {
      flex-direction: row-reverse;
    }

    /* Header bar */
    .header {
      display: flex;
      flex-shrink: 0;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
    }
    .header::-webkit-scrollbar {
      width: 0;
      height: 0;
    }
    :host([filters-position="left"]) .header,
    :host([filters-position="right"]) .header {
      flex-direction: column;
      overflow-x: hidden;
      overflow-y: auto;
    }
    .group-filters {
      flex-grow: 1;
      display: grid;
      grid-auto-flow: column;
      grid-gap: 0.2em;
      padding: 0 0.8em;
     }
    :host([filters-position="left"]) .group-filters,
    :host([filters-position="right"]) .group-filters {
      grid-auto-flow: row;
      padding: 0.8em 0;
    }

    /* Filter button */
    .group-filter {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5em 0;
    }
    :host([filters-position="left"]) .group-filter,
    :host([filters-position="right"]) .group-filter {
      padding: 0 0.5em;
    }
    .group-filter.active:after {
      content: "";
      display: block;
      position: absolute;
      left: -0.1em;
      right: -0.1em;
      bottom: 0;
      height: var(--filter-active-marker-border-width);
      background-color: var(--filter-active-marker-border-color);
    }
    :host([filters-position="left"]) .group-filter.active:after,
    :host([filters-position="right"]) .group-filter.active:after {
      top: -0.1em;
      bottom: -0.1em;
      height: auto;
      width: var(--filter-active-marker-border-width);
    }
    :host([filters-position="left"]) .group-filter.active:after {
      left: auto;
      right: 0;
    }
    :host([filters-position="right"]) .group-filter.active:after {
      left: 0;
      right: auto;
    }
    .group-filter .button {
      display: block;
      overflow: hidden;
      height: 2em;
      width: 2em;
      background-color: var(--filter-fill-color);
      border-radius: var(--filter-border-radius);
      text-align: center;
      transition: background-color var(--transition);
    }
    .group-filter .button:hover,
    .group-filter .button:focus {
      background-color: var(--filter-fill-color-hover);
    }

    /* Viewport */
    .content {
      --scrollbar-width: 14px;
      --scrollbar-thumb-fill-color: var(--content-scrollbar-thumb-fill-color);
      --scrollbar-thumb-fill-color-hover: var(--content-scrollbar-thumb-fill-color-hover);
      --content-padding: 0 0.8em 0.8em;
      position: relative;
      flex-grow: 1;
      border-top: var(--filters-border-width) solid var(--filters-border-color);
    }
    :host([filters-position="bottom"]) .content,
    :host([filters-position="left"]) .content,
    :host([filters-position="right"]) .content {
      border-top: 0 none;
    }
    :host([filters-position="bottom"]) .content {
      border-bottom: var(--filters-border-width) solid var(--filters-border-color);
    }
    :host([filters-position="left"]) .content {
      border-left: var(--filters-border-width) solid var(--filters-border-color);
    }
    :host([filters-position="right"]) .content {
      border-right: var(--filters-border-width) solid var(--filters-border-color);
    }

    /* Title/search bar*/
    .title-bar {
      position: sticky;
      z-index: 40;
      top: -1px;
      display: flex;
      align-items: center;
      max-width: var(--viewport-width);
      height: 3em;
      padding: 1px 1.1em 0;
      margin: -1px -0.8em 0;
      background-color: var(--title-bar-fill-color);
    }
    .title-bar .title {
      overflow: hidden;
      font-size: 1.3em;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .title-bar .search-input {
      display: block;
      width: 100%;
      margin: 0;
      padding: var(--search-input-padding);
      color: inherit;
      font: inherit;
      font-size: 0.85em;
      line-height: 1.6em;
      text-overflow: ellipsis;
      border: solid var(--search-input-border-color);
      border-width: var(--search-input-border-width);
      background-color: transparent;
      border-radius: 0;
      outline: none;
      box-shadow: none;
      transition: border-color var(--transition);
    }
    .title-bar .title.hidden,
    .title-bar .search-input.hidden {
      display: none;
    }
    .title-bar .search-input:hover,
    .title-bar .search-input:focus {
      border-color: var(--search-input-border-color-hover);
    }

    /* Content grid */
    .results {
      position: relative;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(1.85em, 1fr));
      grid-gap: 0.2em;
    }
    .group {
      display: none;
    }
    .group.active {
      display: contents;
    }

    /* Emojis */
    .base-emoji,
    .emoji {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .base-emoji > .button,
    .emoji > .button {
      display: block;
      overflow: hidden;
      width: 1.85em;
      height: 1.85em;
      background-color: var(--emoji-fill-color);
      border: solid var(--emoji-border-color);
      border-width: var(--emoji-border-width);
      border-radius: var(--emoji-border-radius);
      text-align: center;
      transition: background-color var(--transition);
    }
    .base-emoji > .button:hover,
    .base-emoji > .button:focus,
    .emoji > .button:hover,
    .emoji > .button:focus {
      background-color: var(--emoji-fill-color-hover);
      border-color: var(--emoji-border-color-hover);
    }
    .base-emoji.hidden {
      display: none;
    }
    .base-emoji.active {
      z-index: 20;
    }
    .base-emoji.has-variations > .button {
      border-bottom-right-radius: 0;
    }

    /* Emoji variations marker */
    .base-emoji .variations-marker {
      pointer-events: none;
      display: block;
      position: absolute;
      left: calc(50% + 0.925em - var(--emoji-variation-marker-size));
      top: calc(50% + 0.925em - var(--emoji-variation-marker-size));
      width: var(--emoji-variation-marker-size);
      height: var(--emoji-variation-marker-size);
      border: var(--emoji-variation-marker-border-width) solid var(--emoji-variation-marker-border-color);
      border-top: 0 none;
      border-left: 0 none;
    }
    .base-emoji > .button:hover + .variations-marker,
    .base-emoji > .button:focus + .variations-marker {
      border-color: var(--emoji-variation-marker-border-color-hover);
    }

    /* Emoji variations panel */
    .results .backdrop {
      display: none;
      position: absolute;
      z-index: 10;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--variations-backdrop-fill-color);
    }
    .results.highlight .backdrop {
      display: block;
    }
    .base-emoji .variations {
      position: absolute;
      z-index: 30;
      display: none;
      grid-template-columns: repeat(auto-fit, minmax(1.85em, 1fr));
      grid-gap: 0.2em;
      padding: 0.8em;
      max-width: 13.7em;
      top: 0;
      left: 0;
      background-color: var(--variations-fill-color);
      border-radius: var(--variations-border-radius);
      box-shadow: var(--variations-box-shadow);
      outline: none;
    }
    .base-emoji.active .variations {
      display: grid;
    }
  </style>
  <div class="emoji-picker">
    <div class="header">
      <div class="group-filters"></div>
    </div>
    <scrollable-component class="content">
      <div class="title-bar">
        <div class="title"></div>
        <input class="search-input" autocomplete="off" spellcheck="false">
      </div>
      <div class="results">
        <div class="backdrop"></div>
      </div>
    </scrollable-component>
  </div>
`;

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
    this.searchGroup = this.groups.get('search');
    this.activeGroup = null;
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
      if (group !== this.searchGroup) {
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
      if (group !== this.searchGroup) {
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
    if (this.activeGroup === this.searchGroup) {
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
        if (translation[groupKey].emoji) {
          group.title = translation[groupKey].title;
          groupFilterElement.querySelector('.button').setAttribute('title', group.title);
        }
      }
    }
    if (this.activeGroup) {
      this.titleElement.innerHTML = this.activeGroup.title;
    }
  }

  selectGroup(groupKey) {
    // Reset viewport
    if (this.activeBaseEmoji) {
      this.closeVariationsPanel();
    }
    if (this.activeGroup) {
      this.contentElement.viewport.scrollTop = 0;
    }

    // Reset search
    if (this.activeGroup === this.searchGroup) {
      this.searchInputElement.value = '';
      for (const [baseEmoji, baseEmojiElement] of this.baseEmojiElements) {
        baseEmojiElement.classList.remove('hidden');
      }
    }

    // Switch active state
    const group = this.groups.get(groupKey);
    if (group !== this.activeGroup) {

      // Reset previous group filter
      if (this.activeGroup) {
        this.groupFilterElements.get(this.activeGroup).classList.remove('active');
        if (this.activeGroup === this.searchGroup) {
          for (const [group, groupElement] of this.groupElements) {
            groupElement.classList.remove('active');
          }
        }
        else {
          this.groupElements.get(this.activeGroup).classList.remove('active');
        }
      }

      // Set new group filter
      this.activeGroup = group;
      this.titleElement.innerHTML = this.activeGroup.title;
      this.groupFilterElements.get(this.activeGroup).classList.add('active');
      if (this.activeGroup === this.searchGroup) {
        this.titleElement.classList.add('hidden');
        this.searchInputElement.classList.remove('hidden');
        this.searchInputElement.focus();
        for (const [group, groupElement] of this.groupElements) {
          groupElement.classList.add('active');
        }
      }
      else {
        this.titleElement.classList.remove('hidden');
        this.searchInputElement.classList.add('hidden');
        this.groupElements.get(this.activeGroup).classList.add('active');
      }
    }

    // Focus search input if needed
    if (group === this.searchGroup) {
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
    this.contentElement.viewport.scrollTop = 0;
    for (const [baseEmoji, baseEmojiElement] of this.baseEmojiElements) {
      if(this.emojiMatchTerms(baseEmoji, searchTerms)) {
        baseEmojiElement.classList.remove('hidden');
      }
      else {
        baseEmojiElement.classList.add('hidden');
      }
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
      const minTargetTop = this.contentElement.viewport.scrollTop + this.resultsElement.offsetTop;
      const maxTargetBottom = this.contentElement.viewport.scrollTop + this.contentElement.viewport.offsetHeight;
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
          const maxScrollOffset = baseEmoji.offsetTop - this.contentElement.viewport.scrollTop - this.scrollToEmojiViewportMargin;
          const targetScrollOffset = targetBottom - maxTargetBottom + this.scrollToEmojiViewportMargin;
          this.contentElement.viewport.scrollTop += Math.min(maxScrollOffset, targetScrollOffset);
        }
      }
    }
  }

  scrollToEmoji(baseEmojiElement, emojiElement) {
    const minTop = this.contentElement.viewport.scrollTop + this.resultsElement.offsetTop + this.scrollToEmojiViewportMargin;
    const maxBottom = this.contentElement.viewport.scrollTop + this.contentElement.viewport.offsetHeight - this.scrollToEmojiViewportMargin;
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
      this.contentElement.viewport.scrollTop += currentTop - minTop;
    }
    else if (currentBottom > maxBottom) {
      this.contentElement.viewport.scrollTop += currentBottom - maxBottom;
    }
  }
}

window.customElements.define('unicode-emoji-picker', EmojiPickerElement);
