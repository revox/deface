var successURLs = 'https://www.facebook.com/connect/login_success.html';
var successURL = 'http://www.facebook.com/connect/login_success.html';

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

  //console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
  //console.log(request);

  if ((sender.tab.url.indexOf(successURL) == 0) || (sender.tab.url.indexOf(successURLs) == 0)) {
    var params = sender.tab.url.split('#')[1];
    access = params.split('&')[0];
    //console.log('***** got the token from tab ' + sender.tab + ' code is ' + access);
    localStorage.accessToken = access;
    chrome.tabs.remove(sender.tab.id, function() {
      // console.log('tab' + sender.tab.id + ' removed');
      //console.log(request);
    });

    chrome.runtime.sendMessage({
      newToken : "True"
     });
  }

}); 