/*
 *  Deface - digital intervention for the reduction of anxiety caused by excessive use of selfies and
 *  and celebrity images being shoved in your face every time you fire up a browser.
 *  
 *  main.js - the extensions content script, finds images on the page and passes them to deface.js for processing
 * 
 *  This code is hopefully licensed under the creative commons http://creativecommons.org/licenses/by-nc-nd/2.0/uk/
 *  The face detection code is orginally from the OpenCV library and was converted into js by
 *  LiuLiu https://github.com/liuliu/ccv/
 *
 *  Whom I feel sure would join us in saying "Share and enjoy"
 *  
 *  Andy Freeman & Ji Hu
 *  2013-14
 *  Goldsmiths College, Deptford, London, UK
 *  
 */

var currentImage = 0;                           // used to step through the document.images array
var lastImageAdded = 0;    // experiment - for catching AJAX returns after page has finished loading
var processing = false;                         // experiment - for catching AJAX returns after page has finished loading
var processed = new Array();                    // experiment - using a cache?

//console.log("main.js START - domain = " + document.domain, " lastImageAdded = ", lastImageAdded + " document.images.length = "+document.images.length+", the document.readyState is " + document.readyState);

chrome.runtime.sendMessage({resetImages: true}, function(response) {});

if (document.readyState == "complete") {
    // console.log("-- the document.readyState is " + document.readyState);
    processAllImages(currentImage);     // start the process
}

document.onreadystatechange = function () {
  if (document.readyState == "complete") {
    // console.log("-- the document.readyState is " + document.readyState);
    processAllImages(currentImage);     // start the process
  };
};

// this is mad stuff, hope I dont kill your cores dude!
document.addEventListener('DOMNodeInserted', function(event) {
    
    // console.log('DOMNodeInserted currentImage = ' + currentImage + ' lastImageAdded = ' + lastImageAdded + ' document.images.length = ' + document.images.length);
    if (currentImage < document.images.length) {

        if (lastImageAdded < document.images.length) {
          
            // console.log('processing = ' + processing);
            if (!processing) {
                 // console.log('continue processing from currentImage = ' + currentImage);
                processAllImages(currentImage);
            }
            
        }
        //lastImageAdded = document.images.length;
     }
});


/*
 * 
 * processAllImages - do an image from document.images array
 * 
 */

function processAllImages(i) {
    // console.log("processAllImages from " + i);
    processing = true;      // experiment to see if we can run the routine from DOMNodeInserted handler - that could get triggered before we have already processed the extra images
    
    //if (processed.indexOf(encodeURI(document.images[i].src)) > 0) {         // possible speed increase if they use the image more than once, CSS implications?
    //    // console.log('seen this URL before');
    //}

    // eliminates tracking pixels and image too small to detect on (magic number) and gif files (which are usually structural)
    if ((document.images[i].naturalWidth > 30 && document.images[i].naturalHeight > 30) && (encodeURI(document.images[i].src).match(/\.(gif)$/) == null)) {

        // send to background page as this skips round the CORS issues found with bookmarklets

        // console.log("sending image for recognition src = " + document.images[i].src);
        chrome.extension.sendMessage({
            imgSrc : document.images[i].src,
            pos : i
        });

        lastImageAdded = i;
        //processing = false;
        processed.push(encodeURI(document.images[i].src));

    } else {
        // console.log( i + ' too small or gif ' + document.images[i].src);
        currentImage++;
        if (currentImage < document.images.length) {
            processAllImages(currentImage);
        } else {
            processing = false;
        }
    }

}



/*
 * listener for result from deface.js, if currentImage position is less than available in the DOM then call processAllImages again until they are all done
 * 
 */
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    // console.log(sender.tab ? "from the backgound script:" + sender.tab.url : " from the extension");
    
    if (request['data'] != null) {
        document.images[request['pos']].src = request['data'];
        // console.log(request['pos'] + ' defaced!');
    } else {
        // console.log(request['pos'] + ' no face');
    }
    currentImage++;
    if (currentImage < document.images.length) {
        processAllImages(currentImage);
    } else {
        processing = false;
    }
});


