import test from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, getTheme, themeVariables } from '../src/data/themes.js';
import { defaultContent, fromRow, validateContent } from '../src/services/siteContent.js';
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
test('12 distinct palettes provide readable white button text', () => {
  assert.equal(THEMES.length,12);
  assert.equal(new Set(THEMES.map(theme=>theme.id)).size,12);
  for(const theme of THEMES) {
    const contrast = 1.05/(luminance(theme.primary)+.05);
    assert.ok(contrast>=4.5,`${theme.name} contrast: ${contrast}`);
    assert.equal(themeVariables(theme.id)['--green'],theme.primary);
    assert.equal(themeVariables(theme.id)['--dark-green'],theme.dark);
  }
});
test('saved theme survives database mapping and the save validator', () => {
  for(const theme of THEMES) {
    const loaded=fromRow({...Object.fromEntries(Object.entries(defaultContent).map(([key,value])=>[key.replace(/[A-Z]/g,l=>'_'+l.toLowerCase()),value])),theme_key:theme.id});
    assert.equal(loaded.themeKey,theme.id);
    assert.equal(validateContent(loaded).themeKey,theme.id);
  }
});
test('missing themes fall back and unsupported save values are rejected', () => {
  assert.equal(getTheme('unknown').id,'forest');
  assert.equal(fromRow({name:'Test'}).themeKey,'forest');
  assert.equal(fromRow(null).themeKey,'forest');
  assert.equal(validateContent({...defaultContent,themeKey:undefined}).themeKey,'forest');
  assert.throws(()=>validateContent({...defaultContent,themeKey:'invalid'}),/available website themes/);
});
