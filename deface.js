// this is the background script, it listens for images sent to it by the content script (main.js)
// to view the console logging for this page you need to go to the extensions page in chrome and click on the background.html link
// for the extensions background page.

// var mask = new Image();
// var maskLoaded = false;
var imagesArray = new Array();
var successURL = 'http://www.facebook.com/connect/login_success.html';
var sourceUrl;
var start_tab_id;

function shareToFacebook(info, tab) {
  sourceUrl = info.srcUrl;
  start_tab_id = tab.id;
  if (localStorage.accessToken) {// the token could be out of date...
    postImage(info.srcUrl);
  } else {
    fbLogin();
  }
}

function postImage(sourceUrl) {

  target = document.createElement('img');
  target.setAttribute('src', sourceUrl);
  target.setAttribute('id', 'defaced');

  var c = document.createElement("canvas");
  c.width = target.width;
  c.height = target.height;
  var ctx = c.getContext("2d");
  img = new Image();
  img.src = sourceUrl;

  img.onload = function() {

    //console.log('image dims ' + img.width + ',' + img.height);
    ctx.drawImage(img, 0, 0, img.width, img.height);
    var b64img = c.toDataURL("image/png");
    var blob = dataURItoBlob(b64img, "image/png");
    var graph_url = "https://graph.facebook.com/me/photos?" + localStorage.accessToken;
    var formData = new FormData();
    formData.append("source", blob);
    formData.append("message", "made by http://superify.com");

    $.ajax({
      type : 'POST',
      url : graph_url,
      data : formData,
      processData : false,
      contentType : false,
      cache : false,
      success : function(data) {
        console.log(data);
        console.log("selecting tab" + start_tab_id);
        chrome.tabs.update(start_tab_id, {
          "active" : true,
          "highlighted" : true
        }, function(tab) {
          console.log("Completed updating tab .." + tab.id);
        });
        alert('your image was posted to the defaced album in your photo collection');
        // reset the tab position...
      },
      error : function(data) {

        if (data.responseJSON.error.code == 190) {
          console.log('post to FB failed on error 190, reauth commencing');
          fbLogin();
          // callback required here
        } else {
          console.log('post to FB failed WTF?');
          console.log(data);
        }
      }
    });
  };
}

// login to facebook...
function fbLogin() {
  console.log('attempting to login to facebook');
  // need to redirect to THE link
  var url = "https://www.facebook.com/dialog/oauth?client_id=527483423965027&response_type=token&scope=publish_stream&redirect_uri=http://www.facebook.com/connect/login_success.html";
  chrome.tabs.create({
    'url' : url
  }, function(tab) {
    chrome.runtime.sendMessage({
      parseToken : true
    }, function(response) {

      //swallow

    });

  });
}

// http://pupunzi.open-lab.com/2013/10/30/create-images-and-make-them-travel-the-world-using-html5-svg-canvas-and-javascript/
function dataURItoBlob(dataURI, mime) {
  var BASE64_MARKER = ';base64,';
  var base64Index = dataURI.indexOf(BASE64_MARKER);
  dataURI = dataURI.substring(base64Index + BASE64_MARKER.length);
  var byteString = window.atob(dataURI);
  var ia = new Uint8Array(byteString.length);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ia], {
    type : mime
  });
}

// set up the context menu
var parent = chrome.contextMenus.create({
  "title" : chrome.i18n.getMessage("sharingTitle"),
  "contexts" : ["image"],
  "onclick" : shareToFacebook
});

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {

  if (request.newToken) {
    postImage(sourceUrl);
    return;
  }

  if (request.getImages) {
    //console.log('getimage request');
    sendResponse({
      imgs : imagesArray
    });
    return;
  }

  if (request.resetImages) {
    // console.log('resetimage request');
    imagesArray.length = 0;
    return;
  }

  var img = new Image, canvas = document.createElement("canvas"), ctx = canvas.getContext("2d"), src = request['imgSrc'];

  img.onload = function() {
    canvas.width = img.width;
    canvas.height = img.height;

    function post(comp) {

      //console.log('comp called means we are going to mess with the image in position' + request['pos'] + '. There are ' + comp.length + ' face(s) and its url is ' + request['imgSrc']);

      ctx.drawImage(img, 0, 0);

      // this is the face filter....can I load these remotely?
      if (localStorage.faceFilter) {
        window.filters[localStorage.faceFilter](ctx, comp);
      } else {
        filters.classified(ctx, comp);
      }

      var url = canvas.toDataURL("image/png");
      // console.log(url);
      imagesArray.push(url);

      chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.sendMessage(tab.id, {
          data : url,
          pos : request['pos']
        });
      });

    }
    // here's where the magic...bollocks really....struggles on beards, glasses, tilted faces and anyone non-white
    var comp = ccv.detect_objects({
      "canvas" : ccv.grayscale(ccv.pre(img)),
      "cascade" : cascade,
      "interval" : 5,
      "min_neighbors" : 1
    });

    //console.log('comp.length = ' + comp.length);
    if (comp.length) {
      post(comp);
    } else {
      chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.sendMessage(tab.id, {
          data : null,
          pos : request['pos']
        });
      });
    }

  };

  img.src = src; // hey ho lets go! (J Ramone)

});

var filters = {

  classified : function(context, comp) {

    context.fillStyle = 'rgba(255,255,255)';
    for (var i = 0; i < comp.length; i++) {
      // make the ratio for the eyes.
      context.fillRect(comp[i].x, comp[i].y + (comp[i].height * 0.27), comp[i].width, comp[i].height - (comp[i].height * 0.7))
    }
  },

  bleep : function(context, comp) {

    for (var i = 0; i < comp.length; i++) {

      var eyerac_l_x = comp[i].x + comp[i].width * 0.2;
      var eyerac_r_x = comp[i].x + comp[i].width - comp[i].width * 0.2;
      var eyerac = comp[i].width * 0.2;

      context.fillRect(eyerac_l_x - eyerac, comp[i].y + comp[i].height - eyerac * 1.2, eyerac_r_x - eyerac_l_x + 2 * eyerac, eyerac * 1.2);
    }

  },

  smiley : function(context, comp) {

    for (var i = 0; i < comp.length; i++) {

      var eyerac = comp[i].width * 0.15;
      var facerac = comp[i].width * 0.5 * 2;
      var mouthrac = comp[i].height * 0.45;
      var eyerac_l_x = comp[i].x + comp[i].width * 0.25;
      var eyerac_r_x = comp[i].x + comp[i].width - comp[i].width * 0.25;
      var eyerac_y = comp[i].y + comp[i].height * 0.4;

      // needs to scale according ot the face size
      context.lineWidth = comp[i].width * 0.1;

      context.beginPath();
      context.arc(comp[i].x + comp[i].width * 0.5, comp[i].y + comp[i].height * 0.5, mouthrac, 0.6, Math.PI - 0.6, false);

      context.moveTo(eyerac_l_x + eyerac, eyerac_y);
      context.arc(eyerac_l_x, eyerac_y, eyerac, 0, Math.PI * 2, false);

      context.moveTo(eyerac_r_x + eyerac, eyerac_y);
      context.arc(eyerac_r_x, eyerac_y, eyerac, 0, Math.PI * 2, false);

      context.stroke();

    }

  },
  
  lipstick : function(context, comp) {


    for (var i = 0; i < comp.length; i++) {


        var startingX = comp[i].x + comp[i].width * 0.28;
        var startingY = comp[i].y + comp[i].height * 0.9;
        var scale1 = comp[i].width * 0.0026;
       
        context.beginPath();


        context.moveTo( startingX, startingY);
        context.bezierCurveTo( startingX + 74*scale1, startingY + 70*scale1, startingX + 112*scale1, startingY + 76*scale1, startingX + 184*scale1, startingY - 6*scale1 );

        context.moveTo( startingX +0*scale1, startingY + 0*scale1 )
        context.bezierCurveTo( startingX + 38*scale1, startingY + 4*scale1, startingX + 65*scale1, startingY - 80*scale1, startingX + 96*scale1, startingY - 28*scale1 );

        context.moveTo( startingX + 96*scale1, startingY - 28*scale1 )
        context.bezierCurveTo( startingX + 129*scale1, startingY - 89*scale1, startingX + 149*scale1, startingY + 7*scale1, startingX + 184*scale1, startingY - 6*scale1 );
        context.lineWidth = comp[i].width * 0.04;
        context.strokeStyle = "#C20116";

        context.stroke();
        context.fillStyle = '#F54646';
        context.fill();

        context.beginPath();

        context.moveTo( startingX + 41*scale1, startingY + 4*scale1 )
        context.bezierCurveTo( startingX + 118*scale1, startingY + 14*scale1, startingX + 138*scale1, startingY + 5*scale1, startingX + 141*scale1, startingY - 3*scale1 );
        context.lineWidth = comp[i].width * 0.02;

        context.strokeStyle = "#C20116";


    
        context.stroke();



    }

  },


  robocop : function(context, comp) {

    // var mask = new Image();
    // mask.onload = function() {

    for (var i = 0; i < comp.length; i++) {
      context.drawImage(mask, comp[i].x - (comp[i].width * 0.2), comp[i].y - (comp[i].height * 0.4), comp[i].width + (comp[i].width * 0.55), comp[i].height + (comp[i].height * 0.75));
    }
    // }
    // mask.src = chrome.extension.getURL("robocop.png");

  },

  userFilter : ""
}
