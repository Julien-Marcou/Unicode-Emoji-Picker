import { Emoji } from 'unicode-emoji';

export type EmojiGroupKey = 'search' | 'face-emotion' | 'food-drink' | 'animals-nature' | 'activities-events' | 'person-people' | 'travel-places' | 'objects' | 'symbols' | 'flags';

export type EmojiPickerTranslation = {
  'search'?: {
    emoji?: string,
    title?: string,
    inputPlaceholder?: string,
  },
  'face-emotion'?: {
    emoji?: string,
    title?: string,
  },
  'food-drink'?: {
    emoji?: string,
    title?: string,
  },
  'animals-nature'?: {
    emoji?: string,
    title?: string,
  },
  'activities-events'?: {
    emoji?: string,
    title?: string,
  },
  'person-people'?: {
    emoji?: string,
    title?: string,
  },
  'travel-places'?: {
    emoji?: string,
    title?: string,
  },
  'objects'?: {
    emoji?: string,
    title?: string,
  },
  'symbols'?: {
    emoji?: string,
    title?: string,
  },
  'flags'?: {
    emoji?: string,
    title?: string,
  },
};

export type EmojiPickEvent = CustomEvent<Emoji>;

export interface EmojiPickerEventMap extends HTMLElementEventMap {
  'emoji-pick': EmojiPickEvent;
}

export class EmojiPickerElement extends HTMLElement {
  public selectGroup(groupKey: EmojiGroupKey): void;
  public searchEmoji(query: string): void;
  public setTranslation(translation: EmojiPickerTranslation): void;
  public addEventListener<K extends keyof EmojiPickerEventMap>(type: K, listener: (this: EmojiPickerElement, ev: EmojiPickerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  public removeEventListener<K extends keyof EmojiPickerEventMap>(type: K, listener: (this: EmojiPickerElement, ev: EmojiPickerEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
}

declare global {
  interface HTMLElementTagNameMap {
    'unicode-emoji-picker': EmojiPickerElement;
  }
}
