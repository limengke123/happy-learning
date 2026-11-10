/* Momo Word Basket app logic. */
(function () {
  'use strict';

  var DATA = window.MOMO_DATA;
  if (!DATA || !Array.isArray(DATA.words)) {
    document.body.textContent = '词库加载失败：请确认 word-data.js 与 index.html 在同一目录。';
    return;
  }
  var WORDS = DATA.words;
  var ACTIONS = DATA.actions;
  var PACKS = DATA.packs || [];
  var BY_ID = {};
  WORDS.forEach(function (w) { BY_ID[w.id] = w; });

  var LANGS = ['en', 'fr'];
  var POS = {
    noun: { label: '名词', hint: '人、东西、地方' },
    verb: { label: '动词', hint: '动作' },
    adj: { label: '形容词', hint: '样子、感觉' },
    position: { label: '位置词', hint: '在哪里' }
  };
  var POS_ORDER = ['noun', 'verb', 'adj', 'position'];
  var PACK_BY_ID = {};
  PACKS.forEach(function (p) { PACK_BY_ID[p.id] = p; });
  var INTERVALS = [1, 2, 4, 8, 16];
  var KEY = 'momo-word-basket.v1';
  var COLORS = ['#FF8A6B', '#FFCE6B', '#8FD3B6', '#86C5EA', '#E97A9A', '#B79CED', '#F4A261'];

  var CONFUSE = {
    banana: ['moon'], moon: ['banana'],
    cat: ['dog', 'bear'], dog: ['cat', 'bear'], bear: ['cat', 'dog'],
    duck: ['bird'], bird: ['duck'],
    sun: ['star'], star: ['sun'],
    flower: ['tree'], tree: ['flower']
  };
  [
    ['cat', 'lion'], ['cat', 'tiger'], ['lion', 'tiger'],
    ['bear', 'elephant'], ['bear', 'monkey'], ['duck', 'penguin'], ['zebra', 'penguin'],
    ['bus', 'train'], ['bus', 'car'], ['train', 'car'], ['car', 'bicycle'],
    ['airplane', 'helicopter'], ['airplane', 'rocket'], ['helicopter', 'rocket'],
    ['bird', 'airplane'], ['bird', 'helicopter'],
    ['fish', 'boat'], ['fish', 'turtle'], ['apple', 'orange'], ['ball', 'orange'],
    ['strawberry', 'grapes'], ['cake', 'cookie'],
    ['cloud', 'rain'], ['cloud', 'snowflake'], ['rain', 'water'], ['ice', 'water'],
    ['star', 'snowflake'], ['tree', 'mountain'], ['tree', 'giraffe'], ['house', 'castle'],
    ['hand', 'nose'], ['hand', 'eyes'], ['nose', 'eyes'],
    ['skirt', 'dress'], ['triangle', 'rectangle'], ['teeth', 'tongue'],
    ['dirty', 'clean'], ['sky', 'cloud'], ['sky', 'sun'], ['sea', 'water'],
    ['snack', 'cookie'], ['snack', 'cake'], ['yogurt', 'milk'], ['papers', 'book'],
    ['goat', 'donkey'], ['put_on', 'take_off'], ['move', 'fall'], ['belt', 'scarf'],
    ['underwear', 'skirt'], ['underwear', 'dress'], ['underwear', 'scarf'],
    ['snack', 'apple'], ['snack', 'orange'], ['snack', 'grapes'], ['snack', 'watermelon'],
    ['snack', 'cookie'], ['snack', 'cake'], ['snack', 'yogurt'], ['snack', 'milk'], ['snack', 'cashews'],
    ['share', 'cookie'], ['share', 'snack'], ['prepare', 'egg'], ['prepare', 'cake'],
    ['catch', 'ball'], ['yogurt', 'spoon'],
    ['get_dressed', 'dirty'], ['get_dressed', 'clean'], ['get_dressed', 'skirt'],
    ['get_dressed', 'dress'], ['get_dressed', 'underwear'], ['get_dressed', 'put_on'],
    ['get_dressed', 'take_off'], ['work', 'papers']
  ].forEach(function (pair) {
    CONFUSE[pair[0]] = CONFUSE[pair[0]] || [];
    CONFUSE[pair[1]] = CONFUSE[pair[1]] || [];
    if (CONFUSE[pair[0]].indexOf(pair[1]) < 0) CONFUSE[pair[0]].push(pair[1]);
    if (CONFUSE[pair[1]].indexOf(pair[0]) < 0) CONFUSE[pair[1]].push(pair[0]);
  });

  var INTRO = { en: "Let's play!", fr: 'On joue !' };
  var RETRY = { en: 'Hmm... try again.', fr: 'Hmm... essaie encore.' };
  var END = { en: 'You did it! Bravo!', fr: "C'est fini ! Bravo !" };
  var CHECK = { en: "Let's check your words! Listen carefully.", fr: 'On vérifie les mots ! Écoute bien.' };
  var CHECK_END = { en: "Good job! Let's look at the words together.", fr: 'Bravo ! Regardons les mots ensemble.' };

  var MOMO = '' +
    '<svg class="momo" viewBox="0 0 220 210" aria-hidden="true">' +
      '<g class="momo-bob">' +
        '<g><ellipse cx="78" cy="44" rx="17" ry="38" fill="#EFC094" transform="rotate(-9 78 44)"/><ellipse cx="78" cy="46" rx="8" ry="24" fill="#F6B8B0" transform="rotate(-9 78 46)"/></g>' +
        '<g><ellipse cx="142" cy="44" rx="17" ry="38" fill="#EFC094" transform="rotate(9 142 44)"/><ellipse cx="142" cy="46" rx="8" ry="24" fill="#F6B8B0" transform="rotate(9 142 46)"/></g>' +
        '<ellipse cx="110" cy="130" rx="66" ry="63" fill="#F4C99B"/>' +
        '<ellipse cx="110" cy="151" rx="43" ry="37" fill="#FFF3DF"/>' +
        '<g class="eyes"><ellipse cx="86" cy="114" rx="6.5" ry="7.5" fill="#4A3226"/><ellipse cx="134" cy="114" rx="6.5" ry="7.5" fill="#4A3226"/><circle cx="88" cy="111" r="2.2" fill="#fff"/><circle cx="136" cy="111" r="2.2" fill="#fff"/></g>' +
        '<ellipse cx="68" cy="132" rx="11" ry="6" fill="#F7A9A0" opacity=".75"/><ellipse cx="152" cy="132" rx="11" ry="6" fill="#F7A9A0" opacity=".75"/>' +
        '<path d="M103 125 Q110 131 117 125" stroke="#4A3226" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M99 136 Q110 146 121 136" stroke="#4A3226" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
        '<path d="M75 170 Q110 184 145 170" stroke="#8FD3B6" stroke-width="13" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="48" cy="174" rx="10" ry="13" fill="#F4C99B"/><ellipse cx="172" cy="174" rx="10" ry="13" fill="#F4C99B"/>' +
      '</g>' +
    '</svg>';

  document.querySelectorAll('[data-momo]').forEach(function (el) { el.innerHTML = MOMO; });

  /* Hand-drawn SVG art for comparisons that need a controlled layout
     (positions, shapes, dirty/clean). Keyed by word id. Rendering order is
     FLASHCARDS -> ART -> the word's emoji. */
  var ART = {
    rectangle:
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
        '<rect x="12" y="28" width="76" height="44" rx="9" fill="#86C5EA" stroke="#5B4636" stroke-width="3"/>' +
        '<path d="M22 38 H78" stroke="#FFF3DF" stroke-width="3" stroke-linecap="round" opacity=".55"/>' +
        '<circle cx="18" cy="34" r="2.4" fill="#5B4636"/><circle cx="82" cy="34" r="2.4" fill="#5B4636"/>' +
        '<circle cx="18" cy="66" r="2.4" fill="#5B4636"/><circle cx="82" cy="66" r="2.4" fill="#5B4636"/>' +
      '</svg>',

    triangle:
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
        '<path d="M50 16 L88 80 H12 Z" fill="#FF8A6B" stroke="#5B4636" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M50 28 L76 72 H24 Z" fill="none" stroke="#FFF3DF" stroke-width="2.4" opacity=".5"/>' +
        '<circle cx="50" cy="16" r="2.4" fill="#5B4636"/><circle cx="88" cy="80" r="2.4" fill="#5B4636"/><circle cx="12" cy="80" r="2.4" fill="#5B4636"/>' +
      '</svg>',

    dirty:
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
        '<path d="M35 24 L43 28 Q50 35 57 28 L65 24 L80 34 L72 47 L66 43 L68 82 Q50 88 32 82 L34 43 L28 47 L20 34 Z" fill="#FFFDF8" stroke="#5B4636" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M43 29 Q50 36 57 29" fill="none" stroke="#5B4636" stroke-width="2.4" opacity=".5"/>' +
        '<ellipse cx="42" cy="55" rx="8" ry="6" fill="#8C5A32"/>' +
        '<ellipse cx="58" cy="67" rx="6" ry="4.5" fill="#8C5A32"/>' +
        '<ellipse cx="52" cy="45" rx="4" ry="3.2" fill="#6D8C45"/>' +
        '<path d="M37 76 q5 4 10 0" fill="none" stroke="#B98A5E" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M74 22 q4 -5 8 0" fill="none" stroke="#5B4636" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>' +
      '</svg>',

    clean:
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
        '<path d="M35 24 L43 28 Q50 35 57 28 L65 24 L80 34 L72 47 L66 43 L68 82 Q50 88 32 82 L34 43 L28 47 L20 34 Z" fill="#F4FBFF" stroke="#5B4636" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M43 29 Q50 36 57 29" fill="none" stroke="#5B4636" stroke-width="2.4" opacity=".5"/>' +
        '<path d="M22 22 l2.5 7 7 2.5 -7 2.5 -2.5 7 -2.5 -7 -7 -2.5 7 -2.5 Z" fill="#FFCE6B"/>' +
        '<path d="M78 62 l2 5.5 5.5 2 -5.5 2 -2 5.5 -2 -5.5 -5.5 -2 5.5 -2 Z" fill="#FFCE6B"/>' +
        '<path d="M62 20 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6 Z" fill="#86C5EA"/>' +
        '<path d="M72 38 q6 0 6 6 q0 6 -6 6 q-6 0 -6 -6 q0 -6 6 -6" fill="#EAF7FF" stroke="#5B4636" stroke-width="2" opacity=".8"/>' +
      '</svg>',

    on:
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
        '<ellipse cx="50" cy="87" rx="30" ry="4" fill="#5B4636" opacity=".10"/>' +
        '<rect x="30" y="48" width="40" height="34" rx="5" fill="#EFC182" stroke="#5B4636" stroke-width="3"/>' +
        '<path d="M30 58 H70" stroke="#5B4636" stroke-width="2" opacity=".4"/>' +
        '<circle cx="50" cy="38" r="10" fill="#FF8A6B" stroke="#5B4636" stroke-width="3"/>' +
        '<circle cx="46" cy="34" r="2.4" fill="#FFF3DF"/>' +
      '</svg>',

    inside:
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
        '<ellipse cx="50" cy="87" rx="30" ry="4" fill="#5B4636" opacity=".10"/>' +
        '<path d="M30 34 H70 V76 H30 Z" fill="#E0A96B" stroke="#5B4636" stroke-width="3"/>' +
        '<circle cx="50" cy="64" r="10" fill="#FF8A6B" stroke="#5B4636" stroke-width="3"/>' +
        '<circle cx="46" cy="60" r="2.4" fill="#FFF3DF"/>' +
        '<path d="M26 56 H74 V82 H26 Z" fill="#EFC182" stroke="#5B4636" stroke-width="3"/>' +
        '<path d="M26 56 H74" stroke="#5B4636" stroke-width="3"/>' +
        '<path d="M32 60 V78 M68 60 V78" stroke="#5B4636" stroke-width="1.8" opacity=".25"/>' +
      '</svg>',

    under:
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
        '<ellipse cx="50" cy="87" rx="30" ry="4" fill="#5B4636" opacity=".10"/>' +
        '<rect x="30" y="24" width="40" height="34" rx="5" fill="#EFC182" stroke="#5B4636" stroke-width="3"/>' +
        '<path d="M30 34 H70" stroke="#5B4636" stroke-width="2" opacity=".4"/>' +
        '<circle cx="50" cy="70" r="10" fill="#FF8A6B" stroke="#5B4636" stroke-width="3"/>' +
        '<circle cx="46" cy="66" r="2.4" fill="#FFF3DF"/>' +
      '</svg>',

    in_front:
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
        '<ellipse cx="50" cy="87" rx="30" ry="4" fill="#5B4636" opacity=".10"/>' +
        '<rect x="30" y="34" width="40" height="36" rx="5" fill="#EFC182" stroke="#5B4636" stroke-width="3"/>' +
        '<path d="M30 44 H70" stroke="#5B4636" stroke-width="2" opacity=".4"/>' +
        '<circle cx="50" cy="74" r="11" fill="#FF8A6B" stroke="#5B4636" stroke-width="3"/>' +
        '<circle cx="46" cy="70" r="2.6" fill="#FFF3DF"/>' +
      '</svg>',

    behind:
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
        '<ellipse cx="50" cy="87" rx="30" ry="4" fill="#5B4636" opacity=".10"/>' +
        '<circle cx="64" cy="60" r="17" fill="#FF8A6B" stroke="#5B4636" stroke-width="3"/>' +
        '<circle cx="74" cy="54" r="3.6" fill="#FFF3DF"/>' +
        '<rect x="22" y="42" width="42" height="42" rx="5" fill="#EFC182" stroke="#5B4636" stroke-width="3"/>' +
        '<path d="M22 52 H64" stroke="#5B4636" stroke-width="2" opacity=".4"/>' +
        '<path d="M30 62 V78 M50 62 V78" stroke="#5B4636" stroke-width="1.8" opacity=".25"/>' +
      '</svg>',

    next_to:
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
        '<ellipse cx="50" cy="87" rx="34" ry="4" fill="#5B4636" opacity=".10"/>' +
        '<rect x="16" y="48" width="34" height="32" rx="5" fill="#EFC182" stroke="#5B4636" stroke-width="3"/>' +
        '<path d="M16 57 H50" stroke="#5B4636" stroke-width="2" opacity=".4"/>' +
        '<circle cx="68" cy="70" r="10" fill="#FF8A6B" stroke="#5B4636" stroke-width="3"/>' +
        '<circle cx="64" cy="66" r="2.4" fill="#FFF3DF"/>' +
      '</svg>'
  };

  // Downloaded picture cards for concepts that are hard to read as an emoji.
  // Source: ARASAAC (https://arasaac.org), author Sergio Palao, Gobierno de
  // Aragón, CC BY-NC-SA 4.0. Files are cropped/scaled, not redrawn.
  var FLASHCARDS = {
    share: 'flashcards/share.png',
    move: 'flashcards/move.png',
    fall: 'flashcards/fall.png',
    get_dressed: 'flashcards/get_dressed.png',
    prepare: 'flashcards/prepare.png',
    push: 'flashcards/push.png',
    catch: 'flashcards/catch.png',
    blow: 'flashcards/blow.png',
    take_off: 'flashcards/take_off.png',
    put_on: 'flashcards/put_on.png',
    donkey: 'flashcards/donkey.png',
    skirt: 'flashcards/skirt.png',
    dress: 'flashcards/dress.png',
    belt: 'flashcards/belt.png',
    yogurt: 'flashcards/yogurt.png',
    cashews: 'flashcards/cashews.png',
    snack: 'flashcards/snack.png',
    papers: 'flashcards/papers.png',
    sky: 'flashcards/sky.png'
  };


  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function blank() { return { lvl: 0, due: 0, seen: false, tries: 0, misses: 0 }; }

  function todayKey() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ settings: settings, progress: progress })); }
    catch (e) {}
  }

  function normalize(p) {
    p = p || {};
    p.words = p.words || {};
    WORDS.forEach(function (w) {
      var r = p.words[w.id] || {};
      ['en', 'fr'].forEach(function (l) {
        r[l] = Object.assign(blank(), r[l] || {});
        r[l].lvl = Math.max(0, Math.min(5, Number(r[l].lvl) || 0));
        r[l].due = Number(r[l].due) || 0;
        r[l].seen = !!r[l].seen;
        r[l].tries = Math.max(0, Number(r[l].tries) || 0);
        r[l].misses = Math.max(0, Number(r[l].misses) || 0);
      });
      p.words[w.id] = r;
    });
    p.sessions = Math.max(0, Number(p.sessions) || 0);
    p.stats = Object.assign({ trials: 0, firstTry: 0 }, p.stats || {});
    p.checks = p.checks || {};
    // Concepts shown in the previous round. Kept as a separate list so a
    // word never comes back in the very next round just because its due date
    // says so; the due date is still honored one round later.
    var recent = [];
    (Array.isArray(p.recent) ? p.recent : []).forEach(function (id) {
      if (BY_ID[id] && recent.indexOf(id) < 0) recent.push(id);
    });
    p.recent = recent.slice(0, 20);

    // Real confusion pairs: target word -> the card the child tapped instead.
    // Older saves simply get an empty map.
    var confusions = {};
    var rawConfusions = p.confusions && typeof p.confusions === 'object' ? p.confusions : {};
    Object.keys(rawConfusions).forEach(function (targetId) {
      if (!BY_ID[targetId] || !rawConfusions[targetId] || typeof rawConfusions[targetId] !== 'object') return;
      var row = {};
      Object.keys(rawConfusions[targetId]).forEach(function (chosenId) {
        if (!BY_ID[chosenId] || chosenId === targetId) return;
        var count = Math.max(0, Number(rawConfusions[targetId][chosenId]) || 0);
        if (count > 0) row[chosenId] = count;
      });
      if (Object.keys(row).length) confusions[targetId] = row;
    });
    p.confusions = confusions;

    var days = {};
    var rawDays = p.days && typeof p.days === 'object' ? p.days : {};
    Object.keys(rawDays).forEach(function (key) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
      var n = Math.max(0, Number(rawDays[key]) || 0);
      if (n > 0) days[key] = n;
    });
    p.days = days;

    var altPicks = {};
    var rawAltPicks = p.altPicks && typeof p.altPicks === 'object' ? p.altPicks : {};
    Object.keys(rawAltPicks).forEach(function (key) {
      if (!/^[a-z0-9_]+:(en|fr):[123]$/.test(key)) return;
      var n = Number(rawAltPicks[key]);
      if (Number.isInteger(n) && n >= 0 && n <= 2) altPicks[key] = n;
    });
    p.altPicks = altPicks;
    return p;
  }

  var saved = load();
  var settings = Object.assign({ mode: 'both', length: 8, showHint: true, enLevel: 2, frLevel: 3, speed: 1, pos: 'all', pack: '' }, saved.settings || {});
  if (['en', 'fr', 'both'].indexOf(settings.mode) < 0) settings.mode = 'both';
  if ([6, 8, 10].indexOf(Number(settings.length)) < 0) settings.length = 8;
  settings.length = Number(settings.length);
  settings.showHint = settings.showHint !== false;
  settings.enLevel = [1, 2, 3].indexOf(Number(settings.enLevel)) >= 0 ? Number(settings.enLevel) : 2;
  settings.frLevel = [1, 2, 3].indexOf(Number(settings.frLevel)) >= 0 ? Number(settings.frLevel) : 3;
  settings.speed = [0.8, 1, 1.2].indexOf(Number(settings.speed)) >= 0 ? Number(settings.speed) : 1;
  if (settings.pos !== 'all' && !POS[settings.pos]) settings.pos = 'all';
  if (!PACK_BY_ID[settings.pack]) settings.pack = PACKS[0] ? PACKS[0].id : '';
  // One-time move from the old two-level French setup to the new L3. The
  // parent asked for the deeper French prompts; switching back is one tap in
  // the settings sheet. Explicit L1 stays untouched.
  var migratedFr3 = false;
  if (saved.settings && !saved.settings.frLevelV3) {
    if (Number(saved.settings.frLevel) === 2) settings.frLevel = 3;
    settings.frLevelV3 = true;
    migratedFr3 = true;
  } else if (!saved.settings) {
    settings.frLevelV3 = true;
  }
  var progress = normalize(saved.progress);
  if (migratedFr3) save();

  var EN_LEVELS = { 1: '单词句', 2: '两句话', 3: '听描述猜' };
  var FR_LEVELS = { 1: '简短', 2: '形容句', 3: '听描述猜' };
  // The five Elsa/ice words enter the first round first, so the child meets
  // her interest words immediately instead of waiting for a random draw.
  var INTEREST = { elsa: true, snowflake: true, ice: true, magic: true, castle: true };

  function levelFor(lang) {
    return lang === 'en' ? settings.enLevel : settings.frLevel;
  }

  function promptFor(item) {
    var word = BY_ID[item.id][item.lang];
    var level = Math.min(item.level || levelFor(item.lang), word.prompts.length);
    var index = level - 1;
    var alts = word.alts && word.alts[String(level)];
    var variant = Math.max(0, Math.min(Number(item.variant) || 0, alts ? alts.length : 0));
    var suffix = index === 0 ? '' : String(index + 1);
    if (variant > 0) suffix += String.fromCharCode(97 + variant); // b, c
    return {
      text: variant > 0 ? alts[variant - 1] : word.prompts[index],
      file: item.lang + '/' + item.id + '_prompt' + suffix,
      level: level,
      variant: variant
    };
  }

  function pickVariant(id, lang, level) {
    var word = BY_ID[id][lang];
    var alts = word.alts && word.alts[String(level)];
    var count = 1 + (alts ? alts.length : 0);
    if (count <= 1) return 0;
    var key = id + ':' + lang + ':' + level;
    var last = progress.altPicks[key];
    var pool = [];
    for (var i = 0; i < count; i++) if (i !== last) pool.push(i);
    var pick = pool[Math.floor(Math.random() * pool.length)];
    progress.altPicks[key] = pick;
    return pick;
  }

  var state = {
    screen: 'home',
    session: null,
    last: null,
    starting: false
  };

  function getRec(id) {
    if (!progress.words[id]) progress.words[id] = { en: blank(), fr: blank() };
    var r = progress.words[id];
    if (!r.en) r.en = blank();
    if (!r.fr) r.fr = blank();
    return r;
  }

  function mastered(lang) {
    return WORDS.filter(function (w) { return getRec(w.id)[lang].seen && getRec(w.id)[lang].lvl >= 3; }).length;
  }

  function seenCount(lang) {
    return WORDS.filter(function (w) { return getRec(w.id)[lang].seen; }).length;
  }

  function activeWords() {
    return settings.pos === 'all' ? WORDS : WORDS.filter(function (w) { return w.pos === settings.pos; });
  }

  function dueWords() {
    var no = progress.sessions + 1;
    // A round only reviews the language(s) it is playing. Counting both
    // languages here made the home badge and review button disagree with
    // buildSession() in single-language mode.
    var langs = settings.mode === 'both' ? LANGS : [settings.mode];
    return WORDS.filter(function (w) {
      return langs.some(function (l) {
        var r = getRec(w.id)[l];
        return r.seen && r.due <= no;
      });
    });
  }

  function packWordList(pack) {
    var out = [];
    ((pack && pack.words) || []).forEach(function (id) {
      if (BY_ID[id] && out.indexOf(id) < 0) out.push(id);
    });
    return out;
  }

  function phraseFor(id, lang) {
    var w = BY_ID[id];
    return lang === 'en' ? w.en.phrase : w.fr.phrase;
  }

  function artFor(id) {
    if (FLASHCARDS[id]) {
      return '<img src="' + FLASHCARDS[id] + '" alt="" draggable="false" decoding="async">';
    }
    return ART[id] || BY_ID[id].emoji;
  }

  /* ---------------- audio ---------------- */

  var voice = new Audio();
  voice.preload = 'auto';
  var voiceResolve = null;
  var audioTimer = 0;
  var sayToken = 0;

  function playAudio(src) {
    clearTimeout(audioTimer);
    return new Promise(function (resolve) {
      if (!src) { resolve(false); return; }
      var prev = voiceResolve;
      voiceResolve = null;
      if (prev) prev(false);
      try { voice.pause(); } catch (e) {}

      var settled = false;
      function finish(ok) {
        if (settled) return;
        settled = true;
        clearTimeout(audioTimer);
        if (voiceResolve === resolve) voiceResolve = null;
        resolve(ok);
      }

      voice.onended = function () { finish(true); };
      voice.onerror = function () { finish(false); };
      voice.onloadedmetadata = function () {
        if (settled) return;
        var dur = voice.duration;
        var ms = (isFinite(dur) && dur > 0) ? Math.max(3000, Math.min(16000, dur * 1000 + 2000)) : 5000;
        clearTimeout(audioTimer);
        audioTimer = setTimeout(function () { try { voice.pause(); } catch (e) {} finish(true); }, ms);
      };
      voiceResolve = resolve;
      voice.src = src;
      voice.preservesPitch = true;
      voice.playbackRate = settings.speed;

      var p;
      try { p = voice.play(); } catch (e) { finish(false); return; }
      if (p && p.catch) p.catch(function () { finish(false); });

      // Safety net: never let a stalled media element freeze the game.
      audioTimer = setTimeout(function () { try { voice.pause(); } catch (e) {} finish(true); }, 16000);
    });
  }

  function tts(text, lang) {
    return new Promise(function (resolve) {
      if (!text || !('speechSynthesis' in window)) { resolve(); return; }
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
        u.rate = Math.min(1.4, 0.82 * settings.speed);
        u.pitch = 1.05;
        var voices = window.speechSynthesis.getVoices() || [];
        var want = u.lang.toLowerCase();
        var v = voices.filter(function (x) {
          return (x.lang || '').toLowerCase().replace('_', '-').indexOf(want) === 0;
        })[0];
        if (v) u.voice = v;
        var done = false;
        var finish = function () { if (!done) { done = true; resolve(); } };
        u.onend = finish;
        u.onerror = finish;
        window.speechSynthesis.speak(u);
        setTimeout(finish, 12000);
      } catch (e) { resolve(); }
    });
  }

  async function say(file, text, lang) {
    var my = ++sayToken;
    setBubble(true);
    var ok = await playAudio(file ? 'audio/' + file + '.mp3' : null);
    if (my !== sayToken) return false;
    if (!ok) {
      await tts(text, lang);
      if (my !== sayToken) return false;
    }
    setBubble(false);
    return true;
  }

  function stopAudio() {
    sayToken++;
    clearTimeout(audioTimer);
    if (voiceResolve) { var r = voiceResolve; voiceResolve = null; r(false); }
    try { voice.pause(); } catch (e) {}
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    setBubble(false);
    if (state.session) clearTimeout(state.session.replayTimer);
  }

  var bubble = $('#bubble');
  function setBubble(on) { if (bubble) bubble.classList.toggle('on', !!on); }

  /* ---------------- sound effects ---------------- */

  var actx = null;
  function sfx(kind) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = actx || new AC();
      if (actx.state === 'suspended') actx.resume();
      var t0 = actx.currentTime + 0.01;
      var notes;
      if (kind === 'correct') notes = [[784, 0], [988, 0.09], [1319, 0.18]];
      else if (kind === 'wrong') notes = [[300, 0], [240, 0.12]];
      else if (kind === 'win') notes = [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36]];
      else notes = [[660, 0]];
      notes.forEach(function (n) {
        var f = n[0], dt = n[1];
        var o = actx.createOscillator();
        var g = actx.createGain();
        o.type = kind === 'wrong' ? 'sine' : 'triangle';
        o.frequency.setValueAtTime(f, t0 + dt);
        if (kind === 'wrong') o.frequency.exponentialRampToValueAtTime(f * 0.82, t0 + dt + 0.16);
        g.gain.setValueAtTime(0.0001, t0 + dt);
        g.gain.exponentialRampToValueAtTime(kind === 'wrong' ? 0.045 : 0.085, t0 + dt + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.34);
        o.connect(g).connect(actx.destination);
        o.start(t0 + dt);
        o.stop(t0 + dt + 0.4);
      });
    } catch (e) {}
  }

  function burst(x, y, n, dist) {
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i');
      p.className = 'confetti-bit';
      var angle = Math.random() * Math.PI * 2;
      var d = dist * (0.35 + Math.random() * 0.85);
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.width = (5 + Math.random() * 7) + 'px';
      p.style.height = (7 + Math.random() * 8) + 'px';
      p.style.background = COLORS[i % COLORS.length];
      document.body.appendChild(p);
      var dx = Math.cos(angle) * d;
      var dy = Math.sin(angle) * d + 50;
      p.animate([
        { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) rotate(' + (Math.random() * 720 - 360) + 'deg)', opacity: 0 }
      ], { duration: 800 + Math.random() * 500, easing: 'cubic-bezier(.15,.7,.3,1)' }).onfinish = function () { this.effect.target.remove(); };
    }
  }

  function burstAt(el, n) {
    var r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, n, Math.max(90, r.width * 0.9));
  }

  function confettiRain(n) {
    for (var i = 0; i < n; i++) {
      (function (i) {
        setTimeout(function () {
          burst(window.innerWidth * (0.15 + Math.random() * 0.7), window.innerHeight * (0.2 + Math.random() * 0.3), 6, 150);
        }, i * 90);
      })(i);
    }
  }

  function happyMomo() {
    var m = $('#momo-game');
    if (!m) return;
    m.classList.remove('happy');
    void m.offsetWidth;
    m.classList.add('happy');
    setTimeout(function () { m.classList.remove('happy'); }, 720);
  }

  /* ---------------- session building ---------------- */

  function pickFoils(targetId, n) {
    var target = BY_ID[targetId];
    var bad = CONFUSE[targetId] || [];
    var picked = [];
    // Some contrasts are worth showing every time: dirty/clean, on/under,
    // skirt/dress, put on/take off. The data can name those foils explicitly.
    (target.foils || []).forEach(function (id) {
      if (picked.length < n && id !== targetId && BY_ID[id] && picked.indexOf(id) < 0) picked.push(id);
    });
    var pool = shuffle(WORDS.filter(function (w) {
      return w.id !== targetId && bad.indexOf(w.id) < 0 && picked.indexOf(w.id) < 0;
    }));
    pool.sort(function (a, b) {
      return (a.cat === target.cat ? 1 : 0) - (b.cat === target.cat ? 1 : 0);
    });
    pool.forEach(function (w) { if (picked.length < n) picked.push(w.id); });
    return picked;
  }

  function sessionBase(no) {
    return {
      no: no,
      index: 0,
      completed: 0,
      stars: 0,
      misses: 0,
      penalized: false,
      answered: false,
      locked: false,
      current: null,
      cardIds: [],
      breakAt: 0,
      breakDone: false,
      promptPlays: 0,
      replayTimer: 0,
      recorded: {},
      demoTimer: 0,
      demo: false,
      results: []
    };
  }

  function buildSession(kind) {
    kind = kind || 'play';
    var review = kind === 'review';
    var mode = settings.mode;
    var pool = review ? WORDS : activeWords();
    var len = Math.min(settings.length, pool.length);
    var no = progress.sessions + 1;
    var langs = mode === 'both' ? LANGS : [mode];
    var totalSeen = pool.filter(function (w) {
      return langs.some(function (l) { return getRec(w.id)[l].seen; });
    }).length;

    // Half of a normal round is brand-new material (four of eight), so the
    // bank keeps opening up instead of turning into an endless review deck.
    // Review mode still only draws words that are due.
    var newCap = review ? 0 : (totalSeen === 0 ? len : Math.min(4, len));
    var dueCap = review ? len : Math.max(0, len - newCap);

    // A concept shown last round is held back one round when there are enough
    // other concepts to fill the round. This kills the "same words again"
    // feeling without switching off spaced repetition: its due date stays in
    // the past and it comes back the round after next.
    var recent = review ? [] : (progress.recent || []);
    var recentSet = {};
    recent.forEach(function (id) { recentSet[id] = true; });
    var recentInPool = pool.filter(function (w) { return recentSet[w.id]; }).length;
    var skipRecent = !review && pool.length - recentInPool >= len;
    function blocked(id) { return skipRecent && recentSet[id]; }

    var concepts = pool.map(function (w) {
      var recs = langs.map(function (l) { return getRec(w.id)[l]; });
      return {
        id: w.id,
        seenAny: recs.some(function (r) { return r.seen; }),
        dueAny: recs.some(function (r) { return r.seen && r.due <= no; }),
        minLvl: Math.min.apply(null, recs.map(function (r) { return r.lvl; })),
        dueMin: Math.min.apply(null, recs.map(function (r) { return r.seen ? r.due : 9999; }))
      };
    });

    var dueOnes = concepts.filter(function (c) { return c.dueAny && !blocked(c.id); }).sort(function (a, b) {
      return a.minLvl - b.minLvl || a.dueMin - b.dueMin || Math.random() - 0.5;
    });
    if (review && !dueOnes.length) return null;
    var newOnes = shuffle(concepts.filter(function (c) { return !c.seenAny; }));
    newOnes.sort(function (a, b) {
      return (INTEREST[b.id] ? 1 : 0) - (INTEREST[a.id] ? 1 : 0);
    });
    var rest = shuffle(concepts.filter(function (c) {
      return c.seenAny && !c.dueAny && !blocked(c.id);
    }));
    var heldDue = skipRecent ? concepts.filter(function (c) {
      return c.dueAny && recentSet[c.id];
    }).sort(function (a, b) {
      return a.minLvl - b.minLvl || a.dueMin - b.dueMin || Math.random() - 0.5;
    }) : [];

    // Exactly one entry per concept: no word repeats inside a round.
    var picked = [];
    if (review) {
      dueOnes.forEach(function (c) { if (picked.length < len) picked.push(c); });
    } else {
      dueOnes.forEach(function (c) { if (picked.length < dueCap) picked.push(c); });
      var added = 0;
      newOnes.forEach(function (c) {
        if (picked.length >= len || added >= newCap) return;
        picked.push(c); added++;
      });
      // If there are fewer due reviews than the round can hold, open more new
      // words instead of recycling old ones.
      newOnes.forEach(function (c) {
        if (picked.length < len && picked.indexOf(c) < 0) picked.push(c);
      });
      rest.forEach(function (c) { if (picked.length < len) picked.push(c); });
      // Tiny pools (positions, adjectives) may not have enough non-recent
      // concepts; only then do last round's due words come back.
      heldDue.forEach(function (c) { if (picked.length < len) picked.push(c); });
      concepts.forEach(function (c) {
        if (picked.length < len && picked.indexOf(c) < 0) picked.push(c);
      });
    }

    shuffle(picked);

    // One language per word. In bilingual mode, the missing language wins over
    // a due review: otherwise a word learned in English keeps coming back in
    // English while its French version never gets a turn.
    var assignments;
    if (mode === 'both') {
      var enSlots = Math.ceil(len / 2);
      var frSlots = Math.floor(len / 2);
      var enCount = 0;
      var frCount = 0;
      assignments = picked.map(function (c) {
        var recs = getRec(c.id);
        var unseen = LANGS.filter(function (l) { return !recs[l].seen; });
        if (unseen.length === 1) return unseen[0];
        var due = LANGS.filter(function (l) { return recs[l].seen && recs[l].due <= no; });
        return due.length === 1 ? due[0] : null;
      });
      assignments.forEach(function (l) {
        if (l === 'en') enCount++;
        if (l === 'fr') frCount++;
      });
      assignments = assignments.map(function (l) {
        if (l) return l;
        var chooseEn;
        if (enCount >= enSlots) chooseEn = false;
        else if (frCount >= frSlots) chooseEn = true;
        else chooseEn = Math.random() < 0.5;
        if (chooseEn) { enCount++; return 'en'; }
        frCount++;
        return 'fr';
      });
    } else {
      assignments = picked.map(function () { return mode; });
    }

    var queue = picked.map(function (c, i) {
      var lang = assignments[i];
      var level = levelFor(lang);
      return { id: c.id, lang: lang, foils: pickFoils(c.id, 2), variant: pickVariant(c.id, lang, level) };
    });

    var breakAt = Math.floor(queue.length / 2);
    if (queue.length < 4 || breakAt >= queue.length) breakAt = 0;

    progress.recent = picked.map(function (c) { return c.id; });
    progress.sessions = no;
    var key = todayKey();
    progress.days[key] = (progress.days[key] || 0) + 1;
    save();

    var s = sessionBase(no);
    s.kind = kind;
    s.queue = queue;
    s.breakAt = breakAt;
    s.demo = kind === 'play' && progress.sessions === 1 && progress.stats.trials === 0;
    return s;
  }

  function buildCheck(packId) {
    var pack = PACK_BY_ID[packId] || PACKS[0];
    if (!pack) return null;
    var ids = packWordList(pack);
    if (!ids.length) return null;
    var no = progress.sessions + 1;
    var lang = pack.lang === 'en' ? 'en' : 'fr';
    var level = Math.max(1, Math.min(3, Number(pack.level) || 1));
    var queue = shuffle(ids.slice()).map(function (id) {
      return { id: id, lang: lang, level: level, foils: pickFoils(id, 2) };
    });
    progress.sessions = no;
    save();

    var s = sessionBase(no);
    s.kind = 'check';
    s.packId = pack.id;
    s.packLabel = pack.label;
    s.queue = queue;
    s.breakAt = 0;
    return s;
  }

  function noteConfusion(targetId, chosenId) {
    if (!targetId || !chosenId || targetId === chosenId) return;
    if (!progress.confusions[targetId]) progress.confusions[targetId] = {};
    var row = progress.confusions[targetId];
    row[chosenId] = (Number(row[chosenId]) || 0) + 1;
  }

  function record(s, ok) {
    var key = s.current.id + ':' + s.current.lang;
    if (s.recorded[key]) return;
    s.recorded[key] = true;
    var rec = getRec(s.current.id)[s.current.lang];
    rec.seen = true;
    rec.tries++;
    if (!ok) rec.misses++;
    if (ok) {
      if (s.penalized) {
        rec.due = s.no + 1;
      } else {
        rec.lvl = Math.min(5, rec.lvl + 1);
        rec.due = s.no + INTERVALS[rec.lvl - 1];
        progress.stats.firstTry++;
      }
      progress.stats.trials++;
    } else {
      rec.lvl = Math.max(0, rec.lvl - 1);
      rec.due = s.no + 1;
      s.penalized = true;
    }
  }

  /* ---------------- rendering ---------------- */

  function showScreen(name) {
    state.screen = name;
    $$('.screen').forEach(function (el) { el.classList.toggle('active', el.id === 'screen-' + name); });
    document.body.dataset.screen = name;
    if (name === 'home') updateHome();
  }

  function updateHome() {
    $$('.mode-pill').forEach(function (b) { b.classList.toggle('sel', b.dataset.mode === settings.mode); });
    var levels = $('#home-levels');
    if (levels) {
      levels.textContent = '英语：' + EN_LEVELS[settings.enLevel] + ' · Français：' + FR_LEVELS[settings.frLevel] +
        (settings.pos === 'all' ? '' : ' · 本轮：' + POS[settings.pos].label);
    }
    var en = seenCount('en'), fr = seenCount('fr');
    var stats = $('#home-stats');
    if (!stats) return;
    if (progress.sessions === 0) stats.textContent = '每轮 3–5 分钟 · 先陪她玩一次';
    else {
      var due = dueWords().length;
      var today = progress.days[todayKey()] || 0;
      stats.textContent = '英语 ' + en + '/' + WORDS.length + ' · 法语 ' + fr + '/' + WORDS.length +
        (due ? ' · 待复习 ' + due : '') + (today ? ' · 今天 ' + today + ' 轮' : '');
    }
  }

  function renderDots() {
    var s = state.session;
    var dots = $('#dots');
    if (!s || !dots) return;
    if (s.kind === 'check') {
      dots.innerHTML = '<span class="check-count">' + s.completed + ' / ' + s.queue.length + '</span>';
      return;
    }
    var html = '';
    for (var i = 0; i < s.queue.length; i++) {
      html += '<i class="dot' + (i < s.completed ? ' done' : '') + (i === s.index ? ' now' : '') + '"></i>';
    }
    dots.innerHTML = html;
  }

  function updateCaption(item) {
    var w = BY_ID[item.id];
    var cap = $('#caption');
    if (!cap) return;
    if (state.session && state.session.kind === 'check') {
      cap.innerHTML = '';
      cap.title = promptFor(item).text;
      cap.classList.add('hide');
      return;
    }
    if (settings.mode === 'both') {
      if (w.en.phrase === w.fr.phrase) {
        cap.innerHTML = '<span class="on">' + w.en.phrase + '</span>';
      } else {
        cap.innerHTML = '<span class="' + (item.lang === 'en' ? 'on' : '') + '">' + w.en.phrase + '</span><i>·</i><span class="' + (item.lang === 'fr' ? 'on' : '') + '">' + w.fr.phrase + '</span>';
      }
    } else {
      cap.innerHTML = '<span class="on">' + w[item.lang].phrase + '</span>';
    }
    cap.title = promptFor(item).text;
    cap.classList.toggle('hide', !settings.showHint);
  }

  function renderRound(silent) {
    var s = state.session;
    if (!s) return;
    var item = s.queue[s.index];
    if (!item) { endSession(); return; }
    s.current = item;
    s.misses = 0;
    s.penalized = false;
    s.answered = false;
    s.locked = false;
    s.promptPlays = 0;
    s.cardIds = shuffle([item.id].concat(item.foils));

    var game = $('#screen-game');
    game.dataset.lang = item.lang;
    var badge = $('#badge');
    badge.textContent = s.kind === 'check'
      ? (item.lang === 'en' ? 'EN' : 'FR') + ' · 检查'
      : (item.lang === 'en' ? 'EN' : 'FR') + ' L' + (item.level || levelFor(item.lang));
    badge.className = 'lang-badge ' + item.lang;

    var cards = $('#cards');
    cards.innerHTML = s.cardIds.map(function (id, i) {
      var kind = FLASHCARDS[id] ? ' art-img' : (ART[id] ? ' art-svg' : '');
      return '<button class="card" data-id="' + id + '" style="--d:' + (i * 70) + 'ms" aria-label="图片选项 ' + (i + 1) + '">' +
        '<span class="art' + kind + '">' + artFor(id) + '</span></button>';
    }).join('');

    requestAnimationFrame(function () {
      $$('.card', cards).forEach(function (c) { c.classList.add('in'); });
    });

    renderDots();
    updateCaption(item);

    clearTimeout(s.demoTimer);
    if (s.demo && s.index === 0) {
      s.demoTimer = setTimeout(function () {
        if (state.session === s && !s.answered && s.index === 0) {
          var t = cards.querySelector('[data-id="' + s.current.id + '"]');
          if (t) t.classList.add('demo');
        }
      }, 3800);
    }

    if (!silent) {
      clearTimeout(s.replayTimer);
      s.replayTimer = setTimeout(function () {
        if (state.session === s && !s.answered) playPrompt();
      }, 420);
    }
  }

  function overlayOpen() {
    return ['#pause', '#tpr', '#settings', '#check-intro'].some(function (sel) {
      var el = $(sel);
      return el && el.classList.contains('open');
    });
  }

  async function playPrompt() {
    var s = state.session;
    if (!s || !s.current || s.answered || s.locked || overlayOpen()) return;
    var item = s.current;
    var prompt = promptFor(item);
    s.promptPlays++;
    clearTimeout(s.replayTimer);
    await say(prompt.file, prompt.text, item.lang);
    if (state.session !== s || s.answered || s.locked) return;
    // L3 clips are 8-11 seconds now. Auto-playing them twice made one question
    // take over 20 seconds, so L3 plays once and the child can tap replay.
    var maxPlays = prompt.level >= 3 ? 1 : 2;
    if (s.promptPlays < maxPlays) {
      s.replayTimer = setTimeout(function () {
        if (state.session === s && !s.answered && !s.locked) playPrompt();
      }, 4200);
    }
  }

  /* ---------------- game flow ---------------- */

  function closeAllOverlays() {
    ['#pause', '#settings', '#check-intro', '#tpr'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.classList.remove('open');
    });
  }

  function startSession(kind, packId) {
    if (state.starting) return;
    state.starting = true;
    stopAudio();
    closeAllOverlays();
    var s = kind === 'check' ? buildCheck(packId) : buildSession(kind);
    if (!s || !s.queue.length) {
      state.starting = false;
      var isReview = kind === 'review';
      toast(isReview ? '现在没有到期的复习词，先玩一轮新词吧' : '这个词类暂时没有可用的词');
      return;
    }
    if (kind === 'play' && s.queue.length < settings.length) {
      toast('这一类只有 ' + s.queue.length + ' 个词，本轮 ' + s.queue.length + ' 次');
    }
    if (kind === 'review' && s.queue.length < settings.length) {
      toast('到期复习 ' + s.queue.length + ' 个词，本轮 ' + s.queue.length + ' 次');
    }
    state.session = s;
    showScreen('game');
    renderRound(true);
    s.locked = true;
    var firstLang = s.queue[0] ? s.queue[0].lang : (settings.mode === 'both' ? 'en' : settings.mode);
    var intro = kind === 'check'
      ? say(firstLang + '/check', CHECK[firstLang], firstLang)
      : say(firstLang + '/intro', INTRO[firstLang], firstLang);
    // The check intro is ~2.6–3.3s, so a 1.2s fallback used to cut it off and
    // then start the first prompt twice. Give the clip room to finish and make
    // sure only one of the two paths can unlock the board.
    var introDone = false;
    function beginPrompt() {
      if (introDone) return;
      introDone = true;
      clearTimeout(unlockTimer);
      if (state.session === s && !s.answered) {
        s.locked = false;
        playPrompt();
      }
    }
    // Safety net for a stalled media element; playAudio() also has its own cap.
    var unlockTimer = setTimeout(beginPrompt, 6000);
    intro.then(beginPrompt);
    setTimeout(function () { state.starting = false; }, 500);
  }

  function choose(id, el) {
    var s = state.session;
    if (!s || !s.current || s.locked || s.answered) return;
    if (id === s.current.id) correct(el);
    else if (s.kind === 'check') checkWrong(el);
    else wrong(el);
  }

  async function correct(el) {
    var s = state.session;
    if (!s) return;
    s.answered = true;
    s.locked = true;
    s.completed++;
    clearTimeout(s.replayTimer);
    clearTimeout(s.demoTimer);
    stopAudio();
    el.classList.remove('demo');
    el.classList.add('correct');
    $$('.card', $('#cards')).forEach(function (c) { if (c !== el) c.classList.add('dim'); });
    sfx('correct');
    burstAt(el, 12);
    happyMomo();
    record(s, true);
    if (s.kind === 'check') s.results.push({ id: s.current.id, ok: true });
    save();
    renderDots();

    var item = s.current;
    var w = BY_ID[item.id];
    await say(item.lang + '/' + item.id + '_praise', w[item.lang].praise, item.lang);
    if (state.session !== s) return;
    s.locked = false;
    setTimeout(function () { if (state.session === s) next(); }, 650);
  }

  function wrong(el) {
    var s = state.session;
    if (!s) return;
    s.locked = true;
    clearTimeout(s.replayTimer);
    stopAudio();
    el.classList.add('wrong');
    sfx('wrong');
    s.misses++;
    noteConfusion(s.current.id, el.dataset.id);
    if (!s.penalized) {
      record(s, false);
    } else {
      var missedRec = getRec(s.current.id)[s.current.lang];
      missedRec.tries++;
      missedRec.misses++;
    }
    save();

    setTimeout(async function () {
      if (state.session !== s) return;
      el.classList.remove('wrong');
      el.classList.add('dim');
      if (s.misses >= 2) {
        var t = $('#cards').querySelector('[data-id="' + s.current.id + '"]');
        if (t) t.classList.add('hint');
      }
      var item = s.current;
      await say(item.lang + '/retry', RETRY[item.lang], item.lang);
      if (state.session !== s || s.answered) return;
      s.locked = false;
      s.promptPlays = 0;
      playPrompt();
    }, 460);
  }

  function checkWrong(el) {
    var s = state.session;
    if (!s) return;
    s.answered = true;
    s.locked = true;
    s.completed++;
    clearTimeout(s.replayTimer);
    clearTimeout(s.demoTimer);
    stopAudio();
    el.classList.add('wrong');
    sfx('wrong');
    s.misses++;
    noteConfusion(s.current.id, el.dataset.id);
    record(s, false);
    s.results.push({ id: s.current.id, ok: false });
    save();
    renderDots();

    var item = s.current;
    var target = $('#cards').querySelector('[data-id="' + item.id + '"]');
    if (target) target.classList.add('hint');

    setTimeout(async function () {
      if (state.session !== s) return;
      el.classList.remove('wrong');
      el.classList.add('dim');
      // A check gives one attempt, but it still shows the right answer so the
      // child learns from the miss instead of just seeing a score.
      var p = promptFor({ id: item.id, lang: item.lang, level: item.level || 1 });
      await say(p.file, p.text, item.lang);
      if (state.session !== s) return;
      s.locked = false;
      setTimeout(function () { if (state.session === s) next(); }, 450);
    }, 700);
  }

  function next() {
    var s = state.session;
    if (!s) return;
    s.index++;
    if (s.index >= s.queue.length) { endSession(); return; }
    if (s.breakAt && s.index === s.breakAt && !s.breakDone) {
      s.breakDone = true;
      openTPR();
      return;
    }
    renderRound();
  }

  function openTPR() {
    var s = state.session;
    if (!s) return;
    var action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    var lang = (s.queue[s.index] && s.queue[s.index].lang) || 'en';
    $('#tpr-emoji').textContent = action.emoji;
    $('#tpr-lang').textContent = lang === 'en' ? 'English' : 'Français';
    $('#tpr').classList.add('open');
    say(lang + '/' + action.id, action[lang], lang);
  }

  function endSession() {
    var s = state.session;
    if (!s) return;
    stopAudio();
    state.last = s;
    state.session = null;

    var isCheck = s.kind === 'check';
    var answered = s.results.length;
    var correctCount = s.results.filter(function (r) { return r.ok; }).length;
    var total = s.queue.length;
    var done = isCheck ? answered : s.completed;
    var aborted = isCheck && done < total;

    $('#end-stars').textContent = isCheck ? correctCount : s.completed;
    $('#end-unit').innerHTML = isCheck
      ? (aborted ? '/ ' + answered + ' 答对（已中断，共 ' + total + ' 词）' : '/ ' + total + ' 答对')
      : '/ ' + total + ' 颗星';

    if (isCheck) {
      $('#end-title').textContent = done === 0 ? '检查中断' : (aborted ? '检查中断' : (correctCount === total ? '全部答对！' : '检查完成'));
    } else if (s.kind === 'review') {
      $('#end-title').textContent = s.completed === 0 ? '下次见！' : (s.completed >= total ? '复习完成！' : '今天先到这里');
    } else {
      $('#end-title').textContent = s.completed === 0 ? '下次见！' : (s.completed >= total ? '全部完成！' : '今天先到这里');
    }

    var report = $('#end-report');
    if (isCheck) {
      var missed = s.results.filter(function (r) { return !r.ok; }).map(function (r) { return r.id; });
      var pct = answered ? Math.round(correctCount / answered * 100) : 0;
      $('#report-score').textContent = '答对 ' + correctCount + ' / ' + (aborted ? answered : total);
      $('#report-pct').textContent = answered ? pct + '%' : '—';
      var byPos = {};
      missed.forEach(function (id) { var p = BY_ID[id].pos; byPos[p] = (byPos[p] || 0) + 1; });
      var meta = Object.keys(byPos).map(function (p) { return POS[p].label + ' ' + byPos[p]; }).join(' · ');
      $('#report-meta').textContent = missed.length
        ? '需要再看一眼：' + meta
        : '';
      var checkLang = s.queue[0] ? s.queue[0].lang : 'fr';
      $('#report-missed').innerHTML = missed.length
        ? missed.map(function (id) {
            var w = BY_ID[id];
            var pic = FLASHCARDS[id] ? '<img src="' + FLASHCARDS[id] + '" alt="">' : w.emoji;
            return '<span class="miss"><b>' + pic + '</b>' + phraseFor(id, checkLang) + '</span>';
          }).join('')
        : '<span class="miss all">全部答对，太棒了！</span>';
      report.hidden = false;
      $('#end-basket').innerHTML = '';
      // A check that was opened and abandoned before the first answer should
      // not erase the last real result with a 0/0 "aborted" entry.
      if (answered > 0) {
        progress.checks[s.packId] = {
          at: Date.now(),
          total: total,
          answered: answered,
          correct: correctCount,
          missed: missed,
          aborted: aborted
        };
        save();
      }
    } else {
      report.hidden = true;
      var basket = [];
      s.queue.slice(0, s.completed).forEach(function (q) {
        if (basket.indexOf(q.id) < 0) basket.push(q.id);
      });
      $('#end-basket').innerHTML = basket.map(function (id) {
        var pic = FLASHCARDS[id] ? '<img src="' + FLASHCARDS[id] + '" alt="">' : BY_ID[id].emoji;
        return '<span title="' + BY_ID[id].en.phrase + ' / ' + BY_ID[id].fr.phrase + '">' + pic + '</span>';
      }).join('');
    }

    $('#screen-end').classList.toggle('check', isCheck);
    $('#end-sub').textContent = isCheck
      ? (answered === 0
          ? '这次还没有答题，之前的检查结果会保留'
          : (aborted
              ? '这次先到这里，已经答过的词都记在下面'
              : (correctCount === total ? '每个词都认出来了，太棒了！' : '没答对的词都留在下面，下次陪她再看一遍')))
      : (s.kind === 'review' ? '这次复习的词都收好啦' : 'Momo 把星星都收进小篮子里啦');
    $('#btn-again-label').textContent = isCheck ? '再检查一次' : (s.kind === 'review' ? '再复习一次' : '再玩一次');
    showScreen('end');

    if (isCheck) {
      if (done === 0) return;
      var lang = s.queue[0].lang;
      if (correctCount === total) {
        sfx('win');
        confettiRain(9);
      } else {
        sfx('correct');
      }
      setTimeout(function () {
        if (state.screen === 'end') say(lang + '/check_end', CHECK_END[lang], lang);
      }, 500);
      return;
    }

    if (s.completed > 0) {
      sfx('win');
      confettiRain(9);
      var lastLang = s.queue[s.queue.length - 1].lang;
      setTimeout(function () {
        if (state.screen === 'end') say(lastLang + '/end', END[lastLang], lastLang);
      }, 600);
    }
  }

  /* ---------------- settings ---------------- */

  function bar(lvl) {
    var html = '';
    for (var i = 0; i < 5; i++) html += '<i class="' + (i < lvl ? 'f' : '') + '"></i>';
    return html;
  }

  var bankFilter = 'all';

  function shortDate(at) {
    var d = new Date(at);
    if (isNaN(d.getTime())) return '';
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  function renderBank() {
    $$('#bank-filter button').forEach(function (b) {
      b.classList.toggle('sel', b.dataset.pos === bankFilter);
    });
    var counts = {};
    WORDS.forEach(function (w) { counts[w.pos] = (counts[w.pos] || 0) + 1; });
    $('#bank-summary').textContent = '词库 ' + WORDS.length + ' 词 · ' +
      POS_ORDER.map(function (p) { return POS[p].label + ' ' + (counts[p] || 0); }).join(' · ');

    var groups = POS_ORDER.filter(function (p) { return bankFilter === 'all' || p === bankFilter; });
    var html = '';
    groups.forEach(function (p) {
      var list = WORDS.filter(function (w) { return w.pos === p; });
      if (!list.length) return;
      html += '<div class="pgroup"><div class="pgroup-head"><b>' + POS[p].label + '</b><span>' +
        list.length + ' 词 · ' + POS[p].hint + '</span></div><div class="pgrid">' +
        list.map(function (w) {
          var r = getRec(w.id);
          var tries = (Number(r.en.tries) || 0) + (Number(r.fr.tries) || 0);
          var misses = (Number(r.en.misses) || 0) + (Number(r.fr.misses) || 0);
          return '<div class="pcell" title="' + w.fr.phrase + ' / ' + w.en.phrase +
            ' · 练习 ' + tries + ' 次，错 ' + misses + ' 次">' +
            '<span class="pemoji">' + (FLASHCARDS[w.id] ? '<img src="' + FLASHCARDS[w.id] + '" alt="" loading="lazy">' : w.emoji) + '</span>' +
            '<span class="pname">' + w.fr.phrase + '</span>' +
            '<div class="pbars"><div class="pbar en">' + bar(r.en.lvl) + '</div><div class="pbar fr">' + bar(r.fr.lvl) + '</div></div>' +
            '</div>';
        }).join('') + '</div></div>';
    });
    $('#settings-grid').innerHTML = html;
  }

  function renderCheckBlock() {
    var sel = $('#check-pack');
    if (sel) {
      sel.innerHTML = PACKS.map(function (p) {
        return '<option value="' + p.id + '"' + (p.id === settings.pack ? ' selected' : '') + '>' +
          p.label + ' · ' + packWordList(p).length + ' 词</option>';
      }).join('');
    }
    var pack = PACK_BY_ID[settings.pack] || PACKS[0];
    if (!pack) return;
    var checkLang = pack.lang === 'en' ? 'en' : 'fr';
    var list = packWordList(pack);
    var last = progress.checks[pack.id];
    var box = $('#check-last');
    if (!last) {
      box.innerHTML = '<span class="muted">还没有检查过。</span>';
    } else {
      var pct = last.answered ? Math.round(last.correct / last.answered * 100) : 0;
      var line = last.aborted
        ? '上次 ' + shortDate(last.at) + ' 中断：答对 ' + last.correct + ' / ' + last.answered
        : '上次 ' + shortDate(last.at) + '：答对 ' + last.correct + ' / ' + last.total + '（' + pct + '%）';
      var missed = (last.missed || []).map(function (id) {
        var w = BY_ID[id];
        if (!w) return '';
        return '<span class="miss"><b>' + w.emoji + '</b>' + phraseFor(id, checkLang) + '</span>';
      }).join('');
      box.innerHTML = '<div class="check-last-line">' + line + '</div>' +
        (missed ? '<div class="check-last-missed">' + missed + '</div>' : '');
    }
    $('#pack-words').innerHTML = list.map(function (id) {
      var w = BY_ID[id];
      return '<span class="miss"><b>' + w.emoji + '</b>' + phraseFor(id, checkLang) + '</span>';
    }).join('');
    var due = dueWords().length;
    $('#due-count').textContent = due ? '有 ' + due + ' 个词到期' : '今天没有到期的词';
    $('#btn-review').disabled = due === 0;
    $('#btn-review').textContent = due
      ? '开始复习 · ' + Math.min(due, settings.length) + ' 词'
      : '暂无到期复习';
    $('#btn-check').textContent = '开始检查 · ' + list.length + ' 词';
  }

  function miniArt(id) {
    return FLASHCARDS[id] ? '<img src="' + FLASHCARDS[id] + '" alt="">' : BY_ID[id].emoji;
  }

  function topConfusions(limit) {
    var rows = [];
    Object.keys(progress.confusions || {}).forEach(function (targetId) {
      var target = BY_ID[targetId];
      if (!target) return;
      Object.keys(progress.confusions[targetId]).forEach(function (chosenId) {
        var chosen = BY_ID[chosenId];
        if (!chosen) return;
        rows.push({
          target: targetId,
          chosen: chosenId,
          count: Number(progress.confusions[targetId][chosenId]) || 0
        });
      });
    });
    rows.sort(function (a, b) {
      return b.count - a.count || BY_ID[a.target].fr.phrase.localeCompare(BY_ID[b.target].fr.phrase);
    });
    return rows.slice(0, limit);
  }

  function renderConfusions() {
    var box = $('#confusion-list');
    if (!box) return;
    var rows = topConfusions(5);
    if (!rows.length) {
      box.innerHTML = '<p class="note" style="margin:0">还没有足够的错题记录；玩几轮后这里会出现最容易混的卡片。</p>';
      return;
    }
    box.innerHTML = rows.map(function (r) {
      var a = BY_ID[r.target];
      var b = BY_ID[r.chosen];
      return '<div class="confusion-row">' +
        '<span class="confusion-pic">' + miniArt(a.id) + '</span>' +
        '<span class="confusion-name">' + a.fr.phrase + '</span>' +
        '<span class="confusion-arrow">→ 点成</span>' +
        '<span class="confusion-pic">' + miniArt(b.id) + '</span>' +
        '<span class="confusion-name">' + b.fr.phrase + '</span>' +
        '<span class="confusion-count">' + r.count + '×</span>' +
        '</div>';
    }).join('');
  }

  function renderSettings() {
    $$('#settings-modes button').forEach(function (b) { b.classList.toggle('sel', b.dataset.mode === settings.mode); });
    $$('#settings-length button').forEach(function (b) { b.classList.toggle('sel', Number(b.dataset.len) === settings.length); });
    $$('#settings-en-level button').forEach(function (b) { b.classList.toggle('sel', Number(b.dataset.enLevel) === settings.enLevel); });
    $$('#settings-fr-level button').forEach(function (b) { b.classList.toggle('sel', Number(b.dataset.frLevel) === settings.frLevel); });
    $$('#settings-speed button').forEach(function (b) { b.classList.toggle('sel', Number(b.dataset.speed) === settings.speed); });
    $$('#settings-pos button').forEach(function (b) { b.classList.toggle('sel', b.dataset.pos === settings.pos); });
    $('#en-preview').textContent = 'L' + settings.enLevel + ' 示例：' + BY_ID.apple.en.prompts[settings.enLevel - 1];
    $('#fr-preview').textContent = 'L' + settings.frLevel + ' 示例：' + BY_ID.apple.fr.prompts[settings.frLevel - 1];
    $('#toggle-hint').classList.toggle('on', settings.showHint);
    $('#toggle-hint').setAttribute('aria-checked', settings.showHint ? 'true' : 'false');
    $('#settings-summary').textContent = '已学 英语 ' + seenCount('en') + '/' + WORDS.length + ' · 法语 ' + seenCount('fr') + '/' + WORDS.length;
    var today = progress.days[todayKey()] || 0;
    var todayNote = $('#today-note');
    if (todayNote) {
      todayNote.textContent = today === 0
        ? '今天还没玩。'
        : '今天已玩 ' + today + ' 轮' + (today >= 2 ? '；建议最多 1–2 轮，休息一下再玩。' : '。');
    }
    renderCheckBlock();
    renderBank();
    renderConfusions();
  }

  function openSettings() {
    stopAudio();
    renderSettings();
    var sheet = $('.settings-sheet');
    if (sheet) sheet.scrollTop = 0;
    $('#settings').classList.add('open');
    refreshOfflineButton();
  }

  function closeSettings() {
    $('#settings').classList.remove('open');
    if (state.session && state.session.current && !state.session.answered) playPrompt();
  }

  function openCheckIntro() {
    var pack = PACK_BY_ID[settings.pack] || PACKS[0];
    if (!pack) { toast('还没有可用的检查词单'); return; }
    var list = packWordList(pack);
    var lang = pack.lang === 'en' ? '英语' : '法语';
    var minutes = Math.max(3, Math.ceil(list.length * 8 / 60));
    $('#check-intro-text').textContent = pack.label + '：' + list.length + ' 个词，约 ' +
      minutes + ' 分钟。用' + lang + '提示，每个词只出一次。';
    $('#btn-check-start-label').textContent = '开始检查 · ' + list.length + ' 词';
    $('#check-intro').classList.add('open');
  }

  function getAudioCacheName() {
    return new Promise(function (resolve) {
      if (!('serviceWorker' in navigator) || !window.MessageChannel) { resolve(null); return; }
      var settled = false;
      var timer = setTimeout(function () { finish(null); }, 2500);
      function finish(name) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(name);
      }
      navigator.serviceWorker.ready.then(function (reg) {
        var worker = reg.active || navigator.serviceWorker.controller;
        if (!worker) { finish(null); return; }
        var channel = new MessageChannel();
        channel.port1.onmessage = function (event) {
          var data = event.data || {};
          finish(data.audioCache || null);
        };
        worker.postMessage({ type: 'GET_CACHES' }, [channel.port2]);
      }).catch(function () { finish(null); });
    });
  }

  function fetchWithTimeout(url, ms) {
    if (!window.AbortSignal || typeof AbortSignal.timeout !== 'function') return fetch(url);
    return fetch(url, { signal: AbortSignal.timeout(ms) });
  }

  async function refreshOfflineButton() {
    var btn = $('#btn-offline');
    var status = $('#offline-status');
    if (!btn || !('caches' in window)) return;
    var cacheName = await getAudioCacheName();
    if (!cacheName) return;
    var list;
    try {
      list = await fetchWithTimeout('audio/manifest.json?v=4', 15000).then(function (r) { return r.json(); });
    } catch (e) { return; }
    if (!Array.isArray(list) || !list.length) return;
    var cache = await caches.open(cacheName);
    var done = 0;
    for (var i = 0; i < list.length; i++) {
      var hit = await cache.match(new URL(list[i], location.href).href);
      if (hit && hit.status === 200) done++;
    }
    if (done >= list.length) {
      btn.textContent = '离线音频已缓存 ✓';
      status.textContent = '已缓存 ' + done + ' / ' + list.length + ' 段，断网也能玩。';
    } else {
      btn.textContent = '下载离线音频（约 35 MB）';
      if (done > 0) status.textContent = '已缓存 ' + done + ' / ' + list.length + ' 段，可继续下载剩余部分。';
    }
  }

  async function cacheAllAudio() {
    var btn = $('#btn-offline');
    var status = $('#offline-status');
    if (!('caches' in window)) {
      toast('这个浏览器不支持离线缓存');
      return;
    }
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = '正在缓存…';

    // The service worker owns cache names; asking it avoids the old bug where
    // index.html and sw.js each had a hard-coded copy that could drift apart.
    var cacheName = await getAudioCacheName();
    if (!cacheName) {
      status.textContent = '离线缓存需要 HTTPS 或 localhost，并等应用加载完成；刷新后再试。';
      btn.disabled = false;
      btn.textContent = '下载离线音频（约 35 MB）';
      return;
    }

    try {
      // Version the manifest URL so a returning client does not read the old
      // 727-entry list from the service-worker cache after new clips ship.
      var list = await fetchWithTimeout('audio/manifest.json?v=4', 15000).then(function (r) { return r.json(); });
      if (!Array.isArray(list)) throw new Error('bad audio manifest');
      var cache = await caches.open(cacheName);
      var done = 0;
      var failed = 0;
      var cursor = 0;
      status.textContent = '0 / ' + list.length;

      async function worker() {
        while (cursor < list.length) {
          var path = list[cursor++];
          var url = new URL(path, location.href).href;
          try {
            var hit = await cache.match(url);
            if (hit && hit.status !== 200) {
              await cache.delete(url);
              hit = null;
            }
            if (!hit) {
              var res = await fetchWithTimeout(url, 20000);
              if (res.status !== 200) throw new Error('HTTP ' + res.status);
              await cache.put(url, res);
            }
            done++;
          } catch (e) {
            failed++;
          }
          if ((done + failed) % 25 === 0 || done + failed === list.length) {
            status.textContent = '已缓存 ' + done + ' / ' + list.length;
          }
        }
      }

      await Promise.all([worker(), worker(), worker(), worker(), worker()]);
      if (failed === 0) {
        status.textContent = '离线音频已就绪（' + done + ' 段）';
        btn.textContent = '离线音频已缓存 ✓';
      } else {
        status.textContent = '已缓存 ' + done + ' 段，' + failed + ' 段失败；可再点一次重试。';
        btn.disabled = false;
        btn.textContent = '重试下载离线音频';
      }
    } catch (e) {
      status.textContent = '下载失败，请检查网络后重试。';
      btn.disabled = false;
      btn.textContent = '下载离线音频（约 35 MB）';
    }
  }

  function exportProgress() {
    var payload = {
      app: 'momo-word-basket',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: settings,
      progress: progress
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'momo-progress-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('已导出进度文件');
  }

  function importProgress(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try { data = JSON.parse(String(reader.result)); }
      catch (e) { toast('导入失败：文件不是 JSON'); return; }
      var imported = data && data.progress && typeof data.progress === 'object'
        ? data.progress
        : (data && typeof data.words === 'object' ? data : null);
      if (!imported || !imported.words) {
        toast('导入失败：找不到学习进度');
        return;
      }
      if (!window.confirm('导入会覆盖这台设备上的学习记录，确定继续吗？')) return;
      var next = {
        settings: data.settings && typeof data.settings === 'object' ? data.settings : settings,
        progress: imported
      };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        location.reload();
      } catch (e) {
        toast('导入失败：浏览器存储空间不足');
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- events ---------------- */

  $('#btn-start').addEventListener('click', function () { sfx('tap'); startSession('play'); });
  $('#btn-again').addEventListener('click', function () {
    sfx('tap');
    var last = state.last;
    if (last && last.kind === 'check') startSession('check', last.packId);
    else startSession(last && last.kind === 'review' ? 'review' : 'play');
  });
  $('#btn-home').addEventListener('click', function () { stopAudio(); showScreen('home'); });
  $('#btn-replay').addEventListener('click', function () { playPrompt(); });
  $('#btn-pause').addEventListener('click', function () { stopAudio(); $('#pause').classList.add('open'); });
  $('#btn-resume').addEventListener('click', function () {
    $('#pause').classList.remove('open');
    if (state.session && state.session.current && !state.session.answered) playPrompt();
  });
  $('#btn-pause-end').addEventListener('click', function () {
    $('#pause').classList.remove('open');
    endSession();
  });
  $('#btn-pause-settings').addEventListener('click', function () { openSettings(); });
  $('#btn-tpr').addEventListener('click', function () {
    $('#tpr').classList.remove('open');
    stopAudio();
    renderRound();
  });

  $('#cards').addEventListener('click', function (e) {
    var card = e.target.closest('.card');
    if (!card) return;
    choose(card.dataset.id, card);
  });

  $$('.mode-pill').forEach(function (b) {
    b.addEventListener('click', function () {
      settings.mode = b.dataset.mode;
      save();
      updateHome();
      sfx('tap');
    });
  });

  $('#home-modes').addEventListener('click', function (e) { e.stopPropagation(); });

  var pressTimer = 0;
  var downAt = 0;
  var openedByPress = false;
  var gear = $('#btn-settings');

  gear.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    downAt = Date.now();
    openedByPress = false;
    gear.classList.add('pressing');
    clearTimeout(pressTimer);
    pressTimer = setTimeout(function () {
      openedByPress = true;
      gear.classList.remove('pressing');
      openSettings();
    }, 800);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
    gear.addEventListener(ev, function () {
      clearTimeout(pressTimer);
      gear.classList.remove('pressing');
    });
  });
  gear.addEventListener('click', function (e) {
    e.preventDefault();
    if (openedByPress) { openedByPress = false; return; }
    if (Date.now() - downAt < 800) toast('长按 1 秒，进入家长设置');
  });
  gear.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  gear.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSettings(); }
  });

  /* ---------------- PWA install ---------------- */

  var installBtn = $('#btn-install');
  var deferredInstall = null;
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (installBtn) {
    if (standalone) installBtn.hidden = true;
    else if (isIOS) installBtn.hidden = false;

    installBtn.addEventListener('click', async function () {
      if (deferredInstall) {
        deferredInstall.prompt();
        try { await deferredInstall.userChoice; } catch (e) {}
        deferredInstall = null;
        installBtn.hidden = true;
        return;
      }
      $('#install-help').classList.add('open');
    });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredInstall = e;
    if (installBtn && !standalone) installBtn.hidden = false;
  });

  window.addEventListener('appinstalled', function () {
    deferredInstall = null;
    if (installBtn) installBtn.hidden = true;
  });

  $('#btn-install-close').addEventListener('click', function () {
    $('#install-help').classList.remove('open');
  });
  $('#install-help').addEventListener('click', function (e) {
    if (e.target === $('#install-help')) $('#install-help').classList.remove('open');
  });

  $('#btn-offline').addEventListener('click', cacheAllAudio);
  $('#btn-export').addEventListener('click', exportProgress);
  $('#btn-import').addEventListener('click', function () { $('#import-file').click(); });
  $('#import-file').addEventListener('change', function (e) {
    importProgress(e.target.files && e.target.files[0]);
    e.target.value = '';
  });

  $('#settings-modes').addEventListener('click', function (e) {
    var b = e.target.closest('[data-mode]');
    if (!b) return;
    settings.mode = b.dataset.mode;
    save(); renderSettings(); updateHome(); sfx('tap');
  });
  $('#settings-length').addEventListener('click', function (e) {
    var b = e.target.closest('[data-len]');
    if (!b) return;
    settings.length = Number(b.dataset.len);
    save(); renderSettings(); sfx('tap');
  });
  $('#settings-en-level').addEventListener('click', function (e) {
    var b = e.target.closest('[data-en-level]');
    if (!b) return;
    settings.enLevel = Number(b.dataset.enLevel);
    save(); renderSettings(); updateHome(); sfx('tap');
  });
  $('#settings-fr-level').addEventListener('click', function (e) {
    var b = e.target.closest('[data-fr-level]');
    if (!b) return;
    settings.frLevel = Number(b.dataset.frLevel);
    settings.frLevelV3 = true;
    save(); renderSettings(); updateHome(); sfx('tap');
  });
  $('#settings-speed').addEventListener('click', function (e) {
    var b = e.target.closest('[data-speed]');
    if (!b) return;
    settings.speed = Number(b.dataset.speed);
    save(); renderSettings(); sfx('tap');
  });
  $('#settings-pos').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pos]');
    if (!b) return;
    settings.pos = b.dataset.pos;
    save(); renderSettings(); updateHome(); sfx('tap');
  });
  $('#bank-filter').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pos]');
    if (!b) return;
    bankFilter = b.dataset.pos;
    renderBank(); sfx('tap');
  });
  $('#check-pack').addEventListener('change', function () {
    settings.pack = $('#check-pack').value;
    save();
    renderCheckBlock();
    sfx('tap');
  });
  $('#btn-review').addEventListener('click', function () {
    if (dueWords().length === 0) { toast('现在没有到期的复习词'); return; }
    sfx('tap');
    startSession('review');
  });
  $('#btn-check').addEventListener('click', function () { sfx('tap'); openCheckIntro(); });
  $('#btn-check-start').addEventListener('click', function () {
    sfx('tap');
    startSession('check', settings.pack);
  });
  $('#btn-check-cancel').addEventListener('click', function () {
    $('#check-intro').classList.remove('open');
  });
  $('#check-intro').addEventListener('click', function (e) {
    if (e.target === $('#check-intro')) $('#check-intro').classList.remove('open');
  });
  $('#toggle-hint').addEventListener('click', function () {
    settings.showHint = !settings.showHint;
    save(); renderSettings();
    if (state.session && state.session.current) updateCaption(state.session.current);
  });
  $('#btn-close-settings').addEventListener('click', closeSettings);
  $('#settings').addEventListener('click', function (e) {
    if (e.target === $('#settings')) closeSettings();
  });
  $('#test-en').addEventListener('click', function () {
    var p = promptFor({ id: 'apple', lang: 'en' });
    say(p.file, p.text, 'en');
  });
  $('#test-fr').addEventListener('click', function () {
    var p = promptFor({ id: 'apple', lang: 'fr' });
    say(p.file, p.text, 'fr');
  });

  var resetArmed = false;
  var resetTimer = 0;
  $('#btn-reset').addEventListener('click', function () {
    var btn = $('#btn-reset');
    if (!resetArmed) {
      resetArmed = true;
      btn.textContent = '再点一次，确认清空';
      resetTimer = setTimeout(function () {
        resetArmed = false;
        btn.textContent = '清空学习记录';
      }, 3200);
      return;
    }
    clearTimeout(resetTimer);
    resetArmed = false;
    progress = normalize({});
    save();
    renderSettings();
    updateHome();
    btn.textContent = '已清空';
    setTimeout(function () { btn.textContent = '清空学习记录'; }, 1600);
    toast('学习记录已清空');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if ($('#check-intro').classList.contains('open')) { $('#check-intro').classList.remove('open'); return; }
      if ($('#settings').classList.contains('open')) { closeSettings(); return; }
      if ($('#pause').classList.contains('open')) { $('#btn-resume').click(); return; }
      if (state.screen === 'game') { stopAudio(); $('#pause').classList.add('open'); return; }
    }
    if (state.screen !== 'game' || !state.session) return;
    if (e.key === '1' || e.key === '2' || e.key === '3') {
      var card = $('#cards').children[Number(e.key) - 1];
      if (card) card.click();
    } else if (e.key === ' ') {
      e.preventDefault();
      playPrompt();
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopAudio();
  });

  var toastTimer = 0;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 1900);
  }

  /* ---------------- boot ---------------- */

  updateHome();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  var demo = new URLSearchParams(location.search).get('demo');
  if (demo) {
    if (demo === 'en' || demo === 'fr' || demo === 'both') settings.mode = demo;
    setTimeout(function () { startSession(); }, 220);
  }

  window.__momo = {
    get session() { return state.session; },
    get progress() { return progress; },
    get settings() { return settings; },
    screen: function () { return state.screen; },
    current: function () {
      var s = state.session;
      if (!s || !s.current) return null;
      var p = promptFor(s.current);
      return { id: s.current.id, lang: s.current.lang, cards: s.cardIds.slice(), index: s.index, completed: s.completed, total: s.queue.length, locked: s.locked, answered: s.answered, misses: s.misses, level: p.level, prompt: p.text, audio: p.file };
    },
    audio: function () {
      return { paused: voice.paused, t: voice.currentTime, dur: voice.duration, err: voice.error ? voice.error.code : 0, src: voice.currentSrc, rate: voice.playbackRate };
    },
    choose: function (id) {
      var el = $('#cards').querySelector('[data-id="' + id + '"]');
      if (el) el.click();
    },
    start: function (kind, packId) { startSession(kind, packId); },
    check: function (packId) { startSession('check', packId || settings.pack); },
    end: function () { endSession(); },
    openSettings: openSettings,
    openCheckIntro: openCheckIntro,
    art: ART,
    packs: PACKS
  };
})();
