/* FOLGA 2026 — reads the program from the public Google Sheet.
   Sheet columns: day, start, end, type, title, speaker, affiliation, abstract
   If the sheet can't be reached, falls back to data/schedule.csv (copy shipped with the site). */
(function(){
  var SHEET_ID = '1LjDuNJF-_lHq8gWNR7sxRQJX-sJJq36G4RgdlvIZVVw';
  var SHEET_CSV = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&headers=1';
  var LOCAL_CSV = 'data/schedule.csv';

  // Day codes used in the sheet -> label and date (ISO) for the event week
  var DAYS = [
    { key:'mon', label:'Monday',    short:'Mon', date:'2026-11-30', pretty:'Nov 30' },
    { key:'tue', label:'Tuesday',   short:'Tue', date:'2026-12-01', pretty:'Dec 1' },
    { key:'wed', label:'Wednesday', short:'Wed', date:'2026-12-02', pretty:'Dec 2' },
    { key:'thu', label:'Thursday',  short:'Thu', date:'2026-12-03', pretty:'Dec 3' },
    { key:'fri', label:'Friday',    short:'Fri', date:'2026-12-04', pretty:'Dec 4' }
  ];

  var TYPE_LABELS = {
    talk:'Talk', coffee:'Coffee break', lunch:'Lunch', posters:'Posters', roundtable:'Round table',
    opening:'Opening', closing:'Closing', social:'Social', reception:'Reception', free:'Free time'
  };

  // CSV parser that respects quotes (commas and line breaks inside fields)
  function parseCSV(text){
    var rows = [], row = [], cur = '', inQ = false;
    for (var i = 0; i < text.length; i++){
      var c = text[i];
      if (inQ){
        if (c === '"'){
          if (text[i+1] === '"'){ cur += '"'; i++; }
          else inQ = false;
        } else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ','){ row.push(cur); cur = ''; }
        else if (c === '\n'){ row.push(cur); rows.push(row); row = []; cur = ''; }
        else if (c !== '\r') cur += c;
      }
    }
    if (cur.length || row.length){ row.push(cur); rows.push(row); }
    return rows;
  }

  function esc(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function slug(s){
    return s.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }

  // Accepts "9:00", "09:00", "9:00:00", "9:00 AM", "21h", "9h30" -> "09:00" ('' if empty)
  function normTime(s){
    s = (s || '').trim();
    if (!s) return '';
    var m = s.match(/^(\d{1,2})\s*[:hH]?\s*(\d{2})?(?::\d{2})?\s*([AaPp][Mm])?$/);
    if (!m) return s;
    var h = parseInt(m[1], 10), min = m[2] || '00';
    if (m[3]){
      var pm = /p/i.test(m[3]);
      if (pm && h < 12) h += 12;
      if (!pm && h === 12) h = 0;
    }
    return (h < 10 ? '0' : '') + h + ':' + min;
  }
  function minutes(t){ var p = t.split(':'); return parseInt(p[0],10)*60 + parseInt(p[1]||'0',10); }

  function dayIndex(s){
    s = (s || '').trim().toLowerCase();
    if (!s) return -1;
    for (var i = 0; i < DAYS.length; i++){
      var d = DAYS[i];
      if (s.indexOf(d.key) === 0 || s === d.date || s.indexOf(d.pretty.toLowerCase()) !== -1) return i;
    }
    // Portuguese names / dd/mm, in case someone types them in the sheet
    var pt = ['seg','ter','qua','qui','sex'], dm = ['30/11','01/12','02/12','03/12','04/12'];
    for (var j = 0; j < 5; j++){
      if (s.indexOf(pt[j]) === 0 || s.indexOf(dm[j]) === 0 || s.indexOf(dm[j].replace(/^0/,'')) === 0) return j;
    }
    return -1;
  }

  function toEvents(rows){
    if (!rows.length) return [];
    var head = rows[0].map(function(h){ return h.trim().toLowerCase(); });
    function col(name, fallback){ var i = head.indexOf(name); return i === -1 ? fallback : i; }
    var C = {
      day:col('day',0), start:col('start',1), end:col('end',2), type:col('type',3),
      title:col('title',4), speaker:col('speaker',5), affiliation:col('affiliation',6), abstract:col('abstract',7)
    };
    var out = [];
    for (var i = 1; i < rows.length; i++){
      var r = rows[i];
      function g(k){ return (r[C[k]] || '').trim(); }
      var d = dayIndex(g('day'));
      var start = normTime(g('start'));
      if (d === -1 || !/^\d\d:\d\d$/.test(start)) continue;
      var end = normTime(g('end'));
      out.push({
        day:d, start:start, end:/^\d\d:\d\d$/.test(end) ? end : '',
        type:(g('type') || 'talk').toLowerCase(),
        title:g('title'), speaker:g('speaker'), affiliation:g('affiliation'), abstract:g('abstract')
      });
    }
    out.sort(function(a,b){ return a.day - b.day || minutes(a.start) - minutes(b.start); });
    out.forEach(function(e){
      if (e.speaker) e.id = 'talk-' + slug(e.speaker);
      else if (e.type === 'roundtable') e.id = 'round-table';
    });
    return out;
  }

  function fetchText(url){
    return fetch(url, { cache:'no-store' }).then(function(r){
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
  }

  function load(){
    return fetchText(SHEET_CSV)
      .then(function(t){
        // A private sheet answers with an HTML login page instead of CSV
        if (/^\s*</.test(t)) throw new Error('sheet not public');
        var ev = toEvents(parseCSV(t));
        if (!ev.length) throw new Error('sheet empty');
        return ev;
      })
      .catch(function(err){
        console.warn('Google Sheet unavailable, using local copy:', err.message);
        return fetchText(LOCAL_CSV).then(function(t){ return toEvents(parseCSV(t)); });
      });
  }

  function initials(name){
    var p = name.replace(/\(.*?\)/g,'').trim().split(/\s+/);
    return ((p[0]||'')[0] + (p.length > 1 ? p[p.length-1][0] : '')).toUpperCase();
  }

  function timeRange(e){ return e.start + (e.end ? '–' + e.end : ''); }

  function isTBA(t){ return !t || /^tba$/i.test(t); }

  /* ---------- Home: speaker list ---------- */
  function renderSpeakers(el, statusEl, events){
    var seen = {}, list = [];
    events.forEach(function(e){
      if (e.type === 'talk' && e.speaker && !seen[e.id]){ seen[e.id] = 1; list.push(e); }
    });
    list.sort(function(a,b){ return a.speaker.localeCompare(b.speaker, 'en'); });
    el.innerHTML = list.map(function(e){
      return '<a class="spk" href="program.html#' + e.id + '">' +
        '<span class="av" aria-hidden="true">' + esc(initials(e.speaker)) + '</span>' +
        '<span><span class="nm">' + esc(e.speaker) + '</span><br><span class="af">' + esc(e.affiliation) + '</span></span></a>';
    }).join('');
    if (statusEl) statusEl.textContent = list.length + ' invited speakers. Titles and abstracts will be announced on the program page.';
  }

  /* ---------- Program page ---------- */
  function cellInner(e, linkable){
    var who, sub = '';
    if (e.type === 'talk' && e.speaker){
      who = e.speaker;
      sub = (e.affiliation ? '<span class="aff">' + esc(e.affiliation) + '</span>' : '') +
            (!isTBA(e.title) ? '<span class="ttl">' + esc(e.title) + '</span>' : '');
    } else {
      who = e.title || TYPE_LABELS[e.type] || e.type;
      if (e.type === 'roundtable'){
        var parts = who.split(/\s+[—–-]\s+/);
        if (parts.length > 1){ who = parts[0]; sub = '<span class="ttl">' + esc(parts.slice(1).join(' — ')) + '</span>'; }
      }
      if (e.speaker) sub = '<span class="aff">' + esc(e.speaker) + '</span>' + sub;
    }
    var inner = '<span class="who">' + esc(who) + '</span>' + sub;
    return (linkable && e.id) ? '<a href="#' + e.id + '">' + inner + '</a>' : inner;
  }

  function nowInfo(){
    // Event runs in Belo Horizonte (UTC−3, no DST)
    var d = new Date(Date.now() - 3*3600*1000);
    var iso = d.toISOString();
    return { date: iso.slice(0,10), min: d.getUTCHours()*60 + d.getUTCMinutes() };
  }
  function isNow(e, now){
    if (DAYS[e.day].date !== now.date) return false;
    var s = minutes(e.start), f = e.end ? minutes(e.end) : s + 60;
    return now.min >= s && now.min < f;
  }

  function renderGrid(holder, events){
    var now = nowInfo();
    // Time slots = distinct start times; each event spans the slots that begin before it ends
    var starts = {};
    events.forEach(function(e){ starts[e.start] = starts[e.start] || {}; if (e.end) starts[e.start][e.end] = (starts[e.start][e.end]||0) + 1; });
    var slots = Object.keys(starts).sort(function(a,b){ return minutes(a) - minutes(b); });
    var slotEnd = slots.map(function(s){
      var ends = starts[s], best = '', n = 0;
      for (var k in ends){ if (ends[k] > n){ n = ends[k]; best = k; } }
      return best;
    });

    var at = {}; // "slotIdx|day" -> event
    events.forEach(function(e){
      var si = slots.indexOf(e.start), span = 1;
      if (e.end){
        span = 0;
        for (var j = si; j < slots.length && minutes(slots[j]) < minutes(e.end); j++) span++;
        span = Math.max(span, 1);
      }
      e._span = span;
      at[si + '|' + e.day] = e;
    });

    var covered = {};
    var html = '<table class="grid"><thead><tr><th class="time-h">Time</th>' +
      DAYS.map(function(d){ return '<th>' + d.label + '<small>' + d.pretty + '</small></th>'; }).join('') +
      '</tr></thead><tbody>';

    slots.forEach(function(s, si){
      var label = s + (slotEnd[si] ? '–' + slotEnd[si] : '');
      html += '<tr><td class="time">' + label + '</td>';

      // Same break on every day (coffee, lunch…) -> one wide cell
      var row = DAYS.map(function(_, d){ return at[si + '|' + d]; });
      var allSame = row.every(function(e){ return e && !e.speaker && e._span === 1 && e.type === row[0].type && e.title === row[0].title; });
      if (allSame && row[0].type !== 'talk'){
        var e0 = row[0];
        html += '<td colspan="' + DAYS.length + '" class="t-' + esc(e0.type) + '">' + cellInner(e0, true) + '</td></tr>';
        return;
      }

      DAYS.forEach(function(_, d){
        if (covered[si + '|' + d]) return;
        var e = at[si + '|' + d];
        if (!e){ html += '<td></td>'; return; }
        for (var k = 1; k < e._span; k++) covered[(si + k) + '|' + d] = 1;
        var cls = 't-' + e.type + (isNow(e, now) ? ' now' : '');
        html += '<td class="' + esc(cls) + '"' + (e._span > 1 ? ' rowspan="' + e._span + '"' : '') + '>' + cellInner(e, true) + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    holder.innerHTML = html;
  }

  function renderDayList(listEl, tabsEl, events){
    var now = nowInfo(), current = 0;
    DAYS.forEach(function(d, i){ if (d.date === now.date) current = i; });
    function draw(){
      tabsEl.innerHTML = DAYS.map(function(d, i){
        return '<button type="button" role="tab" aria-selected="' + (i === current) + '" data-i="' + i + '">' + d.short + ' · ' + d.pretty + '</button>';
      }).join('');
      listEl.innerHTML = events.filter(function(e){ return e.day === current; }).map(function(e){
        return '<li class="' + (isNow(e, now) ? 'now' : '') + '"><span class="tm">' + timeRange(e) + '</span>' +
          '<span class="ev t-' + esc(e.type) + '">' + cellInner(e, true) + '</span></li>';
      }).join('');
    }
    tabsEl.addEventListener('click', function(ev){
      var b = ev.target.closest('button'); if (!b) return;
      current = parseInt(b.getAttribute('data-i'), 10); draw();
    });
    draw();
  }

  function renderTalks(el, events){
    var items = events.filter(function(e){ return (e.type === 'talk' && e.speaker) || e.type === 'roundtable'; });
    el.innerHTML = items.map(function(e){
      var d = DAYS[e.day];
      var name = e.type === 'roundtable' ? 'Round table' : e.speaker;
      var title = e.title;
      if (e.type === 'roundtable'){ var p = title.split(/\s+[—–-]\s+/); title = p.length > 1 ? p.slice(1).join(' — ') : title; }
      return '<article class="talk" id="' + e.id + '">' +
        '<div class="hd"><span><span class="who">' + esc(name) + '</span>' +
        (e.affiliation ? ' <span class="aff">· ' + esc(e.affiliation) + '</span>' : '') +
        (e.type === 'roundtable' && e.speaker ? ' <span class="aff">· ' + esc(e.speaker) + '</span>' : '') + '</span>' +
        '<span class="slot">' + d.short + ' ' + d.pretty + ' · ' + timeRange(e) + '</span></div>' +
        (isTBA(title) ? '<div class="ttl pending">Title to be announced</div>' : '<div class="ttl">' + esc(title) + '</div>') +
        (e.abstract ? '<details><summary>Abstract</summary><div class="abs">' + esc(e.abstract) + '</div></details>' : '') +
        '</article>';
    }).join('');
    if (location.hash){
      var t = document.getElementById(location.hash.slice(1));
      if (t) t.scrollIntoView();
    }
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([el]);
  }

  window.FOLGA = {
    load:load, renderSpeakers:renderSpeakers, renderGrid:renderGrid,
    renderDayList:renderDayList, renderTalks:renderTalks
  };
})();

// Mobile nav toggle
document.addEventListener('click', function(e){
  var b = e.target.closest('.nav-toggle'); if (!b) return;
  var l = document.querySelector('.nav-links');
  var open = l.classList.toggle('open');
  b.setAttribute('aria-expanded', open);
});
