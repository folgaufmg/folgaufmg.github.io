/**
 * Creates the FOLGA 2026 registration Google Form and its response spreadsheet.
 * Run ONCE: go to https://script.google.com → New project → paste this file → Run "createFolgaRegistrationForm".
 * (Accept the permissions Google asks for: Forms and Sheets in your own Drive.)
 *
 * At the end the log (View → Logs / Execution log) prints:
 *   1. the links to edit the form and to see the responses;
 *   2. a block "FOLGA_FORM = {...}" to paste into registration.js in the site.
 *
 * The site page registration.html sends the answers straight to this form, so the
 * participant never leaves the site. Answers land in the response spreadsheet as usual.
 * If you later add, remove or rename a question in the form, run printFolgaFormConfig()
 * and paste the new block into registration.js.
 */
var FOLGA_DAYS = [
  'Monday, Nov 30', 'Tuesday, Dec 1', 'Wednesday, Dec 2', 'Thursday, Dec 3', 'Friday, Dec 4'
];
var FOLGA_POSITIONS = [
  'Undergraduate student', "Master's student", 'PhD student', 'Postdoc',
  'Faculty / Researcher', 'High school teacher', 'Other'
];

function createFolgaRegistrationForm() {
  var form = FormApp.create('FOLGA 2026 · Registration');
  form.setTitle('Symposium on Supergeometry, Algebraic Geometry and Foliations · Registration')
      .setDescription('November 30 to December 4, 2026 · ICEx, UFMG, Belo Horizonte, Brazil.\n' +
                      'Registration fee: R$ 100 for faculty and postdocs, R$ 50 for students (Pix). Site: https://folgaufmg.github.io')
      .setConfirmationMessage('Thank you! Your registration was received. See you at UFMG.')
      .setCollectEmail(false)
      .setAllowResponseEdits(false)
      .setLimitOneResponsePerUser(false)
      .setShowLinkToRespondAgain(false);
  // The site posts without a Google login, so the form must not require one.
  try { form.setRequireLogin(false); } catch (e) { /* only exists on Workspace accounts */ }

  var emailRule = FormApp.createTextValidation().requireTextIsEmail()
      .setHelpText('Please enter a valid email address.').build();

  form.addTextItem().setTitle('Full name').setRequired(true);
  form.addTextItem().setTitle('Email').setRequired(true).setValidation(emailRule);
  form.addTextItem().setTitle('Institution').setRequired(true);
  form.addTextItem().setTitle('Country').setRequired(true);
  form.addMultipleChoiceItem().setTitle('Academic position')
      .setChoiceValues(FOLGA_POSITIONS).setRequired(true);
  form.addCheckboxItem().setTitle('Days you plan to attend')
      .setChoiceValues(FOLGA_DAYS).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Would you like to present a poster?')
      .setChoiceValues(['Yes', 'No']).setRequired(true);
  form.addTextItem().setTitle('Poster title')
      .setHelpText('Only if you will present a poster.');
  form.addParagraphTextItem().setTitle('Poster abstract')
      .setHelpText('Only if you will present a poster. LaTeX between $...$ is fine.');
  form.addMultipleChoiceItem().setTitle('Do you need a certificate of participation?')
      .setChoiceValues(['Yes', 'No']).setRequired(true);
  form.addParagraphTextItem().setTitle('Comments')
      .setHelpText('Accessibility needs, dietary restrictions, questions to the organizers.');

  var ss = SpreadsheetApp.create('FOLGA 2026 · Registrations (responses)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log('Edit the form:      ' + form.getEditUrl());
  Logger.log('Public form link:   ' + form.getPublishedUrl());
  Logger.log('Responses (sheet):  ' + ss.getUrl());
  Logger.log('Form id (keep it):  ' + form.getId());
  logConfig_(form);
}

/** Prints the block for registration.js again. Put the form id below first. */
function printFolgaFormConfig() {
  var FORM_ID = '1TxEvW4XRa3bmf5ua0QthqjNQfxdzAKP0nJhR5RONOGw';
  logConfig_(FormApp.openById(FORM_ID));
}

// Keys used by registration.html, matched to the form questions by title.
var FOLGA_KEYS = {
  'Full name': 'name',
  'Email': 'email',
  'Institution': 'institution',
  'Country': 'country',
  'Academic position': 'position',
  'Days you plan to attend': 'days',
  'Would you like to present a poster?': 'poster',
  'Poster title': 'poster_title',
  'Poster abstract': 'poster_abstract',
  'Do you need a certificate of participation?': 'certificate',
  'Comments': 'comments'
};

function logConfig_(form) {
  // Google does not expose the "entry.NNN" field names directly. We build a
  // pre-filled link with a dummy answer per question and read the numbers from it.
  var entries = {};
  form.getItems().forEach(function (item) {
    var key = FOLGA_KEYS[item.getTitle()];
    if (!key) return;
    var r;
    switch (item.getType()) {
      case FormApp.ItemType.TEXT: r = item.asTextItem().createResponse('x'); break;
      case FormApp.ItemType.PARAGRAPH_TEXT: r = item.asParagraphTextItem().createResponse('x'); break;
      case FormApp.ItemType.MULTIPLE_CHOICE:
        r = item.asMultipleChoiceItem().createResponse(item.asMultipleChoiceItem().getChoices()[0].getValue()); break;
      case FormApp.ItemType.CHECKBOX:
        r = item.asCheckboxItem().createResponse([item.asCheckboxItem().getChoices()[0].getValue()]); break;
      default: return;
    }
    var url = form.createResponse().withItemResponse(r).toPrefilledUrl();
    var m = url.match(/entry\.(\d+)=/);
    if (m) entries[key] = 'entry.' + m[1];
  });
  var action = form.getPublishedUrl().replace(/\/viewform.*$/, '/formResponse');
  Logger.log('\n----- paste into registration.js -----\n' +
    'var FOLGA_FORM = ' + JSON.stringify({ action: action, entries: entries }, null, 2) + ';\n' +
    '--------------------------------------');
}
