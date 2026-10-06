const test = require('node:test');
const assert = require('node:assert/strict');
const {preferredLanguage, homeRedirect, switchURL} = require('../assets/ink.js');
const root = 'https://alexsoft.co.kr/';

test('uses the first supported language in browser priority order', () => {
  for (const [languages, expected] of [
    [['ko-KR'], 'ko'], [['en-US'], 'en'], [['en-GB'], 'en'],
    [['fr-FR','ko-KR','en-US'], 'ko'], [['en-GB','ko-KR'], 'en'],
    [['ko','en'], 'ko'], [['ja-JP','de-DE'], 'en'], [['KO-kr'], 'ko']
  ]) assert.equal(preferredLanguage(languages, 'en'), expected);
  assert.equal(preferredLanguage([], 'ko-KR'), 'ko');
  assert.equal(preferredLanguage(undefined, undefined), 'en');
});
test('explicit URLs precede preference and autodetection', () => {
  for (const url of [root+'?lang=ko', root+'work/', root+'en/', root+'en/work/', root+'insights/ai-result-quality/'])
    assert.equal(homeRedirect(url, 'en', ['en-US']), null);
  assert.equal(homeRedirect(root+'?lang=en#about', 'ko', ['ko-KR']), root+'en/#about');
});
test('general home uses a valid saved manual preference before navigator', () => {
  assert.equal(homeRedirect(root, 'ko', ['en-US']), null);
  assert.equal(homeRedirect(root, 'en', ['ko-KR']), root+'en/');
  assert.equal(homeRedirect(root, 'invalid', ['ko-KR']), null);
  assert.equal(homeRedirect(root, null, ['ja-JP']), root+'en/');
});
test('automatic replacement preserves query and section; back navigation never re-routes', () => {
  assert.equal(homeRedirect(root+'?utm_source=linkedin#about', null, ['en-GB']), root+'en/?utm_source=linkedin#about');
  assert.equal(homeRedirect(root, 'en', ['en-US'], 'en-US', 'back_forward'), null);
  assert.equal(homeRedirect(root, 'en', ['en-US'], 'en-US', 'reload'), root+'en/');
});
test('switch keeps counterpart path, query and section without leaking language query', () => {
  assert.equal(switchURL(root+'en/work/', root+'work/?utm_source=linkedin#emr'), root+'en/work/?utm_source=linkedin#emr');
  assert.equal(switchURL(root+'?lang=ko', root+'en/?a=1#about'), root+'?a=1&lang=ko#about');
  assert.equal(switchURL(root+'en/', root+'?lang=ko#about'), root+'en/#about');
  assert.equal(switchURL(root+'work/', root+'en/work/', '#eis'), root+'work/#eis');
});
