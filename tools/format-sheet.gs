/**
 * Formats the FOLGA 2026 schedule sheet so it is easy to edit by hand.
 * Run once from the sheet: Extensions → Apps Script → paste → Run "formatFolgaSheet".
 *
 * It only changes formatting, dropdowns and notes. Values are untouched, the header
 * names stay the same (the site reads them), and the schedule stays as the FIRST tab.
 */
function formatFolgaSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheets()[0];
  sh.setName('Schedule');

  var lastRow = Math.max(sh.getLastRow(), 2);
  var maxRows = Math.max(sh.getMaxRows(), lastRow + 30);
  if (sh.getMaxRows() < maxRows) sh.insertRowsAfter(sh.getMaxRows(), maxRows - sh.getMaxRows());
  if (sh.getMaxColumns() > 8) sh.deleteColumns(9, sh.getMaxColumns() - 8);

  var all = sh.getRange(1, 1, maxRows, 8);
  var body = sh.getRange(2, 1, maxRows - 1, 8);

  // Base look
  all.setFontFamily('Open Sans').setFontSize(10).setVerticalAlignment('middle').setBackground(null);
  body.setFontColor('#1F1F1F').setFontWeight('normal').setFontStyle('normal');
  sh.setRowHeights(2, maxRows - 1, 30);

  // Header
  var head = sh.getRange(1, 1, 1, 8);
  head.setBackground('#1F1F1F').setFontColor('#FFFFFF').setFontWeight('bold')
      .setFontFamily('Oswald').setFontSize(11).setHorizontalAlignment('center');
  sh.setRowHeight(1, 36);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(3);

  // Column widths and alignment
  var widths = [70, 70, 70, 110, 330, 220, 250, 460];
  widths.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange(2, 1, maxRows - 1, 4).setHorizontalAlignment('center');
  sh.getRange(2, 5, maxRows - 1, 4).setHorizontalAlignment('left');
  sh.getRange(2, 1, maxRows - 1, 1).setFontWeight('bold');
  sh.getRange(2, 6, maxRows - 1, 1).setFontWeight('bold');
  sh.getRange(2, 5, maxRows - 1, 4).setWrap(true);
  // Keep times as plain text so Sheets doesn't turn 09:00 into a date/number
  sh.getRange(2, 2, maxRows - 1, 2).setNumberFormat('@');

  // Light grid
  all.setBorder(true, true, true, true, true, true, '#E4E4E4', SpreadsheetApp.BorderStyle.SOLID);
  head.setBorder(true, true, true, true, true, true, '#1F1F1F', SpreadsheetApp.BorderStyle.SOLID);

  // Dropdowns
  var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  var types = ['talk', 'coffee', 'lunch', 'posters', 'roundtable', 'opening', 'closing', 'social', 'reception', 'free'];
  sh.getRange(2, 1, maxRows - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(days, true).setAllowInvalid(false)
      .setHelpText('Day of the event: Mon (Nov 30) … Fri (Dec 4)').build());
  sh.getRange(2, 4, maxRows - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(types, true).setAllowInvalid(false)
      .setHelpText('Kind of activity; it sets the colour on the site').build());
  var timeRule = SpreadsheetApp.newDataValidation()
    .requireFormulaSatisfied('=OR(B2="",REGEXMATCH(TO_TEXT(B2),"^\\d{1,2}:\\d{2}$"))')
    .setAllowInvalid(true).setHelpText('24h time, e.g. 09:00').build();
  sh.getRange(2, 2, maxRows - 1, 2).setDataValidation(timeRule);

  // Conditional colours
  var rules = [];
  var rowsRange = sh.getRange(2, 1, maxRows - 1, 8);
  function rowRule(formula, bg, fg, bold, italic) {
    var b = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula).setRanges([rowsRange]);
    if (bg) b.setBackground(bg);
    if (fg) b.setFontColor(fg);
    if (bold) b.setBold(true);
    if (italic) b.setItalic(true);
    rules.push(b.build());
  }
  // Activity types (whole row)
  rowRule('=$D2="roundtable"', '#FDECEB', '#B3302E', true);
  rowRule('=$D2="coffee"', '#FFF4F3', '#D3413F');
  rowRule('=$D2="lunch"', '#F3F3F3', '#8A8A8A');
  rowRule('=$D2="free"', '#F3F3F3', '#8A8A8A', false, true);
  rowRule('=$D2="posters"', '#EEF3F1');
  rowRule('=OR($D2="opening",$D2="closing",$D2="social")', '#ECECEC', null, true);
  rowRule('=$D2="reception"', null, '#8A8A8A');
  // Talks: a soft tint per day so the days are easy to tell apart
  var dayTint = { Mon: '#FFFFFF', Tue: '#FAFAFA', Wed: '#FFFFFF', Thu: '#FAFAFA', Fri: '#FFFFFF' };
  days.forEach(function (d) { rowRule('=AND($D2="talk",$A2="' + d + '")', dayTint[d]); });

  // TBA / to be confirmed in grey italic (title and speaker cells)
  var tba = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=REGEXMATCH(LOWER(E2),"^(tba|tbc|to be confirmed)$")')
    .setFontColor('#9A9A9A').setItalic(true).setRanges([sh.getRange(2, 5, maxRows - 1, 1)]).build();
  var tbcSpeaker = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=REGEXMATCH(LOWER(F2),"\\((tbc|to be confirmed)\\)")')
    .setFontColor('#D3413F').setRanges([sh.getRange(2, 6, maxRows - 1, 1)]).build();
  sh.setConditionalFormatRules([tba, tbcSpeaker].concat(rules));

  // Thick line between days
  var vals = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0] && vals[i][0] !== vals[i - 1][0]) {
      sh.getRange(i + 2, 1, 1, 8).setBorder(true, null, null, null, null, null, '#1F1F1F', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    }
  }

  // Header notes (hover help)
  var notes = [
    'Day: Mon, Tue, Wed, Thu or Fri (dropdown).',
    'Start time, 24h, e.g. 09:00.',
    'End time, 24h. May be empty (e.g. social dinner).',
    'Type of activity (dropdown). It sets the colour on the site.',
    'Talk title. Write TBA while unknown, or "To be confirmed" if the speaker is not confirmed. For other activities: the name shown on the site.',
    'Speaker name (talks only). You can add "(to be confirmed)" after the name.',
    'Speaker institution, as shown on the site.',
    'Optional abstract. LaTeX between $...$ is rendered on the site.'
  ];
  head.setNotes([notes]);

  // Instructions tab (kept AFTER the schedule tab; the site reads the first tab)
  var help = ss.getSheetByName('How to edit') || ss.insertSheet('How to edit', ss.getSheets().length);
  help.clear();
  var lines = [
    ['How to edit the program of the FOLGA 2026 site'],
    [''],
    ['• Each row of the "Schedule" tab is one activity. Changes appear on https://folgaufmg.github.io/program.html after reloading the page.'],
    ['• Keep "Schedule" as the first tab and do not rename the header row (day, start, end, …): the site reads those names.'],
    ['• Row order does not matter; the site sorts by day and time.'],
    ['• To add a talk: insert a row, pick the day and type "talk", fill start, end, speaker and affiliation; write TBA as title until it is known.'],
    ['• Speaker not confirmed yet: write "To be confirmed" in the title, or "(to be confirmed)" after the name.'],
    ['• Coffee breaks and lunch that are the same on all five days are shown as a single wide row on the site.'],
    ['• Abstracts accept LaTeX between $...$.'],
    ['• The sheet must stay shared as "Anyone with the link can view".']
  ];
  help.getRange(1, 1, lines.length, 1).setValues(lines).setFontFamily('Open Sans').setFontSize(11).setWrap(true);
  help.getRange(1, 1).setFontFamily('Oswald').setFontSize(16).setFontWeight('bold').setFontColor('#F34F4C');
  help.setColumnWidth(1, 900);
  help.setHiddenGridlines(true);

  sh.setHiddenGridlines(true);
  ss.setActiveSheet(sh);
  SpreadsheetApp.flush();
}
