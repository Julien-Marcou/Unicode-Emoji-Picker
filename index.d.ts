import { Emoji, Category } from 'unicode-emoji';

export type EmojiTabKey = Category | 'search';

export type EmojiCategoryTabTranslation = {
  emoji?: string;
  title?: string;
};

export type EmojiSearchTabTranslation = EmojiCategoryTabTranslation & {
  inputPlaceholder?: string;
};

export type EmojiPickerTranslation = Partial<{ search: EmojiSearchTabTranslation } & Record<Category, EmojiCategoryTabTranslation>>;

export type EmojiPickEvent = CustomEvent<Emoji>;

export interface EmojiPickerEventMap extends HTMLElementEventMap {
  'emoji-pick': EmojiPickEvent;
}

export class EmojiPickerElement extends HTMLElement {
  public readonly selectedTab: EmojiTabKey;
  public selectTab(tabKey: EmojiTabKey): void;
  public searchEmoji(query: string): void;
  public clearSearch(): void;
  public setTranslation(translation: EmojiPickerTranslation): void;
  public addEventListener<K extends keyof EmojiPickerEventMap>(type: K, listener: (this: EmojiPickerElement, ev: EmojiPickerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  public removeEventListener<K extends keyof EmojiPickerEventMap>(type: K, listener: (this: EmojiPickerElement, ev: EmojiPickerEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  public focusHeader(): void;
  public focusContent(skipSearchInput?: boolean): void;
}

export function defineUnicodeEmojiPicker(): void;
export function isUnicodeEmojiPickerDefined(): boolean;
export function whenUnicodeEmojiPickerDefined(): Promise<CustomElementConstructor>;

declare global {
  interface HTMLElementTagNameMap {
    'unicode-emoji-picker': EmojiPickerElement;
  }
}
