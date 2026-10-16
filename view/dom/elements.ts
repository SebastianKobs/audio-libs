// ---------- view/dom/elements: an element made, and HTML made by html``, every value escaped as it's made ----------
export function makeElement<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  className?: string,
  text?: string | null,
): HTMLElementTagNameMap[Tag] {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text != null) {
    element.textContent = text;
  }
  return element;
}
// HTML made by html``: its values escaped as it was made, so it goes into the page as it is
export class Html {
  readonly text: string;
  constructor(text: string) {
    this.text = text;
  }
}
// HTML from a template, each value in it as HTML (htmlOf()): a name from the theme, the desk or the garden stays text
export function html(strings: TemplateStringsArray, ...values: unknown[]): Html {
  return new Html(strings.reduce((made, string, index) => made + htmlOf(values[index - 1]) + string));
}
// a value as HTML: HTML html`` made as it is, a list's items one after another, anything else as text, escaped
function htmlOf(value: unknown): string {
  if (value instanceof Html) {
    return value.text;
  }
  if (Array.isArray(value)) {
    return value.map(htmlOf).join('');
  }
  return escapeHtml(value);
}
function escapeHtml(text: unknown): string {
  return String(text).replace(/[&<>"]/g, (character) => `&#${character.charCodeAt(0)};`);
}
// the views' one way into the page's HTML: what html`` made
export function setHtml(element: Element, made: Html): void {
  // oxlint-disable-next-line no-unsanitized/property -- made by html``, every value escaped as it was made
  element.innerHTML = made.text;
}
// and what html`` made added after what's there, as a row grows by a device
export function appendHtml(element: Element, made: Html): void {
  // oxlint-disable-next-line no-unsanitized/method -- made by html``, every value escaped as it was made
  element.insertAdjacentHTML('beforeend', made.text);
}
