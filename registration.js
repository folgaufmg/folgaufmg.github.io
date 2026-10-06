/* FOLGA 2026 · registration form.
   The page sends the answers to a Google Form (responses go to its spreadsheet).
   FOLGA_FORM is printed by tools/create-registration-form.gs: replace the block below with it. */
var FOLGA_FORM = {
  "action": "https://docs.google.com/forms/d/e/1FAIpQLSfqY4-KH_Lj7wyP1Rj6eRjbOVXVeREWhBuW8vPxo-R8_zWAEw/formResponse",
  "entries": {
    "name": "entry.1524615067",
    "email": "entry.1854319915",
    "institution": "entry.858005858",
    "country": "entry.926884371",
    "position": "entry.1375746856",
    "days": "entry.140095581",
    "poster": "entry.2065190022",
    "poster_title": "entry.1120327946",
    "poster_abstract": "entry.452659201",
    "certificate": "entry.2102180862",
    "comments": "entry.1631992353"
  }
};

(function(){
  var form = document.getElementById('reg-form');
  var notice = document.getElementById('reg-notice');
  var done = document.getElementById('reg-done');
  var btn = document.getElementById('reg-submit');
  var frame = document.getElementById('reg-frame');
  var posterBox = document.getElementById('poster-fields');
  var configured = /\/formResponse$/.test(FOLGA_FORM.action || '');

  if (!configured){
    notice.hidden = false;
    btn.disabled = true;
  } else {
    form.action = FOLGA_FORM.action;
    // Give every field the Google Form name ("entry.NNN") of its question
    form.querySelectorAll('[data-key]').forEach(function(el){
      var name = FOLGA_FORM.entries[el.getAttribute('data-key')];
      if (name) el.name = name;
    });
  }

  // Poster title and abstract only when presenting a poster
  function syncPoster(){
    var yes = form.querySelector('input[data-key="poster"][value="Yes"]').checked;
    posterBox.hidden = !yes;
    posterBox.querySelectorAll('input, textarea').forEach(function(el){
      el.required = yes;
      el.disabled = !yes;
    });
  }
  form.querySelectorAll('input[data-key="poster"]').forEach(function(el){ el.addEventListener('change', syncPoster); });
  syncPoster();

  // At least one day must be ticked
  var days = form.querySelectorAll('input[data-key="days"]');
  function syncDays(){
    var any = Array.prototype.some.call(days, function(d){ return d.checked; });
    days[0].setCustomValidity(any ? '' : 'Please choose at least one day.');
  }
  days.forEach(function(d){ d.addEventListener('change', syncDays); });
  syncDays();

  var sent = false;
  form.addEventListener('submit', function(e){
    if (!configured){ e.preventDefault(); return; }
    sent = true;
    btn.disabled = true;
    btn.textContent = 'Sending…';
  });

  // Google answers inside the hidden iframe; when it loads after a submit, we are done
  frame.addEventListener('load', function(){
    if (!sent) return;
    form.hidden = true;
    done.hidden = false;
    done.scrollIntoView({ behavior:'smooth', block:'center' });
  });
})();
