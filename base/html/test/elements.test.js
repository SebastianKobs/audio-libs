// The views' HTML tag (mockup/src/libs/base/html/elements.ts): every value escaped as the HTML is made,
// so a name with <, >, & or " stays text; HTML the tag made goes in as it is, and a list's items one after another
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { html } from '../index.ts';

test('a value is escaped as the HTML is made: a name with <, >, & or " stays text, in an element or an attribute', () => {
  const name = 'a <b> & "c"';
  assert.equal(
    html`<i title="${name}">${name}</i>`.text,
    '<i title="a &#60;b&#62; &#38; &#34;c&#34;">a &#60;b&#62; &#38; &#34;c&#34;</i>',
  );
});

test('a number goes in as its text, and so does a string with nothing to escape', () => {
  assert.equal(html`<i style="--v:${0.5}">${'pan'} ${-1}</i>`.text, '<i style="--v:0.5">pan -1</i>');
});

test('HTML the tag made goes in as it is, and a list, its items one after another', () => {
  const cells = ['1 < 2', 'two'].map((text) => html`<b>${text}</b>`);
  assert.equal(html`<div>${cells}${html`<br>`}${[]}</div>`.text, '<div><b>1 &#60; 2</b><b>two</b><br></div>');
});

test("a string that only looks like HTML isn't HTML the tag made: it's text", () => {
  assert.equal(html`<div>${'<br>'}</div>`.text, '<div>&#60;br&#62;</div>');
});
