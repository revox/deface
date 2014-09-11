// to see console.logging you need to inspect the chrome extension button, this will show the special extensions console

//Jquery this
var app = {

  run : function() {
    
    // l10n the popup html
    $('P').text(chrome.i18n.getMessage("popupTitle"));
    $('#classified').next().text(chrome.i18n.getMessage("anonymousFilter"));
    $('#bleep').next().text(chrome.i18n.getMessage("bleepFilter"));
    $('#smiley').next().text(chrome.i18n.getMessage("smileyFilter"));
    $('#lipstick').next().text(chrome.i18n.getMessage("lipstickFilter"));
            
    // get the current filter from localStorage
    if (localStorage.faceFilter) {
      // console.log(localStorage.faceFilter);
      // set the checkbox in the html
      $('#' + localStorage.faceFilter).attr('checked', true);
    }// else the default value is the radio button in the HTML with a checked attribute

    // bind a handler to the radio buttons to change the filter
    $("input[name=faceFilter]").change(function() {

      //console.log($('input[name=faceFilter]:radio:checked').val());
      // store the current face filter
      localStorage.faceFilter = $('input[name=faceFilter]:radio:checked').val();
      console.log('faceFilter is ' + localStorage.faceFilter);

      if (localStorage.faceFilter == "userFilter") {

        // show the div
        // text = text.replace(/\n/gi, "<br />");

        console.log("user filter selected code is - " + $('#userScript').text());
        //localStorage.faceFilter = "classified";
      }

      // refresh the page
      chrome.tabs.getSelected(null, function(tab) {
        var code = 'window.location.reload();';
        chrome.tabs.executeScript(tab.id, {
          code : code
        });
        window.close();
      });

    });

  }
};

document.addEventListener('DOMContentLoaded', function() {
  app.run();
});
