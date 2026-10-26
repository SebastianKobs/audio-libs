// The little of a browser the arrangement's drawer needs in node: a document making elements that keep what they're
// told (their listeners, a canvas's width) and canvases whose context takes whatever is drawn and keeps nothing.
const WIDTH = 400; // px: a canvas as wide as it's shown

// A document of the stand-in, and the elements it made, in order, to find one by its class.
export function standInDocument() {
  const made = [];
  const document = {
    createElement() {
      const element = elementOf();
      made.push(element);
      return element;
    },
  };
  return { document, made };
}

function elementOf() {
  const listeners = {};
  const element = {
    className: '',
    style: {},
    dataset: {},
    clientWidth: WIDTH,
    clientHeight: 0,
    width: 0,
    height: 0,
    listeners,
    append() {},
    prepend() {},
    replaceChildren() {},
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    getBoundingClientRect: () => ({ left: 0 }),
    setPointerCapture() {},
    getContext: () => contextOf(element),
  };
  return element;
}
function contextOf(canvas) {
  const kept = { canvas };
  return new Proxy(kept, {
    get: (target, name) => (name in target ? target[name] : () => {}),
    set(target, name, value) {
      target[name] = value;
      return true;
    },
  });
}
