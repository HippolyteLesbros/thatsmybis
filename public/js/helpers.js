// For keeping track of the intervals updating times
var timestampUpdateInterval = null;

// Add CSRF token to all request headers
$.ajaxSetup({
    headers: {
        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
    }
});

// For config options: https://marked.js.org/#/USING_ADVANCED.md#options
marked.setOptions({
    gfm: true,
    breaks: true
});

$(document).ready(function () {
    // Format any markdown fields
    parseMarkdown();

    // Fix wowhead links that were generated by markdown
    makeWowheadLinks();

    // Watch any watchable times on the page
    trackTimestamps();

    // Don't submit forms when the user presses enter in a textbox
    addInputAntiSubmitHandler();

    // For toggling hidden note inputs
    addNoteHandlers();
});

/**
 * Prevents inputs from submitting their form when enter is pressed.
 */
function addInputAntiSubmitHandler(selector = ":text") {
    $(selector).on("keypress keyup", function (e) {
        if (e.which == 13) {
            return false;
        }
    });
}

// Add basic handlers to show edit forms for notes
function addNoteHandlers() {
    $(".js-show-note-edit").click(function () {
        $(".js-note-input").toggle();
    });
}

function decToHex(number) {
    return parseInt(number).toString(16);
}

/**
 * Pass a number, get back a hex color complete with leading hash to make it HTML friendly
 */
function getColorFromDec(color) {
    if (color) {
        color = decToHex(color);
        // If it's too short, keep adding prefixed zero's until it's long enough
        while (color.length < 6) {
            color = '0' + color;
        }
    } else {
        color = 'FFF';
    }
    return '#' + color;
}

// Turn a url into a slug url!
function slug(string) {
    let theChosenCharacter = "-";

    const a = "àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœṕŕßśșțùúüûǘẃẍÿź·/_,:;";
    const b = "aaaaaaaaceeeeghiiiimnnnoooooprssstuuuuuwxyz------";
    const p = new RegExp(a.split("").join("|"), "g");

    let slug =  string.toString().toLowerCase()
        .replace(/\s+/g, "-")                    // Replace spaces with -
        .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
        .replace(/&/g, "")                       // Remove ampersands (can optionally change to replace with '-and-)
        .replace(/[^\w\-]+/g, "")                // Remove all non-word characters
        .replace(/\-\-+/g, "-")                  // Replace multiple - with single -
        .replace(/^-+/, "")                      // Trim - from start of text
        .replace(/-+$/, "")                      // Trim - from end of text
        .replace(/-+/g, theChosenCharacter)      // Replace - with The Chosen Character
        .substr(0, 50);                          // Limit length to 50 characters

    if (slug) {
        return slug;
    } else {
        return theChosenCharacter;
    }
}

/**
 * Tracks any timestamps on the page and prints how long since/until each timestamp's date.
 *
 * @param rate How frequently the timestamps should be updated.
 */
function trackTimestamps(rate = 15000) {
    $(".js-watchable-timestamp").each(function () {
        let timestamp = $(this).data("timestamp");
        if (timestamp < 1000000000000) { // <-- Potential y33.658k bug [that's a y2k joke]
            timestamp = timestamp * 1000; // convert from seconds to milliseconds
        }
        let future = false;
        if (timestamp > (Date.now())) {
            future = true;
        }

        let since = null;
        let maxDays = $(this).data("maxDays");
        if (maxDays && (timestamp < moment().valueOf() - (maxDays * 86400000))) {
        // > 2 weeks, change the message to that
            since = "over 2 weeks";
        } else {
        // < 2 weeks
            since = moment(timestamp).fromNow(true);
        }

        if ($(this).is("abbr")) {
            $(this).prop("title", (future ? "in " : "") + since + (!future ? " ago" : ""));
        } else {
            $(this).html(since);
        }
    });

    $(".js-timestamp").each(function () {
        let timestamp = $(this).data("timestamp");
        if (timestamp < 1000000000000) {
            timestamp = timestamp * 1000;
        }
        let format    = ($(this).data("format") ? $(this).data("format") : "dddd, MMMM Do YYYY, h:mm a");
        let since     = moment(timestamp).format(format);
        if ($(this).is("abbr")) {
            $(this).prop("title", since);
        } else {
            $(this).html(since);
        }
    });

    timestampUpdateInterval ? clearInterval(timestampUpdateInterval) : null;

    timestampUpdateInterval = setInterval(function () {
        $(".js-watchable-timestamp").each(function () {
            let timestamp = $(this).data("timestamp");
            if (timestamp < 1000000000000) {
                timestamp = timestamp * 1000; // convert from seconds to milliseconds
            }
            let future = false;
            if (timestamp > (Date.now())) {
                future = true;
            }

            let since = null;
            let maxDays = $(this).data("maxDays");
            if (maxDays && (timestamp < moment().valueOf() - (maxDays * 86400000))) {
            // > 2 weeks, change the message to that
                since = "over 2 weeks";
            } else {
            // < 2 weeks
                since = moment(timestamp).fromNow(true);
            }

            if ($(this).is("abbr")) {
                $(this).prop("title", (future ? "in " : "") + since + (!future ? " ago" : ""));
            } else {
                $(this).html(since);
            }
        });
    }, rate);
}

/**
 * Convert newlines to <br> tags. Given the odd name because that's the name PHP uses.
 *
 * @param string string The string to convert.
 *
 * @return string
 */
function nl2br(string) {
    return string ? string.replace(/\n/g,"<br>") : '';
}

function cleanUrl(sanitize, base, href) {
    if (sanitize) {
        try {
            var prot = decodeURIComponent(unescape(href))
            .replace(/[^\w:]/g, '')
            .toLowerCase();
        } catch (e) {
            return null;
        }
        if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
            return null;
        }
    }
    if (base && !originIndependentUrl.test(href)) {
        href = resolveUrl(base, href);
    }
    try {
        href = encodeURI(href).replace(/%25/g, '%');
    } catch (e) {
        return null;
    }
    return href;
}

/**
 * Parse markdown in the given element from markdown into HTML.
 * If no element is provided, do it for all markdown elements.
 */
function parseMarkdown(element = null) {
    var render = new marked.Renderer();

    // Disable pretty links so that users always know what link they're clicking on.
    // This is to prevent abuse.
    // Autolinks still work: 'https://nubbl.com' -> 'https://nubbl.com'
    // Pretty links format like so: '[title1](https://www.example.com)' -> 'title1 (https://www.example.com)'
    /*
        render.link = function(href, title, text) {
            var textIsDifferent = text ? ((text == href) ? false : true) : false;
            var out = '';

            if (textIsDifferent) {
                out = text + ' (';
            }

            href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);

            if (href === null) {
                return text;
            }

            out += '<a target="_blank" href="' + href + '"';
            if (title) {
                out += ' title="' + title + '"';
            }
            out += '>' + href + '</a>';

            if (textIsDifferent) {
                out += ')';
            }
            return out;
        };
    */

    // Add target=_blank to links
    render.link = function(href, title, text) {
        var out = '';
        href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);

        if (href === null) {
            return text;
        }

        out += '<a target="_blank" href="' + href + '"';
        if (title) {
            out += ' title="' + title + '"';
        }
        out += '>' + text + '</a>';
        return out;
    };

    // Disable embedded images. Instead, display as a link.
    // '![alt text](https://example.com/image.jpg)' -> 'alt text (https://example.com/image.jpg)'
    // '![](https://example.com/image.jpg)' -> 'https://example.com/image.jpg'
    // render.image = function(href, title, text) {
    //     var textIsDifferent = text ? ((text == href) ? false : true) : false;
    //     var out = '';

    //     if (textIsDifferent) {
    //         out = text + ' (';
    //     }

    //     href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
    //     if (href === null) {
    //         return text;
    //     }

    //     out += '<a target="_blank" href="' + href + '"';
    //     if (title) {
    //         out += ' title="' + title + '"';
    //     }
    //     out += '>' + href + '</a>';

    //     if (textIsDifferent) {
    //         out += ')';
    //     }
    //     return out;
    // };

    if (element && !element.hasClass("js-markdown-parsed")) {
        element.html(marked(element.html(), {renderer: render}));
        element.addClass("js-markdown-parsed"); // To avoid going over the same element twice
    } else {
        $(".js-markdown").each(function () {
            if (!$(this).hasClass("js-markdown-parsed")) {
                $(this).html(marked($.trim($(this).text()), {renderer: render}));
                $(this).addClass("js-markdown-parsed");
            }
        });

        $(".js-markdown-inline").each(function () {
            if (!$(this).hasClass("js-markdown-parsed")) {
                $(this).html(marked.inlineLexer($.trim($(this).text()), {renderer: render}));
                $(this).addClass("js-markdown-parsed");
            }
        });
    }
}

// Takes a numeric RGB value and turns it into a hex colour code
function rgbToHex (rgb) {
    let hex = Number(rgb).toString(16);

    // If it's too short, keep adding prefixed zero's till it's long enough
    while (hex.length < 6) {
        hex = "0" + hex;
    }
    return hex;
};

// Updates any wowhead links to have a tooltip, plus other modifications.
// The configuration for this is defined in the HTML header (app.blade.php)
function makeWowheadLinks() {
    // Sometimes the error "WH.getDataEnv is not a function" appears
    // This *seems* to be due to trying to refresh the links before they've finished their inital
    // setup, but I'm not sure.
    // If the error goes through (and I don't see anything we can do to fix/handle it), it breaks the
    // javascript on the rest of our page. try/catch is a cheap fix.
    try {
        $WowheadPower.refreshLinks();
    } catch (error) {
        console.log("Failed to refresh wowhead links.");
    }
}
