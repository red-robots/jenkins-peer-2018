"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/**
* jquery.matchHeight.js v0.5.2
* http://brm.io/jquery-match-height/
* License: MIT
*/
;

(function ($) {
  /*
  *  internal
  */
  var _previousResizeWidth = -1,
      _updateTimeout = -1;
  /*
  *  _rows
  *  utility function returns array of jQuery selections representing each row
  *  (as displayed after float wrapping applied by browser)
  */


  var _rows = function _rows(elements) {
    var tolerance = 1,
        $elements = $(elements),
        lastTop = null,
        rows = []; // group elements by their top position

    $elements.each(function () {
      var $that = $(this),
          top = $that.offset().top - _parse($that.css('margin-top')),
          lastRow = rows.length > 0 ? rows[rows.length - 1] : null;

      if (lastRow === null) {
        // first item on the row, so just push it
        rows.push($that);
      } else {
        // if the row top is the same, add to the row group
        if (Math.floor(Math.abs(lastTop - top)) <= tolerance) {
          rows[rows.length - 1] = lastRow.add($that);
        } else {
          // otherwise start a new row group
          rows.push($that);
        }
      } // keep track of the last row top


      lastTop = top;
    });
    return rows;
  };
  /*
  *  _parse
  *  value parse utility function
  */


  var _parse = function _parse(value) {
    // parse value and convert NaN to 0
    return parseFloat(value) || 0;
  };
  /*
  *  _parseOptions
  *  handle plugin options
  */


  var _parseOptions = function _parseOptions(options) {
    var opts = {
      byRow: true,
      remove: false,
      property: 'height'
    };

    if (_typeof(options) === 'object') {
      return $.extend(opts, options);
    }

    if (typeof options === 'boolean') {
      opts.byRow = options;
    } else if (options === 'remove') {
      opts.remove = true;
    }

    return opts;
  };
  /*
  *  matchHeight
  *  plugin definition
  */


  var matchHeight = $.fn.matchHeight = function (options) {
    var opts = _parseOptions(options); // handle remove


    if (opts.remove) {
      var that = this; // remove fixed height from all selected elements

      this.css(opts.property, ''); // remove selected elements from all groups

      $.each(matchHeight._groups, function (key, group) {
        group.elements = group.elements.not(that);
      }); // TODO: cleanup empty groups

      return this;
    }

    if (this.length <= 1) return this; // keep track of this group so we can re-apply later on load and resize events

    matchHeight._groups.push({
      elements: this,
      options: opts
    }); // match each element's height to the tallest element in the selection


    matchHeight._apply(this, opts);

    return this;
  };
  /*
  *  plugin global options
  */


  matchHeight._groups = [];
  matchHeight._throttle = 80;
  matchHeight._maintainScroll = false;
  matchHeight._beforeUpdate = null;
  matchHeight._afterUpdate = null;
  /*
  *  matchHeight._apply
  *  apply matchHeight to given elements
  */

  matchHeight._apply = function (elements, options) {
    var opts = _parseOptions(options),
        $elements = $(elements),
        rows = [$elements]; // take note of scroll position


    var scrollTop = $(window).scrollTop(),
        htmlHeight = $('html').outerHeight(true); // get hidden parents

    var $hiddenParents = $elements.parents().filter(':hidden'); // cache the original inline style

    $hiddenParents.each(function () {
      var $that = $(this);
      $that.data('style-cache', $that.attr('style'));
    }); // temporarily must force hidden parents visible

    $hiddenParents.css('display', 'block'); // get rows if using byRow, otherwise assume one row

    if (opts.byRow) {
      // must first force an arbitrary equal height so floating elements break evenly
      $elements.each(function () {
        var $that = $(this),
            display = $that.css('display') === 'inline-block' ? 'inline-block' : 'block'; // cache the original inline style

        $that.data('style-cache', $that.attr('style'));
        $that.css({
          'display': display,
          'padding-top': '0',
          'padding-bottom': '0',
          'margin-top': '0',
          'margin-bottom': '0',
          'border-top-width': '0',
          'border-bottom-width': '0',
          'height': '100px'
        });
      }); // get the array of rows (based on element top position)

      rows = _rows($elements); // revert original inline styles

      $elements.each(function () {
        var $that = $(this);
        $that.attr('style', $that.data('style-cache') || '');
      });
    }

    $.each(rows, function (key, row) {
      var $row = $(row),
          maxHeight = 0; // skip apply to rows with only one item

      if (opts.byRow && $row.length <= 1) {
        $row.css(opts.property, '');
        return;
      } // iterate the row and find the max height


      $row.each(function () {
        var $that = $(this),
            display = $that.css('display') === 'inline-block' ? 'inline-block' : 'block'; // ensure we get the correct actual height (and not a previously set height value)

        var css = {
          'display': display
        };
        css[opts.property] = '';
        $that.css(css); // find the max height (including padding, but not margin)

        if ($that.outerHeight(false) > maxHeight) maxHeight = $that.outerHeight(false); // revert display block

        $that.css('display', '');
      }); // iterate the row and apply the height to all elements

      $row.each(function () {
        var $that = $(this),
            verticalPadding = 0; // handle padding and border correctly (required when not using border-box)

        if ($that.css('box-sizing') !== 'border-box') {
          verticalPadding += _parse($that.css('border-top-width')) + _parse($that.css('border-bottom-width'));
          verticalPadding += _parse($that.css('padding-top')) + _parse($that.css('padding-bottom'));
        } // set the height (accounting for padding and border)


        $that.css(opts.property, maxHeight - verticalPadding);
      });
    }); // revert hidden parents

    $hiddenParents.each(function () {
      var $that = $(this);
      $that.attr('style', $that.data('style-cache') || null);
    }); // restore scroll position if enabled

    if (matchHeight._maintainScroll) $(window).scrollTop(scrollTop / htmlHeight * $('html').outerHeight(true));
    return this;
  };
  /*
  *  matchHeight._applyDataApi
  *  applies matchHeight to all elements with a data-match-height attribute
  */


  matchHeight._applyDataApi = function () {
    var groups = {}; // generate groups by their groupId set by elements using data-match-height

    $('[data-match-height], [data-mh]').each(function () {
      var $this = $(this),
          groupId = $this.attr('data-match-height') || $this.attr('data-mh');

      if (groupId in groups) {
        groups[groupId] = groups[groupId].add($this);
      } else {
        groups[groupId] = $this;
      }
    }); // apply matchHeight to each group

    $.each(groups, function () {
      this.matchHeight(true);
    });
  };
  /*
  *  matchHeight._update
  *  updates matchHeight on all current groups with their correct options
  */


  var _update = function _update(event) {
    if (matchHeight._beforeUpdate) matchHeight._beforeUpdate(event, matchHeight._groups);
    $.each(matchHeight._groups, function () {
      matchHeight._apply(this.elements, this.options);
    });
    if (matchHeight._afterUpdate) matchHeight._afterUpdate(event, matchHeight._groups);
  };

  matchHeight._update = function (throttle, event) {
    // prevent update if fired from a resize event
    // where the viewport width hasn't actually changed
    // fixes an event looping bug in IE8
    if (event && event.type === 'resize') {
      var windowWidth = $(window).width();
      if (windowWidth === _previousResizeWidth) return;
      _previousResizeWidth = windowWidth;
    } // throttle updates


    if (!throttle) {
      _update(event);
    } else if (_updateTimeout === -1) {
      _updateTimeout = setTimeout(function () {
        _update(event);

        _updateTimeout = -1;
      }, matchHeight._throttle);
    }
  };
  /*
  *  bind events
  */
  // apply on DOM ready event


  $(matchHeight._applyDataApi); // update heights on load and resize events

  $(window).bind('load', function (event) {
    matchHeight._update(false, event);
  }); // throttled update heights on resize events

  $(window).bind('resize orientationchange', function (event) {
    matchHeight._update(true, event);
  });
})(jQuery);
"use strict";

/*!
	Colorbox v1.4.33 - 2013-10-31
	jQuery lightbox and modal window plugin
	(c) 2013 Jack Moore - http://www.jacklmoore.com/colorbox
	license: http://www.opensource.org/licenses/mit-license.php
*/
(function ($, document, window) {
  var // Default settings object.
  // See http://jacklmoore.com/colorbox for details.
  defaults = {
    // data sources
    html: false,
    photo: false,
    iframe: false,
    inline: false,
    // behavior and appearance
    transition: "elastic",
    speed: 300,
    fadeOut: 300,
    width: false,
    initialWidth: "600",
    innerWidth: false,
    maxWidth: false,
    height: false,
    initialHeight: "450",
    innerHeight: false,
    maxHeight: false,
    scalePhotos: true,
    scrolling: true,
    href: false,
    title: false,
    rel: false,
    opacity: 0.9,
    preloading: true,
    className: false,
    overlayClose: true,
    escKey: true,
    arrowKey: true,
    top: false,
    bottom: false,
    left: false,
    right: false,
    fixed: false,
    data: undefined,
    closeButton: true,
    fastIframe: true,
    open: false,
    reposition: true,
    loop: true,
    slideshow: false,
    slideshowAuto: true,
    slideshowSpeed: 2500,
    slideshowStart: "start slideshow",
    slideshowStop: "stop slideshow",
    photoRegex: /\.(gif|png|jp(e|g|eg)|bmp|ico|webp)((#|\?).*)?$/i,
    // alternate image paths for high-res displays
    retinaImage: false,
    retinaUrl: false,
    retinaSuffix: '@2x.$1',
    // internationalization
    current: "Company {current} of {total}",
    previous: "previous",
    next: "next",
    close: "close",
    xhrError: "This content failed to load.",
    imgError: "This image failed to load.",
    // accessbility
    returnFocus: true,
    trapFocus: true,
    // callbacks
    onOpen: false,
    onLoad: false,
    onComplete: false,
    onCleanup: false,
    onClosed: false
  },
      // Abstracting the HTML and event identifiers for easy rebranding
  colorbox = 'colorbox',
      prefix = 'cbox',
      boxElement = prefix + 'Element',
      // Events
  event_open = prefix + '_open',
      event_load = prefix + '_load',
      event_complete = prefix + '_complete',
      event_cleanup = prefix + '_cleanup',
      event_closed = prefix + '_closed',
      event_purge = prefix + '_purge',
      // Cached jQuery Object Variables
  $overlay,
      $box,
      $wrap,
      $content,
      $topBorder,
      $leftBorder,
      $rightBorder,
      $bottomBorder,
      $related,
      $window,
      $loaded,
      $loadingBay,
      $loadingOverlay,
      $title,
      $current,
      $slideshow,
      $next,
      $prev,
      $close,
      $groupControls,
      $events = $('<a/>'),
      // $([]) would be prefered, but there is an issue with jQuery 1.4.2
  // Variables for cached values or use across multiple functions
  settings,
      interfaceHeight,
      interfaceWidth,
      loadedHeight,
      loadedWidth,
      element,
      index,
      photo,
      open,
      active,
      closing,
      loadingTimer,
      publicMethod,
      div = "div",
      className,
      requests = 0,
      previousCSS = {},
      init; // ****************
  // HELPER FUNCTIONS
  // ****************
  // Convenience function for creating new jQuery objects

  function $tag(tag, id, css) {
    var element = document.createElement(tag);

    if (id) {
      element.id = prefix + id;
    }

    if (css) {
      element.style.cssText = css;
    }

    return $(element);
  } // Get the window height using innerHeight when available to avoid an issue with iOS
  // http://bugs.jquery.com/ticket/6724


  function winheight() {
    return window.innerHeight ? window.innerHeight : $(window).height();
  } // Determine the next and previous members in a group.


  function getIndex(increment) {
    var max = $related.length,
        newIndex = (index + increment) % max;
    return newIndex < 0 ? max + newIndex : newIndex;
  } // Convert '%' and 'px' values to integers


  function setSize(size, dimension) {
    return Math.round((/%/.test(size) ? (dimension === 'x' ? $window.width() : winheight()) / 100 : 1) * parseInt(size, 10));
  } // Checks an href to see if it is a photo.
  // There is a force photo option (photo: true) for hrefs that cannot be matched by the regex.


  function isImage(settings, url) {
    return settings.photo || settings.photoRegex.test(url);
  }

  function retinaUrl(settings, url) {
    return settings.retinaUrl && window.devicePixelRatio > 1 ? url.replace(settings.photoRegex, settings.retinaSuffix) : url;
  }

  function trapFocus(e) {
    if ('contains' in $box[0] && !$box[0].contains(e.target)) {
      e.stopPropagation();
      $box.focus();
    }
  } // Assigns function results to their respective properties


  function makeSettings() {
    var i,
        data = $.data(element, colorbox);

    if (data == null) {
      settings = $.extend({}, defaults);

      if (console && console.log) {
        console.log('Error: cboxElement missing settings object');
      }
    } else {
      settings = $.extend({}, data);
    }

    for (i in settings) {
      if ($.isFunction(settings[i]) && i.slice(0, 2) !== 'on') {
        // checks to make sure the function isn't one of the callbacks, they will be handled at the appropriate time.
        settings[i] = settings[i].call(element);
      }
    }

    settings.rel = settings.rel || element.rel || $(element).data('rel') || 'nofollow';
    settings.href = settings.href || $(element).attr('href');
    settings.title = settings.title || element.title;

    if (typeof settings.href === "string") {
      settings.href = $.trim(settings.href);
    }
  }

  function trigger(event, callback) {
    // for external use
    $(document).trigger(event); // for internal use

    $events.triggerHandler(event);

    if ($.isFunction(callback)) {
      callback.call(element);
    }
  }

  var slideshow = function () {
    var active,
        className = prefix + "Slideshow_",
        click = "click." + prefix,
        timeOut;

    function clear() {
      clearTimeout(timeOut);
    }

    function set() {
      if (settings.loop || $related[index + 1]) {
        clear();
        timeOut = setTimeout(publicMethod.next, settings.slideshowSpeed);
      }
    }

    function start() {
      $slideshow.html(settings.slideshowStop).unbind(click).one(click, stop);
      $events.bind(event_complete, set).bind(event_load, clear);
      $box.removeClass(className + "off").addClass(className + "on");
    }

    function stop() {
      clear();
      $events.unbind(event_complete, set).unbind(event_load, clear);
      $slideshow.html(settings.slideshowStart).unbind(click).one(click, function () {
        publicMethod.next();
        start();
      });
      $box.removeClass(className + "on").addClass(className + "off");
    }

    function reset() {
      active = false;
      $slideshow.hide();
      clear();
      $events.unbind(event_complete, set).unbind(event_load, clear);
      $box.removeClass(className + "off " + className + "on");
    }

    return function () {
      if (active) {
        if (!settings.slideshow) {
          $events.unbind(event_cleanup, reset);
          reset();
        }
      } else {
        if (settings.slideshow && $related[1]) {
          active = true;
          $events.one(event_cleanup, reset);

          if (settings.slideshowAuto) {
            start();
          } else {
            stop();
          }

          $slideshow.show();
        }
      }
    };
  }();

  function launch(target) {
    if (!closing) {
      element = target;
      makeSettings();
      $related = $(element);
      index = 0;

      if (settings.rel !== 'nofollow') {
        $related = $('.' + boxElement).filter(function () {
          var data = $.data(this, colorbox),
              relRelated;

          if (data) {
            relRelated = $(this).data('rel') || data.rel || this.rel;
          }

          return relRelated === settings.rel;
        });
        index = $related.index(element); // Check direct calls to Colorbox.

        if (index === -1) {
          $related = $related.add(element);
          index = $related.length - 1;
        }
      }

      $overlay.css({
        opacity: parseFloat(settings.opacity),
        cursor: settings.overlayClose ? "pointer" : "auto",
        visibility: 'visible'
      }).show();

      if (className) {
        $box.add($overlay).removeClass(className);
      }

      if (settings.className) {
        $box.add($overlay).addClass(settings.className);
      }

      className = settings.className;

      if (settings.closeButton) {
        $close.html(settings.close).appendTo($content);
      } else {
        $close.appendTo('<div/>');
      }

      if (!open) {
        open = active = true; // Prevents the page-change action from queuing up if the visitor holds down the left or right keys.
        // Show colorbox so the sizes can be calculated in older versions of jQuery

        $box.css({
          visibility: 'hidden',
          display: 'block'
        });
        $loaded = $tag(div, 'LoadedContent', 'width:0; height:0; overflow:hidden');
        $content.css({
          width: '',
          height: ''
        }).append($loaded); // Cache values needed for size calculations

        interfaceHeight = $topBorder.height() + $bottomBorder.height() + $content.outerHeight(true) - $content.height();
        interfaceWidth = $leftBorder.width() + $rightBorder.width() + $content.outerWidth(true) - $content.width();
        loadedHeight = $loaded.outerHeight(true);
        loadedWidth = $loaded.outerWidth(true); // Opens inital empty Colorbox prior to content being loaded.

        settings.w = setSize(settings.initialWidth, 'x');
        settings.h = setSize(settings.initialHeight, 'y');
        $loaded.css({
          width: '',
          height: settings.h
        });
        publicMethod.position();
        trigger(event_open, settings.onOpen);
        $groupControls.add($title).hide();
        $box.focus();

        if (settings.trapFocus) {
          // Confine focus to the modal
          // Uses event capturing that is not supported in IE8-
          if (document.addEventListener) {
            document.addEventListener('focus', trapFocus, true);
            $events.one(event_closed, function () {
              document.removeEventListener('focus', trapFocus, true);
            });
          }
        } // Return focus on closing


        if (settings.returnFocus) {
          $events.one(event_closed, function () {
            $(element).focus();
          });
        }
      }

      load();
    }
  } // Colorbox's markup needs to be added to the DOM prior to being called
  // so that the browser will go ahead and load the CSS background images.


  function appendHTML() {
    if (!$box && document.body) {
      init = false;
      $window = $(window);
      $box = $tag(div).attr({
        id: colorbox,
        'class': $.support.opacity === false ? prefix + 'IE' : '',
        // class for optional IE8 & lower targeted CSS.
        role: 'dialog',
        tabindex: '-1'
      }).hide();
      $overlay = $tag(div, "Overlay").hide();
      $loadingOverlay = $([$tag(div, "LoadingOverlay")[0], $tag(div, "LoadingGraphic")[0]]);
      $wrap = $tag(div, "Wrapper");
      $content = $tag(div, "Content").append($title = $tag(div, "Title"), $current = $tag(div, "Current"), $prev = $('<button type="button"/>').attr({
        id: prefix + 'Previous'
      }), $next = $('<button type="button"/>').attr({
        id: prefix + 'Next'
      }), $slideshow = $tag('button', "Slideshow"), $loadingOverlay);
      $close = $('<button type="button"/>').attr({
        id: prefix + 'Close'
      });
      $wrap.append( // The 3x3 Grid that makes up Colorbox
      $tag(div).append($tag(div, "TopLeft"), $topBorder = $tag(div, "TopCenter"), $tag(div, "TopRight")), $tag(div, false, 'clear:left').append($leftBorder = $tag(div, "MiddleLeft"), $content, $rightBorder = $tag(div, "MiddleRight")), $tag(div, false, 'clear:left').append($tag(div, "BottomLeft"), $bottomBorder = $tag(div, "BottomCenter"), $tag(div, "BottomRight"))).find('div div').css({
        'float': 'left'
      });
      $loadingBay = $tag(div, false, 'position:absolute; width:9999px; visibility:hidden; display:none; max-width:none;');
      $groupControls = $next.add($prev).add($current).add($slideshow);
      $(document.body).append($overlay, $box.append($wrap, $loadingBay));
    }
  } // Add Colorbox's event bindings


  function addBindings() {
    function clickHandler(e) {
      // ignore non-left-mouse-clicks and clicks modified with ctrl / command, shift, or alt.
      // See: http://jacklmoore.com/notes/click-events/
      if (!(e.which > 1 || e.shiftKey || e.altKey || e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        launch(this);
      }
    }

    if ($box) {
      if (!init) {
        init = true; // Anonymous functions here keep the public method from being cached, thereby allowing them to be redefined on the fly.

        $next.click(function () {
          publicMethod.next();
        });
        $prev.click(function () {
          publicMethod.prev();
        });
        $close.click(function () {
          publicMethod.close();
        });
        $overlay.click(function () {
          if (settings.overlayClose) {
            publicMethod.close();
          }
        }); // Key Bindings

        $(document).bind('keydown.' + prefix, function (e) {
          var key = e.keyCode;

          if (open && settings.escKey && key === 27) {
            e.preventDefault();
            publicMethod.close();
          }

          if (open && settings.arrowKey && $related[1] && !e.altKey) {
            if (key === 37) {
              e.preventDefault();
              $prev.click();
            } else if (key === 39) {
              e.preventDefault();
              $next.click();
            }
          }
        });

        if ($.isFunction($.fn.on)) {
          // For jQuery 1.7+
          $(document).on('click.' + prefix, '.' + boxElement, clickHandler);
        } else {
          // For jQuery 1.3.x -> 1.6.x
          // This code is never reached in jQuery 1.9, so do not contact me about 'live' being removed.
          // This is not here for jQuery 1.9, it's here for legacy users.
          $('.' + boxElement).live('click.' + prefix, clickHandler);
        }
      }

      return true;
    }

    return false;
  } // Don't do anything if Colorbox already exists.


  if ($.colorbox) {
    return;
  } // Append the HTML when the DOM loads


  $(appendHTML); // ****************
  // PUBLIC FUNCTIONS
  // Usage format: $.colorbox.close();
  // Usage from within an iframe: parent.jQuery.colorbox.close();
  // ****************

  publicMethod = $.fn[colorbox] = $[colorbox] = function (options, callback) {
    var $this = this;
    options = options || {};
    appendHTML();

    if (addBindings()) {
      if ($.isFunction($this)) {
        // assume a call to $.colorbox
        $this = $('<a/>');
        options.open = true;
      } else if (!$this[0]) {
        // colorbox being applied to empty collection
        return $this;
      }

      if (callback) {
        options.onComplete = callback;
      }

      $this.each(function () {
        $.data(this, colorbox, $.extend({}, $.data(this, colorbox) || defaults, options));
      }).addClass(boxElement);

      if ($.isFunction(options.open) && options.open.call($this) || options.open) {
        launch($this[0]);
      }
    }

    return $this;
  };

  publicMethod.position = function (speed, loadedCallback) {
    var css,
        top = 0,
        left = 0,
        offset = $box.offset(),
        scrollTop,
        scrollLeft;
    $window.unbind('resize.' + prefix); // remove the modal so that it doesn't influence the document width/height

    $box.css({
      top: -9e4,
      left: -9e4
    });
    scrollTop = $window.scrollTop();
    scrollLeft = $window.scrollLeft();

    if (settings.fixed) {
      offset.top -= scrollTop;
      offset.left -= scrollLeft;
      $box.css({
        position: 'fixed'
      });
    } else {
      top = scrollTop;
      left = scrollLeft;
      $box.css({
        position: 'absolute'
      });
    } // keeps the top and left positions within the browser's viewport.


    if (settings.right !== false) {
      left += Math.max($window.width() - settings.w - loadedWidth - interfaceWidth - setSize(settings.right, 'x'), 0);
    } else if (settings.left !== false) {
      left += setSize(settings.left, 'x');
    } else {
      left += Math.round(Math.max($window.width() - settings.w - loadedWidth - interfaceWidth, 0) / 2);
    }

    if (settings.bottom !== false) {
      top += Math.max(winheight() - settings.h - loadedHeight - interfaceHeight - setSize(settings.bottom, 'y'), 0);
    } else if (settings.top !== false) {
      top += setSize(settings.top, 'y');
    } else {
      top += Math.round(Math.max(winheight() - settings.h - loadedHeight - interfaceHeight, 0) / 2);
    }

    $box.css({
      top: offset.top,
      left: offset.left,
      visibility: 'visible'
    }); // this gives the wrapper plenty of breathing room so it's floated contents can move around smoothly,
    // but it has to be shrank down around the size of div#colorbox when it's done.  If not,
    // it can invoke an obscure IE bug when using iframes.

    $wrap[0].style.width = $wrap[0].style.height = "9999px";

    function modalDimensions() {
      $topBorder[0].style.width = $bottomBorder[0].style.width = $content[0].style.width = parseInt($box[0].style.width, 10) - interfaceWidth + 'px';
      $content[0].style.height = $leftBorder[0].style.height = $rightBorder[0].style.height = parseInt($box[0].style.height, 10) - interfaceHeight + 'px';
    }

    css = {
      width: settings.w + loadedWidth + interfaceWidth,
      height: settings.h + loadedHeight + interfaceHeight,
      top: top,
      left: left
    }; // setting the speed to 0 if the content hasn't changed size or position

    if (speed) {
      var tempSpeed = 0;
      $.each(css, function (i) {
        if (css[i] !== previousCSS[i]) {
          tempSpeed = speed;
          return;
        }
      });
      speed = tempSpeed;
    }

    previousCSS = css;

    if (!speed) {
      $box.css(css);
    }

    $box.dequeue().animate(css, {
      duration: speed || 0,
      complete: function complete() {
        modalDimensions();
        active = false; // shrink the wrapper down to exactly the size of colorbox to avoid a bug in IE's iframe implementation.

        $wrap[0].style.width = settings.w + loadedWidth + interfaceWidth + "px";
        $wrap[0].style.height = settings.h + loadedHeight + interfaceHeight + "px";

        if (settings.reposition) {
          setTimeout(function () {
            // small delay before binding onresize due to an IE8 bug.
            $window.bind('resize.' + prefix, publicMethod.position);
          }, 1);
        }

        if (loadedCallback) {
          loadedCallback();
        }
      },
      step: modalDimensions
    });
  };

  publicMethod.resize = function (options) {
    var scrolltop;

    if (open) {
      options = options || {};

      if (options.width) {
        settings.w = setSize(options.width, 'x') - loadedWidth - interfaceWidth;
      }

      if (options.innerWidth) {
        settings.w = setSize(options.innerWidth, 'x');
      }

      $loaded.css({
        width: settings.w
      });

      if (options.height) {
        settings.h = setSize(options.height, 'y') - loadedHeight - interfaceHeight;
      }

      if (options.innerHeight) {
        settings.h = setSize(options.innerHeight, 'y');
      }

      if (!options.innerHeight && !options.height) {
        scrolltop = $loaded.scrollTop();
        $loaded.css({
          height: "auto"
        });
        settings.h = $loaded.height();
      }

      $loaded.css({
        height: settings.h
      });

      if (scrolltop) {
        $loaded.scrollTop(scrolltop);
      }

      publicMethod.position(settings.transition === "none" ? 0 : settings.speed);
    }
  };

  publicMethod.prep = function (object) {
    if (!open) {
      return;
    }

    var callback,
        speed = settings.transition === "none" ? 0 : settings.speed;
    $loaded.empty().remove(); // Using empty first may prevent some IE7 issues.

    $loaded = $tag(div, 'LoadedContent').append(object);

    function getWidth() {
      settings.w = settings.w || $loaded.width();
      settings.w = settings.mw && settings.mw < settings.w ? settings.mw : settings.w;
      return settings.w;
    }

    function getHeight() {
      settings.h = settings.h || $loaded.height();
      settings.h = settings.mh && settings.mh < settings.h ? settings.mh : settings.h;
      return settings.h;
    }

    $loaded.hide().appendTo($loadingBay.show()) // content has to be appended to the DOM for accurate size calculations.
    .css({
      width: getWidth(),
      overflow: settings.scrolling ? 'auto' : 'hidden'
    }).css({
      height: getHeight()
    }) // sets the height independently from the width in case the new width influences the value of height.
    .prependTo($content);
    $loadingBay.hide(); // floating the IMG removes the bottom line-height and fixed a problem where IE miscalculates the width of the parent element as 100% of the document width.

    $(photo).css({
      'float': 'none'
    });

    callback = function callback() {
      var total = $related.length,
          iframe,
          frameBorder = 'frameBorder',
          allowTransparency = 'allowTransparency',
          complete;

      if (!open) {
        return;
      }

      function removeFilter() {
        // Needed for IE7 & IE8 in versions of jQuery prior to 1.7.2
        if ($.support.opacity === false) {
          $box[0].style.removeAttribute('filter');
        }
      }

      complete = function complete() {
        clearTimeout(loadingTimer);
        $loadingOverlay.hide();
        trigger(event_complete, settings.onComplete);
      };

      $title.html(settings.title).add($loaded).show();

      if (total > 1) {
        // handle grouping
        if (typeof settings.current === "string") {
          $current.html(settings.current.replace('{current}', index + 1).replace('{total}', total)).show();
        }

        $next[settings.loop || index < total - 1 ? "show" : "hide"]().html(settings.next);
        $prev[settings.loop || index ? "show" : "hide"]().html(settings.previous);
        slideshow(); // Preloads images within a rel group

        if (settings.preloading) {
          $.each([getIndex(-1), getIndex(1)], function () {
            var src,
                img,
                i = $related[this],
                data = $.data(i, colorbox);

            if (data && data.href) {
              src = data.href;

              if ($.isFunction(src)) {
                src = src.call(i);
              }
            } else {
              src = $(i).attr('href');
            }

            if (src && isImage(data, src)) {
              src = retinaUrl(data, src);
              img = document.createElement('img');
              img.src = src;
            }
          });
        }
      } else {
        $groupControls.hide();
      }

      if (settings.iframe) {
        iframe = $tag('iframe')[0];

        if (frameBorder in iframe) {
          iframe[frameBorder] = 0;
        }

        if (allowTransparency in iframe) {
          iframe[allowTransparency] = "true";
        }

        if (!settings.scrolling) {
          iframe.scrolling = "no";
        }

        $(iframe).attr({
          src: settings.href,
          name: new Date().getTime(),
          // give the iframe a unique name to prevent caching
          'class': prefix + 'Iframe',
          allowFullScreen: true,
          // allow HTML5 video to go fullscreen
          webkitAllowFullScreen: true,
          mozallowfullscreen: true
        }).one('load', complete).appendTo($loaded);
        $events.one(event_purge, function () {
          iframe.src = "//about:blank";
        });

        if (settings.fastIframe) {
          $(iframe).trigger('load');
        }
      } else {
        complete();
      }

      if (settings.transition === 'fade') {
        $box.fadeTo(speed, 1, removeFilter);
      } else {
        removeFilter();
      }
    };

    if (settings.transition === 'fade') {
      $box.fadeTo(speed, 0, function () {
        publicMethod.position(0, callback);
      });
    } else {
      publicMethod.position(speed, callback);
    }
  };

  function load() {
    var href,
        setResize,
        prep = publicMethod.prep,
        $inline,
        request = ++requests;
    active = true;
    photo = false;
    element = $related[index];
    makeSettings();
    trigger(event_purge);
    trigger(event_load, settings.onLoad);
    settings.h = settings.height ? setSize(settings.height, 'y') - loadedHeight - interfaceHeight : settings.innerHeight && setSize(settings.innerHeight, 'y');
    settings.w = settings.width ? setSize(settings.width, 'x') - loadedWidth - interfaceWidth : settings.innerWidth && setSize(settings.innerWidth, 'x'); // Sets the minimum dimensions for use in image scaling

    settings.mw = settings.w;
    settings.mh = settings.h; // Re-evaluate the minimum width and height based on maxWidth and maxHeight values.
    // If the width or height exceed the maxWidth or maxHeight, use the maximum values instead.

    if (settings.maxWidth) {
      settings.mw = setSize(settings.maxWidth, 'x') - loadedWidth - interfaceWidth;
      settings.mw = settings.w && settings.w < settings.mw ? settings.w : settings.mw;
    }

    if (settings.maxHeight) {
      settings.mh = setSize(settings.maxHeight, 'y') - loadedHeight - interfaceHeight;
      settings.mh = settings.h && settings.h < settings.mh ? settings.h : settings.mh;
    }

    href = settings.href;
    loadingTimer = setTimeout(function () {
      $loadingOverlay.show();
    }, 100);

    if (settings.inline) {
      // Inserts an empty placeholder where inline content is being pulled from.
      // An event is bound to put inline content back when Colorbox closes or loads new content.
      $inline = $tag(div).hide().insertBefore($(href)[0]);
      $events.one(event_purge, function () {
        $inline.replaceWith($loaded.children());
      });
      prep($(href));
    } else if (settings.iframe) {
      // IFrame element won't be added to the DOM until it is ready to be displayed,
      // to avoid problems with DOM-ready JS that might be trying to run in that iframe.
      prep(" ");
    } else if (settings.html) {
      prep(settings.html);
    } else if (isImage(settings, href)) {
      href = retinaUrl(settings, href);
      photo = document.createElement('img');
      $(photo).addClass(prefix + 'Photo').bind('error', function () {
        settings.title = false;
        prep($tag(div, 'Error').html(settings.imgError));
      }).one('load', function () {
        var percent;

        if (request !== requests) {
          return;
        }

        $.each(['alt', 'longdesc', 'aria-describedby'], function (i, val) {
          var attr = $(element).attr(val) || $(element).attr('data-' + val);

          if (attr) {
            photo.setAttribute(val, attr);
          }
        });

        if (settings.retinaImage && window.devicePixelRatio > 1) {
          photo.height = photo.height / window.devicePixelRatio;
          photo.width = photo.width / window.devicePixelRatio;
        }

        if (settings.scalePhotos) {
          setResize = function setResize() {
            photo.height -= photo.height * percent;
            photo.width -= photo.width * percent;
          };

          if (settings.mw && photo.width > settings.mw) {
            percent = (photo.width - settings.mw) / photo.width;
            setResize();
          }

          if (settings.mh && photo.height > settings.mh) {
            percent = (photo.height - settings.mh) / photo.height;
            setResize();
          }
        }

        if (settings.h) {
          photo.style.marginTop = Math.max(settings.mh - photo.height, 0) / 2 + 'px';
        }

        if ($related[1] && (settings.loop || $related[index + 1])) {
          photo.style.cursor = 'pointer';

          photo.onclick = function () {
            publicMethod.next();
          };
        }

        photo.style.width = photo.width + 'px';
        photo.style.height = photo.height + 'px';
        setTimeout(function () {
          // A pause because Chrome will sometimes report a 0 by 0 size otherwise.
          prep(photo);
        }, 1);
      });
      setTimeout(function () {
        // A pause because Opera 10.6+ will sometimes not run the onload function otherwise.
        photo.src = href;
      }, 1);
    } else if (href) {
      $loadingBay.load(href, settings.data, function (data, status) {
        if (request === requests) {
          prep(status === 'error' ? $tag(div, 'Error').html(settings.xhrError) : $(this).contents());
        }
      });
    }
  } // Navigates to the next page/image in a set.


  publicMethod.next = function () {
    if (!active && $related[1] && (settings.loop || $related[index + 1])) {
      index = getIndex(1);
      launch($related[index]);
    }
  };

  publicMethod.prev = function () {
    if (!active && $related[1] && (settings.loop || index)) {
      index = getIndex(-1);
      launch($related[index]);
    }
  }; // Note: to use this within an iframe use the following format: parent.jQuery.colorbox.close();


  publicMethod.close = function () {
    if (open && !closing) {
      closing = true;
      open = false;
      trigger(event_cleanup, settings.onCleanup);
      $window.unbind('.' + prefix);
      $overlay.fadeTo(settings.fadeOut || 0, 0);
      $box.stop().fadeTo(settings.fadeOut || 0, 0, function () {
        $box.add($overlay).css({
          'opacity': 1,
          cursor: 'auto'
        }).hide();
        trigger(event_purge);
        $loaded.empty().remove(); // Using empty first may prevent some IE7 issues.

        setTimeout(function () {
          closing = false;
          trigger(event_closed, settings.onClosed);
        }, 1);
      });
    }
  }; // Removes changes Colorbox made to the document, but does not remove the plugin.


  publicMethod.remove = function () {
    if (!$box) {
      return;
    }

    $box.stop();
    $.colorbox.close();
    $box.stop().remove();
    $overlay.remove();
    closing = false;
    $box = null;
    $('.' + boxElement).removeData(colorbox).removeClass(boxElement);
    $(document).unbind('click.' + prefix);
  }; // A method for fetching the current element Colorbox is referencing.
  // returns a jQuery object.


  publicMethod.element = function () {
    return $(element);
  };

  publicMethod.settings = defaults;
})(jQuery, document, window);
"use strict";

/**
 * customizer.js
 *
 * Theme Customizer enhancements for a better user experience.
 *
 * Contains handlers to make Theme Customizer preview reload changes asynchronously.
 */
(function ($) {
  // Site title and description.
  wp.customize('blogname', function (value) {
    value.bind(function (to) {
      $('.site-title a').text(to);
    });
  });
  wp.customize('blogdescription', function (value) {
    value.bind(function (to) {
      $('.site-description').text(to);
    });
  }); // Header text color.

  wp.customize('header_textcolor', function (value) {
    value.bind(function (to) {
      if ('blank' === to) {
        $('.site-title a, .site-description').css({
          'clip': 'rect(1px, 1px, 1px, 1px)',
          'position': 'absolute'
        });
      } else {
        $('.site-title a, .site-description').css({
          'clip': 'auto',
          'position': 'relative'
        });
        $('.site-title a, .site-description').css({
          'color': to
        });
      }
    });
  });
})(jQuery);
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * jQuery FlexSlider v2.2.0
 * Copyright 2012 WooThemes
 * Contributing Author: Tyler Smith
 */
;

(function ($) {
  //FlexSlider: Object Instance
  $.flexslider = function (el, options) {
    var slider = $(el); // making variables public

    slider.vars = $.extend({}, $.flexslider.defaults, options);
    var namespace = slider.vars.namespace,
        msGesture = window.navigator && window.navigator.msPointerEnabled && window.MSGesture,
        touch = ("ontouchstart" in window || msGesture || window.DocumentTouch && document instanceof DocumentTouch) && slider.vars.touch,
        // depricating this idea, as devices are being released with both of these events
    //eventType = (touch) ? "touchend" : "click",
    eventType = "click touchend MSPointerUp",
        watchedEvent = "",
        watchedEventClearTimer,
        vertical = slider.vars.direction === "vertical",
        reverse = slider.vars.reverse,
        carousel = slider.vars.itemWidth > 0,
        fade = slider.vars.animation === "fade",
        asNav = slider.vars.asNavFor !== "",
        methods = {},
        focused = true; // Store a reference to the slider object

    $.data(el, "flexslider", slider); // Private slider methods

    methods = {
      init: function init() {
        slider.animating = false; // Get current slide and make sure it is a number

        slider.currentSlide = parseInt(slider.vars.startAt ? slider.vars.startAt : 0);
        if (isNaN(slider.currentSlide)) slider.currentSlide = 0;
        slider.animatingTo = slider.currentSlide;
        slider.atEnd = slider.currentSlide === 0 || slider.currentSlide === slider.last;
        slider.containerSelector = slider.vars.selector.substr(0, slider.vars.selector.search(' '));
        slider.slides = $(slider.vars.selector, slider);
        slider.container = $(slider.containerSelector, slider);
        slider.count = slider.slides.length; // SYNC:

        slider.syncExists = $(slider.vars.sync).length > 0; // SLIDE:

        if (slider.vars.animation === "slide") slider.vars.animation = "swing";
        slider.prop = vertical ? "top" : "marginLeft";
        slider.args = {}; // SLIDESHOW:

        slider.manualPause = false;
        slider.stopped = false; //PAUSE WHEN INVISIBLE

        slider.started = false;
        slider.startTimeout = null; // TOUCH/USECSS:

        slider.transitions = !slider.vars.video && !fade && slider.vars.useCSS && function () {
          var obj = document.createElement('div'),
              props = ['perspectiveProperty', 'WebkitPerspective', 'MozPerspective', 'OPerspective', 'msPerspective'];

          for (var i in props) {
            if (obj.style[props[i]] !== undefined) {
              slider.pfx = props[i].replace('Perspective', '').toLowerCase();
              slider.prop = "-" + slider.pfx + "-transform";
              return true;
            }
          }

          return false;
        }(); // CONTROLSCONTAINER:


        if (slider.vars.controlsContainer !== "") slider.controlsContainer = $(slider.vars.controlsContainer).length > 0 && $(slider.vars.controlsContainer); // MANUAL:

        if (slider.vars.manualControls !== "") slider.manualControls = $(slider.vars.manualControls).length > 0 && $(slider.vars.manualControls); // RANDOMIZE:

        if (slider.vars.randomize) {
          slider.slides.sort(function () {
            return Math.round(Math.random()) - 0.5;
          });
          slider.container.empty().append(slider.slides);
        }

        slider.doMath(); // INIT

        slider.setup("init"); // CONTROLNAV:

        if (slider.vars.controlNav) methods.controlNav.setup(); // DIRECTIONNAV:

        if (slider.vars.directionNav) methods.directionNav.setup(); // KEYBOARD:

        if (slider.vars.keyboard && ($(slider.containerSelector).length === 1 || slider.vars.multipleKeyboard)) {
          $(document).bind('keyup', function (event) {
            var keycode = event.keyCode;

            if (!slider.animating && (keycode === 39 || keycode === 37)) {
              var target = keycode === 39 ? slider.getTarget('next') : keycode === 37 ? slider.getTarget('prev') : false;
              slider.flexAnimate(target, slider.vars.pauseOnAction);
            }
          });
        } // MOUSEWHEEL:


        if (slider.vars.mousewheel) {
          slider.bind('mousewheel', function (event, delta, deltaX, deltaY) {
            event.preventDefault();
            var target = delta < 0 ? slider.getTarget('next') : slider.getTarget('prev');
            slider.flexAnimate(target, slider.vars.pauseOnAction);
          });
        } // PAUSEPLAY


        if (slider.vars.pausePlay) methods.pausePlay.setup(); //PAUSE WHEN INVISIBLE

        if (slider.vars.slideshow && slider.vars.pauseInvisible) methods.pauseInvisible.init(); // SLIDSESHOW

        if (slider.vars.slideshow) {
          if (slider.vars.pauseOnHover) {
            slider.hover(function () {
              if (!slider.manualPlay && !slider.manualPause) slider.pause();
            }, function () {
              if (!slider.manualPause && !slider.manualPlay && !slider.stopped) slider.play();
            });
          } // initialize animation
          //If we're visible, or we don't use PageVisibility API


          if (!slider.vars.pauseInvisible || !methods.pauseInvisible.isHidden()) {
            slider.vars.initDelay > 0 ? slider.startTimeout = setTimeout(slider.play, slider.vars.initDelay) : slider.play();
          }
        } // ASNAV:


        if (asNav) methods.asNav.setup(); // TOUCH

        if (touch && slider.vars.touch) methods.touch(); // FADE&&SMOOTHHEIGHT || SLIDE:

        if (!fade || fade && slider.vars.smoothHeight) $(window).bind("resize orientationchange focus", methods.resize);
        slider.find("img").attr("draggable", "false"); // API: start() Callback

        setTimeout(function () {
          slider.vars.start(slider);
        }, 200);
      },
      asNav: {
        setup: function setup() {
          slider.asNav = true;
          slider.animatingTo = Math.floor(slider.currentSlide / slider.move);
          slider.currentItem = slider.currentSlide;
          slider.slides.removeClass(namespace + "active-slide").eq(slider.currentItem).addClass(namespace + "active-slide");

          if (!msGesture) {
            slider.slides.click(function (e) {
              e.preventDefault();
              var $slide = $(this),
                  target = $slide.index();
              var posFromLeft = $slide.offset().left - $(slider).scrollLeft(); // Find position of slide relative to left of slider container

              if (posFromLeft <= 0 && $slide.hasClass(namespace + 'active-slide')) {
                slider.flexAnimate(slider.getTarget("prev"), true);
              } else if (!$(slider.vars.asNavFor).data('flexslider').animating && !$slide.hasClass(namespace + "active-slide")) {
                slider.direction = slider.currentItem < target ? "next" : "prev";
                slider.flexAnimate(target, slider.vars.pauseOnAction, false, true, true);
              }
            });
          } else {
            el._slider = slider;
            slider.slides.each(function () {
              var that = this;
              that._gesture = new MSGesture();
              that._gesture.target = that;
              that.addEventListener("MSPointerDown", function (e) {
                e.preventDefault();
                if (e.currentTarget._gesture) e.currentTarget._gesture.addPointer(e.pointerId);
              }, false);
              that.addEventListener("MSGestureTap", function (e) {
                e.preventDefault();
                var $slide = $(this),
                    target = $slide.index();

                if (!$(slider.vars.asNavFor).data('flexslider').animating && !$slide.hasClass('active')) {
                  slider.direction = slider.currentItem < target ? "next" : "prev";
                  slider.flexAnimate(target, slider.vars.pauseOnAction, false, true, true);
                }
              });
            });
          }
        }
      },
      controlNav: {
        setup: function setup() {
          if (!slider.manualControls) {
            methods.controlNav.setupPaging();
          } else {
            // MANUALCONTROLS:
            methods.controlNav.setupManual();
          }
        },
        setupPaging: function setupPaging() {
          var type = slider.vars.controlNav === "thumbnails" ? 'control-thumbs' : 'control-paging',
              j = 1,
              item,
              slide;
          slider.controlNavScaffold = $('<ol class="' + namespace + 'control-nav ' + namespace + type + '"></ol>');

          if (slider.pagingCount > 1) {
            for (var i = 0; i < slider.pagingCount; i++) {
              slide = slider.slides.eq(i);
              item = slider.vars.controlNav === "thumbnails" ? '<img src="' + slide.attr('data-thumb') + '"/>' : '<a>' + j + '</a>';

              if ('thumbnails' === slider.vars.controlNav && true === slider.vars.thumbCaptions) {
                var captn = slide.attr('data-thumbcaption');
                if ('' != captn && undefined != captn) item += '<span class="' + namespace + 'caption">' + captn + '</span>';
              }

              slider.controlNavScaffold.append('<li>' + item + '</li>');
              j++;
            }
          } // CONTROLSCONTAINER:


          slider.controlsContainer ? $(slider.controlsContainer).append(slider.controlNavScaffold) : slider.append(slider.controlNavScaffold);
          methods.controlNav.set();
          methods.controlNav.active();
          slider.controlNavScaffold.delegate('a, img', eventType, function (event) {
            event.preventDefault();

            if (watchedEvent === "" || watchedEvent === event.type) {
              var $this = $(this),
                  target = slider.controlNav.index($this);

              if (!$this.hasClass(namespace + 'active')) {
                slider.direction = target > slider.currentSlide ? "next" : "prev";
                slider.flexAnimate(target, slider.vars.pauseOnAction);
              }
            } // setup flags to prevent event duplication


            if (watchedEvent === "") {
              watchedEvent = event.type;
            }

            methods.setToClearWatchedEvent();
          });
        },
        setupManual: function setupManual() {
          slider.controlNav = slider.manualControls;
          methods.controlNav.active();
          slider.controlNav.bind(eventType, function (event) {
            event.preventDefault();

            if (watchedEvent === "" || watchedEvent === event.type) {
              var $this = $(this),
                  target = slider.controlNav.index($this);

              if (!$this.hasClass(namespace + 'active')) {
                target > slider.currentSlide ? slider.direction = "next" : slider.direction = "prev";
                slider.flexAnimate(target, slider.vars.pauseOnAction);
              }
            } // setup flags to prevent event duplication


            if (watchedEvent === "") {
              watchedEvent = event.type;
            }

            methods.setToClearWatchedEvent();
          });
        },
        set: function set() {
          var selector = slider.vars.controlNav === "thumbnails" ? 'img' : 'a';
          slider.controlNav = $('.' + namespace + 'control-nav li ' + selector, slider.controlsContainer ? slider.controlsContainer : slider);
        },
        active: function active() {
          slider.controlNav.removeClass(namespace + "active").eq(slider.animatingTo).addClass(namespace + "active");
        },
        update: function update(action, pos) {
          if (slider.pagingCount > 1 && action === "add") {
            slider.controlNavScaffold.append($('<li><a>' + slider.count + '</a></li>'));
          } else if (slider.pagingCount === 1) {
            slider.controlNavScaffold.find('li').remove();
          } else {
            slider.controlNav.eq(pos).closest('li').remove();
          }

          methods.controlNav.set();
          slider.pagingCount > 1 && slider.pagingCount !== slider.controlNav.length ? slider.update(pos, action) : methods.controlNav.active();
        }
      },
      directionNav: {
        setup: function setup() {
          var directionNavScaffold = $('<ul class="' + namespace + 'direction-nav"><li><a class="' + namespace + 'prev" href="#">' + slider.vars.prevText + '</a></li><li><a class="' + namespace + 'next" href="#">' + slider.vars.nextText + '</a></li></ul>'); // CONTROLSCONTAINER:

          if (slider.controlsContainer) {
            $(slider.controlsContainer).append(directionNavScaffold);
            slider.directionNav = $('.' + namespace + 'direction-nav li a', slider.controlsContainer);
          } else {
            slider.append(directionNavScaffold);
            slider.directionNav = $('.' + namespace + 'direction-nav li a', slider);
          }

          methods.directionNav.update();
          slider.directionNav.bind(eventType, function (event) {
            event.preventDefault();
            var target;

            if (watchedEvent === "" || watchedEvent === event.type) {
              target = $(this).hasClass(namespace + 'next') ? slider.getTarget('next') : slider.getTarget('prev');
              slider.flexAnimate(target, slider.vars.pauseOnAction);
            } // setup flags to prevent event duplication


            if (watchedEvent === "") {
              watchedEvent = event.type;
            }

            methods.setToClearWatchedEvent();
          });
        },
        update: function update() {
          var disabledClass = namespace + 'disabled';

          if (slider.pagingCount === 1) {
            slider.directionNav.addClass(disabledClass).attr('tabindex', '-1');
          } else if (!slider.vars.animationLoop) {
            if (slider.animatingTo === 0) {
              slider.directionNav.removeClass(disabledClass).filter('.' + namespace + "prev").addClass(disabledClass).attr('tabindex', '-1');
            } else if (slider.animatingTo === slider.last) {
              slider.directionNav.removeClass(disabledClass).filter('.' + namespace + "next").addClass(disabledClass).attr('tabindex', '-1');
            } else {
              slider.directionNav.removeClass(disabledClass).removeAttr('tabindex');
            }
          } else {
            slider.directionNav.removeClass(disabledClass).removeAttr('tabindex');
          }
        }
      },
      pausePlay: {
        setup: function setup() {
          var pausePlayScaffold = $('<div class="' + namespace + 'pauseplay"><a></a></div>'); // CONTROLSCONTAINER:

          if (slider.controlsContainer) {
            slider.controlsContainer.append(pausePlayScaffold);
            slider.pausePlay = $('.' + namespace + 'pauseplay a', slider.controlsContainer);
          } else {
            slider.append(pausePlayScaffold);
            slider.pausePlay = $('.' + namespace + 'pauseplay a', slider);
          }

          methods.pausePlay.update(slider.vars.slideshow ? namespace + 'pause' : namespace + 'play');
          slider.pausePlay.bind(eventType, function (event) {
            event.preventDefault();

            if (watchedEvent === "" || watchedEvent === event.type) {
              if ($(this).hasClass(namespace + 'pause')) {
                slider.manualPause = true;
                slider.manualPlay = false;
                slider.pause();
              } else {
                slider.manualPause = false;
                slider.manualPlay = true;
                slider.play();
              }
            } // setup flags to prevent event duplication


            if (watchedEvent === "") {
              watchedEvent = event.type;
            }

            methods.setToClearWatchedEvent();
          });
        },
        update: function update(state) {
          state === "play" ? slider.pausePlay.removeClass(namespace + 'pause').addClass(namespace + 'play').html(slider.vars.playText) : slider.pausePlay.removeClass(namespace + 'play').addClass(namespace + 'pause').html(slider.vars.pauseText);
        }
      },
      touch: function touch() {
        var startX,
            startY,
            offset,
            cwidth,
            dx,
            startT,
            scrolling = false,
            localX = 0,
            localY = 0,
            accDx = 0;

        if (!msGesture) {
          var onTouchStart = function onTouchStart(e) {
            if (slider.animating) {
              e.preventDefault();
            } else if (window.navigator.msPointerEnabled || e.touches.length === 1) {
              slider.pause(); // CAROUSEL:

              cwidth = vertical ? slider.h : slider.w;
              startT = Number(new Date()); // CAROUSEL:
              // Local vars for X and Y points.

              localX = e.touches[0].pageX;
              localY = e.touches[0].pageY;
              offset = carousel && reverse && slider.animatingTo === slider.last ? 0 : carousel && reverse ? slider.limit - (slider.itemW + slider.vars.itemMargin) * slider.move * slider.animatingTo : carousel && slider.currentSlide === slider.last ? slider.limit : carousel ? (slider.itemW + slider.vars.itemMargin) * slider.move * slider.currentSlide : reverse ? (slider.last - slider.currentSlide + slider.cloneOffset) * cwidth : (slider.currentSlide + slider.cloneOffset) * cwidth;
              startX = vertical ? localY : localX;
              startY = vertical ? localX : localY;
              el.addEventListener('touchmove', onTouchMove, false);
              el.addEventListener('touchend', onTouchEnd, false);
            }
          };

          var onTouchMove = function onTouchMove(e) {
            // Local vars for X and Y points.
            localX = e.touches[0].pageX;
            localY = e.touches[0].pageY;
            dx = vertical ? startX - localY : startX - localX;
            scrolling = vertical ? Math.abs(dx) < Math.abs(localX - startY) : Math.abs(dx) < Math.abs(localY - startY);
            var fxms = 500;

            if (!scrolling || Number(new Date()) - startT > fxms) {
              e.preventDefault();

              if (!fade && slider.transitions) {
                if (!slider.vars.animationLoop) {
                  dx = dx / (slider.currentSlide === 0 && dx < 0 || slider.currentSlide === slider.last && dx > 0 ? Math.abs(dx) / cwidth + 2 : 1);
                }

                slider.setProps(offset + dx, "setTouch");
              }
            }
          };

          var onTouchEnd = function onTouchEnd(e) {
            // finish the touch by undoing the touch session
            el.removeEventListener('touchmove', onTouchMove, false);

            if (slider.animatingTo === slider.currentSlide && !scrolling && !(dx === null)) {
              var updateDx = reverse ? -dx : dx,
                  target = updateDx > 0 ? slider.getTarget('next') : slider.getTarget('prev');

              if (slider.canAdvance(target) && (Number(new Date()) - startT < 550 && Math.abs(updateDx) > 50 || Math.abs(updateDx) > cwidth / 2)) {
                slider.flexAnimate(target, slider.vars.pauseOnAction);
              } else {
                if (!fade) slider.flexAnimate(slider.currentSlide, slider.vars.pauseOnAction, true);
              }
            }

            el.removeEventListener('touchend', onTouchEnd, false);
            startX = null;
            startY = null;
            dx = null;
            offset = null;
          };

          el.addEventListener('touchstart', onTouchStart, false);
        } else {
          var onMSPointerDown = function onMSPointerDown(e) {
            e.stopPropagation();

            if (slider.animating) {
              e.preventDefault();
            } else {
              slider.pause();

              el._gesture.addPointer(e.pointerId);

              accDx = 0;
              cwidth = vertical ? slider.h : slider.w;
              startT = Number(new Date()); // CAROUSEL:

              offset = carousel && reverse && slider.animatingTo === slider.last ? 0 : carousel && reverse ? slider.limit - (slider.itemW + slider.vars.itemMargin) * slider.move * slider.animatingTo : carousel && slider.currentSlide === slider.last ? slider.limit : carousel ? (slider.itemW + slider.vars.itemMargin) * slider.move * slider.currentSlide : reverse ? (slider.last - slider.currentSlide + slider.cloneOffset) * cwidth : (slider.currentSlide + slider.cloneOffset) * cwidth;
            }
          };

          var onMSGestureChange = function onMSGestureChange(e) {
            e.stopPropagation();
            var slider = e.target._slider;

            if (!slider) {
              return;
            }

            var transX = -e.translationX,
                transY = -e.translationY; //Accumulate translations.

            accDx = accDx + (vertical ? transY : transX);
            dx = accDx;
            scrolling = vertical ? Math.abs(accDx) < Math.abs(-transX) : Math.abs(accDx) < Math.abs(-transY);

            if (e.detail === e.MSGESTURE_FLAG_INERTIA) {
              setImmediate(function () {
                el._gesture.stop();
              });
              return;
            }

            if (!scrolling || Number(new Date()) - startT > 500) {
              e.preventDefault();

              if (!fade && slider.transitions) {
                if (!slider.vars.animationLoop) {
                  dx = accDx / (slider.currentSlide === 0 && accDx < 0 || slider.currentSlide === slider.last && accDx > 0 ? Math.abs(accDx) / cwidth + 2 : 1);
                }

                slider.setProps(offset + dx, "setTouch");
              }
            }
          };

          var onMSGestureEnd = function onMSGestureEnd(e) {
            e.stopPropagation();
            var slider = e.target._slider;

            if (!slider) {
              return;
            }

            if (slider.animatingTo === slider.currentSlide && !scrolling && !(dx === null)) {
              var updateDx = reverse ? -dx : dx,
                  target = updateDx > 0 ? slider.getTarget('next') : slider.getTarget('prev');

              if (slider.canAdvance(target) && (Number(new Date()) - startT < 550 && Math.abs(updateDx) > 50 || Math.abs(updateDx) > cwidth / 2)) {
                slider.flexAnimate(target, slider.vars.pauseOnAction);
              } else {
                if (!fade) slider.flexAnimate(slider.currentSlide, slider.vars.pauseOnAction, true);
              }
            }

            startX = null;
            startY = null;
            dx = null;
            offset = null;
            accDx = 0;
          };

          el.style.msTouchAction = "none";
          el._gesture = new MSGesture();
          el._gesture.target = el;
          el.addEventListener("MSPointerDown", onMSPointerDown, false);
          el._slider = slider;
          el.addEventListener("MSGestureChange", onMSGestureChange, false);
          el.addEventListener("MSGestureEnd", onMSGestureEnd, false);
        }
      },
      resize: function resize() {
        if (!slider.animating && slider.is(':visible')) {
          if (!carousel) slider.doMath();

          if (fade) {
            // SMOOTH HEIGHT:
            methods.smoothHeight();
          } else if (carousel) {
            //CAROUSEL:
            slider.slides.width(slider.computedW);
            slider.update(slider.pagingCount);
            slider.setProps();
          } else if (vertical) {
            //VERTICAL:
            slider.viewport.height(slider.h);
            slider.setProps(slider.h, "setTotal");
          } else {
            // SMOOTH HEIGHT:
            if (slider.vars.smoothHeight) methods.smoothHeight();
            slider.newSlides.width(slider.computedW);
            slider.setProps(slider.computedW, "setTotal");
          }
        }
      },
      smoothHeight: function smoothHeight(dur) {
        if (!vertical || fade) {
          var $obj = fade ? slider : slider.viewport;
          dur ? $obj.animate({
            "height": slider.slides.eq(slider.animatingTo).height()
          }, dur) : $obj.height(slider.slides.eq(slider.animatingTo).height());
        }
      },
      sync: function sync(action) {
        var $obj = $(slider.vars.sync).data("flexslider"),
            target = slider.animatingTo;

        switch (action) {
          case "animate":
            $obj.flexAnimate(target, slider.vars.pauseOnAction, false, true);
            break;

          case "play":
            if (!$obj.playing && !$obj.asNav) {
              $obj.play();
            }

            break;

          case "pause":
            $obj.pause();
            break;
        }
      },
      pauseInvisible: {
        visProp: null,
        init: function init() {
          var prefixes = ['webkit', 'moz', 'ms', 'o'];
          if ('hidden' in document) return 'hidden';

          for (var i = 0; i < prefixes.length; i++) {
            if (prefixes[i] + 'Hidden' in document) methods.pauseInvisible.visProp = prefixes[i] + 'Hidden';
          }

          if (methods.pauseInvisible.visProp) {
            var evtname = methods.pauseInvisible.visProp.replace(/[H|h]idden/, '') + 'visibilitychange';
            document.addEventListener(evtname, function () {
              if (methods.pauseInvisible.isHidden()) {
                if (slider.startTimeout) clearTimeout(slider.startTimeout); //If clock is ticking, stop timer and prevent from starting while invisible
                else slider.pause(); //Or just pause
              } else {
                if (slider.started) slider.play(); //Initiated before, just play
                else slider.vars.initDelay > 0 ? setTimeout(slider.play, slider.vars.initDelay) : slider.play(); //Didn't init before: simply init or wait for it
              }
            });
          }
        },
        isHidden: function isHidden() {
          return document[methods.pauseInvisible.visProp] || false;
        }
      },
      setToClearWatchedEvent: function setToClearWatchedEvent() {
        clearTimeout(watchedEventClearTimer);
        watchedEventClearTimer = setTimeout(function () {
          watchedEvent = "";
        }, 3000);
      }
    }; // public methods

    slider.flexAnimate = function (target, pause, override, withSync, fromNav) {
      if (!slider.vars.animationLoop && target !== slider.currentSlide) {
        slider.direction = target > slider.currentSlide ? "next" : "prev";
      }

      if (asNav && slider.pagingCount === 1) slider.direction = slider.currentItem < target ? "next" : "prev";

      if (!slider.animating && (slider.canAdvance(target, fromNav) || override) && slider.is(":visible")) {
        if (asNav && withSync) {
          var master = $(slider.vars.asNavFor).data('flexslider');
          slider.atEnd = target === 0 || target === slider.count - 1;
          master.flexAnimate(target, true, false, true, fromNav);
          slider.direction = slider.currentItem < target ? "next" : "prev";
          master.direction = slider.direction;

          if (Math.ceil((target + 1) / slider.visible) - 1 !== slider.currentSlide && target !== 0) {
            slider.currentItem = target;
            slider.slides.removeClass(namespace + "active-slide").eq(target).addClass(namespace + "active-slide");
            target = Math.floor(target / slider.visible);
          } else {
            slider.currentItem = target;
            slider.slides.removeClass(namespace + "active-slide").eq(target).addClass(namespace + "active-slide");
            return false;
          }
        }

        slider.animating = true;
        slider.animatingTo = target; // SLIDESHOW:

        if (pause) slider.pause(); // API: before() animation Callback

        slider.vars.before(slider); // SYNC:

        if (slider.syncExists && !fromNav) methods.sync("animate"); // CONTROLNAV

        if (slider.vars.controlNav) methods.controlNav.active(); // !CAROUSEL:
        // CANDIDATE: slide active class (for add/remove slide)

        if (!carousel) slider.slides.removeClass(namespace + 'active-slide').eq(target).addClass(namespace + 'active-slide'); // INFINITE LOOP:
        // CANDIDATE: atEnd

        slider.atEnd = target === 0 || target === slider.last; // DIRECTIONNAV:

        if (slider.vars.directionNav) methods.directionNav.update();

        if (target === slider.last) {
          // API: end() of cycle Callback
          slider.vars.end(slider); // SLIDESHOW && !INFINITE LOOP:

          if (!slider.vars.animationLoop) slider.pause();
        } // SLIDE:


        if (!fade) {
          var dimension = vertical ? slider.slides.filter(':first').height() : slider.computedW,
              margin,
              slideString,
              calcNext; // INFINITE LOOP / REVERSE:

          if (carousel) {
            //margin = (slider.vars.itemWidth > slider.w) ? slider.vars.itemMargin * 2 : slider.vars.itemMargin;
            margin = slider.vars.itemMargin;
            calcNext = (slider.itemW + margin) * slider.move * slider.animatingTo;
            slideString = calcNext > slider.limit && slider.visible !== 1 ? slider.limit : calcNext;
          } else if (slider.currentSlide === 0 && target === slider.count - 1 && slider.vars.animationLoop && slider.direction !== "next") {
            slideString = reverse ? (slider.count + slider.cloneOffset) * dimension : 0;
          } else if (slider.currentSlide === slider.last && target === 0 && slider.vars.animationLoop && slider.direction !== "prev") {
            slideString = reverse ? 0 : (slider.count + 1) * dimension;
          } else {
            slideString = reverse ? (slider.count - 1 - target + slider.cloneOffset) * dimension : (target + slider.cloneOffset) * dimension;
          }

          slider.setProps(slideString, "", slider.vars.animationSpeed);

          if (slider.transitions) {
            if (!slider.vars.animationLoop || !slider.atEnd) {
              slider.animating = false;
              slider.currentSlide = slider.animatingTo;
            }

            slider.container.unbind("webkitTransitionEnd transitionend");
            slider.container.bind("webkitTransitionEnd transitionend", function () {
              slider.wrapup(dimension);
            });
          } else {
            slider.container.animate(slider.args, slider.vars.animationSpeed, slider.vars.easing, function () {
              slider.wrapup(dimension);
            });
          }
        } else {
          // FADE:
          if (!touch) {
            //slider.slides.eq(slider.currentSlide).fadeOut(slider.vars.animationSpeed, slider.vars.easing);
            //slider.slides.eq(target).fadeIn(slider.vars.animationSpeed, slider.vars.easing, slider.wrapup);
            slider.slides.eq(slider.currentSlide).css({
              "zIndex": 1
            }).animate({
              "opacity": 0
            }, slider.vars.animationSpeed, slider.vars.easing);
            slider.slides.eq(target).css({
              "zIndex": 2
            }).animate({
              "opacity": 1
            }, slider.vars.animationSpeed, slider.vars.easing, slider.wrapup);
          } else {
            slider.slides.eq(slider.currentSlide).css({
              "opacity": 0,
              "zIndex": 1
            });
            slider.slides.eq(target).css({
              "opacity": 1,
              "zIndex": 2
            });
            slider.wrapup(dimension);
          }
        } // SMOOTH HEIGHT:


        if (slider.vars.smoothHeight) methods.smoothHeight(slider.vars.animationSpeed);
      }
    };

    slider.wrapup = function (dimension) {
      // SLIDE:
      if (!fade && !carousel) {
        if (slider.currentSlide === 0 && slider.animatingTo === slider.last && slider.vars.animationLoop) {
          slider.setProps(dimension, "jumpEnd");
        } else if (slider.currentSlide === slider.last && slider.animatingTo === 0 && slider.vars.animationLoop) {
          slider.setProps(dimension, "jumpStart");
        }
      }

      slider.animating = false;
      slider.currentSlide = slider.animatingTo; // API: after() animation Callback

      slider.vars.after(slider);
    }; // SLIDESHOW:


    slider.animateSlides = function () {
      if (!slider.animating && focused) slider.flexAnimate(slider.getTarget("next"));
    }; // SLIDESHOW:


    slider.pause = function () {
      clearInterval(slider.animatedSlides);
      slider.animatedSlides = null;
      slider.playing = false; // PAUSEPLAY:

      if (slider.vars.pausePlay) methods.pausePlay.update("play"); // SYNC:

      if (slider.syncExists) methods.sync("pause");
    }; // SLIDESHOW:


    slider.play = function () {
      if (slider.playing) clearInterval(slider.animatedSlides);
      slider.animatedSlides = slider.animatedSlides || setInterval(slider.animateSlides, slider.vars.slideshowSpeed);
      slider.started = slider.playing = true; // PAUSEPLAY:

      if (slider.vars.pausePlay) methods.pausePlay.update("pause"); // SYNC:

      if (slider.syncExists) methods.sync("play");
    }; // STOP:


    slider.stop = function () {
      slider.pause();
      slider.stopped = true;
    };

    slider.canAdvance = function (target, fromNav) {
      // ASNAV:
      var last = asNav ? slider.pagingCount - 1 : slider.last;
      return fromNav ? true : asNav && slider.currentItem === slider.count - 1 && target === 0 && slider.direction === "prev" ? true : asNav && slider.currentItem === 0 && target === slider.pagingCount - 1 && slider.direction !== "next" ? false : target === slider.currentSlide && !asNav ? false : slider.vars.animationLoop ? true : slider.atEnd && slider.currentSlide === 0 && target === last && slider.direction !== "next" ? false : slider.atEnd && slider.currentSlide === last && target === 0 && slider.direction === "next" ? false : true;
    };

    slider.getTarget = function (dir) {
      slider.direction = dir;

      if (dir === "next") {
        return slider.currentSlide === slider.last ? 0 : slider.currentSlide + 1;
      } else {
        return slider.currentSlide === 0 ? slider.last : slider.currentSlide - 1;
      }
    }; // SLIDE:


    slider.setProps = function (pos, special, dur) {
      var target = function () {
        var posCheck = pos ? pos : (slider.itemW + slider.vars.itemMargin) * slider.move * slider.animatingTo,
            posCalc = function () {
          if (carousel) {
            return special === "setTouch" ? pos : reverse && slider.animatingTo === slider.last ? 0 : reverse ? slider.limit - (slider.itemW + slider.vars.itemMargin) * slider.move * slider.animatingTo : slider.animatingTo === slider.last ? slider.limit : posCheck;
          } else {
            switch (special) {
              case "setTotal":
                return reverse ? (slider.count - 1 - slider.currentSlide + slider.cloneOffset) * pos : (slider.currentSlide + slider.cloneOffset) * pos;

              case "setTouch":
                return reverse ? pos : pos;

              case "jumpEnd":
                return reverse ? pos : slider.count * pos;

              case "jumpStart":
                return reverse ? slider.count * pos : pos;

              default:
                return pos;
            }
          }
        }();

        return posCalc * -1 + "px";
      }();

      if (slider.transitions) {
        target = vertical ? "translate3d(0," + target + ",0)" : "translate3d(" + target + ",0,0)";
        dur = dur !== undefined ? dur / 1000 + "s" : "0s";
        slider.container.css("-" + slider.pfx + "-transition-duration", dur);
      }

      slider.args[slider.prop] = target;
      if (slider.transitions || dur === undefined) slider.container.css(slider.args);
    };

    slider.setup = function (type) {
      // SLIDE:
      if (!fade) {
        var sliderOffset, arr;

        if (type === "init") {
          slider.viewport = $('<div class="' + namespace + 'viewport"></div>').css({
            "overflow": "hidden",
            "position": "relative"
          }).appendTo(slider).append(slider.container); // INFINITE LOOP:

          slider.cloneCount = 0;
          slider.cloneOffset = 0; // REVERSE:

          if (reverse) {
            arr = $.makeArray(slider.slides).reverse();
            slider.slides = $(arr);
            slider.container.empty().append(slider.slides);
          }
        } // INFINITE LOOP && !CAROUSEL:


        if (slider.vars.animationLoop && !carousel) {
          slider.cloneCount = 2;
          slider.cloneOffset = 1; // clear out old clones

          if (type !== "init") slider.container.find('.clone').remove();
          slider.container.append(slider.slides.first().clone().addClass('clone').attr('aria-hidden', 'true')).prepend(slider.slides.last().clone().addClass('clone').attr('aria-hidden', 'true'));
        }

        slider.newSlides = $(slider.vars.selector, slider);
        sliderOffset = reverse ? slider.count - 1 - slider.currentSlide + slider.cloneOffset : slider.currentSlide + slider.cloneOffset; // VERTICAL:

        if (vertical && !carousel) {
          slider.container.height((slider.count + slider.cloneCount) * 200 + "%").css("position", "absolute").width("100%");
          setTimeout(function () {
            slider.newSlides.css({
              "display": "block"
            });
            slider.doMath();
            slider.viewport.height(slider.h);
            slider.setProps(sliderOffset * slider.h, "init");
          }, type === "init" ? 100 : 0);
        } else {
          slider.container.width((slider.count + slider.cloneCount) * 200 + "%");
          slider.setProps(sliderOffset * slider.computedW, "init");
          setTimeout(function () {
            slider.doMath();
            slider.newSlides.css({
              "width": slider.computedW,
              "float": "left",
              "display": "block"
            }); // SMOOTH HEIGHT:

            if (slider.vars.smoothHeight) methods.smoothHeight();
          }, type === "init" ? 100 : 0);
        }
      } else {
        // FADE:
        slider.slides.css({
          "width": "100%",
          "float": "left",
          "marginRight": "-100%",
          "position": "relative"
        });

        if (type === "init") {
          if (!touch) {
            //slider.slides.eq(slider.currentSlide).fadeIn(slider.vars.animationSpeed, slider.vars.easing);
            slider.slides.css({
              "opacity": 0,
              "display": "block",
              "zIndex": 1
            }).eq(slider.currentSlide).css({
              "zIndex": 2
            }).animate({
              "opacity": 1
            }, slider.vars.animationSpeed, slider.vars.easing);
          } else {
            slider.slides.css({
              "opacity": 0,
              "display": "block",
              "webkitTransition": "opacity " + slider.vars.animationSpeed / 1000 + "s ease",
              "zIndex": 1
            }).eq(slider.currentSlide).css({
              "opacity": 1,
              "zIndex": 2
            });
          }
        } // SMOOTH HEIGHT:


        if (slider.vars.smoothHeight) methods.smoothHeight();
      } // !CAROUSEL:
      // CANDIDATE: active slide


      if (!carousel) slider.slides.removeClass(namespace + "active-slide").eq(slider.currentSlide).addClass(namespace + "active-slide");
    };

    slider.doMath = function () {
      var slide = slider.slides.first(),
          slideMargin = slider.vars.itemMargin,
          minItems = slider.vars.minItems,
          maxItems = slider.vars.maxItems;
      slider.w = slider.viewport === undefined ? slider.width() : slider.viewport.width();
      slider.h = slide.height();
      slider.boxPadding = slide.outerWidth() - slide.width(); // CAROUSEL:

      if (carousel) {
        slider.itemT = slider.vars.itemWidth + slideMargin;
        slider.minW = minItems ? minItems * slider.itemT : slider.w;
        slider.maxW = maxItems ? maxItems * slider.itemT - slideMargin : slider.w;
        slider.itemW = slider.minW > slider.w ? (slider.w - slideMargin * (minItems - 1)) / minItems : slider.maxW < slider.w ? (slider.w - slideMargin * (maxItems - 1)) / maxItems : slider.vars.itemWidth > slider.w ? slider.w : slider.vars.itemWidth;
        slider.visible = Math.floor(slider.w / slider.itemW);
        slider.move = slider.vars.move > 0 && slider.vars.move < slider.visible ? slider.vars.move : slider.visible;
        slider.pagingCount = Math.ceil((slider.count - slider.visible) / slider.move + 1);
        slider.last = slider.pagingCount - 1;
        slider.limit = slider.pagingCount === 1 ? 0 : slider.vars.itemWidth > slider.w ? slider.itemW * (slider.count - 1) + slideMargin * (slider.count - 1) : (slider.itemW + slideMargin) * slider.count - slider.w - slideMargin;
      } else {
        slider.itemW = slider.w;
        slider.pagingCount = slider.count;
        slider.last = slider.count - 1;
      }

      slider.computedW = slider.itemW - slider.boxPadding;
    };

    slider.update = function (pos, action) {
      slider.doMath(); // update currentSlide and slider.animatingTo if necessary

      if (!carousel) {
        if (pos < slider.currentSlide) {
          slider.currentSlide += 1;
        } else if (pos <= slider.currentSlide && pos !== 0) {
          slider.currentSlide -= 1;
        }

        slider.animatingTo = slider.currentSlide;
      } // update controlNav


      if (slider.vars.controlNav && !slider.manualControls) {
        if (action === "add" && !carousel || slider.pagingCount > slider.controlNav.length) {
          methods.controlNav.update("add");
        } else if (action === "remove" && !carousel || slider.pagingCount < slider.controlNav.length) {
          if (carousel && slider.currentSlide > slider.last) {
            slider.currentSlide -= 1;
            slider.animatingTo -= 1;
          }

          methods.controlNav.update("remove", slider.last);
        }
      } // update directionNav


      if (slider.vars.directionNav) methods.directionNav.update();
    };

    slider.addSlide = function (obj, pos) {
      var $obj = $(obj);
      slider.count += 1;
      slider.last = slider.count - 1; // append new slide

      if (vertical && reverse) {
        pos !== undefined ? slider.slides.eq(slider.count - pos).after($obj) : slider.container.prepend($obj);
      } else {
        pos !== undefined ? slider.slides.eq(pos).before($obj) : slider.container.append($obj);
      } // update currentSlide, animatingTo, controlNav, and directionNav


      slider.update(pos, "add"); // update slider.slides

      slider.slides = $(slider.vars.selector + ':not(.clone)', slider); // re-setup the slider to accomdate new slide

      slider.setup(); //FlexSlider: added() Callback

      slider.vars.added(slider);
    };

    slider.removeSlide = function (obj) {
      var pos = isNaN(obj) ? slider.slides.index($(obj)) : obj; // update count

      slider.count -= 1;
      slider.last = slider.count - 1; // remove slide

      if (isNaN(obj)) {
        $(obj, slider.slides).remove();
      } else {
        vertical && reverse ? slider.slides.eq(slider.last).remove() : slider.slides.eq(obj).remove();
      } // update currentSlide, animatingTo, controlNav, and directionNav


      slider.doMath();
      slider.update(pos, "remove"); // update slider.slides

      slider.slides = $(slider.vars.selector + ':not(.clone)', slider); // re-setup the slider to accomdate new slide

      slider.setup(); // FlexSlider: removed() Callback

      slider.vars.removed(slider);
    }; //FlexSlider: Initialize


    methods.init();
  }; // Ensure the slider isn't focussed if the window loses focus.


  $(window).blur(function (e) {
    focused = false;
  }).focus(function (e) {
    focused = true;
  }); //FlexSlider: Default Settings

  $.flexslider.defaults = {
    namespace: "flex-",
    //{NEW} String: Prefix string attached to the class of every element generated by the plugin
    selector: ".slides > li",
    //{NEW} Selector: Must match a simple pattern. '{container} > {slide}' -- Ignore pattern at your own peril
    animation: "fade",
    //String: Select your animation type, "fade" or "slide"
    easing: "swing",
    //{NEW} String: Determines the easing method used in jQuery transitions. jQuery easing plugin is supported!
    direction: "horizontal",
    //String: Select the sliding direction, "horizontal" or "vertical"
    reverse: false,
    //{NEW} Boolean: Reverse the animation direction
    animationLoop: true,
    //Boolean: Should the animation loop? If false, directionNav will received "disable" classes at either end
    smoothHeight: false,
    //{NEW} Boolean: Allow height of the slider to animate smoothly in horizontal mode
    startAt: 0,
    //Integer: The slide that the slider should start on. Array notation (0 = first slide)
    slideshow: true,
    //Boolean: Animate slider automatically
    slideshowSpeed: 7000,
    //Integer: Set the speed of the slideshow cycling, in milliseconds
    animationSpeed: 600,
    //Integer: Set the speed of animations, in milliseconds
    initDelay: 0,
    //{NEW} Integer: Set an initialization delay, in milliseconds
    randomize: false,
    //Boolean: Randomize slide order
    thumbCaptions: false,
    //Boolean: Whether or not to put captions on thumbnails when using the "thumbnails" controlNav.
    // Usability features
    pauseOnAction: true,
    //Boolean: Pause the slideshow when interacting with control elements, highly recommended.
    pauseOnHover: false,
    //Boolean: Pause the slideshow when hovering over slider, then resume when no longer hovering
    pauseInvisible: true,
    //{NEW} Boolean: Pause the slideshow when tab is invisible, resume when visible. Provides better UX, lower CPU usage.
    useCSS: true,
    //{NEW} Boolean: Slider will use CSS3 transitions if available
    touch: true,
    //{NEW} Boolean: Allow touch swipe navigation of the slider on touch-enabled devices
    video: false,
    //{NEW} Boolean: If using video in the slider, will prevent CSS3 3D Transforms to avoid graphical glitches
    // Primary Controls
    controlNav: true,
    //Boolean: Create navigation for paging control of each clide? Note: Leave true for manualControls usage
    directionNav: true,
    //Boolean: Create navigation for previous/next navigation? (true/false)
    prevText: "Previous",
    //String: Set the text for the "previous" directionNav item
    nextText: "Next",
    //String: Set the text for the "next" directionNav item
    // Secondary Navigation
    keyboard: true,
    //Boolean: Allow slider navigating via keyboard left/right keys
    multipleKeyboard: false,
    //{NEW} Boolean: Allow keyboard navigation to affect multiple sliders. Default behavior cuts out keyboard navigation with more than one slider present.
    mousewheel: false,
    //{UPDATED} Boolean: Requires jquery.mousewheel.js (https://github.com/brandonaaron/jquery-mousewheel) - Allows slider navigating via mousewheel
    pausePlay: false,
    //Boolean: Create pause/play dynamic element
    pauseText: "Pause",
    //String: Set the text for the "pause" pausePlay item
    playText: "Play",
    //String: Set the text for the "play" pausePlay item
    // Special properties
    controlsContainer: "",
    //{UPDATED} jQuery Object/Selector: Declare which container the navigation elements should be appended too. Default container is the FlexSlider element. Example use would be $(".flexslider-container"). Property is ignored if given element is not found.
    manualControls: "",
    //{UPDATED} jQuery Object/Selector: Declare custom control navigation. Examples would be $(".flex-control-nav li") or "#tabs-nav li img", etc. The number of elements in your controlNav should match the number of slides/tabs.
    sync: "",
    //{NEW} Selector: Mirror the actions performed on this slider with another slider. Use with care.
    asNavFor: "",
    //{NEW} Selector: Internal property exposed for turning the slider into a thumbnail navigation for another slider
    // Carousel Options
    itemWidth: 0,
    //{NEW} Integer: Box-model width of individual carousel items, including horizontal borders and padding.
    itemMargin: 0,
    //{NEW} Integer: Margin between carousel items.
    minItems: 1,
    //{NEW} Integer: Minimum number of carousel items that should be visible. Items will resize fluidly when below this.
    maxItems: 0,
    //{NEW} Integer: Maxmimum number of carousel items that should be visible. Items will resize fluidly when above this limit.
    move: 0,
    //{NEW} Integer: Number of carousel items that should move on animation. If 0, slider will move all visible items.
    allowOneSlide: true,
    //{NEW} Boolean: Whether or not to allow a slider comprised of a single slide
    // Callback API
    start: function start() {},
    //Callback: function(slider) - Fires when the slider loads the first slide
    before: function before() {},
    //Callback: function(slider) - Fires asynchronously with each slider animation
    after: function after() {},
    //Callback: function(slider) - Fires after each slider animation completes
    end: function end() {},
    //Callback: function(slider) - Fires when the slider reaches the last slide (asynchronous)
    added: function added() {},
    //{NEW} Callback: function(slider) - Fires after a slide is added
    removed: function removed() {} //{NEW} Callback: function(slider) - Fires after a slide is removed

  }; //FlexSlider: Plugin Function

  $.fn.flexslider = function (options) {
    if (options === undefined) options = {};

    if (_typeof(options) === "object") {
      return this.each(function () {
        var $this = $(this),
            selector = options.selector ? options.selector : ".slides > li",
            $slides = $this.find(selector);

        if ($slides.length === 1 && options.allowOneSlide === true || $slides.length === 0) {
          $slides.fadeIn(400);
          if (options.start) options.start($this);
        } else if ($this.data('flexslider') === undefined) {
          new $.flexslider(this, options);
        }
      });
    } else {
      // Helper strings to quickly perform functions on the slider
      var $slider = $(this).data('flexslider');

      switch (options) {
        case "play":
          $slider.play();
          break;

        case "pause":
          $slider.pause();
          break;

        case "stop":
          $slider.stop();
          break;

        case "next":
          $slider.flexAnimate($slider.getTarget("next"), true);
          break;

        case "prev":
        case "previous":
          $slider.flexAnimate($slider.getTarget("prev"), true);
          break;

        default:
          if (typeof options === "number") $slider.flexAnimate(options, true);
      }
    }
  };
})(jQuery);
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*!
 * imagesLoaded PACKAGED v3.1.8
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

/*!
 * EventEmitter v4.2.6 - git.io/ee
 * Oliver Caldwell
 * MIT license
 * @preserve
 */
(function () {
  /**
   * Class for managing events.
   * Can be extended to provide event functionality in other classes.
   *
   * @class EventEmitter Manages event registering and emitting.
   */
  function EventEmitter() {} // Shortcuts to improve speed and size


  var proto = EventEmitter.prototype;
  var exports = this;
  var originalGlobalValue = exports.EventEmitter;
  /**
   * Finds the index of the listener for the event in it's storage array.
   *
   * @param {Function[]} listeners Array of listeners to search through.
   * @param {Function} listener Method to look for.
   * @return {Number} Index of the specified listener, -1 if not found
   * @api private
   */

  function indexOfListener(listeners, listener) {
    var i = listeners.length;

    while (i--) {
      if (listeners[i].listener === listener) {
        return i;
      }
    }

    return -1;
  }
  /**
   * Alias a method while keeping the context correct, to allow for overwriting of target method.
   *
   * @param {String} name The name of the target method.
   * @return {Function} The aliased method
   * @api private
   */


  function alias(name) {
    return function aliasClosure() {
      return this[name].apply(this, arguments);
    };
  }
  /**
   * Returns the listener array for the specified event.
   * Will initialise the event object and listener arrays if required.
   * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
   * Each property in the object response is an array of listener functions.
   *
   * @param {String|RegExp} evt Name of the event to return the listeners from.
   * @return {Function[]|Object} All listener functions for the event.
   */


  proto.getListeners = function getListeners(evt) {
    var events = this._getEvents();

    var response;
    var key; // Return a concatenated array of all matching events if
    // the selector is a regular expression.

    if (_typeof(evt) === 'object') {
      response = {};

      for (key in events) {
        if (events.hasOwnProperty(key) && evt.test(key)) {
          response[key] = events[key];
        }
      }
    } else {
      response = events[evt] || (events[evt] = []);
    }

    return response;
  };
  /**
   * Takes a list of listener objects and flattens it into a list of listener functions.
   *
   * @param {Object[]} listeners Raw listener objects.
   * @return {Function[]} Just the listener functions.
   */


  proto.flattenListeners = function flattenListeners(listeners) {
    var flatListeners = [];
    var i;

    for (i = 0; i < listeners.length; i += 1) {
      flatListeners.push(listeners[i].listener);
    }

    return flatListeners;
  };
  /**
   * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
   *
   * @param {String|RegExp} evt Name of the event to return the listeners from.
   * @return {Object} All listener functions for an event in an object.
   */


  proto.getListenersAsObject = function getListenersAsObject(evt) {
    var listeners = this.getListeners(evt);
    var response;

    if (listeners instanceof Array) {
      response = {};
      response[evt] = listeners;
    }

    return response || listeners;
  };
  /**
   * Adds a listener function to the specified event.
   * The listener will not be added if it is a duplicate.
   * If the listener returns true then it will be removed after it is called.
   * If you pass a regular expression as the event name then the listener will be added to all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to attach the listener to.
   * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
   * @return {Object} Current instance of EventEmitter for chaining.
   */


  proto.addListener = function addListener(evt, listener) {
    var listeners = this.getListenersAsObject(evt);
    var listenerIsWrapped = _typeof(listener) === 'object';
    var key;

    for (key in listeners) {
      if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
        listeners[key].push(listenerIsWrapped ? listener : {
          listener: listener,
          once: false
        });
      }
    }

    return this;
  };
  /**
   * Alias of addListener
   */


  proto.on = alias('addListener');
  /**
   * Semi-alias of addListener. It will add a listener that will be
   * automatically removed after it's first execution.
   *
   * @param {String|RegExp} evt Name of the event to attach the listener to.
   * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
   * @return {Object} Current instance of EventEmitter for chaining.
   */

  proto.addOnceListener = function addOnceListener(evt, listener) {
    return this.addListener(evt, {
      listener: listener,
      once: true
    });
  };
  /**
   * Alias of addOnceListener.
   */


  proto.once = alias('addOnceListener');
  /**
   * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
   * You need to tell it what event names should be matched by a regex.
   *
   * @param {String} evt Name of the event to create.
   * @return {Object} Current instance of EventEmitter for chaining.
   */

  proto.defineEvent = function defineEvent(evt) {
    this.getListeners(evt);
    return this;
  };
  /**
   * Uses defineEvent to define multiple events.
   *
   * @param {String[]} evts An array of event names to define.
   * @return {Object} Current instance of EventEmitter for chaining.
   */


  proto.defineEvents = function defineEvents(evts) {
    for (var i = 0; i < evts.length; i += 1) {
      this.defineEvent(evts[i]);
    }

    return this;
  };
  /**
   * Removes a listener function from the specified event.
   * When passed a regular expression as the event name, it will remove the listener from all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to remove the listener from.
   * @param {Function} listener Method to remove from the event.
   * @return {Object} Current instance of EventEmitter for chaining.
   */


  proto.removeListener = function removeListener(evt, listener) {
    var listeners = this.getListenersAsObject(evt);
    var index;
    var key;

    for (key in listeners) {
      if (listeners.hasOwnProperty(key)) {
        index = indexOfListener(listeners[key], listener);

        if (index !== -1) {
          listeners[key].splice(index, 1);
        }
      }
    }

    return this;
  };
  /**
   * Alias of removeListener
   */


  proto.off = alias('removeListener');
  /**
   * Adds listeners in bulk using the manipulateListeners method.
   * If you pass an object as the second argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
   * You can also pass it a regular expression to add the array of listeners to all events that match it.
   * Yeah, this function does quite a bit. That's probably a bad thing.
   *
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to add.
   * @return {Object} Current instance of EventEmitter for chaining.
   */

  proto.addListeners = function addListeners(evt, listeners) {
    // Pass through to manipulateListeners
    return this.manipulateListeners(false, evt, listeners);
  };
  /**
   * Removes listeners in bulk using the manipulateListeners method.
   * If you pass an object as the second argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
   * You can also pass it an event name and an array of listeners to be removed.
   * You can also pass it a regular expression to remove the listeners from all events that match it.
   *
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to remove.
   * @return {Object} Current instance of EventEmitter for chaining.
   */


  proto.removeListeners = function removeListeners(evt, listeners) {
    // Pass through to manipulateListeners
    return this.manipulateListeners(true, evt, listeners);
  };
  /**
   * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
   * The first argument will determine if the listeners are removed (true) or added (false).
   * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
   * You can also pass it an event name and an array of listeners to be added/removed.
   * You can also pass it a regular expression to manipulate the listeners of all events that match it.
   *
   * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
   * @return {Object} Current instance of EventEmitter for chaining.
   */


  proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
    var i;
    var value;
    var single = remove ? this.removeListener : this.addListener;
    var multiple = remove ? this.removeListeners : this.addListeners; // If evt is an object then pass each of it's properties to this method

    if (_typeof(evt) === 'object' && !(evt instanceof RegExp)) {
      for (i in evt) {
        if (evt.hasOwnProperty(i) && (value = evt[i])) {
          // Pass the single listener straight through to the singular method
          if (typeof value === 'function') {
            single.call(this, i, value);
          } else {
            // Otherwise pass back to the multiple function
            multiple.call(this, i, value);
          }
        }
      }
    } else {
      // So evt must be a string
      // And listeners must be an array of listeners
      // Loop over it and pass each one to the multiple method
      i = listeners.length;

      while (i--) {
        single.call(this, evt, listeners[i]);
      }
    }

    return this;
  };
  /**
   * Removes all listeners from a specified event.
   * If you do not specify an event then all listeners will be removed.
   * That means every event will be emptied.
   * You can also pass a regex to remove all events that match it.
   *
   * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
   * @return {Object} Current instance of EventEmitter for chaining.
   */


  proto.removeEvent = function removeEvent(evt) {
    var type = _typeof(evt);

    var events = this._getEvents();

    var key; // Remove different things depending on the state of evt

    if (type === 'string') {
      // Remove all listeners for the specified event
      delete events[evt];
    } else if (type === 'object') {
      // Remove all events matching the regex.
      for (key in events) {
        if (events.hasOwnProperty(key) && evt.test(key)) {
          delete events[key];
        }
      }
    } else {
      // Remove all listeners in all events
      delete this._events;
    }

    return this;
  };
  /**
   * Alias of removeEvent.
   *
   * Added to mirror the node API.
   */


  proto.removeAllListeners = alias('removeEvent');
  /**
   * Emits an event of your choice.
   * When emitted, every listener attached to that event will be executed.
   * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
   * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
   * So they will not arrive within the array on the other side, they will be separate.
   * You can also pass a regular expression to emit to all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
   * @param {Array} [args] Optional array of arguments to be passed to each listener.
   * @return {Object} Current instance of EventEmitter for chaining.
   */

  proto.emitEvent = function emitEvent(evt, args) {
    var listeners = this.getListenersAsObject(evt);
    var listener;
    var i;
    var key;
    var response;

    for (key in listeners) {
      if (listeners.hasOwnProperty(key)) {
        i = listeners[key].length;

        while (i--) {
          // If the listener returns true then it shall be removed from the event
          // The function is executed either with a basic call or an apply if there is an args array
          listener = listeners[key][i];

          if (listener.once === true) {
            this.removeListener(evt, listener.listener);
          }

          response = listener.listener.apply(this, args || []);

          if (response === this._getOnceReturnValue()) {
            this.removeListener(evt, listener.listener);
          }
        }
      }
    }

    return this;
  };
  /**
   * Alias of emitEvent
   */


  proto.trigger = alias('emitEvent');
  /**
   * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
   * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
   * @param {...*} Optional additional arguments to be passed to each listener.
   * @return {Object} Current instance of EventEmitter for chaining.
   */

  proto.emit = function emit(evt) {
    var args = Array.prototype.slice.call(arguments, 1);
    return this.emitEvent(evt, args);
  };
  /**
   * Sets the current value to check against when executing listeners. If a
   * listeners return value matches the one set here then it will be removed
   * after execution. This value defaults to true.
   *
   * @param {*} value The new value to check for when executing listeners.
   * @return {Object} Current instance of EventEmitter for chaining.
   */


  proto.setOnceReturnValue = function setOnceReturnValue(value) {
    this._onceReturnValue = value;
    return this;
  };
  /**
   * Fetches the current value to check against when executing listeners. If
   * the listeners return value matches this one then it should be removed
   * automatically. It will return true by default.
   *
   * @return {*|Boolean} The current value to check for or the default, true.
   * @api private
   */


  proto._getOnceReturnValue = function _getOnceReturnValue() {
    if (this.hasOwnProperty('_onceReturnValue')) {
      return this._onceReturnValue;
    } else {
      return true;
    }
  };
  /**
   * Fetches the events object and creates one if required.
   *
   * @return {Object} The events storage object.
   * @api private
   */


  proto._getEvents = function _getEvents() {
    return this._events || (this._events = {});
  };
  /**
   * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
   *
   * @return {Function} Non conflicting EventEmitter class.
   */


  EventEmitter.noConflict = function noConflict() {
    exports.EventEmitter = originalGlobalValue;
    return EventEmitter;
  }; // Expose the class either via AMD, CommonJS or the global object


  if (typeof define === 'function' && define.amd) {
    define('eventEmitter/EventEmitter', [], function () {
      return EventEmitter;
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) === 'object' && module.exports) {
    module.exports = EventEmitter;
  } else {
    this.EventEmitter = EventEmitter;
  }
}).call(void 0);
/*!
 * eventie v1.0.4
 * event binding helper
 *   eventie.bind( elem, 'click', myFn )
 *   eventie.unbind( elem, 'click', myFn )
 */

/*jshint browser: true, undef: true, unused: true */

/*global define: false */

(function (window) {
  var docElem = document.documentElement;

  var bind = function bind() {};

  function getIEEvent(obj) {
    var event = window.event; // add event.target

    event.target = event.target || event.srcElement || obj;
    return event;
  }

  if (docElem.addEventListener) {
    bind = function bind(obj, type, fn) {
      obj.addEventListener(type, fn, false);
    };
  } else if (docElem.attachEvent) {
    bind = function bind(obj, type, fn) {
      obj[type + fn] = fn.handleEvent ? function () {
        var event = getIEEvent(obj);
        fn.handleEvent.call(fn, event);
      } : function () {
        var event = getIEEvent(obj);
        fn.call(obj, event);
      };
      obj.attachEvent("on" + type, obj[type + fn]);
    };
  }

  var unbind = function unbind() {};

  if (docElem.removeEventListener) {
    unbind = function unbind(obj, type, fn) {
      obj.removeEventListener(type, fn, false);
    };
  } else if (docElem.detachEvent) {
    unbind = function unbind(obj, type, fn) {
      obj.detachEvent("on" + type, obj[type + fn]);

      try {
        delete obj[type + fn];
      } catch (err) {
        // can't delete window object properties
        obj[type + fn] = undefined;
      }
    };
  }

  var eventie = {
    bind: bind,
    unbind: unbind
  }; // transport

  if (typeof define === 'function' && define.amd) {
    // AMD
    define('eventie/eventie', eventie);
  } else {
    // browser global
    window.eventie = eventie;
  }
})(void 0);
/*!
 * imagesLoaded v3.1.8
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */


(function (window, factory) {
  // universal module definition

  /*global define: false, module: false, require: false */
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(['eventEmitter/EventEmitter', 'eventie/eventie'], function (EventEmitter, eventie) {
      return factory(window, EventEmitter, eventie);
    });
  } else if ((typeof exports === "undefined" ? "undefined" : _typeof(exports)) === 'object') {
    // CommonJS
    module.exports = factory(window, require('wolfy87-eventemitter'), require('eventie'));
  } else {
    // browser global
    window.imagesLoaded = factory(window, window.EventEmitter, window.eventie);
  }
})(window, // --------------------------  factory -------------------------- //
function factory(window, EventEmitter, eventie) {
  var $ = window.jQuery;
  var console = window.console;
  var hasConsole = typeof console !== 'undefined'; // -------------------------- helpers -------------------------- //
  // extend objects

  function extend(a, b) {
    for (var prop in b) {
      a[prop] = b[prop];
    }

    return a;
  }

  var objToString = Object.prototype.toString;

  function isArray(obj) {
    return objToString.call(obj) === '[object Array]';
  } // turn element or nodeList into an array


  function makeArray(obj) {
    var ary = [];

    if (isArray(obj)) {
      // use object if already an array
      ary = obj;
    } else if (typeof obj.length === 'number') {
      // convert nodeList to array
      for (var i = 0, len = obj.length; i < len; i++) {
        ary.push(obj[i]);
      }
    } else {
      // array of single index
      ary.push(obj);
    }

    return ary;
  } // -------------------------- imagesLoaded -------------------------- //

  /**
   * @param {Array, Element, NodeList, String} elem
   * @param {Object or Function} options - if function, use as callback
   * @param {Function} onAlways - callback function
   */


  function ImagesLoaded(elem, options, onAlways) {
    // coerce ImagesLoaded() without new, to be new ImagesLoaded()
    if (!(this instanceof ImagesLoaded)) {
      return new ImagesLoaded(elem, options);
    } // use elem as selector string


    if (typeof elem === 'string') {
      elem = document.querySelectorAll(elem);
    }

    this.elements = makeArray(elem);
    this.options = extend({}, this.options);

    if (typeof options === 'function') {
      onAlways = options;
    } else {
      extend(this.options, options);
    }

    if (onAlways) {
      this.on('always', onAlways);
    }

    this.getImages();

    if ($) {
      // add jQuery Deferred object
      this.jqDeferred = new $.Deferred();
    } // HACK check async to allow time to bind listeners


    var _this = this;

    setTimeout(function () {
      _this.check();
    });
  }

  ImagesLoaded.prototype = new EventEmitter();
  ImagesLoaded.prototype.options = {};

  ImagesLoaded.prototype.getImages = function () {
    this.images = []; // filter & find items if we have an item selector

    for (var i = 0, len = this.elements.length; i < len; i++) {
      var elem = this.elements[i]; // filter siblings

      if (elem.nodeName === 'IMG') {
        this.addImage(elem);
      } // find children
      // no non-element nodes, #143


      var nodeType = elem.nodeType;

      if (!nodeType || !(nodeType === 1 || nodeType === 9 || nodeType === 11)) {
        continue;
      }

      var childElems = elem.querySelectorAll('img'); // concat childElems to filterFound array

      for (var j = 0, jLen = childElems.length; j < jLen; j++) {
        var img = childElems[j];
        this.addImage(img);
      }
    }
  };
  /**
   * @param {Image} img
   */


  ImagesLoaded.prototype.addImage = function (img) {
    var loadingImage = new LoadingImage(img);
    this.images.push(loadingImage);
  };

  ImagesLoaded.prototype.check = function () {
    var _this = this;

    var checkedCount = 0;
    var length = this.images.length;
    this.hasAnyBroken = false; // complete if no images

    if (!length) {
      this.complete();
      return;
    }

    function onConfirm(image, message) {
      if (_this.options.debug && hasConsole) {
        console.log('confirm', image, message);
      }

      _this.progress(image);

      checkedCount++;

      if (checkedCount === length) {
        _this.complete();
      }

      return true; // bind once
    }

    for (var i = 0; i < length; i++) {
      var loadingImage = this.images[i];
      loadingImage.on('confirm', onConfirm);
      loadingImage.check();
    }
  };

  ImagesLoaded.prototype.progress = function (image) {
    this.hasAnyBroken = this.hasAnyBroken || !image.isLoaded; // HACK - Chrome triggers event before object properties have changed. #83

    var _this = this;

    setTimeout(function () {
      _this.emit('progress', _this, image);

      if (_this.jqDeferred && _this.jqDeferred.notify) {
        _this.jqDeferred.notify(_this, image);
      }
    });
  };

  ImagesLoaded.prototype.complete = function () {
    var eventName = this.hasAnyBroken ? 'fail' : 'done';
    this.isComplete = true;

    var _this = this; // HACK - another setTimeout so that confirm happens after progress


    setTimeout(function () {
      _this.emit(eventName, _this);

      _this.emit('always', _this);

      if (_this.jqDeferred) {
        var jqMethod = _this.hasAnyBroken ? 'reject' : 'resolve';

        _this.jqDeferred[jqMethod](_this);
      }
    });
  }; // -------------------------- jquery -------------------------- //


  if ($) {
    $.fn.imagesLoaded = function (options, callback) {
      var instance = new ImagesLoaded(this, options, callback);
      return instance.jqDeferred.promise($(this));
    };
  } // --------------------------  -------------------------- //


  function LoadingImage(img) {
    this.img = img;
  }

  LoadingImage.prototype = new EventEmitter();

  LoadingImage.prototype.check = function () {
    // first check cached any previous images that have same src
    var resource = cache[this.img.src] || new Resource(this.img.src);

    if (resource.isConfirmed) {
      this.confirm(resource.isLoaded, 'cached was confirmed');
      return;
    } // If complete is true and browser supports natural sizes,
    // try to check for image status manually.


    if (this.img.complete && this.img.naturalWidth !== undefined) {
      // report based on naturalWidth
      this.confirm(this.img.naturalWidth !== 0, 'naturalWidth');
      return;
    } // If none of the checks above matched, simulate loading on detached element.


    var _this = this;

    resource.on('confirm', function (resrc, message) {
      _this.confirm(resrc.isLoaded, message);

      return true;
    });
    resource.check();
  };

  LoadingImage.prototype.confirm = function (isLoaded, message) {
    this.isLoaded = isLoaded;
    this.emit('confirm', this, message);
  }; // -------------------------- Resource -------------------------- //
  // Resource checks each src, only once
  // separate class from LoadingImage to prevent memory leaks. See #115


  var cache = {};

  function Resource(src) {
    this.src = src; // add to cache

    cache[src] = this;
  }

  Resource.prototype = new EventEmitter();

  Resource.prototype.check = function () {
    // only trigger checking once
    if (this.isChecked) {
      return;
    } // simulate loading on detached element


    var proxyImage = new Image();
    eventie.bind(proxyImage, 'load', this);
    eventie.bind(proxyImage, 'error', this);
    proxyImage.src = this.src; // set flag

    this.isChecked = true;
  }; // ----- events ----- //
  // trigger specified handler for event type


  Resource.prototype.handleEvent = function (event) {
    var method = 'on' + event.type;

    if (this[method]) {
      this[method](event);
    }
  };

  Resource.prototype.onload = function (event) {
    this.confirm(true, 'onload');
    this.unbindProxyEvents(event);
  };

  Resource.prototype.onerror = function (event) {
    this.confirm(false, 'onerror');
    this.unbindProxyEvents(event);
  }; // ----- confirm ----- //


  Resource.prototype.confirm = function (isLoaded, message) {
    this.isConfirmed = true;
    this.isLoaded = isLoaded;
    this.emit('confirm', this, message);
  };

  Resource.prototype.unbindProxyEvents = function (event) {
    eventie.unbind(event.target, 'load', this);
    eventie.unbind(event.target, 'error', this);
  }; // -----  ----- //


  return ImagesLoaded;
});
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*!
 * Isotope PACKAGED v2.1.0
 * Filter & sort magical layouts
 * http://isotope.metafizzy.co
 */
(function (t) {
  function e() {}

  function i(t) {
    function i(e) {
      e.prototype.option || (e.prototype.option = function (e) {
        t.isPlainObject(e) && (this.options = t.extend(!0, this.options, e));
      });
    }

    function n(e, i) {
      t.fn[e] = function (n) {
        if ("string" == typeof n) {
          for (var s = o.call(arguments, 1), a = 0, u = this.length; u > a; a++) {
            var p = this[a],
                h = t.data(p, e);
            if (h) {
              if (t.isFunction(h[n]) && "_" !== n.charAt(0)) {
                var f = h[n].apply(h, s);
                if (void 0 !== f) return f;
              } else r("no such method '" + n + "' for " + e + " instance");
            } else r("cannot call methods on " + e + " prior to initialization; " + "attempted to call '" + n + "'");
          }

          return this;
        }

        return this.each(function () {
          var o = t.data(this, e);
          o ? (o.option(n), o._init()) : (o = new i(this, n), t.data(this, e, o));
        });
      };
    }

    if (t) {
      var r = "undefined" == typeof console ? e : function (t) {
        console.error(t);
      };
      return t.bridget = function (t, e) {
        i(e), n(t, e);
      }, t.bridget;
    }
  }

  var o = Array.prototype.slice;
  "function" == typeof define && define.amd ? define("jquery-bridget/jquery.bridget", ["jquery"], i) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? i(require("jquery")) : i(t.jQuery);
})(window), function (t) {
  function e(e) {
    var i = t.event;
    return i.target = i.target || i.srcElement || e, i;
  }

  var i = document.documentElement,
      o = function o() {};

  i.addEventListener ? o = function o(t, e, i) {
    t.addEventListener(e, i, !1);
  } : i.attachEvent && (o = function o(t, i, _o) {
    t[i + _o] = _o.handleEvent ? function () {
      var i = e(t);

      _o.handleEvent.call(_o, i);
    } : function () {
      var i = e(t);

      _o.call(t, i);
    }, t.attachEvent("on" + i, t[i + _o]);
  });

  var n = function n() {};

  i.removeEventListener ? n = function n(t, e, i) {
    t.removeEventListener(e, i, !1);
  } : i.detachEvent && (n = function n(t, e, i) {
    t.detachEvent("on" + e, t[e + i]);

    try {
      delete t[e + i];
    } catch (o) {
      t[e + i] = void 0;
    }
  });
  var r = {
    bind: o,
    unbind: n
  };
  "function" == typeof define && define.amd ? define("eventie/eventie", r) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? module.exports = r : t.eventie = r;
}(void 0), function (t) {
  function e(t) {
    "function" == typeof t && (e.isReady ? t() : s.push(t));
  }

  function i(t) {
    var i = "readystatechange" === t.type && "complete" !== r.readyState;
    e.isReady || i || o();
  }

  function o() {
    e.isReady = !0;

    for (var t = 0, i = s.length; i > t; t++) {
      var o = s[t];
      o();
    }
  }

  function n(n) {
    return "complete" === r.readyState ? o() : (n.bind(r, "DOMContentLoaded", i), n.bind(r, "readystatechange", i), n.bind(t, "load", i)), e;
  }

  var r = t.document,
      s = [];
  e.isReady = !1, "function" == typeof define && define.amd ? define("doc-ready/doc-ready", ["eventie/eventie"], n) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? module.exports = n(require("eventie")) : t.docReady = n(t.eventie);
}(window), function () {
  function t() {}

  function e(t, e) {
    for (var i = t.length; i--;) {
      if (t[i].listener === e) return i;
    }

    return -1;
  }

  function i(t) {
    return function () {
      return this[t].apply(this, arguments);
    };
  }

  var o = t.prototype,
      n = this,
      r = n.EventEmitter;
  o.getListeners = function (t) {
    var e,
        i,
        o = this._getEvents();

    if (t instanceof RegExp) {
      e = {};

      for (i in o) {
        o.hasOwnProperty(i) && t.test(i) && (e[i] = o[i]);
      }
    } else e = o[t] || (o[t] = []);

    return e;
  }, o.flattenListeners = function (t) {
    var e,
        i = [];

    for (e = 0; t.length > e; e += 1) {
      i.push(t[e].listener);
    }

    return i;
  }, o.getListenersAsObject = function (t) {
    var e,
        i = this.getListeners(t);
    return i instanceof Array && (e = {}, e[t] = i), e || i;
  }, o.addListener = function (t, i) {
    var o,
        n = this.getListenersAsObject(t),
        r = "object" == _typeof(i);

    for (o in n) {
      n.hasOwnProperty(o) && -1 === e(n[o], i) && n[o].push(r ? i : {
        listener: i,
        once: !1
      });
    }

    return this;
  }, o.on = i("addListener"), o.addOnceListener = function (t, e) {
    return this.addListener(t, {
      listener: e,
      once: !0
    });
  }, o.once = i("addOnceListener"), o.defineEvent = function (t) {
    return this.getListeners(t), this;
  }, o.defineEvents = function (t) {
    for (var e = 0; t.length > e; e += 1) {
      this.defineEvent(t[e]);
    }

    return this;
  }, o.removeListener = function (t, i) {
    var o,
        n,
        r = this.getListenersAsObject(t);

    for (n in r) {
      r.hasOwnProperty(n) && (o = e(r[n], i), -1 !== o && r[n].splice(o, 1));
    }

    return this;
  }, o.off = i("removeListener"), o.addListeners = function (t, e) {
    return this.manipulateListeners(!1, t, e);
  }, o.removeListeners = function (t, e) {
    return this.manipulateListeners(!0, t, e);
  }, o.manipulateListeners = function (t, e, i) {
    var o,
        n,
        r = t ? this.removeListener : this.addListener,
        s = t ? this.removeListeners : this.addListeners;
    if ("object" != _typeof(e) || e instanceof RegExp) for (o = i.length; o--;) {
      r.call(this, e, i[o]);
    } else for (o in e) {
      e.hasOwnProperty(o) && (n = e[o]) && ("function" == typeof n ? r.call(this, o, n) : s.call(this, o, n));
    }
    return this;
  }, o.removeEvent = function (t) {
    var e,
        i = _typeof(t),
        o = this._getEvents();

    if ("string" === i) delete o[t];else if (t instanceof RegExp) for (e in o) {
      o.hasOwnProperty(e) && t.test(e) && delete o[e];
    } else delete this._events;
    return this;
  }, o.removeAllListeners = i("removeEvent"), o.emitEvent = function (t, e) {
    var i,
        o,
        n,
        r,
        s = this.getListenersAsObject(t);

    for (n in s) {
      if (s.hasOwnProperty(n)) for (o = s[n].length; o--;) {
        i = s[n][o], i.once === !0 && this.removeListener(t, i.listener), r = i.listener.apply(this, e || []), r === this._getOnceReturnValue() && this.removeListener(t, i.listener);
      }
    }

    return this;
  }, o.trigger = i("emitEvent"), o.emit = function (t) {
    var e = Array.prototype.slice.call(arguments, 1);
    return this.emitEvent(t, e);
  }, o.setOnceReturnValue = function (t) {
    return this._onceReturnValue = t, this;
  }, o._getOnceReturnValue = function () {
    return this.hasOwnProperty("_onceReturnValue") ? this._onceReturnValue : !0;
  }, o._getEvents = function () {
    return this._events || (this._events = {});
  }, t.noConflict = function () {
    return n.EventEmitter = r, t;
  }, "function" == typeof define && define.amd ? define("eventEmitter/EventEmitter", [], function () {
    return t;
  }) : "object" == (typeof module === "undefined" ? "undefined" : _typeof(module)) && module.exports ? module.exports = t : n.EventEmitter = t;
}.call(void 0), function (t) {
  function e(t) {
    if (t) {
      if ("string" == typeof o[t]) return t;
      t = t.charAt(0).toUpperCase() + t.slice(1);

      for (var e, n = 0, r = i.length; r > n; n++) {
        if (e = i[n] + t, "string" == typeof o[e]) return e;
      }
    }
  }

  var i = "Webkit Moz ms Ms O".split(" "),
      o = document.documentElement.style;
  "function" == typeof define && define.amd ? define("get-style-property/get-style-property", [], function () {
    return e;
  }) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? module.exports = e : t.getStyleProperty = e;
}(window), function (t) {
  function e(t) {
    var e = parseFloat(t),
        i = -1 === t.indexOf("%") && !isNaN(e);
    return i && e;
  }

  function i() {}

  function o() {
    for (var t = {
      width: 0,
      height: 0,
      innerWidth: 0,
      innerHeight: 0,
      outerWidth: 0,
      outerHeight: 0
    }, e = 0, i = s.length; i > e; e++) {
      var o = s[e];
      t[o] = 0;
    }

    return t;
  }

  function n(i) {
    function n() {
      if (!d) {
        d = !0;
        var o = t.getComputedStyle;

        if (p = function () {
          var t = o ? function (t) {
            return o(t, null);
          } : function (t) {
            return t.currentStyle;
          };
          return function (e) {
            var i = t(e);
            return i || r("Style returned " + i + ". Are you running this code in a hidden iframe on Firefox? " + "See http://bit.ly/getsizebug1"), i;
          };
        }(), h = i("boxSizing")) {
          var n = document.createElement("div");
          n.style.width = "200px", n.style.padding = "1px 2px 3px 4px", n.style.borderStyle = "solid", n.style.borderWidth = "1px 2px 3px 4px", n.style[h] = "border-box";
          var s = document.body || document.documentElement;
          s.appendChild(n);
          var a = p(n);
          f = 200 === e(a.width), s.removeChild(n);
        }
      }
    }

    function a(t) {
      if (n(), "string" == typeof t && (t = document.querySelector(t)), t && "object" == _typeof(t) && t.nodeType) {
        var i = p(t);
        if ("none" === i.display) return o();
        var r = {};
        r.width = t.offsetWidth, r.height = t.offsetHeight;

        for (var a = r.isBorderBox = !(!h || !i[h] || "border-box" !== i[h]), d = 0, l = s.length; l > d; d++) {
          var c = s[d],
              y = i[c];
          y = u(t, y);
          var m = parseFloat(y);
          r[c] = isNaN(m) ? 0 : m;
        }

        var g = r.paddingLeft + r.paddingRight,
            v = r.paddingTop + r.paddingBottom,
            _ = r.marginLeft + r.marginRight,
            I = r.marginTop + r.marginBottom,
            L = r.borderLeftWidth + r.borderRightWidth,
            z = r.borderTopWidth + r.borderBottomWidth,
            b = a && f,
            x = e(i.width);

        x !== !1 && (r.width = x + (b ? 0 : g + L));
        var S = e(i.height);
        return S !== !1 && (r.height = S + (b ? 0 : v + z)), r.innerWidth = r.width - (g + L), r.innerHeight = r.height - (v + z), r.outerWidth = r.width + _, r.outerHeight = r.height + I, r;
      }
    }

    function u(e, i) {
      if (t.getComputedStyle || -1 === i.indexOf("%")) return i;
      var o = e.style,
          n = o.left,
          r = e.runtimeStyle,
          s = r && r.left;
      return s && (r.left = e.currentStyle.left), o.left = i, i = o.pixelLeft, o.left = n, s && (r.left = s), i;
    }

    var p,
        h,
        f,
        d = !1;
    return a;
  }

  var r = "undefined" == typeof console ? i : function (t) {
    console.error(t);
  },
      s = ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "marginLeft", "marginRight", "marginTop", "marginBottom", "borderLeftWidth", "borderRightWidth", "borderTopWidth", "borderBottomWidth"];
  "function" == typeof define && define.amd ? define("get-size/get-size", ["get-style-property/get-style-property"], n) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? module.exports = n(require("desandro-get-style-property")) : t.getSize = n(t.getStyleProperty);
}(window), function (t) {
  function e(t, e) {
    return t[s](e);
  }

  function i(t) {
    if (!t.parentNode) {
      var e = document.createDocumentFragment();
      e.appendChild(t);
    }
  }

  function o(t, e) {
    i(t);

    for (var o = t.parentNode.querySelectorAll(e), n = 0, r = o.length; r > n; n++) {
      if (o[n] === t) return !0;
    }

    return !1;
  }

  function n(t, o) {
    return i(t), e(t, o);
  }

  var r,
      s = function () {
    if (t.matchesSelector) return "matchesSelector";

    for (var e = ["webkit", "moz", "ms", "o"], i = 0, o = e.length; o > i; i++) {
      var n = e[i],
          r = n + "MatchesSelector";
      if (t[r]) return r;
    }
  }();

  if (s) {
    var a = document.createElement("div"),
        u = e(a, "div");
    r = u ? e : n;
  } else r = o;

  "function" == typeof define && define.amd ? define("matches-selector/matches-selector", [], function () {
    return r;
  }) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? module.exports = r : window.matchesSelector = r;
}(Element.prototype), function (t) {
  function e(t, e) {
    for (var i in e) {
      t[i] = e[i];
    }

    return t;
  }

  function i(t) {
    for (var e in t) {
      return !1;
    }

    return e = null, !0;
  }

  function o(t) {
    return t.replace(/([A-Z])/g, function (t) {
      return "-" + t.toLowerCase();
    });
  }

  function n(t, n, r) {
    function a(t, e) {
      t && (this.element = t, this.layout = e, this.position = {
        x: 0,
        y: 0
      }, this._create());
    }

    var u = r("transition"),
        p = r("transform"),
        h = u && p,
        f = !!r("perspective"),
        d = {
      WebkitTransition: "webkitTransitionEnd",
      MozTransition: "transitionend",
      OTransition: "otransitionend",
      transition: "transitionend"
    }[u],
        l = ["transform", "transition", "transitionDuration", "transitionProperty"],
        c = function () {
      for (var t = {}, e = 0, i = l.length; i > e; e++) {
        var o = l[e],
            n = r(o);
        n && n !== o && (t[o] = n);
      }

      return t;
    }();

    e(a.prototype, t.prototype), a.prototype._create = function () {
      this._transn = {
        ingProperties: {},
        clean: {},
        onEnd: {}
      }, this.css({
        position: "absolute"
      });
    }, a.prototype.handleEvent = function (t) {
      var e = "on" + t.type;
      this[e] && this[e](t);
    }, a.prototype.getSize = function () {
      this.size = n(this.element);
    }, a.prototype.css = function (t) {
      var e = this.element.style;

      for (var i in t) {
        var o = c[i] || i;
        e[o] = t[i];
      }
    }, a.prototype.getPosition = function () {
      var t = s(this.element),
          e = this.layout.options,
          i = e.isOriginLeft,
          o = e.isOriginTop,
          n = parseInt(t[i ? "left" : "right"], 10),
          r = parseInt(t[o ? "top" : "bottom"], 10);
      n = isNaN(n) ? 0 : n, r = isNaN(r) ? 0 : r;
      var a = this.layout.size;
      n -= i ? a.paddingLeft : a.paddingRight, r -= o ? a.paddingTop : a.paddingBottom, this.position.x = n, this.position.y = r;
    }, a.prototype.layoutPosition = function () {
      var t = this.layout.size,
          e = this.layout.options,
          i = {};
      e.isOriginLeft ? (i.left = this.position.x + t.paddingLeft + "px", i.right = "") : (i.right = this.position.x + t.paddingRight + "px", i.left = ""), e.isOriginTop ? (i.top = this.position.y + t.paddingTop + "px", i.bottom = "") : (i.bottom = this.position.y + t.paddingBottom + "px", i.top = ""), this.css(i), this.emitEvent("layout", [this]);
    };
    var y = f ? function (t, e) {
      return "translate3d(" + t + "px, " + e + "px, 0)";
    } : function (t, e) {
      return "translate(" + t + "px, " + e + "px)";
    };
    a.prototype._transitionTo = function (t, e) {
      this.getPosition();
      var i = this.position.x,
          o = this.position.y,
          n = parseInt(t, 10),
          r = parseInt(e, 10),
          s = n === this.position.x && r === this.position.y;
      if (this.setPosition(t, e), s && !this.isTransitioning) return this.layoutPosition(), void 0;
      var a = t - i,
          u = e - o,
          p = {},
          h = this.layout.options;
      a = h.isOriginLeft ? a : -a, u = h.isOriginTop ? u : -u, p.transform = y(a, u), this.transition({
        to: p,
        onTransitionEnd: {
          transform: this.layoutPosition
        },
        isCleaning: !0
      });
    }, a.prototype.goTo = function (t, e) {
      this.setPosition(t, e), this.layoutPosition();
    }, a.prototype.moveTo = h ? a.prototype._transitionTo : a.prototype.goTo, a.prototype.setPosition = function (t, e) {
      this.position.x = parseInt(t, 10), this.position.y = parseInt(e, 10);
    }, a.prototype._nonTransition = function (t) {
      this.css(t.to), t.isCleaning && this._removeStyles(t.to);

      for (var e in t.onTransitionEnd) {
        t.onTransitionEnd[e].call(this);
      }
    }, a.prototype._transition = function (t) {
      if (!parseFloat(this.layout.options.transitionDuration)) return this._nonTransition(t), void 0;
      var e = this._transn;

      for (var i in t.onTransitionEnd) {
        e.onEnd[i] = t.onTransitionEnd[i];
      }

      for (i in t.to) {
        e.ingProperties[i] = !0, t.isCleaning && (e.clean[i] = !0);
      }

      if (t.from) {
        this.css(t.from);
        var o = this.element.offsetHeight;
        o = null;
      }

      this.enableTransition(t.to), this.css(t.to), this.isTransitioning = !0;
    };
    var m = p && o(p) + ",opacity";
    a.prototype.enableTransition = function () {
      this.isTransitioning || (this.css({
        transitionProperty: m,
        transitionDuration: this.layout.options.transitionDuration
      }), this.element.addEventListener(d, this, !1));
    }, a.prototype.transition = a.prototype[u ? "_transition" : "_nonTransition"], a.prototype.onwebkitTransitionEnd = function (t) {
      this.ontransitionend(t);
    }, a.prototype.onotransitionend = function (t) {
      this.ontransitionend(t);
    };
    var g = {
      "-webkit-transform": "transform",
      "-moz-transform": "transform",
      "-o-transform": "transform"
    };
    a.prototype.ontransitionend = function (t) {
      if (t.target === this.element) {
        var e = this._transn,
            o = g[t.propertyName] || t.propertyName;

        if (delete e.ingProperties[o], i(e.ingProperties) && this.disableTransition(), o in e.clean && (this.element.style[t.propertyName] = "", delete e.clean[o]), o in e.onEnd) {
          var n = e.onEnd[o];
          n.call(this), delete e.onEnd[o];
        }

        this.emitEvent("transitionEnd", [this]);
      }
    }, a.prototype.disableTransition = function () {
      this.removeTransitionStyles(), this.element.removeEventListener(d, this, !1), this.isTransitioning = !1;
    }, a.prototype._removeStyles = function (t) {
      var e = {};

      for (var i in t) {
        e[i] = "";
      }

      this.css(e);
    };
    var v = {
      transitionProperty: "",
      transitionDuration: ""
    };
    return a.prototype.removeTransitionStyles = function () {
      this.css(v);
    }, a.prototype.removeElem = function () {
      this.element.parentNode.removeChild(this.element), this.emitEvent("remove", [this]);
    }, a.prototype.remove = function () {
      if (!u || !parseFloat(this.layout.options.transitionDuration)) return this.removeElem(), void 0;
      var t = this;
      this.on("transitionEnd", function () {
        return t.removeElem(), !0;
      }), this.hide();
    }, a.prototype.reveal = function () {
      delete this.isHidden, this.css({
        display: ""
      });
      var t = this.layout.options;
      this.transition({
        from: t.hiddenStyle,
        to: t.visibleStyle,
        isCleaning: !0
      });
    }, a.prototype.hide = function () {
      this.isHidden = !0, this.css({
        display: ""
      });
      var t = this.layout.options;
      this.transition({
        from: t.visibleStyle,
        to: t.hiddenStyle,
        isCleaning: !0,
        onTransitionEnd: {
          opacity: function opacity() {
            this.isHidden && this.css({
              display: "none"
            });
          }
        }
      });
    }, a.prototype.destroy = function () {
      this.css({
        position: "",
        left: "",
        right: "",
        top: "",
        bottom: "",
        transition: "",
        transform: ""
      });
    }, a;
  }

  var r = t.getComputedStyle,
      s = r ? function (t) {
    return r(t, null);
  } : function (t) {
    return t.currentStyle;
  };
  "function" == typeof define && define.amd ? define("outlayer/item", ["eventEmitter/EventEmitter", "get-size/get-size", "get-style-property/get-style-property"], n) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? module.exports = n(require("wolfy87-eventemitter"), require("get-size"), require("desandro-get-style-property")) : (t.Outlayer = {}, t.Outlayer.Item = n(t.EventEmitter, t.getSize, t.getStyleProperty));
}(window), function (t) {
  function e(t, e) {
    for (var i in e) {
      t[i] = e[i];
    }

    return t;
  }

  function i(t) {
    return "[object Array]" === f.call(t);
  }

  function o(t) {
    var e = [];
    if (i(t)) e = t;else if (t && "number" == typeof t.length) for (var o = 0, n = t.length; n > o; o++) {
      e.push(t[o]);
    } else e.push(t);
    return e;
  }

  function n(t, e) {
    var i = l(e, t);
    -1 !== i && e.splice(i, 1);
  }

  function r(t) {
    return t.replace(/(.)([A-Z])/g, function (t, e, i) {
      return e + "-" + i;
    }).toLowerCase();
  }

  function s(i, s, f, l, c, y) {
    function m(t, i) {
      if ("string" == typeof t && (t = a.querySelector(t)), !t || !d(t)) return u && u.error("Bad " + this.constructor.namespace + " element: " + t), void 0;
      this.element = t, this.options = e({}, this.constructor.defaults), this.option(i);
      var o = ++g;
      this.element.outlayerGUID = o, v[o] = this, this._create(), this.options.isInitLayout && this.layout();
    }

    var g = 0,
        v = {};
    return m.namespace = "outlayer", m.Item = y, m.defaults = {
      containerStyle: {
        position: "relative"
      },
      isInitLayout: !0,
      isOriginLeft: !0,
      isOriginTop: !0,
      isResizeBound: !0,
      isResizingContainer: !0,
      transitionDuration: "0.4s",
      hiddenStyle: {
        opacity: 0,
        transform: "scale(0.001)"
      },
      visibleStyle: {
        opacity: 1,
        transform: "scale(1)"
      }
    }, e(m.prototype, f.prototype), m.prototype.option = function (t) {
      e(this.options, t);
    }, m.prototype._create = function () {
      this.reloadItems(), this.stamps = [], this.stamp(this.options.stamp), e(this.element.style, this.options.containerStyle), this.options.isResizeBound && this.bindResize();
    }, m.prototype.reloadItems = function () {
      this.items = this._itemize(this.element.children);
    }, m.prototype._itemize = function (t) {
      for (var e = this._filterFindItemElements(t), i = this.constructor.Item, o = [], n = 0, r = e.length; r > n; n++) {
        var s = e[n],
            a = new i(s, this);
        o.push(a);
      }

      return o;
    }, m.prototype._filterFindItemElements = function (t) {
      t = o(t);

      for (var e = this.options.itemSelector, i = [], n = 0, r = t.length; r > n; n++) {
        var s = t[n];
        if (d(s)) if (e) {
          c(s, e) && i.push(s);

          for (var a = s.querySelectorAll(e), u = 0, p = a.length; p > u; u++) {
            i.push(a[u]);
          }
        } else i.push(s);
      }

      return i;
    }, m.prototype.getItemElements = function () {
      for (var t = [], e = 0, i = this.items.length; i > e; e++) {
        t.push(this.items[e].element);
      }

      return t;
    }, m.prototype.layout = function () {
      this._resetLayout(), this._manageStamps();
      var t = void 0 !== this.options.isLayoutInstant ? this.options.isLayoutInstant : !this._isLayoutInited;
      this.layoutItems(this.items, t), this._isLayoutInited = !0;
    }, m.prototype._init = m.prototype.layout, m.prototype._resetLayout = function () {
      this.getSize();
    }, m.prototype.getSize = function () {
      this.size = l(this.element);
    }, m.prototype._getMeasurement = function (t, e) {
      var i,
          o = this.options[t];
      o ? ("string" == typeof o ? i = this.element.querySelector(o) : d(o) && (i = o), this[t] = i ? l(i)[e] : o) : this[t] = 0;
    }, m.prototype.layoutItems = function (t, e) {
      t = this._getItemsForLayout(t), this._layoutItems(t, e), this._postLayout();
    }, m.prototype._getItemsForLayout = function (t) {
      for (var e = [], i = 0, o = t.length; o > i; i++) {
        var n = t[i];
        n.isIgnored || e.push(n);
      }

      return e;
    }, m.prototype._layoutItems = function (t, e) {
      function i() {
        o.emitEvent("layoutComplete", [o, t]);
      }

      var o = this;
      if (!t || !t.length) return i(), void 0;

      this._itemsOn(t, "layout", i);

      for (var n = [], r = 0, s = t.length; s > r; r++) {
        var a = t[r],
            u = this._getItemLayoutPosition(a);

        u.item = a, u.isInstant = e || a.isLayoutInstant, n.push(u);
      }

      this._processLayoutQueue(n);
    }, m.prototype._getItemLayoutPosition = function () {
      return {
        x: 0,
        y: 0
      };
    }, m.prototype._processLayoutQueue = function (t) {
      for (var e = 0, i = t.length; i > e; e++) {
        var o = t[e];

        this._positionItem(o.item, o.x, o.y, o.isInstant);
      }
    }, m.prototype._positionItem = function (t, e, i, o) {
      o ? t.goTo(e, i) : t.moveTo(e, i);
    }, m.prototype._postLayout = function () {
      this.resizeContainer();
    }, m.prototype.resizeContainer = function () {
      if (this.options.isResizingContainer) {
        var t = this._getContainerSize();

        t && (this._setContainerMeasure(t.width, !0), this._setContainerMeasure(t.height, !1));
      }
    }, m.prototype._getContainerSize = h, m.prototype._setContainerMeasure = function (t, e) {
      if (void 0 !== t) {
        var i = this.size;
        i.isBorderBox && (t += e ? i.paddingLeft + i.paddingRight + i.borderLeftWidth + i.borderRightWidth : i.paddingBottom + i.paddingTop + i.borderTopWidth + i.borderBottomWidth), t = Math.max(t, 0), this.element.style[e ? "width" : "height"] = t + "px";
      }
    }, m.prototype._itemsOn = function (t, e, i) {
      function o() {
        return n++, n === r && i.call(s), !0;
      }

      for (var n = 0, r = t.length, s = this, a = 0, u = t.length; u > a; a++) {
        var p = t[a];
        p.on(e, o);
      }
    }, m.prototype.ignore = function (t) {
      var e = this.getItem(t);
      e && (e.isIgnored = !0);
    }, m.prototype.unignore = function (t) {
      var e = this.getItem(t);
      e && delete e.isIgnored;
    }, m.prototype.stamp = function (t) {
      if (t = this._find(t)) {
        this.stamps = this.stamps.concat(t);

        for (var e = 0, i = t.length; i > e; e++) {
          var o = t[e];
          this.ignore(o);
        }
      }
    }, m.prototype.unstamp = function (t) {
      if (t = this._find(t)) for (var e = 0, i = t.length; i > e; e++) {
        var o = t[e];
        n(o, this.stamps), this.unignore(o);
      }
    }, m.prototype._find = function (t) {
      return t ? ("string" == typeof t && (t = this.element.querySelectorAll(t)), t = o(t)) : void 0;
    }, m.prototype._manageStamps = function () {
      if (this.stamps && this.stamps.length) {
        this._getBoundingRect();

        for (var t = 0, e = this.stamps.length; e > t; t++) {
          var i = this.stamps[t];

          this._manageStamp(i);
        }
      }
    }, m.prototype._getBoundingRect = function () {
      var t = this.element.getBoundingClientRect(),
          e = this.size;
      this._boundingRect = {
        left: t.left + e.paddingLeft + e.borderLeftWidth,
        top: t.top + e.paddingTop + e.borderTopWidth,
        right: t.right - (e.paddingRight + e.borderRightWidth),
        bottom: t.bottom - (e.paddingBottom + e.borderBottomWidth)
      };
    }, m.prototype._manageStamp = h, m.prototype._getElementOffset = function (t) {
      var e = t.getBoundingClientRect(),
          i = this._boundingRect,
          o = l(t),
          n = {
        left: e.left - i.left - o.marginLeft,
        top: e.top - i.top - o.marginTop,
        right: i.right - e.right - o.marginRight,
        bottom: i.bottom - e.bottom - o.marginBottom
      };
      return n;
    }, m.prototype.handleEvent = function (t) {
      var e = "on" + t.type;
      this[e] && this[e](t);
    }, m.prototype.bindResize = function () {
      this.isResizeBound || (i.bind(t, "resize", this), this.isResizeBound = !0);
    }, m.prototype.unbindResize = function () {
      this.isResizeBound && i.unbind(t, "resize", this), this.isResizeBound = !1;
    }, m.prototype.onresize = function () {
      function t() {
        e.resize(), delete e.resizeTimeout;
      }

      this.resizeTimeout && clearTimeout(this.resizeTimeout);
      var e = this;
      this.resizeTimeout = setTimeout(t, 100);
    }, m.prototype.resize = function () {
      this.isResizeBound && this.needsResizeLayout() && this.layout();
    }, m.prototype.needsResizeLayout = function () {
      var t = l(this.element),
          e = this.size && t;
      return e && t.innerWidth !== this.size.innerWidth;
    }, m.prototype.addItems = function (t) {
      var e = this._itemize(t);

      return e.length && (this.items = this.items.concat(e)), e;
    }, m.prototype.appended = function (t) {
      var e = this.addItems(t);
      e.length && (this.layoutItems(e, !0), this.reveal(e));
    }, m.prototype.prepended = function (t) {
      var e = this._itemize(t);

      if (e.length) {
        var i = this.items.slice(0);
        this.items = e.concat(i), this._resetLayout(), this._manageStamps(), this.layoutItems(e, !0), this.reveal(e), this.layoutItems(i);
      }
    }, m.prototype.reveal = function (t) {
      var e = t && t.length;
      if (e) for (var i = 0; e > i; i++) {
        var o = t[i];
        o.reveal();
      }
    }, m.prototype.hide = function (t) {
      var e = t && t.length;
      if (e) for (var i = 0; e > i; i++) {
        var o = t[i];
        o.hide();
      }
    }, m.prototype.getItem = function (t) {
      for (var e = 0, i = this.items.length; i > e; e++) {
        var o = this.items[e];
        if (o.element === t) return o;
      }
    }, m.prototype.getItems = function (t) {
      if (t && t.length) {
        for (var e = [], i = 0, o = t.length; o > i; i++) {
          var n = t[i],
              r = this.getItem(n);
          r && e.push(r);
        }

        return e;
      }
    }, m.prototype.remove = function (t) {
      t = o(t);
      var e = this.getItems(t);

      if (e && e.length) {
        this._itemsOn(e, "remove", function () {
          this.emitEvent("removeComplete", [this, e]);
        });

        for (var i = 0, r = e.length; r > i; i++) {
          var s = e[i];
          s.remove(), n(s, this.items);
        }
      }
    }, m.prototype.destroy = function () {
      var t = this.element.style;
      t.height = "", t.position = "", t.width = "";

      for (var e = 0, i = this.items.length; i > e; e++) {
        var o = this.items[e];
        o.destroy();
      }

      this.unbindResize();
      var n = this.element.outlayerGUID;
      delete v[n], delete this.element.outlayerGUID, p && p.removeData(this.element, this.constructor.namespace);
    }, m.data = function (t) {
      var e = t && t.outlayerGUID;
      return e && v[e];
    }, m.create = function (t, i) {
      function o() {
        m.apply(this, arguments);
      }

      return Object.create ? o.prototype = Object.create(m.prototype) : e(o.prototype, m.prototype), o.prototype.constructor = o, o.defaults = e({}, m.defaults), e(o.defaults, i), o.prototype.settings = {}, o.namespace = t, o.data = m.data, o.Item = function () {
        y.apply(this, arguments);
      }, o.Item.prototype = new y(), s(function () {
        for (var e = r(t), i = a.querySelectorAll(".js-" + e), n = "data-" + e + "-options", s = 0, h = i.length; h > s; s++) {
          var f,
              d = i[s],
              l = d.getAttribute(n);

          try {
            f = l && JSON.parse(l);
          } catch (c) {
            u && u.error("Error parsing " + n + " on " + d.nodeName.toLowerCase() + (d.id ? "#" + d.id : "") + ": " + c);
            continue;
          }

          var y = new o(d, f);
          p && p.data(d, t, y);
        }
      }), p && p.bridget && p.bridget(t, o), o;
    }, m.Item = y, m;
  }

  var a = t.document,
      u = t.console,
      p = t.jQuery,
      h = function h() {},
      f = Object.prototype.toString,
      d = "function" == typeof HTMLElement || "object" == (typeof HTMLElement === "undefined" ? "undefined" : _typeof(HTMLElement)) ? function (t) {
    return t instanceof HTMLElement;
  } : function (t) {
    return t && "object" == _typeof(t) && 1 === t.nodeType && "string" == typeof t.nodeName;
  },
      l = Array.prototype.indexOf ? function (t, e) {
    return t.indexOf(e);
  } : function (t, e) {
    for (var i = 0, o = t.length; o > i; i++) {
      if (t[i] === e) return i;
    }

    return -1;
  };

  "function" == typeof define && define.amd ? define("outlayer/outlayer", ["eventie/eventie", "doc-ready/doc-ready", "eventEmitter/EventEmitter", "get-size/get-size", "matches-selector/matches-selector", "./item"], s) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? module.exports = s(require("eventie"), require("doc-ready"), require("wolfy87-eventemitter"), require("get-size"), require("desandro-matches-selector"), require("./item")) : t.Outlayer = s(t.eventie, t.docReady, t.EventEmitter, t.getSize, t.matchesSelector, t.Outlayer.Item);
}(window), function (t) {
  function e(t) {
    function e() {
      t.Item.apply(this, arguments);
    }

    e.prototype = new t.Item(), e.prototype._create = function () {
      this.id = this.layout.itemGUID++, t.Item.prototype._create.call(this), this.sortData = {};
    }, e.prototype.updateSortData = function () {
      if (!this.isIgnored) {
        this.sortData.id = this.id, this.sortData["original-order"] = this.id, this.sortData.random = Math.random();
        var t = this.layout.options.getSortData,
            e = this.layout._sorters;

        for (var i in t) {
          var o = e[i];
          this.sortData[i] = o(this.element, this);
        }
      }
    };
    var i = e.prototype.destroy;
    return e.prototype.destroy = function () {
      i.apply(this, arguments), this.css({
        display: ""
      });
    }, e;
  }

  "function" == typeof define && define.amd ? define("isotope/js/item", ["outlayer/outlayer"], e) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? module.exports = e(require("outlayer")) : (t.Isotope = t.Isotope || {}, t.Isotope.Item = e(t.Outlayer));
}(window), function (t) {
  function e(t, e) {
    function i(t) {
      this.isotope = t, t && (this.options = t.options[this.namespace], this.element = t.element, this.items = t.filteredItems, this.size = t.size);
    }

    return function () {
      function t(t) {
        return function () {
          return e.prototype[t].apply(this.isotope, arguments);
        };
      }

      for (var o = ["_resetLayout", "_getItemLayoutPosition", "_manageStamp", "_getContainerSize", "_getElementOffset", "needsResizeLayout"], n = 0, r = o.length; r > n; n++) {
        var s = o[n];
        i.prototype[s] = t(s);
      }
    }(), i.prototype.needsVerticalResizeLayout = function () {
      var e = t(this.isotope.element),
          i = this.isotope.size && e;
      return i && e.innerHeight !== this.isotope.size.innerHeight;
    }, i.prototype._getMeasurement = function () {
      this.isotope._getMeasurement.apply(this, arguments);
    }, i.prototype.getColumnWidth = function () {
      this.getSegmentSize("column", "Width");
    }, i.prototype.getRowHeight = function () {
      this.getSegmentSize("row", "Height");
    }, i.prototype.getSegmentSize = function (t, e) {
      var i = t + e,
          o = "outer" + e;

      if (this._getMeasurement(i, o), !this[i]) {
        var n = this.getFirstItemSize();
        this[i] = n && n[o] || this.isotope.size["inner" + e];
      }
    }, i.prototype.getFirstItemSize = function () {
      var e = this.isotope.filteredItems[0];
      return e && e.element && t(e.element);
    }, i.prototype.layout = function () {
      this.isotope.layout.apply(this.isotope, arguments);
    }, i.prototype.getSize = function () {
      this.isotope.getSize(), this.size = this.isotope.size;
    }, i.modes = {}, i.create = function (t, e) {
      function o() {
        i.apply(this, arguments);
      }

      return o.prototype = new i(), e && (o.options = e), o.prototype.namespace = t, i.modes[t] = o, o;
    }, i;
  }

  "function" == typeof define && define.amd ? define("isotope/js/layout-mode", ["get-size/get-size", "outlayer/outlayer"], e) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? module.exports = e(require("get-size"), require("outlayer")) : (t.Isotope = t.Isotope || {}, t.Isotope.LayoutMode = e(t.getSize, t.Outlayer));
}(window), function (t) {
  function e(t, e) {
    var o = t.create("masonry");
    return o.prototype._resetLayout = function () {
      this.getSize(), this._getMeasurement("columnWidth", "outerWidth"), this._getMeasurement("gutter", "outerWidth"), this.measureColumns();
      var t = this.cols;

      for (this.colYs = []; t--;) {
        this.colYs.push(0);
      }

      this.maxY = 0;
    }, o.prototype.measureColumns = function () {
      if (this.getContainerWidth(), !this.columnWidth) {
        var t = this.items[0],
            i = t && t.element;
        this.columnWidth = i && e(i).outerWidth || this.containerWidth;
      }

      this.columnWidth += this.gutter, this.cols = Math.floor((this.containerWidth + this.gutter) / this.columnWidth), this.cols = Math.max(this.cols, 1);
    }, o.prototype.getContainerWidth = function () {
      var t = this.options.isFitWidth ? this.element.parentNode : this.element,
          i = e(t);
      this.containerWidth = i && i.innerWidth;
    }, o.prototype._getItemLayoutPosition = function (t) {
      t.getSize();
      var e = t.size.outerWidth % this.columnWidth,
          o = e && 1 > e ? "round" : "ceil",
          n = Math[o](t.size.outerWidth / this.columnWidth);
      n = Math.min(n, this.cols);

      for (var r = this._getColGroup(n), s = Math.min.apply(Math, r), a = i(r, s), u = {
        x: this.columnWidth * a,
        y: s
      }, p = s + t.size.outerHeight, h = this.cols + 1 - r.length, f = 0; h > f; f++) {
        this.colYs[a + f] = p;
      }

      return u;
    }, o.prototype._getColGroup = function (t) {
      if (2 > t) return this.colYs;

      for (var e = [], i = this.cols + 1 - t, o = 0; i > o; o++) {
        var n = this.colYs.slice(o, o + t);
        e[o] = Math.max.apply(Math, n);
      }

      return e;
    }, o.prototype._manageStamp = function (t) {
      var i = e(t),
          o = this._getElementOffset(t),
          n = this.options.isOriginLeft ? o.left : o.right,
          r = n + i.outerWidth,
          s = Math.floor(n / this.columnWidth);

      s = Math.max(0, s);
      var a = Math.floor(r / this.columnWidth);
      a -= r % this.columnWidth ? 0 : 1, a = Math.min(this.cols - 1, a);

      for (var u = (this.options.isOriginTop ? o.top : o.bottom) + i.outerHeight, p = s; a >= p; p++) {
        this.colYs[p] = Math.max(u, this.colYs[p]);
      }
    }, o.prototype._getContainerSize = function () {
      this.maxY = Math.max.apply(Math, this.colYs);
      var t = {
        height: this.maxY
      };
      return this.options.isFitWidth && (t.width = this._getContainerFitWidth()), t;
    }, o.prototype._getContainerFitWidth = function () {
      for (var t = 0, e = this.cols; --e && 0 === this.colYs[e];) {
        t++;
      }

      return (this.cols - t) * this.columnWidth - this.gutter;
    }, o.prototype.needsResizeLayout = function () {
      var t = this.containerWidth;
      return this.getContainerWidth(), t !== this.containerWidth;
    }, o;
  }

  var i = Array.prototype.indexOf ? function (t, e) {
    return t.indexOf(e);
  } : function (t, e) {
    for (var i = 0, o = t.length; o > i; i++) {
      var n = t[i];
      if (n === e) return i;
    }

    return -1;
  };
  "function" == typeof define && define.amd ? define("masonry/masonry", ["outlayer/outlayer", "get-size/get-size"], e) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? module.exports = e(require("outlayer"), require("get-size")) : t.Masonry = e(t.Outlayer, t.getSize);
}(window), function (t) {
  function e(t, e) {
    for (var i in e) {
      t[i] = e[i];
    }

    return t;
  }

  function i(t, i) {
    var o = t.create("masonry"),
        n = o.prototype._getElementOffset,
        r = o.prototype.layout,
        s = o.prototype._getMeasurement;
    e(o.prototype, i.prototype), o.prototype._getElementOffset = n, o.prototype.layout = r, o.prototype._getMeasurement = s;
    var a = o.prototype.measureColumns;

    o.prototype.measureColumns = function () {
      this.items = this.isotope.filteredItems, a.call(this);
    };

    var u = o.prototype._manageStamp;
    return o.prototype._manageStamp = function () {
      this.options.isOriginLeft = this.isotope.options.isOriginLeft, this.options.isOriginTop = this.isotope.options.isOriginTop, u.apply(this, arguments);
    }, o;
  }

  "function" == typeof define && define.amd ? define("isotope/js/layout-modes/masonry", ["../layout-mode", "masonry/masonry"], i) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? module.exports = i(require("../layout-mode"), require("masonry-layout")) : i(t.Isotope.LayoutMode, t.Masonry);
}(window), function (t) {
  function e(t) {
    var e = t.create("fitRows");
    return e.prototype._resetLayout = function () {
      this.x = 0, this.y = 0, this.maxY = 0, this._getMeasurement("gutter", "outerWidth");
    }, e.prototype._getItemLayoutPosition = function (t) {
      t.getSize();
      var e = t.size.outerWidth + this.gutter,
          i = this.isotope.size.innerWidth + this.gutter;
      0 !== this.x && e + this.x > i && (this.x = 0, this.y = this.maxY);
      var o = {
        x: this.x,
        y: this.y
      };
      return this.maxY = Math.max(this.maxY, this.y + t.size.outerHeight), this.x += e, o;
    }, e.prototype._getContainerSize = function () {
      return {
        height: this.maxY
      };
    }, e;
  }

  "function" == typeof define && define.amd ? define("isotope/js/layout-modes/fit-rows", ["../layout-mode"], e) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? module.exports = e(require("../layout-mode")) : e(t.Isotope.LayoutMode);
}(window), function (t) {
  function e(t) {
    var e = t.create("vertical", {
      horizontalAlignment: 0
    });
    return e.prototype._resetLayout = function () {
      this.y = 0;
    }, e.prototype._getItemLayoutPosition = function (t) {
      t.getSize();
      var e = (this.isotope.size.innerWidth - t.size.outerWidth) * this.options.horizontalAlignment,
          i = this.y;
      return this.y += t.size.outerHeight, {
        x: e,
        y: i
      };
    }, e.prototype._getContainerSize = function () {
      return {
        height: this.y
      };
    }, e;
  }

  "function" == typeof define && define.amd ? define("isotope/js/layout-modes/vertical", ["../layout-mode"], e) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? module.exports = e(require("../layout-mode")) : e(t.Isotope.LayoutMode);
}(window), function (t) {
  function e(t, e) {
    for (var i in e) {
      t[i] = e[i];
    }

    return t;
  }

  function i(t) {
    return "[object Array]" === h.call(t);
  }

  function o(t) {
    var e = [];
    if (i(t)) e = t;else if (t && "number" == typeof t.length) for (var o = 0, n = t.length; n > o; o++) {
      e.push(t[o]);
    } else e.push(t);
    return e;
  }

  function n(t, e) {
    var i = f(e, t);
    -1 !== i && e.splice(i, 1);
  }

  function r(t, i, r, u, h) {
    function f(t, e) {
      return function (i, o) {
        for (var n = 0, r = t.length; r > n; n++) {
          var s = t[n],
              a = i.sortData[s],
              u = o.sortData[s];

          if (a > u || u > a) {
            var p = void 0 !== e[s] ? e[s] : e,
                h = p ? 1 : -1;
            return (a > u ? 1 : -1) * h;
          }
        }

        return 0;
      };
    }

    var d = t.create("isotope", {
      layoutMode: "masonry",
      isJQueryFiltering: !0,
      sortAscending: !0
    });
    d.Item = u, d.LayoutMode = h, d.prototype._create = function () {
      this.itemGUID = 0, this._sorters = {}, this._getSorters(), t.prototype._create.call(this), this.modes = {}, this.filteredItems = this.items, this.sortHistory = ["original-order"];

      for (var e in h.modes) {
        this._initLayoutMode(e);
      }
    }, d.prototype.reloadItems = function () {
      this.itemGUID = 0, t.prototype.reloadItems.call(this);
    }, d.prototype._itemize = function () {
      for (var e = t.prototype._itemize.apply(this, arguments), i = 0, o = e.length; o > i; i++) {
        var n = e[i];
        n.id = this.itemGUID++;
      }

      return this._updateItemsSortData(e), e;
    }, d.prototype._initLayoutMode = function (t) {
      var i = h.modes[t],
          o = this.options[t] || {};
      this.options[t] = i.options ? e(i.options, o) : o, this.modes[t] = new i(this);
    }, d.prototype.layout = function () {
      return !this._isLayoutInited && this.options.isInitLayout ? (this.arrange(), void 0) : (this._layout(), void 0);
    }, d.prototype._layout = function () {
      var t = this._getIsInstant();

      this._resetLayout(), this._manageStamps(), this.layoutItems(this.filteredItems, t), this._isLayoutInited = !0;
    }, d.prototype.arrange = function (t) {
      this.option(t), this._getIsInstant(), this.filteredItems = this._filter(this.items), this._sort(), this._layout();
    }, d.prototype._init = d.prototype.arrange, d.prototype._getIsInstant = function () {
      var t = void 0 !== this.options.isLayoutInstant ? this.options.isLayoutInstant : !this._isLayoutInited;
      return this._isInstant = t, t;
    }, d.prototype._filter = function (t) {
      function e() {
        f.reveal(n), f.hide(r);
      }

      var i = this.options.filter;
      i = i || "*";

      for (var o = [], n = [], r = [], s = this._getFilterTest(i), a = 0, u = t.length; u > a; a++) {
        var p = t[a];

        if (!p.isIgnored) {
          var h = s(p);
          h && o.push(p), h && p.isHidden ? n.push(p) : h || p.isHidden || r.push(p);
        }
      }

      var f = this;
      return this._isInstant ? this._noTransition(e) : e(), o;
    }, d.prototype._getFilterTest = function (t) {
      return s && this.options.isJQueryFiltering ? function (e) {
        return s(e.element).is(t);
      } : "function" == typeof t ? function (e) {
        return t(e.element);
      } : function (e) {
        return r(e.element, t);
      };
    }, d.prototype.updateSortData = function (t) {
      var e;
      t ? (t = o(t), e = this.getItems(t)) : e = this.items, this._getSorters(), this._updateItemsSortData(e);
    }, d.prototype._getSorters = function () {
      var t = this.options.getSortData;

      for (var e in t) {
        var i = t[e];
        this._sorters[e] = l(i);
      }
    }, d.prototype._updateItemsSortData = function (t) {
      for (var e = t && t.length, i = 0; e && e > i; i++) {
        var o = t[i];
        o.updateSortData();
      }
    };

    var l = function () {
      function t(t) {
        if ("string" != typeof t) return t;
        var i = a(t).split(" "),
            o = i[0],
            n = o.match(/^\[(.+)\]$/),
            r = n && n[1],
            s = e(r, o),
            u = d.sortDataParsers[i[1]];
        return t = u ? function (t) {
          return t && u(s(t));
        } : function (t) {
          return t && s(t);
        };
      }

      function e(t, e) {
        var i;
        return i = t ? function (e) {
          return e.getAttribute(t);
        } : function (t) {
          var i = t.querySelector(e);
          return i && p(i);
        };
      }

      return t;
    }();

    d.sortDataParsers = {
      parseInt: function (_parseInt) {
        function parseInt(_x) {
          return _parseInt.apply(this, arguments);
        }

        parseInt.toString = function () {
          return _parseInt.toString();
        };

        return parseInt;
      }(function (t) {
        return parseInt(t, 10);
      }),
      parseFloat: function (_parseFloat) {
        function parseFloat(_x2) {
          return _parseFloat.apply(this, arguments);
        }

        parseFloat.toString = function () {
          return _parseFloat.toString();
        };

        return parseFloat;
      }(function (t) {
        return parseFloat(t);
      })
    }, d.prototype._sort = function () {
      var t = this.options.sortBy;

      if (t) {
        var e = [].concat.apply(t, this.sortHistory),
            i = f(e, this.options.sortAscending);
        this.filteredItems.sort(i), t !== this.sortHistory[0] && this.sortHistory.unshift(t);
      }
    }, d.prototype._mode = function () {
      var t = this.options.layoutMode,
          e = this.modes[t];
      if (!e) throw Error("No layout mode: " + t);
      return e.options = this.options[t], e;
    }, d.prototype._resetLayout = function () {
      t.prototype._resetLayout.call(this), this._mode()._resetLayout();
    }, d.prototype._getItemLayoutPosition = function (t) {
      return this._mode()._getItemLayoutPosition(t);
    }, d.prototype._manageStamp = function (t) {
      this._mode()._manageStamp(t);
    }, d.prototype._getContainerSize = function () {
      return this._mode()._getContainerSize();
    }, d.prototype.needsResizeLayout = function () {
      return this._mode().needsResizeLayout();
    }, d.prototype.appended = function (t) {
      var e = this.addItems(t);

      if (e.length) {
        var i = this._filterRevealAdded(e);

        this.filteredItems = this.filteredItems.concat(i);
      }
    }, d.prototype.prepended = function (t) {
      var e = this._itemize(t);

      if (e.length) {
        var i = this.items.slice(0);
        this.items = e.concat(i), this._resetLayout(), this._manageStamps();

        var o = this._filterRevealAdded(e);

        this.layoutItems(i), this.filteredItems = o.concat(this.filteredItems);
      }
    }, d.prototype._filterRevealAdded = function (t) {
      var e = this._noTransition(function () {
        return this._filter(t);
      });

      return this.layoutItems(e, !0), this.reveal(e), t;
    }, d.prototype.insert = function (t) {
      var e = this.addItems(t);

      if (e.length) {
        var i,
            o,
            n = e.length;

        for (i = 0; n > i; i++) {
          o = e[i], this.element.appendChild(o.element);
        }

        var r = this._filter(e);

        for (this._noTransition(function () {
          this.hide(r);
        }), i = 0; n > i; i++) {
          e[i].isLayoutInstant = !0;
        }

        for (this.arrange(), i = 0; n > i; i++) {
          delete e[i].isLayoutInstant;
        }

        this.reveal(r);
      }
    };
    var c = d.prototype.remove;
    return d.prototype.remove = function (t) {
      t = o(t);
      var e = this.getItems(t);
      if (c.call(this, t), e && e.length) for (var i = 0, r = e.length; r > i; i++) {
        var s = e[i];
        n(s, this.filteredItems);
      }
    }, d.prototype.shuffle = function () {
      for (var t = 0, e = this.items.length; e > t; t++) {
        var i = this.items[t];
        i.sortData.random = Math.random();
      }

      this.options.sortBy = "random", this._sort(), this._layout();
    }, d.prototype._noTransition = function (t) {
      var e = this.options.transitionDuration;
      this.options.transitionDuration = 0;
      var i = t.call(this);
      return this.options.transitionDuration = e, i;
    }, d.prototype.getFilteredItemElements = function () {
      for (var t = [], e = 0, i = this.filteredItems.length; i > e; e++) {
        t.push(this.filteredItems[e].element);
      }

      return t;
    }, d;
  }

  var s = t.jQuery,
      a = String.prototype.trim ? function (t) {
    return t.trim();
  } : function (t) {
    return t.replace(/^\s+|\s+$/g, "");
  },
      u = document.documentElement,
      p = u.textContent ? function (t) {
    return t.textContent;
  } : function (t) {
    return t.innerText;
  },
      h = Object.prototype.toString,
      f = Array.prototype.indexOf ? function (t, e) {
    return t.indexOf(e);
  } : function (t, e) {
    for (var i = 0, o = t.length; o > i; i++) {
      if (t[i] === e) return i;
    }

    return -1;
  };
  "function" == typeof define && define.amd ? define(["outlayer/outlayer", "get-size/get-size", "matches-selector/matches-selector", "isotope/js/item", "isotope/js/layout-mode", "isotope/js/layout-modes/masonry", "isotope/js/layout-modes/fit-rows", "isotope/js/layout-modes/vertical"], r) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? module.exports = r(require("outlayer"), require("get-size"), require("desandro-matches-selector"), require("./item"), require("./layout-mode"), require("./layout-modes/masonry"), require("./layout-modes/fit-rows"), require("./layout-modes/vertical")) : t.Isotope = r(t.Outlayer, t.getSize, t.matchesSelector, t.Isotope.Item, t.Isotope.LayoutMode);
}(window);
"use strict";

/*
 * jQuery Easing v1.3 - http://gsgd.co.uk/sandbox/jquery/easing/
 *
 * Uses the built in easing capabilities added In jQuery 1.1
 * to offer multiple easing options
 *
 * TERMS OF USE - jQuery Easing
 * 
 * Open source under the BSD License. 
 * 
 * Copyright Â© 2008 George McGinley Smith
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, 
 * are permitted provided that the following conditions are met:
 * 
 * Redistributions of source code must retain the above copyright notice, this list of 
 * conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list 
 * of conditions and the following disclaimer in the documentation and/or other materials 
 * provided with the distribution.
 * 
 * Neither the name of the author nor the names of contributors may be used to endorse 
 * or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 *  COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 *  GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
 * OF THE POSSIBILITY OF SUCH DAMAGE. 
 *
*/
// t: current time, b: begInnIng value, c: change In value, d: duration
jQuery.easing['jswing'] = jQuery.easing['swing'];
jQuery.extend(jQuery.easing, {
  def: 'easeOutQuad',
  swing: function swing(x, t, b, c, d) {
    //alert(jQuery.easing.default);
    return jQuery.easing[jQuery.easing.def](x, t, b, c, d);
  },
  easeInQuad: function easeInQuad(x, t, b, c, d) {
    return c * (t /= d) * t + b;
  },
  easeOutQuad: function easeOutQuad(x, t, b, c, d) {
    return -c * (t /= d) * (t - 2) + b;
  },
  easeInOutQuad: function easeInOutQuad(x, t, b, c, d) {
    if ((t /= d / 2) < 1) return c / 2 * t * t + b;
    return -c / 2 * (--t * (t - 2) - 1) + b;
  },
  easeInCubic: function easeInCubic(x, t, b, c, d) {
    return c * (t /= d) * t * t + b;
  },
  easeOutCubic: function easeOutCubic(x, t, b, c, d) {
    return c * ((t = t / d - 1) * t * t + 1) + b;
  },
  easeInOutCubic: function easeInOutCubic(x, t, b, c, d) {
    if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
    return c / 2 * ((t -= 2) * t * t + 2) + b;
  },
  easeInQuart: function easeInQuart(x, t, b, c, d) {
    return c * (t /= d) * t * t * t + b;
  },
  easeOutQuart: function easeOutQuart(x, t, b, c, d) {
    return -c * ((t = t / d - 1) * t * t * t - 1) + b;
  },
  easeInOutQuart: function easeInOutQuart(x, t, b, c, d) {
    if ((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
    return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
  },
  easeInQuint: function easeInQuint(x, t, b, c, d) {
    return c * (t /= d) * t * t * t * t + b;
  },
  easeOutQuint: function easeOutQuint(x, t, b, c, d) {
    return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
  },
  easeInOutQuint: function easeInOutQuint(x, t, b, c, d) {
    if ((t /= d / 2) < 1) return c / 2 * t * t * t * t * t + b;
    return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
  },
  easeInSine: function easeInSine(x, t, b, c, d) {
    return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
  },
  easeOutSine: function easeOutSine(x, t, b, c, d) {
    return c * Math.sin(t / d * (Math.PI / 2)) + b;
  },
  easeInOutSine: function easeInOutSine(x, t, b, c, d) {
    return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
  },
  easeInExpo: function easeInExpo(x, t, b, c, d) {
    return t == 0 ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
  },
  easeOutExpo: function easeOutExpo(x, t, b, c, d) {
    return t == d ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
  },
  easeInOutExpo: function easeInOutExpo(x, t, b, c, d) {
    if (t == 0) return b;
    if (t == d) return b + c;
    if ((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
    return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
  },
  easeInCirc: function easeInCirc(x, t, b, c, d) {
    return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
  },
  easeOutCirc: function easeOutCirc(x, t, b, c, d) {
    return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
  },
  easeInOutCirc: function easeInOutCirc(x, t, b, c, d) {
    if ((t /= d / 2) < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
    return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
  },
  easeInElastic: function easeInElastic(x, t, b, c, d) {
    var s = 1.70158;
    var p = 0;
    var a = c;
    if (t == 0) return b;
    if ((t /= d) == 1) return b + c;
    if (!p) p = d * .3;

    if (a < Math.abs(c)) {
      a = c;
      var s = p / 4;
    } else var s = p / (2 * Math.PI) * Math.asin(c / a);

    return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
  },
  easeOutElastic: function easeOutElastic(x, t, b, c, d) {
    var s = 1.70158;
    var p = 0;
    var a = c;
    if (t == 0) return b;
    if ((t /= d) == 1) return b + c;
    if (!p) p = d * .3;

    if (a < Math.abs(c)) {
      a = c;
      var s = p / 4;
    } else var s = p / (2 * Math.PI) * Math.asin(c / a);

    return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
  },
  easeInOutElastic: function easeInOutElastic(x, t, b, c, d) {
    var s = 1.70158;
    var p = 0;
    var a = c;
    if (t == 0) return b;
    if ((t /= d / 2) == 2) return b + c;
    if (!p) p = d * (.3 * 1.5);

    if (a < Math.abs(c)) {
      a = c;
      var s = p / 4;
    } else var s = p / (2 * Math.PI) * Math.asin(c / a);

    if (t < 1) return -.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
    return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p) * .5 + c + b;
  },
  easeInBack: function easeInBack(x, t, b, c, d, s) {
    if (s == undefined) s = 1.70158;
    return c * (t /= d) * t * ((s + 1) * t - s) + b;
  },
  easeOutBack: function easeOutBack(x, t, b, c, d, s) {
    if (s == undefined) s = 1.70158;
    return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
  },
  easeInOutBack: function easeInOutBack(x, t, b, c, d, s) {
    if (s == undefined) s = 1.70158;
    if ((t /= d / 2) < 1) return c / 2 * (t * t * (((s *= 1.525) + 1) * t - s)) + b;
    return c / 2 * ((t -= 2) * t * (((s *= 1.525) + 1) * t + s) + 2) + b;
  },
  easeInBounce: function easeInBounce(x, t, b, c, d) {
    return c - jQuery.easing.easeOutBounce(x, d - t, 0, c, d) + b;
  },
  easeOutBounce: function easeOutBounce(x, t, b, c, d) {
    if ((t /= d) < 1 / 2.75) {
      return c * (7.5625 * t * t) + b;
    } else if (t < 2 / 2.75) {
      return c * (7.5625 * (t -= 1.5 / 2.75) * t + .75) + b;
    } else if (t < 2.5 / 2.75) {
      return c * (7.5625 * (t -= 2.25 / 2.75) * t + .9375) + b;
    } else {
      return c * (7.5625 * (t -= 2.625 / 2.75) * t + .984375) + b;
    }
  },
  easeInOutBounce: function easeInOutBounce(x, t, b, c, d) {
    if (t < d / 2) return jQuery.easing.easeInBounce(x, t * 2, 0, c, d) * .5 + b;
    return jQuery.easing.easeOutBounce(x, t * 2 - d, 0, c, d) * .5 + c * .5 + b;
  }
});
/*
 *
 * TERMS OF USE - EASING EQUATIONS
 * 
 * Open source under the BSD License. 
 * 
 * Copyright Â© 2001 Robert Penner
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, 
 * are permitted provided that the following conditions are met:
 * 
 * Redistributions of source code must retain the above copyright notice, this list of 
 * conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list 
 * of conditions and the following disclaimer in the documentation and/or other materials 
 * provided with the distribution.
 * 
 * Neither the name of the author nor the names of contributors may be used to endorse 
 * or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 *  COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 *  GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
 * OF THE POSSIBILITY OF SUCH DAMAGE. 
 *
 */
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * jQuery FlexSlider v2.7.2
 * Copyright 2012 WooThemes
 * Contributing Author: Tyler Smith
 */
;

(function ($) {
  var focused = true; //FlexSlider: Object Instance

  $.flexslider = function (el, options) {
    var slider = $(el); // making variables public
    //if rtl value was not passed and html is in rtl..enable it by default.

    if (typeof options.rtl == 'undefined' && $('html').attr('dir') == 'rtl') {
      options.rtl = true;
    }

    slider.vars = $.extend({}, $.flexslider.defaults, options);
    var namespace = slider.vars.namespace,
        msGesture = window.navigator && window.navigator.msPointerEnabled && window.MSGesture,
        touch = ("ontouchstart" in window || msGesture || window.DocumentTouch && document instanceof DocumentTouch) && slider.vars.touch,
        // deprecating this idea, as devices are being released with both of these events
    eventType = "click touchend MSPointerUp keyup",
        watchedEvent = "",
        watchedEventClearTimer,
        vertical = slider.vars.direction === "vertical",
        reverse = slider.vars.reverse,
        carousel = slider.vars.itemWidth > 0,
        fade = slider.vars.animation === "fade",
        asNav = slider.vars.asNavFor !== "",
        methods = {}; // Store a reference to the slider object

    $.data(el, "flexslider", slider); // Private slider methods

    methods = {
      init: function init() {
        slider.animating = false; // Get current slide and make sure it is a number

        slider.currentSlide = parseInt(slider.vars.startAt ? slider.vars.startAt : 0, 10);

        if (isNaN(slider.currentSlide)) {
          slider.currentSlide = 0;
        }

        slider.animatingTo = slider.currentSlide;
        slider.atEnd = slider.currentSlide === 0 || slider.currentSlide === slider.last;
        slider.containerSelector = slider.vars.selector.substr(0, slider.vars.selector.search(' '));
        slider.slides = $(slider.vars.selector, slider);
        slider.container = $(slider.containerSelector, slider);
        slider.count = slider.slides.length; // SYNC:

        slider.syncExists = $(slider.vars.sync).length > 0; // SLIDE:

        if (slider.vars.animation === "slide") {
          slider.vars.animation = "swing";
        }

        slider.prop = vertical ? "top" : slider.vars.rtl ? "marginRight" : "marginLeft";
        slider.args = {}; // SLIDESHOW:

        slider.manualPause = false;
        slider.stopped = false; //PAUSE WHEN INVISIBLE

        slider.started = false;
        slider.startTimeout = null; // TOUCH/USECSS:

        slider.transitions = !slider.vars.video && !fade && slider.vars.useCSS && function () {
          var obj = document.createElement('div'),
              props = ['perspectiveProperty', 'WebkitPerspective', 'MozPerspective', 'OPerspective', 'msPerspective'];

          for (var i in props) {
            if (obj.style[props[i]] !== undefined) {
              slider.pfx = props[i].replace('Perspective', '').toLowerCase();
              slider.prop = "-" + slider.pfx + "-transform";
              return true;
            }
          }

          return false;
        }();

        slider.isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
        slider.ensureAnimationEnd = ''; // CONTROLSCONTAINER:

        if (slider.vars.controlsContainer !== "") slider.controlsContainer = $(slider.vars.controlsContainer).length > 0 && $(slider.vars.controlsContainer); // MANUAL:

        if (slider.vars.manualControls !== "") slider.manualControls = $(slider.vars.manualControls).length > 0 && $(slider.vars.manualControls); // CUSTOM DIRECTION NAV:

        if (slider.vars.customDirectionNav !== "") slider.customDirectionNav = $(slider.vars.customDirectionNav).length === 2 && $(slider.vars.customDirectionNav); // RANDOMIZE:

        if (slider.vars.randomize) {
          slider.slides.sort(function () {
            return Math.round(Math.random()) - 0.5;
          });
          slider.container.empty().append(slider.slides);
        }

        slider.doMath(); // INIT

        slider.setup("init"); // CONTROLNAV:

        if (slider.vars.controlNav) {
          methods.controlNav.setup();
        } // DIRECTIONNAV:


        if (slider.vars.directionNav) {
          methods.directionNav.setup();
        } // KEYBOARD:


        if (slider.vars.keyboard && ($(slider.containerSelector).length === 1 || slider.vars.multipleKeyboard)) {
          $(document).bind('keyup', function (event) {
            var keycode = event.keyCode;

            if (!slider.animating && (keycode === 39 || keycode === 37)) {
              var target = slider.vars.rtl ? keycode === 37 ? slider.getTarget('next') : keycode === 39 ? slider.getTarget('prev') : false : keycode === 39 ? slider.getTarget('next') : keycode === 37 ? slider.getTarget('prev') : false;
              slider.flexAnimate(target, slider.vars.pauseOnAction);
            }
          });
        } // MOUSEWHEEL:


        if (slider.vars.mousewheel) {
          slider.bind('mousewheel', function (event, delta, deltaX, deltaY) {
            event.preventDefault();
            var target = delta < 0 ? slider.getTarget('next') : slider.getTarget('prev');
            slider.flexAnimate(target, slider.vars.pauseOnAction);
          });
        } // PAUSEPLAY


        if (slider.vars.pausePlay) {
          methods.pausePlay.setup();
        } //PAUSE WHEN INVISIBLE


        if (slider.vars.slideshow && slider.vars.pauseInvisible) {
          methods.pauseInvisible.init();
        } // SLIDSESHOW


        if (slider.vars.slideshow) {
          if (slider.vars.pauseOnHover) {
            slider.hover(function () {
              if (!slider.manualPlay && !slider.manualPause) {
                slider.pause();
              }
            }, function () {
              if (!slider.manualPause && !slider.manualPlay && !slider.stopped) {
                slider.play();
              }
            });
          } // initialize animation
          //If we're visible, or we don't use PageVisibility API


          if (!slider.vars.pauseInvisible || !methods.pauseInvisible.isHidden()) {
            slider.vars.initDelay > 0 ? slider.startTimeout = setTimeout(slider.play, slider.vars.initDelay) : slider.play();
          }
        } // ASNAV:


        if (asNav) {
          methods.asNav.setup();
        } // TOUCH


        if (touch && slider.vars.touch) {
          methods.touch();
        } // FADE&&SMOOTHHEIGHT || SLIDE:


        if (!fade || fade && slider.vars.smoothHeight) {
          $(window).bind("resize orientationchange focus", methods.resize);
        }

        slider.find("img").attr("draggable", "false"); // API: start() Callback

        setTimeout(function () {
          slider.vars.start(slider);
        }, 200);
      },
      asNav: {
        setup: function setup() {
          slider.asNav = true;
          slider.animatingTo = Math.floor(slider.currentSlide / slider.move);
          slider.currentItem = slider.currentSlide;
          slider.slides.removeClass(namespace + "active-slide").eq(slider.currentItem).addClass(namespace + "active-slide");

          if (!msGesture) {
            slider.slides.on(eventType, function (e) {
              e.preventDefault();
              var $slide = $(this),
                  target = $slide.index();
              var posFromX;

              if (slider.vars.rtl) {
                posFromX = -1 * ($slide.offset().right - $(slider).scrollLeft()); // Find position of slide relative to right of slider container
              } else {
                posFromX = $slide.offset().left - $(slider).scrollLeft(); // Find position of slide relative to left of slider container
              }

              if (posFromX <= 0 && $slide.hasClass(namespace + 'active-slide')) {
                slider.flexAnimate(slider.getTarget("prev"), true);
              } else if (!$(slider.vars.asNavFor).data('flexslider').animating && !$slide.hasClass(namespace + "active-slide")) {
                slider.direction = slider.currentItem < target ? "next" : "prev";
                slider.flexAnimate(target, slider.vars.pauseOnAction, false, true, true);
              }
            });
          } else {
            el._slider = slider;
            slider.slides.each(function () {
              var that = this;
              that._gesture = new MSGesture();
              that._gesture.target = that;
              that.addEventListener("MSPointerDown", function (e) {
                e.preventDefault();

                if (e.currentTarget._gesture) {
                  e.currentTarget._gesture.addPointer(e.pointerId);
                }
              }, false);
              that.addEventListener("MSGestureTap", function (e) {
                e.preventDefault();
                var $slide = $(this),
                    target = $slide.index();

                if (!$(slider.vars.asNavFor).data('flexslider').animating && !$slide.hasClass('active')) {
                  slider.direction = slider.currentItem < target ? "next" : "prev";
                  slider.flexAnimate(target, slider.vars.pauseOnAction, false, true, true);
                }
              });
            });
          }
        }
      },
      controlNav: {
        setup: function setup() {
          if (!slider.manualControls) {
            methods.controlNav.setupPaging();
          } else {
            // MANUALCONTROLS:
            methods.controlNav.setupManual();
          }
        },
        setupPaging: function setupPaging() {
          var type = slider.vars.controlNav === "thumbnails" ? 'control-thumbs' : 'control-paging',
              j = 1,
              item,
              slide;
          slider.controlNavScaffold = $('<ol class="' + namespace + 'control-nav ' + namespace + type + '"></ol>');

          if (slider.pagingCount > 1) {
            for (var i = 0; i < slider.pagingCount; i++) {
              slide = slider.slides.eq(i);

              if (undefined === slide.attr('data-thumb-alt')) {
                slide.attr('data-thumb-alt', '');
              }

              item = $('<a></a>').attr('href', '#').text(j);

              if (slider.vars.controlNav === "thumbnails") {
                item = $('<img/>').attr('src', slide.attr('data-thumb'));
              }

              if ('' !== slide.attr('data-thumb-alt')) {
                item.attr('alt', slide.attr('data-thumb-alt'));
              }

              if ('thumbnails' === slider.vars.controlNav && true === slider.vars.thumbCaptions) {
                var captn = slide.attr('data-thumbcaption');

                if ('' !== captn && undefined !== captn) {
                  var caption = $('<span></span>').addClass(namespace + 'caption').text(captn);
                  item.append(caption);
                }
              }

              var liElement = $('<li>');
              item.appendTo(liElement);
              liElement.append('</li>');
              slider.controlNavScaffold.append(liElement);
              j++;
            }
          } // CONTROLSCONTAINER:


          slider.controlsContainer ? $(slider.controlsContainer).append(slider.controlNavScaffold) : slider.append(slider.controlNavScaffold);
          methods.controlNav.set();
          methods.controlNav.active();
          slider.controlNavScaffold.delegate('a, img', eventType, function (event) {
            event.preventDefault();

            if (watchedEvent === "" || watchedEvent === event.type) {
              var $this = $(this),
                  target = slider.controlNav.index($this);

              if (!$this.hasClass(namespace + 'active')) {
                slider.direction = target > slider.currentSlide ? "next" : "prev";
                slider.flexAnimate(target, slider.vars.pauseOnAction);
              }
            } // setup flags to prevent event duplication


            if (watchedEvent === "") {
              watchedEvent = event.type;
            }

            methods.setToClearWatchedEvent();
          });
        },
        setupManual: function setupManual() {
          slider.controlNav = slider.manualControls;
          methods.controlNav.active();
          slider.controlNav.bind(eventType, function (event) {
            event.preventDefault();

            if (watchedEvent === "" || watchedEvent === event.type) {
              var $this = $(this),
                  target = slider.controlNav.index($this);

              if (!$this.hasClass(namespace + 'active')) {
                target > slider.currentSlide ? slider.direction = "next" : slider.direction = "prev";
                slider.flexAnimate(target, slider.vars.pauseOnAction);
              }
            } // setup flags to prevent event duplication


            if (watchedEvent === "") {
              watchedEvent = event.type;
            }

            methods.setToClearWatchedEvent();
          });
        },
        set: function set() {
          var selector = slider.vars.controlNav === "thumbnails" ? 'img' : 'a';
          slider.controlNav = $('.' + namespace + 'control-nav li ' + selector, slider.controlsContainer ? slider.controlsContainer : slider);
        },
        active: function active() {
          slider.controlNav.removeClass(namespace + "active").eq(slider.animatingTo).addClass(namespace + "active");
        },
        update: function update(action, pos) {
          if (slider.pagingCount > 1 && action === "add") {
            slider.controlNavScaffold.append($('<li><a href="#">' + slider.count + '</a></li>'));
          } else if (slider.pagingCount === 1) {
            slider.controlNavScaffold.find('li').remove();
          } else {
            slider.controlNav.eq(pos).closest('li').remove();
          }

          methods.controlNav.set();
          slider.pagingCount > 1 && slider.pagingCount !== slider.controlNav.length ? slider.update(pos, action) : methods.controlNav.active();
        }
      },
      directionNav: {
        setup: function setup() {
          var directionNavScaffold = $('<ul class="' + namespace + 'direction-nav"><li class="' + namespace + 'nav-prev"><a class="' + namespace + 'prev" href="#">' + slider.vars.prevText + '</a></li><li class="' + namespace + 'nav-next"><a class="' + namespace + 'next" href="#">' + slider.vars.nextText + '</a></li></ul>'); // CUSTOM DIRECTION NAV:

          if (slider.customDirectionNav) {
            slider.directionNav = slider.customDirectionNav; // CONTROLSCONTAINER:
          } else if (slider.controlsContainer) {
            $(slider.controlsContainer).append(directionNavScaffold);
            slider.directionNav = $('.' + namespace + 'direction-nav li a', slider.controlsContainer);
          } else {
            slider.append(directionNavScaffold);
            slider.directionNav = $('.' + namespace + 'direction-nav li a', slider);
          }

          methods.directionNav.update();
          slider.directionNav.bind(eventType, function (event) {
            event.preventDefault();
            var target;

            if (watchedEvent === "" || watchedEvent === event.type) {
              target = $(this).hasClass(namespace + 'next') ? slider.getTarget('next') : slider.getTarget('prev');
              slider.flexAnimate(target, slider.vars.pauseOnAction);
            } // setup flags to prevent event duplication


            if (watchedEvent === "") {
              watchedEvent = event.type;
            }

            methods.setToClearWatchedEvent();
          });
        },
        update: function update() {
          var disabledClass = namespace + 'disabled';

          if (slider.pagingCount === 1) {
            slider.directionNav.addClass(disabledClass).attr('tabindex', '-1');
          } else if (!slider.vars.animationLoop) {
            if (slider.animatingTo === 0) {
              slider.directionNav.removeClass(disabledClass).filter('.' + namespace + "prev").addClass(disabledClass).attr('tabindex', '-1');
            } else if (slider.animatingTo === slider.last) {
              slider.directionNav.removeClass(disabledClass).filter('.' + namespace + "next").addClass(disabledClass).attr('tabindex', '-1');
            } else {
              slider.directionNav.removeClass(disabledClass).removeAttr('tabindex');
            }
          } else {
            slider.directionNav.removeClass(disabledClass).removeAttr('tabindex');
          }
        }
      },
      pausePlay: {
        setup: function setup() {
          var pausePlayScaffold = $('<div class="' + namespace + 'pauseplay"><a href="#"></a></div>'); // CONTROLSCONTAINER:

          if (slider.controlsContainer) {
            slider.controlsContainer.append(pausePlayScaffold);
            slider.pausePlay = $('.' + namespace + 'pauseplay a', slider.controlsContainer);
          } else {
            slider.append(pausePlayScaffold);
            slider.pausePlay = $('.' + namespace + 'pauseplay a', slider);
          }

          methods.pausePlay.update(slider.vars.slideshow ? namespace + 'pause' : namespace + 'play');
          slider.pausePlay.bind(eventType, function (event) {
            event.preventDefault();

            if (watchedEvent === "" || watchedEvent === event.type) {
              if ($(this).hasClass(namespace + 'pause')) {
                slider.manualPause = true;
                slider.manualPlay = false;
                slider.pause();
              } else {
                slider.manualPause = false;
                slider.manualPlay = true;
                slider.play();
              }
            } // setup flags to prevent event duplication


            if (watchedEvent === "") {
              watchedEvent = event.type;
            }

            methods.setToClearWatchedEvent();
          });
        },
        update: function update(state) {
          state === "play" ? slider.pausePlay.removeClass(namespace + 'pause').addClass(namespace + 'play').html(slider.vars.playText) : slider.pausePlay.removeClass(namespace + 'play').addClass(namespace + 'pause').html(slider.vars.pauseText);
        }
      },
      touch: function touch() {
        var startX,
            startY,
            offset,
            cwidth,
            dx,
            startT,
            onTouchStart,
            onTouchMove,
            _onTouchEnd,
            scrolling = false,
            localX = 0,
            localY = 0,
            accDx = 0;

        if (!msGesture) {
          onTouchStart = function onTouchStart(e) {
            if (slider.animating) {
              e.preventDefault();
            } else if (window.navigator.msPointerEnabled || e.touches.length === 1) {
              slider.pause(); // CAROUSEL:

              cwidth = vertical ? slider.h : slider.w;
              startT = Number(new Date()); // CAROUSEL:
              // Local vars for X and Y points.

              localX = e.touches[0].pageX;
              localY = e.touches[0].pageY;
              offset = carousel && reverse && slider.animatingTo === slider.last ? 0 : carousel && reverse ? slider.limit - (slider.itemW + slider.vars.itemMargin) * slider.move * slider.animatingTo : carousel && slider.currentSlide === slider.last ? slider.limit : carousel ? (slider.itemW + slider.vars.itemMargin) * slider.move * slider.currentSlide : reverse ? (slider.last - slider.currentSlide + slider.cloneOffset) * cwidth : (slider.currentSlide + slider.cloneOffset) * cwidth;
              startX = vertical ? localY : localX;
              startY = vertical ? localX : localY;
              el.addEventListener('touchmove', onTouchMove, false);
              el.addEventListener('touchend', _onTouchEnd, false);
            }
          };

          onTouchMove = function onTouchMove(e) {
            // Local vars for X and Y points.
            localX = e.touches[0].pageX;
            localY = e.touches[0].pageY;
            dx = vertical ? startX - localY : (slider.vars.rtl ? -1 : 1) * (startX - localX);
            scrolling = vertical ? Math.abs(dx) < Math.abs(localX - startY) : Math.abs(dx) < Math.abs(localY - startY);
            var fxms = 500;

            if (!scrolling || Number(new Date()) - startT > fxms) {
              e.preventDefault();

              if (!fade && slider.transitions) {
                if (!slider.vars.animationLoop) {
                  dx = dx / (slider.currentSlide === 0 && dx < 0 || slider.currentSlide === slider.last && dx > 0 ? Math.abs(dx) / cwidth + 2 : 1);
                }

                slider.setProps(offset + dx, "setTouch");
              }
            }
          };

          _onTouchEnd = function onTouchEnd(e) {
            // finish the touch by undoing the touch session
            el.removeEventListener('touchmove', onTouchMove, false);

            if (slider.animatingTo === slider.currentSlide && !scrolling && !(dx === null)) {
              var updateDx = reverse ? -dx : dx,
                  target = updateDx > 0 ? slider.getTarget('next') : slider.getTarget('prev');

              if (slider.canAdvance(target) && (Number(new Date()) - startT < 550 && Math.abs(updateDx) > 50 || Math.abs(updateDx) > cwidth / 2)) {
                slider.flexAnimate(target, slider.vars.pauseOnAction);
              } else {
                if (!fade) {
                  slider.flexAnimate(slider.currentSlide, slider.vars.pauseOnAction, true);
                }
              }
            }

            el.removeEventListener('touchend', _onTouchEnd, false);
            startX = null;
            startY = null;
            dx = null;
            offset = null;
          };

          el.addEventListener('touchstart', onTouchStart, false);
        } else {
          var onMSPointerDown = function onMSPointerDown(e) {
            e.stopPropagation();

            if (slider.animating) {
              e.preventDefault();
            } else {
              slider.pause();

              el._gesture.addPointer(e.pointerId);

              accDx = 0;
              cwidth = vertical ? slider.h : slider.w;
              startT = Number(new Date()); // CAROUSEL:

              offset = carousel && reverse && slider.animatingTo === slider.last ? 0 : carousel && reverse ? slider.limit - (slider.itemW + slider.vars.itemMargin) * slider.move * slider.animatingTo : carousel && slider.currentSlide === slider.last ? slider.limit : carousel ? (slider.itemW + slider.vars.itemMargin) * slider.move * slider.currentSlide : reverse ? (slider.last - slider.currentSlide + slider.cloneOffset) * cwidth : (slider.currentSlide + slider.cloneOffset) * cwidth;
            }
          };

          var onMSGestureChange = function onMSGestureChange(e) {
            e.stopPropagation();
            var slider = e.target._slider;

            if (!slider) {
              return;
            }

            var transX = -e.translationX,
                transY = -e.translationY; //Accumulate translations.

            accDx = accDx + (vertical ? transY : transX);
            dx = (slider.vars.rtl ? -1 : 1) * accDx;
            scrolling = vertical ? Math.abs(accDx) < Math.abs(-transX) : Math.abs(accDx) < Math.abs(-transY);

            if (e.detail === e.MSGESTURE_FLAG_INERTIA) {
              setImmediate(function () {
                el._gesture.stop();
              });
              return;
            }

            if (!scrolling || Number(new Date()) - startT > 500) {
              e.preventDefault();

              if (!fade && slider.transitions) {
                if (!slider.vars.animationLoop) {
                  dx = accDx / (slider.currentSlide === 0 && accDx < 0 || slider.currentSlide === slider.last && accDx > 0 ? Math.abs(accDx) / cwidth + 2 : 1);
                }

                slider.setProps(offset + dx, "setTouch");
              }
            }
          };

          var onMSGestureEnd = function onMSGestureEnd(e) {
            e.stopPropagation();
            var slider = e.target._slider;

            if (!slider) {
              return;
            }

            if (slider.animatingTo === slider.currentSlide && !scrolling && !(dx === null)) {
              var updateDx = reverse ? -dx : dx,
                  target = updateDx > 0 ? slider.getTarget('next') : slider.getTarget('prev');

              if (slider.canAdvance(target) && (Number(new Date()) - startT < 550 && Math.abs(updateDx) > 50 || Math.abs(updateDx) > cwidth / 2)) {
                slider.flexAnimate(target, slider.vars.pauseOnAction);
              } else {
                if (!fade) {
                  slider.flexAnimate(slider.currentSlide, slider.vars.pauseOnAction, true);
                }
              }
            }

            startX = null;
            startY = null;
            dx = null;
            offset = null;
            accDx = 0;
          };

          el.style.msTouchAction = "none";
          el._gesture = new MSGesture();
          el._gesture.target = el;
          el.addEventListener("MSPointerDown", onMSPointerDown, false);
          el._slider = slider;
          el.addEventListener("MSGestureChange", onMSGestureChange, false);
          el.addEventListener("MSGestureEnd", onMSGestureEnd, false);
        }
      },
      resize: function resize() {
        if (!slider.animating && slider.is(':visible')) {
          if (!carousel) {
            slider.doMath();
          }

          if (fade) {
            // SMOOTH HEIGHT:
            methods.smoothHeight();
          } else if (carousel) {
            //CAROUSEL:
            slider.slides.width(slider.computedW);
            slider.update(slider.pagingCount);
            slider.setProps();
          } else if (vertical) {
            //VERTICAL:
            slider.viewport.height(slider.h);
            slider.setProps(slider.h, "setTotal");
          } else {
            // SMOOTH HEIGHT:
            if (slider.vars.smoothHeight) {
              methods.smoothHeight();
            }

            slider.newSlides.width(slider.computedW);
            slider.setProps(slider.computedW, "setTotal");
          }
        }
      },
      smoothHeight: function smoothHeight(dur) {
        if (!vertical || fade) {
          var $obj = fade ? slider : slider.viewport;
          dur ? $obj.animate({
            "height": slider.slides.eq(slider.animatingTo).innerHeight()
          }, dur) : $obj.innerHeight(slider.slides.eq(slider.animatingTo).innerHeight());
        }
      },
      sync: function sync(action) {
        var $obj = $(slider.vars.sync).data("flexslider"),
            target = slider.animatingTo;

        switch (action) {
          case "animate":
            $obj.flexAnimate(target, slider.vars.pauseOnAction, false, true);
            break;

          case "play":
            if (!$obj.playing && !$obj.asNav) {
              $obj.play();
            }

            break;

          case "pause":
            $obj.pause();
            break;
        }
      },
      uniqueID: function uniqueID($clone) {
        // Append _clone to current level and children elements with id attributes
        $clone.filter('[id]').add($clone.find('[id]')).each(function () {
          var $this = $(this);
          $this.attr('id', $this.attr('id') + '_clone');
        });
        return $clone;
      },
      pauseInvisible: {
        visProp: null,
        init: function init() {
          var visProp = methods.pauseInvisible.getHiddenProp();

          if (visProp) {
            var evtname = visProp.replace(/[H|h]idden/, '') + 'visibilitychange';
            document.addEventListener(evtname, function () {
              if (methods.pauseInvisible.isHidden()) {
                if (slider.startTimeout) {
                  clearTimeout(slider.startTimeout); //If clock is ticking, stop timer and prevent from starting while invisible
                } else {
                  slider.pause(); //Or just pause
                }
              } else {
                if (slider.started) {
                  slider.play(); //Initiated before, just play
                } else {
                  if (slider.vars.initDelay > 0) {
                    setTimeout(slider.play, slider.vars.initDelay);
                  } else {
                    slider.play(); //Didn't init before: simply init or wait for it
                  }
                }
              }
            });
          }
        },
        isHidden: function isHidden() {
          var prop = methods.pauseInvisible.getHiddenProp();

          if (!prop) {
            return false;
          }

          return document[prop];
        },
        getHiddenProp: function getHiddenProp() {
          var prefixes = ['webkit', 'moz', 'ms', 'o']; // if 'hidden' is natively supported just return it

          if ('hidden' in document) {
            return 'hidden';
          } // otherwise loop over all the known prefixes until we find one


          for (var i = 0; i < prefixes.length; i++) {
            if (prefixes[i] + 'Hidden' in document) {
              return prefixes[i] + 'Hidden';
            }
          } // otherwise it's not supported


          return null;
        }
      },
      setToClearWatchedEvent: function setToClearWatchedEvent() {
        clearTimeout(watchedEventClearTimer);
        watchedEventClearTimer = setTimeout(function () {
          watchedEvent = "";
        }, 3000);
      }
    }; // public methods

    slider.flexAnimate = function (target, pause, override, withSync, fromNav) {
      if (!slider.vars.animationLoop && target !== slider.currentSlide) {
        slider.direction = target > slider.currentSlide ? "next" : "prev";
      }

      if (asNav && slider.pagingCount === 1) slider.direction = slider.currentItem < target ? "next" : "prev";

      if (!slider.animating && (slider.canAdvance(target, fromNav) || override) && slider.is(":visible")) {
        if (asNav && withSync) {
          var master = $(slider.vars.asNavFor).data('flexslider');
          slider.atEnd = target === 0 || target === slider.count - 1;
          master.flexAnimate(target, true, false, true, fromNav);
          slider.direction = slider.currentItem < target ? "next" : "prev";
          master.direction = slider.direction;

          if (Math.ceil((target + 1) / slider.visible) - 1 !== slider.currentSlide && target !== 0) {
            slider.currentItem = target;
            slider.slides.removeClass(namespace + "active-slide").eq(target).addClass(namespace + "active-slide");
            target = Math.floor(target / slider.visible);
          } else {
            slider.currentItem = target;
            slider.slides.removeClass(namespace + "active-slide").eq(target).addClass(namespace + "active-slide");
            return false;
          }
        }

        slider.animating = true;
        slider.animatingTo = target; // SLIDESHOW:

        if (pause) {
          slider.pause();
        } // API: before() animation Callback


        slider.vars.before(slider); // SYNC:

        if (slider.syncExists && !fromNav) {
          methods.sync("animate");
        } // CONTROLNAV


        if (slider.vars.controlNav) {
          methods.controlNav.active();
        } // !CAROUSEL:
        // CANDIDATE: slide active class (for add/remove slide)


        if (!carousel) {
          slider.slides.removeClass(namespace + 'active-slide').eq(target).addClass(namespace + 'active-slide');
        } // INFINITE LOOP:
        // CANDIDATE: atEnd


        slider.atEnd = target === 0 || target === slider.last; // DIRECTIONNAV:

        if (slider.vars.directionNav) {
          methods.directionNav.update();
        }

        if (target === slider.last) {
          // API: end() of cycle Callback
          slider.vars.end(slider); // SLIDESHOW && !INFINITE LOOP:

          if (!slider.vars.animationLoop) {
            slider.pause();
          }
        } // SLIDE:


        if (!fade) {
          var dimension = vertical ? slider.slides.filter(':first').height() : slider.computedW,
              margin,
              slideString,
              calcNext; // INFINITE LOOP / REVERSE:

          if (carousel) {
            margin = slider.vars.itemMargin;
            calcNext = (slider.itemW + margin) * slider.move * slider.animatingTo;
            slideString = calcNext > slider.limit && slider.visible !== 1 ? slider.limit : calcNext;
          } else if (slider.currentSlide === 0 && target === slider.count - 1 && slider.vars.animationLoop && slider.direction !== "next") {
            slideString = reverse ? (slider.count + slider.cloneOffset) * dimension : 0;
          } else if (slider.currentSlide === slider.last && target === 0 && slider.vars.animationLoop && slider.direction !== "prev") {
            slideString = reverse ? 0 : (slider.count + 1) * dimension;
          } else {
            slideString = reverse ? (slider.count - 1 - target + slider.cloneOffset) * dimension : (target + slider.cloneOffset) * dimension;
          }

          slider.setProps(slideString, "", slider.vars.animationSpeed);

          if (slider.transitions) {
            if (!slider.vars.animationLoop || !slider.atEnd) {
              slider.animating = false;
              slider.currentSlide = slider.animatingTo;
            } // Unbind previous transitionEnd events and re-bind new transitionEnd event


            slider.container.unbind("webkitTransitionEnd transitionend");
            slider.container.bind("webkitTransitionEnd transitionend", function () {
              clearTimeout(slider.ensureAnimationEnd);
              slider.wrapup(dimension);
            }); // Insurance for the ever-so-fickle transitionEnd event

            clearTimeout(slider.ensureAnimationEnd);
            slider.ensureAnimationEnd = setTimeout(function () {
              slider.wrapup(dimension);
            }, slider.vars.animationSpeed + 100);
          } else {
            slider.container.animate(slider.args, slider.vars.animationSpeed, slider.vars.easing, function () {
              slider.wrapup(dimension);
            });
          }
        } else {
          // FADE:
          if (!touch) {
            slider.slides.eq(slider.currentSlide).css({
              "zIndex": 1
            }).animate({
              "opacity": 0
            }, slider.vars.animationSpeed, slider.vars.easing);
            slider.slides.eq(target).css({
              "zIndex": 2
            }).animate({
              "opacity": 1
            }, slider.vars.animationSpeed, slider.vars.easing, slider.wrapup);
          } else {
            slider.slides.eq(slider.currentSlide).css({
              "opacity": 0,
              "zIndex": 1
            });
            slider.slides.eq(target).css({
              "opacity": 1,
              "zIndex": 2
            });
            slider.wrapup(dimension);
          }
        } // SMOOTH HEIGHT:


        if (slider.vars.smoothHeight) {
          methods.smoothHeight(slider.vars.animationSpeed);
        }
      }
    };

    slider.wrapup = function (dimension) {
      // SLIDE:
      if (!fade && !carousel) {
        if (slider.currentSlide === 0 && slider.animatingTo === slider.last && slider.vars.animationLoop) {
          slider.setProps(dimension, "jumpEnd");
        } else if (slider.currentSlide === slider.last && slider.animatingTo === 0 && slider.vars.animationLoop) {
          slider.setProps(dimension, "jumpStart");
        }
      }

      slider.animating = false;
      slider.currentSlide = slider.animatingTo; // API: after() animation Callback

      slider.vars.after(slider);
    }; // SLIDESHOW:


    slider.animateSlides = function () {
      if (!slider.animating && focused) {
        slider.flexAnimate(slider.getTarget("next"));
      }
    }; // SLIDESHOW:


    slider.pause = function () {
      clearInterval(slider.animatedSlides);
      slider.animatedSlides = null;
      slider.playing = false; // PAUSEPLAY:

      if (slider.vars.pausePlay) {
        methods.pausePlay.update("play");
      } // SYNC:


      if (slider.syncExists) {
        methods.sync("pause");
      }
    }; // SLIDESHOW:


    slider.play = function () {
      if (slider.playing) {
        clearInterval(slider.animatedSlides);
      }

      slider.animatedSlides = slider.animatedSlides || setInterval(slider.animateSlides, slider.vars.slideshowSpeed);
      slider.started = slider.playing = true; // PAUSEPLAY:

      if (slider.vars.pausePlay) {
        methods.pausePlay.update("pause");
      } // SYNC:


      if (slider.syncExists) {
        methods.sync("play");
      }
    }; // STOP:


    slider.stop = function () {
      slider.pause();
      slider.stopped = true;
    };

    slider.canAdvance = function (target, fromNav) {
      // ASNAV:
      var last = asNav ? slider.pagingCount - 1 : slider.last;
      return fromNav ? true : asNav && slider.currentItem === slider.count - 1 && target === 0 && slider.direction === "prev" ? true : asNav && slider.currentItem === 0 && target === slider.pagingCount - 1 && slider.direction !== "next" ? false : target === slider.currentSlide && !asNav ? false : slider.vars.animationLoop ? true : slider.atEnd && slider.currentSlide === 0 && target === last && slider.direction !== "next" ? false : slider.atEnd && slider.currentSlide === last && target === 0 && slider.direction === "next" ? false : true;
    };

    slider.getTarget = function (dir) {
      slider.direction = dir;

      if (dir === "next") {
        return slider.currentSlide === slider.last ? 0 : slider.currentSlide + 1;
      } else {
        return slider.currentSlide === 0 ? slider.last : slider.currentSlide - 1;
      }
    }; // SLIDE:


    slider.setProps = function (pos, special, dur) {
      var target = function () {
        var posCheck = pos ? pos : (slider.itemW + slider.vars.itemMargin) * slider.move * slider.animatingTo,
            posCalc = function () {
          if (carousel) {
            return special === "setTouch" ? pos : reverse && slider.animatingTo === slider.last ? 0 : reverse ? slider.limit - (slider.itemW + slider.vars.itemMargin) * slider.move * slider.animatingTo : slider.animatingTo === slider.last ? slider.limit : posCheck;
          } else {
            switch (special) {
              case "setTotal":
                return reverse ? (slider.count - 1 - slider.currentSlide + slider.cloneOffset) * pos : (slider.currentSlide + slider.cloneOffset) * pos;

              case "setTouch":
                return reverse ? pos : pos;

              case "jumpEnd":
                return reverse ? pos : slider.count * pos;

              case "jumpStart":
                return reverse ? slider.count * pos : pos;

              default:
                return pos;
            }
          }
        }();

        return posCalc * (slider.vars.rtl ? 1 : -1) + "px";
      }();

      if (slider.transitions) {
        if (slider.isFirefox) {
          target = vertical ? "translate3d(0," + target + ",0)" : "translate3d(" + (parseInt(target) + 'px') + ",0,0)";
        } else {
          target = vertical ? "translate3d(0," + target + ",0)" : "translate3d(" + ((slider.vars.rtl ? -1 : 1) * parseInt(target) + 'px') + ",0,0)";
        }

        dur = dur !== undefined ? dur / 1000 + "s" : "0s";
        slider.container.css("-" + slider.pfx + "-transition-duration", dur);
        slider.container.css("transition-duration", dur);
      }

      slider.args[slider.prop] = target;

      if (slider.transitions || dur === undefined) {
        slider.container.css(slider.args);
      }

      slider.container.css('transform', target);
    };

    slider.setup = function (type) {
      // SLIDE:
      if (!fade) {
        var sliderOffset, arr;

        if (type === "init") {
          slider.viewport = $('<div class="' + namespace + 'viewport"></div>').css({
            "overflow": "hidden",
            "position": "relative"
          }).appendTo(slider).append(slider.container); // INFINITE LOOP:

          slider.cloneCount = 0;
          slider.cloneOffset = 0; // REVERSE:

          if (reverse) {
            arr = $.makeArray(slider.slides).reverse();
            slider.slides = $(arr);
            slider.container.empty().append(slider.slides);
          }
        } // INFINITE LOOP && !CAROUSEL:


        if (slider.vars.animationLoop && !carousel) {
          slider.cloneCount = 2;
          slider.cloneOffset = 1; // clear out old clones

          if (type !== "init") {
            slider.container.find('.clone').remove();
          }

          slider.container.append(methods.uniqueID(slider.slides.first().clone().addClass('clone')).attr('aria-hidden', 'true')).prepend(methods.uniqueID(slider.slides.last().clone().addClass('clone')).attr('aria-hidden', 'true'));
        }

        slider.newSlides = $(slider.vars.selector, slider);
        sliderOffset = reverse ? slider.count - 1 - slider.currentSlide + slider.cloneOffset : slider.currentSlide + slider.cloneOffset; // VERTICAL:

        if (vertical && !carousel) {
          slider.container.height((slider.count + slider.cloneCount) * 200 + "%").css("position", "absolute").width("100%");
          setTimeout(function () {
            slider.newSlides.css({
              "display": "block"
            });
            slider.doMath();
            slider.viewport.height(slider.h);
            slider.setProps(sliderOffset * slider.h, "init");
          }, type === "init" ? 100 : 0);
        } else {
          slider.container.width((slider.count + slider.cloneCount) * 200 + "%");
          slider.setProps(sliderOffset * slider.computedW, "init");
          setTimeout(function () {
            slider.doMath();

            if (slider.vars.rtl) {
              if (slider.isFirefox) {
                slider.newSlides.css({
                  "width": slider.computedW,
                  "marginRight": slider.computedM,
                  "float": "right",
                  "display": "block"
                });
              } else {
                slider.newSlides.css({
                  "width": slider.computedW,
                  "marginRight": slider.computedM,
                  "float": "left",
                  "display": "block"
                });
              }
            } else {
              slider.newSlides.css({
                "width": slider.computedW,
                "marginRight": slider.computedM,
                "float": "left",
                "display": "block"
              });
            } // SMOOTH HEIGHT:


            if (slider.vars.smoothHeight) {
              methods.smoothHeight();
            }
          }, type === "init" ? 100 : 0);
        }
      } else {
        // FADE:
        if (slider.vars.rtl) {
          slider.slides.css({
            "width": "100%",
            "float": 'right',
            "marginLeft": "-100%",
            "position": "relative"
          });
        } else {
          slider.slides.css({
            "width": "100%",
            "float": 'left',
            "marginRight": "-100%",
            "position": "relative"
          });
        }

        if (type === "init") {
          if (!touch) {
            //slider.slides.eq(slider.currentSlide).fadeIn(slider.vars.animationSpeed, slider.vars.easing);
            if (slider.vars.fadeFirstSlide == false) {
              slider.slides.css({
                "opacity": 0,
                "display": "block",
                "zIndex": 1
              }).eq(slider.currentSlide).css({
                "zIndex": 2
              }).css({
                "opacity": 1
              });
            } else {
              slider.slides.css({
                "opacity": 0,
                "display": "block",
                "zIndex": 1
              }).eq(slider.currentSlide).css({
                "zIndex": 2
              }).animate({
                "opacity": 1
              }, slider.vars.animationSpeed, slider.vars.easing);
            }
          } else {
            slider.slides.css({
              "opacity": 0,
              "display": "block",
              "webkitTransition": "opacity " + slider.vars.animationSpeed / 1000 + "s ease",
              "zIndex": 1
            }).eq(slider.currentSlide).css({
              "opacity": 1,
              "zIndex": 2
            });
          }
        } // SMOOTH HEIGHT:


        if (slider.vars.smoothHeight) {
          methods.smoothHeight();
        }
      } // !CAROUSEL:
      // CANDIDATE: active slide


      if (!carousel) {
        slider.slides.removeClass(namespace + "active-slide").eq(slider.currentSlide).addClass(namespace + "active-slide");
      } //FlexSlider: init() Callback


      slider.vars.init(slider);
    };

    slider.doMath = function () {
      var slide = slider.slides.first(),
          slideMargin = slider.vars.itemMargin,
          minItems = slider.vars.minItems,
          maxItems = slider.vars.maxItems;
      slider.w = slider.viewport === undefined ? slider.width() : slider.viewport.width();

      if (slider.isFirefox) {
        slider.w = slider.width();
      }

      slider.h = slide.height();
      slider.boxPadding = slide.outerWidth() - slide.width(); // CAROUSEL:

      if (carousel) {
        slider.itemT = slider.vars.itemWidth + slideMargin;
        slider.itemM = slideMargin;
        slider.minW = minItems ? minItems * slider.itemT : slider.w;
        slider.maxW = maxItems ? maxItems * slider.itemT - slideMargin : slider.w;
        slider.itemW = slider.minW > slider.w ? (slider.w - slideMargin * (minItems - 1)) / minItems : slider.maxW < slider.w ? (slider.w - slideMargin * (maxItems - 1)) / maxItems : slider.vars.itemWidth > slider.w ? slider.w : slider.vars.itemWidth;
        slider.visible = Math.floor(slider.w / slider.itemW);
        slider.move = slider.vars.move > 0 && slider.vars.move < slider.visible ? slider.vars.move : slider.visible;
        slider.pagingCount = Math.ceil((slider.count - slider.visible) / slider.move + 1);
        slider.last = slider.pagingCount - 1;
        slider.limit = slider.pagingCount === 1 ? 0 : slider.vars.itemWidth > slider.w ? slider.itemW * (slider.count - 1) + slideMargin * (slider.count - 1) : (slider.itemW + slideMargin) * slider.count - slider.w - slideMargin;
      } else {
        slider.itemW = slider.w;
        slider.itemM = slideMargin;
        slider.pagingCount = slider.count;
        slider.last = slider.count - 1;
      }

      slider.computedW = slider.itemW - slider.boxPadding;
      slider.computedM = slider.itemM;
    };

    slider.update = function (pos, action) {
      slider.doMath(); // update currentSlide and slider.animatingTo if necessary

      if (!carousel) {
        if (pos < slider.currentSlide) {
          slider.currentSlide += 1;
        } else if (pos <= slider.currentSlide && pos !== 0) {
          slider.currentSlide -= 1;
        }

        slider.animatingTo = slider.currentSlide;
      } // update controlNav


      if (slider.vars.controlNav && !slider.manualControls) {
        if (action === "add" && !carousel || slider.pagingCount > slider.controlNav.length) {
          methods.controlNav.update("add");
        } else if (action === "remove" && !carousel || slider.pagingCount < slider.controlNav.length) {
          if (carousel && slider.currentSlide > slider.last) {
            slider.currentSlide -= 1;
            slider.animatingTo -= 1;
          }

          methods.controlNav.update("remove", slider.last);
        }
      } // update directionNav


      if (slider.vars.directionNav) {
        methods.directionNav.update();
      }
    };

    slider.addSlide = function (obj, pos) {
      var $obj = $(obj);
      slider.count += 1;
      slider.last = slider.count - 1; // append new slide

      if (vertical && reverse) {
        pos !== undefined ? slider.slides.eq(slider.count - pos).after($obj) : slider.container.prepend($obj);
      } else {
        pos !== undefined ? slider.slides.eq(pos).before($obj) : slider.container.append($obj);
      } // update currentSlide, animatingTo, controlNav, and directionNav


      slider.update(pos, "add"); // update slider.slides

      slider.slides = $(slider.vars.selector + ':not(.clone)', slider); // re-setup the slider to accomdate new slide

      slider.setup(); //FlexSlider: added() Callback

      slider.vars.added(slider);
    };

    slider.removeSlide = function (obj) {
      var pos = isNaN(obj) ? slider.slides.index($(obj)) : obj; // update count

      slider.count -= 1;
      slider.last = slider.count - 1; // remove slide

      if (isNaN(obj)) {
        $(obj, slider.slides).remove();
      } else {
        vertical && reverse ? slider.slides.eq(slider.last).remove() : slider.slides.eq(obj).remove();
      } // update currentSlide, animatingTo, controlNav, and directionNav


      slider.doMath();
      slider.update(pos, "remove"); // update slider.slides

      slider.slides = $(slider.vars.selector + ':not(.clone)', slider); // re-setup the slider to accomdate new slide

      slider.setup(); // FlexSlider: removed() Callback

      slider.vars.removed(slider);
    }; //FlexSlider: Initialize


    methods.init();
  }; // Ensure the slider isn't focussed if the window loses focus.


  $(window).blur(function (e) {
    focused = false;
  }).focus(function (e) {
    focused = true;
  }); //FlexSlider: Default Settings

  $.flexslider.defaults = {
    namespace: "flex-",
    //{NEW} String: Prefix string attached to the class of every element generated by the plugin
    selector: ".slides > li",
    //{NEW} Selector: Must match a simple pattern. '{container} > {slide}' -- Ignore pattern at your own peril
    animation: "fade",
    //String: Select your animation type, "fade" or "slide"
    easing: "swing",
    //{NEW} String: Determines the easing method used in jQuery transitions. jQuery easing plugin is supported!
    direction: "horizontal",
    //String: Select the sliding direction, "horizontal" or "vertical"
    reverse: false,
    //{NEW} Boolean: Reverse the animation direction
    animationLoop: true,
    //Boolean: Should the animation loop? If false, directionNav will received "disable" classes at either end
    smoothHeight: false,
    //{NEW} Boolean: Allow height of the slider to animate smoothly in horizontal mode
    startAt: 0,
    //Integer: The slide that the slider should start on. Array notation (0 = first slide)
    slideshow: true,
    //Boolean: Animate slider automatically
    slideshowSpeed: 7000,
    //Integer: Set the speed of the slideshow cycling, in milliseconds
    animationSpeed: 600,
    //Integer: Set the speed of animations, in milliseconds
    initDelay: 0,
    //{NEW} Integer: Set an initialization delay, in milliseconds
    randomize: false,
    //Boolean: Randomize slide order
    fadeFirstSlide: true,
    //Boolean: Fade in the first slide when animation type is "fade"
    thumbCaptions: false,
    //Boolean: Whether or not to put captions on thumbnails when using the "thumbnails" controlNav.
    // Usability features
    pauseOnAction: true,
    //Boolean: Pause the slideshow when interacting with control elements, highly recommended.
    pauseOnHover: false,
    //Boolean: Pause the slideshow when hovering over slider, then resume when no longer hovering
    pauseInvisible: true,
    //{NEW} Boolean: Pause the slideshow when tab is invisible, resume when visible. Provides better UX, lower CPU usage.
    useCSS: true,
    //{NEW} Boolean: Slider will use CSS3 transitions if available
    touch: true,
    //{NEW} Boolean: Allow touch swipe navigation of the slider on touch-enabled devices
    video: false,
    //{NEW} Boolean: If using video in the slider, will prevent CSS3 3D Transforms to avoid graphical glitches
    // Primary Controls
    controlNav: true,
    //Boolean: Create navigation for paging control of each slide? Note: Leave true for manualControls usage
    directionNav: true,
    //Boolean: Create navigation for previous/next navigation? (true/false)
    prevText: "Previous",
    //String: Set the text for the "previous" directionNav item
    nextText: "Next",
    //String: Set the text for the "next" directionNav item
    // Secondary Navigation
    keyboard: true,
    //Boolean: Allow slider navigating via keyboard left/right keys
    multipleKeyboard: false,
    //{NEW} Boolean: Allow keyboard navigation to affect multiple sliders. Default behavior cuts out keyboard navigation with more than one slider present.
    mousewheel: false,
    //{UPDATED} Boolean: Requires jquery.mousewheel.js (https://github.com/brandonaaron/jquery-mousewheel) - Allows slider navigating via mousewheel
    pausePlay: false,
    //Boolean: Create pause/play dynamic element
    pauseText: "Pause",
    //String: Set the text for the "pause" pausePlay item
    playText: "Play",
    //String: Set the text for the "play" pausePlay item
    // Special properties
    controlsContainer: "",
    //{UPDATED} jQuery Object/Selector: Declare which container the navigation elements should be appended too. Default container is the FlexSlider element. Example use would be $(".flexslider-container"). Property is ignored if given element is not found.
    manualControls: "",
    //{UPDATED} jQuery Object/Selector: Declare custom control navigation. Examples would be $(".flex-control-nav li") or "#tabs-nav li img", etc. The number of elements in your controlNav should match the number of slides/tabs.
    customDirectionNav: "",
    //{NEW} jQuery Object/Selector: Custom prev / next button. Must be two jQuery elements. In order to make the events work they have to have the classes "prev" and "next" (plus namespace)
    sync: "",
    //{NEW} Selector: Mirror the actions performed on this slider with another slider. Use with care.
    asNavFor: "",
    //{NEW} Selector: Internal property exposed for turning the slider into a thumbnail navigation for another slider
    // Carousel Options
    itemWidth: 0,
    //{NEW} Integer: Box-model width of individual carousel items, including horizontal borders and padding.
    itemMargin: 0,
    //{NEW} Integer: Margin between carousel items.
    minItems: 1,
    //{NEW} Integer: Minimum number of carousel items that should be visible. Items will resize fluidly when below this.
    maxItems: 0,
    //{NEW} Integer: Maxmimum number of carousel items that should be visible. Items will resize fluidly when above this limit.
    move: 0,
    //{NEW} Integer: Number of carousel items that should move on animation. If 0, slider will move all visible items.
    allowOneSlide: true,
    //{NEW} Boolean: Whether or not to allow a slider comprised of a single slide
    // Browser Specific
    isFirefox: false,
    // {NEW} Boolean: Set to true when Firefox is the browser used.
    // Callback API
    start: function start() {},
    //Callback: function(slider) - Fires when the slider loads the first slide
    before: function before() {},
    //Callback: function(slider) - Fires asynchronously with each slider animation
    after: function after() {},
    //Callback: function(slider) - Fires after each slider animation completes
    end: function end() {},
    //Callback: function(slider) - Fires when the slider reaches the last slide (asynchronous)
    added: function added() {},
    //{NEW} Callback: function(slider) - Fires after a slide is added
    removed: function removed() {},
    //{NEW} Callback: function(slider) - Fires after a slide is removed
    init: function init() {},
    //{NEW} Callback: function(slider) - Fires after the slider is initially setup
    rtl: false //{NEW} Boolean: Whether or not to enable RTL mode

  }; //FlexSlider: Plugin Function

  $.fn.flexslider = function (options) {
    if (options === undefined) {
      options = {};
    }

    if (_typeof(options) === "object") {
      return this.each(function () {
        var $this = $(this),
            selector = options.selector ? options.selector : ".slides > li",
            $slides = $this.find(selector);

        if ($slides.length === 1 && options.allowOneSlide === false || $slides.length === 0) {
          $slides.fadeIn(400);

          if (options.start) {
            options.start($this);
          }
        } else if ($this.data('flexslider') === undefined) {
          new $.flexslider(this, options);
        }
      });
    } else {
      // Helper strings to quickly perform functions on the slider
      var $slider = $(this).data('flexslider');

      switch (options) {
        case "play":
          $slider.play();
          break;

        case "pause":
          $slider.pause();
          break;

        case "stop":
          $slider.stop();
          break;

        case "next":
          $slider.flexAnimate($slider.getTarget("next"), true);
          break;

        case "prev":
        case "previous":
          $slider.flexAnimate($slider.getTarget("prev"), true);
          break;

        default:
          if (typeof options === "number") {
            $slider.flexAnimate(options, true);
          }

      }
    }
  };
})(jQuery);
"use strict";

/*! Copyright (c) 2011 Brandon Aaron (http://brandonaaron.net)
 * Licensed under the MIT License (LICENSE.txt).
 *
 * Thanks to: http://adomas.org/javascript-mouse-wheel/ for some pointers.
 * Thanks to: Mathias Bank(http://www.mathias-bank.de) for a scope bug fix.
 * Thanks to: Seamus Leahy for adding deltaX and deltaY
 *
 * Version: 3.0.6
 * 
 * Requires: 1.2.2+
 */
(function ($) {
  var types = ['DOMMouseScroll', 'mousewheel'];

  if ($.event.fixHooks) {
    for (var i = types.length; i;) {
      $.event.fixHooks[types[--i]] = $.event.mouseHooks;
    }
  }

  $.event.special.mousewheel = {
    setup: function setup() {
      if (this.addEventListener) {
        for (var i = types.length; i;) {
          this.addEventListener(types[--i], handler, false);
        }
      } else {
        this.onmousewheel = handler;
      }
    },
    teardown: function teardown() {
      if (this.removeEventListener) {
        for (var i = types.length; i;) {
          this.removeEventListener(types[--i], handler, false);
        }
      } else {
        this.onmousewheel = null;
      }
    }
  };
  $.fn.extend({
    mousewheel: function mousewheel(fn) {
      return fn ? this.bind("mousewheel", fn) : this.trigger("mousewheel");
    },
    unmousewheel: function unmousewheel(fn) {
      return this.unbind("mousewheel", fn);
    }
  });

  function handler(event) {
    var orgEvent = event || window.event,
        args = [].slice.call(arguments, 1),
        delta = 0,
        returnValue = true,
        deltaX = 0,
        deltaY = 0;
    event = $.event.fix(orgEvent);
    event.type = "mousewheel"; // Old school scrollwheel delta

    if (orgEvent.wheelDelta) {
      delta = orgEvent.wheelDelta / 120;
    }

    if (orgEvent.detail) {
      delta = -orgEvent.detail / 3;
    } // New school multidimensional scroll (touchpads) deltas


    deltaY = delta; // Gecko

    if (orgEvent.axis !== undefined && orgEvent.axis === orgEvent.HORIZONTAL_AXIS) {
      deltaY = 0;
      deltaX = -1 * delta;
    } // Webkit


    if (orgEvent.wheelDeltaY !== undefined) {
      deltaY = orgEvent.wheelDeltaY / 120;
    }

    if (orgEvent.wheelDeltaX !== undefined) {
      deltaX = -1 * orgEvent.wheelDeltaX / 120;
    } // Add event and delta to the front of the arguments


    args.unshift(event, delta, deltaX, deltaY);
    return ($.event.dispatch || $.event.handle).apply(this, args);
  }
})(jQuery);
"use strict";

/**
 * navigation.js
 *
 * Handles toggling the navigation menu for small screens and enables tab
 * support for dropdown menus.
 */
(function () {
  var container, button, menu, links, subMenus;
  container = document.getElementById('site-navigation');

  if (!container) {
    return;
  }

  button = container.getElementsByTagName('button')[0];

  if ('undefined' === typeof button) {
    return;
  }

  menu = container.getElementsByTagName('ul')[0]; // Hide menu toggle button if menu is empty and return early.

  if ('undefined' === typeof menu) {
    button.style.display = 'none';
    return;
  }

  menu.setAttribute('aria-expanded', 'false');

  if (-1 === menu.className.indexOf('nav-menu')) {
    menu.className += ' nav-menu';
  }

  button.onclick = function () {
    if (-1 !== container.className.indexOf('toggled')) {
      container.className = container.className.replace(' toggled', '');
      button.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-expanded', 'false');
    } else {
      container.className += ' toggled';
      button.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-expanded', 'true');
    }
  }; // Get all the link elements within the menu.


  links = menu.getElementsByTagName('a');
  subMenus = menu.getElementsByTagName('ul'); // Set menu items with submenus to aria-haspopup="true".

  for (var i = 0, len = subMenus.length; i < len; i++) {
    subMenus[i].parentNode.setAttribute('aria-haspopup', 'true');
  } // Each time a menu link is focused or blurred, toggle focus.


  for (i = 0, len = links.length; i < len; i++) {
    links[i].addEventListener('focus', toggleFocus, true);
    links[i].addEventListener('blur', toggleFocus, true);
  }
  /**
   * Sets or removes .focus class on an element.
   */


  function toggleFocus() {
    var self = this; // Move up through the ancestors of the current link until we hit .nav-menu.

    while (-1 === self.className.indexOf('nav-menu')) {
      // On li elements toggle the class .focus.
      if ('li' === self.tagName.toLowerCase()) {
        if (-1 !== self.className.indexOf('focus')) {
          self.className = self.className.replace(' focus', '');
        } else {
          self.className += ' focus';
        }
      }

      self = self.parentElement;
    }
  }
})();
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/* jquery.nicescroll 3.2.0 InuYaksa*2013 MIT http://areaaperta.com/nicescroll */
(function (e) {
  var y = !1,
      D = !1,
      J = 5E3,
      K = 2E3,
      x = 0,
      L = function () {
    var e = document.getElementsByTagName("script"),
        e = e[e.length - 1].src.split("?")[0];
    return 0 < e.split("/").length ? e.split("/").slice(0, -1).join("/") + "/" : "";
  }();

  Array.prototype.forEach || (Array.prototype.forEach = function (e, c) {
    for (var h = 0, l = this.length; h < l; ++h) {
      e.call(c, this[h], h, this);
    }
  });
  var v = window.requestAnimationFrame || !1,
      w = window.cancelAnimationFrame || !1;
  ["ms", "moz", "webkit", "o"].forEach(function (e) {
    v || (v = window[e + "RequestAnimationFrame"]);
    w || (w = window[e + "CancelAnimationFrame"] || window[e + "CancelRequestAnimationFrame"]);
  });

  var z = window.MutationObserver || window.WebKitMutationObserver || !1,
      F = {
    zindex: "auto",
    cursoropacitymin: 0,
    cursoropacitymax: 1,
    cursorcolor: "#424242",
    cursorwidth: "5px",
    cursorborder: "1px solid #fff",
    cursorborderradius: "5px",
    scrollspeed: 60,
    mousescrollstep: 24,
    touchbehavior: !1,
    hwacceleration: !0,
    usetransition: !0,
    boxzoom: !1,
    dblclickzoom: !0,
    gesturezoom: !0,
    grabcursorenabled: !0,
    autohidemode: !0,
    background: "",
    iframeautoresize: !0,
    cursorminheight: 32,
    preservenativescrolling: !0,
    railoffset: !1,
    bouncescroll: !0,
    spacebarenabled: !0,
    railpadding: {
      top: 0,
      right: 0,
      left: 0,
      bottom: 0
    },
    disableoutline: !0,
    horizrailenabled: !0,
    railalign: "right",
    railvalign: "bottom",
    enabletranslate3d: !0,
    enablemousewheel: !0,
    enablekeyboard: !0,
    smoothscroll: !0,
    sensitiverail: !0,
    enablemouselockapi: !0,
    cursorfixedheight: !1,
    directionlockdeadzone: 6,
    hidecursordelay: 400,
    nativeparentscrolling: !0,
    enablescrollonselection: !0,
    overflowx: !0,
    overflowy: !0,
    cursordragspeed: 0.3,
    rtlmode: !1,
    cursordragontouch: !1
  },
      E = !1,
      M = function M() {
    if (E) return E;
    var e = document.createElement("DIV"),
        c = {
      haspointerlock: "pointerLockElement" in document || "mozPointerLockElement" in document || "webkitPointerLockElement" in document
    };
    c.isopera = "opera" in window;
    c.isopera12 = c.isopera && "getUserMedia" in navigator;
    c.isie = "all" in document && "attachEvent" in e && !c.isopera;
    c.isieold = c.isie && !("msInterpolationMode" in e.style);
    c.isie7 = c.isie && !c.isieold && (!("documentMode" in document) || 7 == document.documentMode);
    c.isie8 = c.isie && "documentMode" in document && 8 == document.documentMode;
    c.isie9 = c.isie && "performance" in window && 9 <= document.documentMode;
    c.isie10 = c.isie && "performance" in window && 10 <= document.documentMode;
    c.isie9mobile = /iemobile.9/i.test(navigator.userAgent);
    c.isie9mobile && (c.isie9 = !1);
    c.isie7mobile = !c.isie9mobile && c.isie7 && /iemobile/i.test(navigator.userAgent);
    c.ismozilla = "MozAppearance" in e.style;
    c.iswebkit = "WebkitAppearance" in e.style;
    c.ischrome = "chrome" in window;
    c.ischrome22 = c.ischrome && c.haspointerlock;
    c.ischrome26 = c.ischrome && "transition" in e.style;
    c.cantouch = "ontouchstart" in document.documentElement || "ontouchstart" in window;
    c.hasmstouch = window.navigator.msPointerEnabled || !1;
    c.ismac = /^mac$/i.test(navigator.platform);
    c.isios = c.cantouch && /iphone|ipad|ipod/i.test(navigator.platform);
    c.isios4 = c.isios && !("seal" in Object);
    c.isandroid = /android/i.test(navigator.userAgent);
    c.trstyle = !1;
    c.hastransform = !1;
    c.hastranslate3d = !1;
    c.transitionstyle = !1;
    c.hastransition = !1;
    c.transitionend = !1;

    for (var h = ["transform", "msTransform", "webkitTransform", "MozTransform", "OTransform"], l = 0; l < h.length; l++) {
      if ("undefined" != typeof e.style[h[l]]) {
        c.trstyle = h[l];
        break;
      }
    }

    c.hastransform = !1 != c.trstyle;
    c.hastransform && (e.style[c.trstyle] = "translate3d(1px,2px,3px)", c.hastranslate3d = /translate3d/.test(e.style[c.trstyle]));
    c.transitionstyle = !1;
    c.prefixstyle = "";
    c.transitionend = !1;

    for (var h = "transition webkitTransition MozTransition OTransition OTransition msTransition KhtmlTransition".split(" "), n = " -webkit- -moz- -o- -o -ms- -khtml-".split(" "), t = "transitionend webkitTransitionEnd transitionend otransitionend oTransitionEnd msTransitionEnd KhtmlTransitionEnd".split(" "), l = 0; l < h.length; l++) {
      if (h[l] in e.style) {
        c.transitionstyle = h[l];
        c.prefixstyle = n[l];
        c.transitionend = t[l];
        break;
      }
    }

    c.ischrome26 && (c.prefixstyle = n[1]);
    c.hastransition = c.transitionstyle;

    a: {
      h = ["-moz-grab", "-webkit-grab", "grab"];
      if (c.ischrome && !c.ischrome22 || c.isie) h = [];

      for (l = 0; l < h.length; l++) {
        if (n = h[l], e.style.cursor = n, e.style.cursor == n) {
          h = n;
          break a;
        }
      }

      h = "url(http://www.google.com/intl/en_ALL/mapfiles/openhand.cur),n-resize";
    }

    c.cursorgrabvalue = h;
    c.hasmousecapture = "setCapture" in e;
    c.hasMutationObserver = !1 !== z;
    return E = c;
  },
      N = function N(k, c) {
    function h() {
      var d = b.win;
      if ("zIndex" in d) return d.zIndex();

      for (; 0 < d.length && 9 != d[0].nodeType;) {
        var c = d.css("zIndex");
        if (!isNaN(c) && 0 != c) return parseInt(c);
        d = d.parent();
      }

      return !1;
    }

    function l(d, c, g) {
      c = d.css(c);
      d = parseFloat(c);
      return isNaN(d) ? (d = u[c] || 0, g = 3 == d ? g ? b.win.outerHeight() - b.win.innerHeight() : b.win.outerWidth() - b.win.innerWidth() : 1, b.isie8 && d && (d += 1), g ? d : 0) : d;
    }

    function n(d, c, g, e) {
      b._bind(d, c, function (b) {
        b = b ? b : window.event;
        var e = {
          original: b,
          target: b.target || b.srcElement,
          type: "wheel",
          deltaMode: "MozMousePixelScroll" == b.type ? 0 : 1,
          deltaX: 0,
          deltaZ: 0,
          preventDefault: function preventDefault() {
            b.preventDefault ? b.preventDefault() : b.returnValue = !1;
            return !1;
          },
          stopImmediatePropagation: function stopImmediatePropagation() {
            b.stopImmediatePropagation ? b.stopImmediatePropagation() : b.cancelBubble = !0;
          }
        };
        "mousewheel" == c ? (e.deltaY = -0.025 * b.wheelDelta, b.wheelDeltaX && (e.deltaX = -0.025 * b.wheelDeltaX)) : e.deltaY = b.detail;
        return g.call(d, e);
      }, e);
    }

    function t(d, c, g) {
      var e, f;
      0 == d.deltaMode ? (e = -Math.floor(d.deltaX * (b.opt.mousescrollstep / 54)), f = -Math.floor(d.deltaY * (b.opt.mousescrollstep / 54))) : 1 == d.deltaMode && (e = -Math.floor(d.deltaX * b.opt.mousescrollstep), f = -Math.floor(d.deltaY * b.opt.mousescrollstep));
      c && 0 == e && f && (e = f, f = 0);
      e && (b.scrollmom && b.scrollmom.stop(), b.lastdeltax += e, b.debounced("mousewheelx", function () {
        var d = b.lastdeltax;
        b.lastdeltax = 0;
        b.rail.drag || b.doScrollLeftBy(d);
      }, 120));

      if (f) {
        if (b.opt.nativeparentscrolling && g && !b.ispage && !b.zoomactive) if (0 > f) {
          if (b.getScrollTop() >= b.page.maxh) return !0;
        } else if (0 >= b.getScrollTop()) return !0;
        b.scrollmom && b.scrollmom.stop();
        b.lastdeltay += f;
        b.debounced("mousewheely", function () {
          var d = b.lastdeltay;
          b.lastdeltay = 0;
          b.rail.drag || b.doScrollBy(d);
        }, 120);
      }

      d.stopImmediatePropagation();
      return d.preventDefault();
    }

    var b = this;
    this.version = "3.4.0";
    this.name = "nicescroll";
    this.me = c;
    this.opt = {
      doc: e("body"),
      win: !1
    };
    e.extend(this.opt, F);
    this.opt.snapbackspeed = 80;
    if (k) for (var q in b.opt) {
      "undefined" != typeof k[q] && (b.opt[q] = k[q]);
    }
    this.iddoc = (this.doc = b.opt.doc) && this.doc[0] ? this.doc[0].id || "" : "";
    this.ispage = /BODY|HTML/.test(b.opt.win ? b.opt.win[0].nodeName : this.doc[0].nodeName);
    this.haswrapper = !1 !== b.opt.win;
    this.win = b.opt.win || (this.ispage ? e(window) : this.doc);
    this.docscroll = this.ispage && !this.haswrapper ? e(window) : this.win;
    this.body = e("body");
    this.iframe = this.isfixed = this.viewport = !1;
    this.isiframe = "IFRAME" == this.doc[0].nodeName && "IFRAME" == this.win[0].nodeName;
    this.istextarea = "TEXTAREA" == this.win[0].nodeName;
    this.forcescreen = !1;
    this.canshowonmouseevent = "scroll" != b.opt.autohidemode;
    this.page = this.view = this.onzoomout = this.onzoomin = this.onscrollcancel = this.onscrollend = this.onscrollstart = this.onclick = this.ongesturezoom = this.onkeypress = this.onmousewheel = this.onmousemove = this.onmouseup = this.onmousedown = !1;
    this.scroll = {
      x: 0,
      y: 0
    };
    this.scrollratio = {
      x: 0,
      y: 0
    };
    this.cursorheight = 20;
    this.scrollvaluemax = 0;
    this.observerremover = this.observer = this.scrollmom = this.scrollrunning = this.checkrtlmode = !1;

    do {
      this.id = "ascrail" + K++;
    } while (document.getElementById(this.id));

    this.hasmousefocus = this.hasfocus = this.zoomactive = this.zoom = this.selectiondrag = this.cursorfreezed = this.cursor = this.rail = !1;
    this.visibility = !0;
    this.hidden = this.locked = !1;
    this.cursoractive = !0;
    this.overflowx = b.opt.overflowx;
    this.overflowy = b.opt.overflowy;
    this.nativescrollingarea = !1;
    this.checkarea = 0;
    this.events = [];
    this.saved = {};
    this.delaylist = {};
    this.synclist = {};
    this.lastdeltay = this.lastdeltax = 0;
    this.detected = M();
    var f = e.extend({}, this.detected);
    this.ishwscroll = (this.canhwscroll = f.hastransform && b.opt.hwacceleration) && b.haswrapper;
    this.istouchcapable = !1;
    f.cantouch && f.ischrome && !f.isios && !f.isandroid && (this.istouchcapable = !0, f.cantouch = !1);
    f.cantouch && f.ismozilla && !f.isios && (this.istouchcapable = !0, f.cantouch = !1);
    b.opt.enablemouselockapi || (f.hasmousecapture = !1, f.haspointerlock = !1);

    this.delayed = function (d, c, g, e) {
      var f = b.delaylist[d],
          h = new Date().getTime();
      if (!e && f && f.tt) return !1;
      f && f.tt && clearTimeout(f.tt);
      if (f && f.last + g > h && !f.tt) b.delaylist[d] = {
        last: h + g,
        tt: setTimeout(function () {
          b.delaylist[d].tt = 0;
          c.call();
        }, g)
      };else if (!f || !f.tt) b.delaylist[d] = {
        last: h,
        tt: 0
      }, setTimeout(function () {
        c.call();
      }, 0);
    };

    this.debounced = function (d, c, g) {
      var f = b.delaylist[d];
      new Date().getTime();
      b.delaylist[d] = c;
      f || setTimeout(function () {
        var c = b.delaylist[d];
        b.delaylist[d] = !1;
        c.call();
      }, g);
    };

    this.synched = function (d, c) {
      b.synclist[d] = c;

      (function () {
        b.onsync || (v(function () {
          b.onsync = !1;

          for (d in b.synclist) {
            var c = b.synclist[d];
            c && c.call(b);
            b.synclist[d] = !1;
          }
        }), b.onsync = !0);
      })();

      return d;
    };

    this.unsynched = function (d) {
      b.synclist[d] && (b.synclist[d] = !1);
    };

    this.css = function (d, c) {
      for (var g in c) {
        b.saved.css.push([d, g, d.css(g)]), d.css(g, c[g]);
      }
    };

    this.scrollTop = function (d) {
      return "undefined" == typeof d ? b.getScrollTop() : b.setScrollTop(d);
    };

    this.scrollLeft = function (d) {
      return "undefined" == typeof d ? b.getScrollLeft() : b.setScrollLeft(d);
    };

    BezierClass = function BezierClass(b, c, g, f, e, h, l) {
      this.st = b;
      this.ed = c;
      this.spd = g;
      this.p1 = f || 0;
      this.p2 = e || 1;
      this.p3 = h || 0;
      this.p4 = l || 1;
      this.ts = new Date().getTime();
      this.df = this.ed - this.st;
    };

    BezierClass.prototype = {
      B2: function B2(b) {
        return 3 * b * b * (1 - b);
      },
      B3: function B3(b) {
        return 3 * b * (1 - b) * (1 - b);
      },
      B4: function B4(b) {
        return (1 - b) * (1 - b) * (1 - b);
      },
      getNow: function getNow() {
        var b = 1 - (new Date().getTime() - this.ts) / this.spd,
            c = this.B2(b) + this.B3(b) + this.B4(b);
        return 0 > b ? this.ed : this.st + Math.round(this.df * c);
      },
      update: function update(b, c) {
        this.st = this.getNow();
        this.ed = b;
        this.spd = c;
        this.ts = new Date().getTime();
        this.df = this.ed - this.st;
        return this;
      }
    };

    if (this.ishwscroll) {
      this.doc.translate = {
        x: 0,
        y: 0,
        tx: "0px",
        ty: "0px"
      };
      f.hastranslate3d && f.isios && this.doc.css("-webkit-backface-visibility", "hidden");

      var r = function r() {
        var d = b.doc.css(f.trstyle);
        return d && "matrix" == d.substr(0, 6) ? d.replace(/^.*\((.*)\)$/g, "$1").replace(/px/g, "").split(/, +/) : !1;
      };

      this.getScrollTop = function (d) {
        if (!d) {
          if (d = r()) return 16 == d.length ? -d[13] : -d[5];
          if (b.timerscroll && b.timerscroll.bz) return b.timerscroll.bz.getNow();
        }

        return b.doc.translate.y;
      };

      this.getScrollLeft = function (d) {
        if (!d) {
          if (d = r()) return 16 == d.length ? -d[12] : -d[4];
          if (b.timerscroll && b.timerscroll.bh) return b.timerscroll.bh.getNow();
        }

        return b.doc.translate.x;
      };

      this.notifyScrollEvent = document.createEvent ? function (b) {
        var c = document.createEvent("UIEvents");
        c.initUIEvent("scroll", !1, !0, window, 1);
        b.dispatchEvent(c);
      } : document.fireEvent ? function (b) {
        var c = document.createEventObject();
        b.fireEvent("onscroll");
        c.cancelBubble = !0;
      } : function (b, c) {};
      f.hastranslate3d && b.opt.enabletranslate3d ? (this.setScrollTop = function (d, c) {
        b.doc.translate.y = d;
        b.doc.translate.ty = -1 * d + "px";
        b.doc.css(f.trstyle, "translate3d(" + b.doc.translate.tx + "," + b.doc.translate.ty + ",0px)");
        c || b.notifyScrollEvent(b.win[0]);
      }, this.setScrollLeft = function (d, c) {
        b.doc.translate.x = d;
        b.doc.translate.tx = -1 * d + "px";
        b.doc.css(f.trstyle, "translate3d(" + b.doc.translate.tx + "," + b.doc.translate.ty + ",0px)");
        c || b.notifyScrollEvent(b.win[0]);
      }) : (this.setScrollTop = function (d, c) {
        b.doc.translate.y = d;
        b.doc.translate.ty = -1 * d + "px";
        b.doc.css(f.trstyle, "translate(" + b.doc.translate.tx + "," + b.doc.translate.ty + ")");
        c || b.notifyScrollEvent(b.win[0]);
      }, this.setScrollLeft = function (d, c) {
        b.doc.translate.x = d;
        b.doc.translate.tx = -1 * d + "px";
        b.doc.css(f.trstyle, "translate(" + b.doc.translate.tx + "," + b.doc.translate.ty + ")");
        c || b.notifyScrollEvent(b.win[0]);
      });
    } else this.getScrollTop = function () {
      return b.docscroll.scrollTop();
    }, this.setScrollTop = function (d) {
      return b.docscroll.scrollTop(d);
    }, this.getScrollLeft = function () {
      return b.docscroll.scrollLeft();
    }, this.setScrollLeft = function (d) {
      return b.docscroll.scrollLeft(d);
    };

    this.getTarget = function (b) {
      return !b ? !1 : b.target ? b.target : b.srcElement ? b.srcElement : !1;
    };

    this.hasParent = function (b, c) {
      if (!b) return !1;

      for (var g = b.target || b.srcElement || b || !1; g && g.id != c;) {
        g = g.parentNode || !1;
      }

      return !1 !== g;
    };

    var u = {
      thin: 1,
      medium: 3,
      thick: 5
    };

    this.getOffset = function () {
      if (b.isfixed) return {
        top: parseFloat(b.win.css("top")),
        left: parseFloat(b.win.css("left"))
      };
      if (!b.viewport) return b.win.offset();
      var d = b.win.offset(),
          c = b.viewport.offset();
      return {
        top: d.top - c.top + b.viewport.scrollTop(),
        left: d.left - c.left + b.viewport.scrollLeft()
      };
    };

    this.updateScrollBar = function (d) {
      if (b.ishwscroll) b.rail.css({
        height: b.win.innerHeight()
      }), b.railh && b.railh.css({
        width: b.win.innerWidth()
      });else {
        var c = b.getOffset(),
            g = c.top,
            f = c.left,
            g = g + l(b.win, "border-top-width", !0);
        b.win.outerWidth();
        b.win.innerWidth();
        var f = f + (b.rail.align ? b.win.outerWidth() - l(b.win, "border-right-width") - b.rail.width : l(b.win, "border-left-width")),
            e = b.opt.railoffset;
        e && (e.top && (g += e.top), b.rail.align && e.left && (f += e.left));
        b.locked || b.rail.css({
          top: g,
          left: f,
          height: d ? d.h : b.win.innerHeight()
        });
        b.zoom && b.zoom.css({
          top: g + 1,
          left: 1 == b.rail.align ? f - 20 : f + b.rail.width + 4
        });
        b.railh && !b.locked && (g = c.top, f = c.left, d = b.railh.align ? g + l(b.win, "border-top-width", !0) + b.win.innerHeight() - b.railh.height : g + l(b.win, "border-top-width", !0), f += l(b.win, "border-left-width"), b.railh.css({
          top: d,
          left: f,
          width: b.railh.width
        }));
      }
    };

    this.doRailClick = function (d, c, g) {
      var f;
      b.locked || (b.cancelEvent(d), c ? (c = g ? b.doScrollLeft : b.doScrollTop, f = g ? (d.pageX - b.railh.offset().left - b.cursorwidth / 2) * b.scrollratio.x : (d.pageY - b.rail.offset().top - b.cursorheight / 2) * b.scrollratio.y, c(f)) : (c = g ? b.doScrollLeftBy : b.doScrollBy, f = g ? b.scroll.x : b.scroll.y, d = g ? d.pageX - b.railh.offset().left : d.pageY - b.rail.offset().top, g = g ? b.view.w : b.view.h, f >= d ? c(g) : c(-g)));
    };

    b.hasanimationframe = v;
    b.hascancelanimationframe = w;
    b.hasanimationframe ? b.hascancelanimationframe || (w = function w() {
      b.cancelAnimationFrame = !0;
    }) : (v = function v(b) {
      return setTimeout(b, 15 - Math.floor(+new Date() / 1E3) % 16);
    }, w = clearInterval);

    this.init = function () {
      b.saved.css = [];
      if (f.isie7mobile) return !0;
      f.hasmstouch && b.css(b.ispage ? e("html") : b.win, {
        "-ms-touch-action": "none"
      });
      b.zindex = "auto";
      b.zindex = !b.ispage && "auto" == b.opt.zindex ? h() || "auto" : b.opt.zindex;
      !b.ispage && "auto" != b.zindex && b.zindex > x && (x = b.zindex);
      b.isie && 0 == b.zindex && "auto" == b.opt.zindex && (b.zindex = "auto");

      if (!b.ispage || !f.cantouch && !f.isieold && !f.isie9mobile) {
        var d = b.docscroll;
        b.ispage && (d = b.haswrapper ? b.win : b.doc);
        f.isie9mobile || b.css(d, {
          "overflow-y": "hidden"
        });
        b.ispage && f.isie7 && ("BODY" == b.doc[0].nodeName ? b.css(e("html"), {
          "overflow-y": "hidden"
        }) : "HTML" == b.doc[0].nodeName && b.css(e("body"), {
          "overflow-y": "hidden"
        }));
        f.isios && !b.ispage && !b.haswrapper && b.css(e("body"), {
          "-webkit-overflow-scrolling": "touch"
        });
        var c = e(document.createElement("div"));
        c.css({
          position: "relative",
          top: 0,
          "float": "right",
          width: b.opt.cursorwidth,
          height: "0px",
          "background-color": b.opt.cursorcolor,
          border: b.opt.cursorborder,
          "background-clip": "padding-box",
          "-webkit-border-radius": b.opt.cursorborderradius,
          "-moz-border-radius": b.opt.cursorborderradius,
          "border-radius": b.opt.cursorborderradius
        });
        c.hborder = parseFloat(c.outerHeight() - c.innerHeight());
        b.cursor = c;
        var g = e(document.createElement("div"));
        g.attr("id", b.id);
        g.addClass("nicescroll-rails");
        var l,
            k,
            n = ["left", "right"],
            G;

        for (G in n) {
          k = n[G], (l = b.opt.railpadding[k]) ? g.css("padding-" + k, l + "px") : b.opt.railpadding[k] = 0;
        }

        g.append(c);
        g.width = Math.max(parseFloat(b.opt.cursorwidth), c.outerWidth()) + b.opt.railpadding.left + b.opt.railpadding.right;
        g.css({
          width: g.width + "px",
          zIndex: b.zindex,
          background: b.opt.background,
          cursor: "default"
        });
        g.visibility = !0;
        g.scrollable = !0;
        g.align = "left" == b.opt.railalign ? 0 : 1;
        b.rail = g;
        c = b.rail.drag = !1;
        b.opt.boxzoom && !b.ispage && !f.isieold && (c = document.createElement("div"), b.bind(c, "click", b.doZoom), b.zoom = e(c), b.zoom.css({
          cursor: "pointer",
          "z-index": b.zindex,
          backgroundImage: "url(" + L + "zoomico.png)",
          height: 18,
          width: 18,
          backgroundPosition: "0px 0px"
        }), b.opt.dblclickzoom && b.bind(b.win, "dblclick", b.doZoom), f.cantouch && b.opt.gesturezoom && (b.ongesturezoom = function (d) {
          1.5 < d.scale && b.doZoomIn(d);
          0.8 > d.scale && b.doZoomOut(d);
          return b.cancelEvent(d);
        }, b.bind(b.win, "gestureend", b.ongesturezoom)));
        b.railh = !1;

        if (b.opt.horizrailenabled) {
          b.css(d, {
            "overflow-x": "hidden"
          });
          c = e(document.createElement("div"));
          c.css({
            position: "relative",
            top: 0,
            height: b.opt.cursorwidth,
            width: "0px",
            "background-color": b.opt.cursorcolor,
            border: b.opt.cursorborder,
            "background-clip": "padding-box",
            "-webkit-border-radius": b.opt.cursorborderradius,
            "-moz-border-radius": b.opt.cursorborderradius,
            "border-radius": b.opt.cursorborderradius
          });
          c.wborder = parseFloat(c.outerWidth() - c.innerWidth());
          b.cursorh = c;
          var m = e(document.createElement("div"));
          m.attr("id", b.id + "-hr");
          m.addClass("nicescroll-rails");
          m.height = Math.max(parseFloat(b.opt.cursorwidth), c.outerHeight());
          m.css({
            height: m.height + "px",
            zIndex: b.zindex,
            background: b.opt.background
          });
          m.append(c);
          m.visibility = !0;
          m.scrollable = !0;
          m.align = "top" == b.opt.railvalign ? 0 : 1;
          b.railh = m;
          b.railh.drag = !1;
        }

        b.ispage ? (g.css({
          position: "fixed",
          top: "0px",
          height: "100%"
        }), g.align ? g.css({
          right: "0px"
        }) : g.css({
          left: "0px"
        }), b.body.append(g), b.railh && (m.css({
          position: "fixed",
          left: "0px",
          width: "100%"
        }), m.align ? m.css({
          bottom: "0px"
        }) : m.css({
          top: "0px"
        }), b.body.append(m))) : (b.ishwscroll ? ("static" == b.win.css("position") && b.css(b.win, {
          position: "relative"
        }), d = "HTML" == b.win[0].nodeName ? b.body : b.win, b.zoom && (b.zoom.css({
          position: "absolute",
          top: 1,
          right: 0,
          "margin-right": g.width + 4
        }), d.append(b.zoom)), g.css({
          position: "absolute",
          top: 0
        }), g.align ? g.css({
          right: 0
        }) : g.css({
          left: 0
        }), d.append(g), m && (m.css({
          position: "absolute",
          left: 0,
          bottom: 0
        }), m.align ? m.css({
          bottom: 0
        }) : m.css({
          top: 0
        }), d.append(m))) : (b.isfixed = "fixed" == b.win.css("position"), d = b.isfixed ? "fixed" : "absolute", b.isfixed || (b.viewport = b.getViewport(b.win[0])), b.viewport && (b.body = b.viewport, !1 == /relative|absolute/.test(b.viewport.css("position")) && b.css(b.viewport, {
          position: "relative"
        })), g.css({
          position: d
        }), b.zoom && b.zoom.css({
          position: d
        }), b.updateScrollBar(), b.body.append(g), b.zoom && b.body.append(b.zoom), b.railh && (m.css({
          position: d
        }), b.body.append(m))), f.isios && b.css(b.win, {
          "-webkit-tap-highlight-color": "rgba(0,0,0,0)",
          "-webkit-touch-callout": "none"
        }), f.isie && b.opt.disableoutline && b.win.attr("hideFocus", "true"), f.iswebkit && b.opt.disableoutline && b.win.css({
          outline: "none"
        }));
        !1 === b.opt.autohidemode ? (b.autohidedom = !1, b.rail.css({
          opacity: b.opt.cursoropacitymax
        }), b.railh && b.railh.css({
          opacity: b.opt.cursoropacitymax
        })) : !0 === b.opt.autohidemode ? (b.autohidedom = e().add(b.rail), f.isie8 && (b.autohidedom = b.autohidedom.add(b.cursor)), b.railh && (b.autohidedom = b.autohidedom.add(b.railh)), b.railh && f.isie8 && (b.autohidedom = b.autohidedom.add(b.cursorh))) : "scroll" == b.opt.autohidemode ? (b.autohidedom = e().add(b.rail), b.railh && (b.autohidedom = b.autohidedom.add(b.railh))) : "cursor" == b.opt.autohidemode ? (b.autohidedom = e().add(b.cursor), b.railh && (b.autohidedom = b.autohidedom.add(b.cursorh))) : "hidden" == b.opt.autohidemode && (b.autohidedom = !1, b.hide(), b.locked = !1);
        if (f.isie9mobile) b.scrollmom = new H(b), b.onmangotouch = function (d) {
          d = b.getScrollTop();
          var c = b.getScrollLeft();
          if (d == b.scrollmom.lastscrolly && c == b.scrollmom.lastscrollx) return !0;
          var g = d - b.mangotouch.sy,
              f = c - b.mangotouch.sx;

          if (0 != Math.round(Math.sqrt(Math.pow(f, 2) + Math.pow(g, 2)))) {
            var p = 0 > g ? -1 : 1,
                e = 0 > f ? -1 : 1,
                h = +new Date();
            b.mangotouch.lazy && clearTimeout(b.mangotouch.lazy);
            80 < h - b.mangotouch.tm || b.mangotouch.dry != p || b.mangotouch.drx != e ? (b.scrollmom.stop(), b.scrollmom.reset(c, d), b.mangotouch.sy = d, b.mangotouch.ly = d, b.mangotouch.sx = c, b.mangotouch.lx = c, b.mangotouch.dry = p, b.mangotouch.drx = e, b.mangotouch.tm = h) : (b.scrollmom.stop(), b.scrollmom.update(b.mangotouch.sx - f, b.mangotouch.sy - g), b.mangotouch.tm = h, g = Math.max(Math.abs(b.mangotouch.ly - d), Math.abs(b.mangotouch.lx - c)), b.mangotouch.ly = d, b.mangotouch.lx = c, 2 < g && (b.mangotouch.lazy = setTimeout(function () {
              b.mangotouch.lazy = !1;
              b.mangotouch.dry = 0;
              b.mangotouch.drx = 0;
              b.mangotouch.tm = 0;
              b.scrollmom.doMomentum(30);
            }, 100)));
          }
        }, g = b.getScrollTop(), m = b.getScrollLeft(), b.mangotouch = {
          sy: g,
          ly: g,
          dry: 0,
          sx: m,
          lx: m,
          drx: 0,
          lazy: !1,
          tm: 0
        }, b.bind(b.docscroll, "scroll", b.onmangotouch);else {
          if (f.cantouch || b.istouchcapable || b.opt.touchbehavior || f.hasmstouch) {
            b.scrollmom = new H(b);

            b.ontouchstart = function (d) {
              if (d.pointerType && 2 != d.pointerType) return !1;

              if (!b.locked) {
                if (f.hasmstouch) for (var c = d.target ? d.target : !1; c;) {
                  var g = e(c).getNiceScroll();
                  if (0 < g.length && g[0].me == b.me) break;
                  if (0 < g.length) return !1;
                  if ("DIV" == c.nodeName && c.id == b.id) break;
                  c = c.parentNode ? c.parentNode : !1;
                }
                b.cancelScroll();
                if ((c = b.getTarget(d)) && /INPUT/i.test(c.nodeName) && /range/i.test(c.type)) return b.stopPropagation(d);
                !("clientX" in d) && "changedTouches" in d && (d.clientX = d.changedTouches[0].clientX, d.clientY = d.changedTouches[0].clientY);
                b.forcescreen && (g = d, d = {
                  original: d.original ? d.original : d
                }, d.clientX = g.screenX, d.clientY = g.screenY);
                b.rail.drag = {
                  x: d.clientX,
                  y: d.clientY,
                  sx: b.scroll.x,
                  sy: b.scroll.y,
                  st: b.getScrollTop(),
                  sl: b.getScrollLeft(),
                  pt: 2,
                  dl: !1
                };
                if (b.ispage || !b.opt.directionlockdeadzone) b.rail.drag.dl = "f";else {
                  var g = e(window).width(),
                      p = e(window).height(),
                      h = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
                      l = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
                      p = Math.max(0, l - p),
                      g = Math.max(0, h - g);
                  b.rail.drag.ck = !b.rail.scrollable && b.railh.scrollable ? 0 < p ? "v" : !1 : b.rail.scrollable && !b.railh.scrollable ? 0 < g ? "h" : !1 : !1;
                  b.rail.drag.ck || (b.rail.drag.dl = "f");
                }
                b.opt.touchbehavior && b.isiframe && f.isie && (g = b.win.position(), b.rail.drag.x += g.left, b.rail.drag.y += g.top);
                b.hasmoving = !1;
                b.lastmouseup = !1;
                b.scrollmom.reset(d.clientX, d.clientY);

                if (!f.cantouch && !this.istouchcapable && !f.hasmstouch) {
                  if (!c || !/INPUT|SELECT|TEXTAREA/i.test(c.nodeName)) return !b.ispage && f.hasmousecapture && c.setCapture(), b.cancelEvent(d);
                  /SUBMIT|CANCEL|BUTTON/i.test(e(c).attr("type")) && (pc = {
                    tg: c,
                    click: !1
                  }, b.preventclick = pc);
                }
              }
            };

            b.ontouchend = function (d) {
              if (d.pointerType && 2 != d.pointerType) return !1;
              if (b.rail.drag && 2 == b.rail.drag.pt && (b.scrollmom.doMomentum(), b.rail.drag = !1, b.hasmoving && (b.hasmoving = !1, b.lastmouseup = !0, b.hideCursor(), f.hasmousecapture && document.releaseCapture(), !f.cantouch))) return b.cancelEvent(d);
            };

            var q = b.opt.touchbehavior && b.isiframe && !f.hasmousecapture;

            b.ontouchmove = function (d, c) {
              if (d.pointerType && 2 != d.pointerType) return !1;

              if (b.rail.drag && 2 == b.rail.drag.pt) {
                if (f.cantouch && "undefined" == typeof d.original) return !0;
                b.hasmoving = !0;
                b.preventclick && !b.preventclick.click && (b.preventclick.click = b.preventclick.tg.onclick || !1, b.preventclick.tg.onclick = b.onpreventclick);
                d = e.extend({
                  original: d
                }, d);
                "changedTouches" in d && (d.clientX = d.changedTouches[0].clientX, d.clientY = d.changedTouches[0].clientY);

                if (b.forcescreen) {
                  var g = d;
                  d = {
                    original: d.original ? d.original : d
                  };
                  d.clientX = g.screenX;
                  d.clientY = g.screenY;
                }

                g = ofy = 0;

                if (q && !c) {
                  var p = b.win.position(),
                      g = -p.left;
                  ofy = -p.top;
                }

                var h = d.clientY + ofy,
                    p = h - b.rail.drag.y,
                    l = d.clientX + g,
                    k = l - b.rail.drag.x,
                    s = b.rail.drag.st - p;
                b.ishwscroll && b.opt.bouncescroll ? 0 > s ? s = Math.round(s / 2) : s > b.page.maxh && (s = b.page.maxh + Math.round((s - b.page.maxh) / 2)) : (0 > s && (h = s = 0), s > b.page.maxh && (s = b.page.maxh, h = 0));

                if (b.railh && b.railh.scrollable) {
                  var m = b.rail.drag.sl - k;
                  b.ishwscroll && b.opt.bouncescroll ? 0 > m ? m = Math.round(m / 2) : m > b.page.maxw && (m = b.page.maxw + Math.round((m - b.page.maxw) / 2)) : (0 > m && (l = m = 0), m > b.page.maxw && (m = b.page.maxw, l = 0));
                }

                g = !1;
                if (b.rail.drag.dl) g = !0, "v" == b.rail.drag.dl ? m = b.rail.drag.sl : "h" == b.rail.drag.dl && (s = b.rail.drag.st);else {
                  var p = Math.abs(p),
                      k = Math.abs(k),
                      n = b.opt.directionlockdeadzone;

                  if ("v" == b.rail.drag.ck) {
                    if (p > n && k <= 0.3 * p) return b.rail.drag = !1, !0;
                    k > n && (b.rail.drag.dl = "f", e("body").scrollTop(e("body").scrollTop()));
                  } else if ("h" == b.rail.drag.ck) {
                    if (k > n && p <= 0.3 * az) return b.rail.drag = !1, !0;
                    p > n && (b.rail.drag.dl = "f", e("body").scrollLeft(e("body").scrollLeft()));
                  }
                }
                b.synched("touchmove", function () {
                  b.rail.drag && 2 == b.rail.drag.pt && (b.prepareTransition && b.prepareTransition(0), b.rail.scrollable && b.setScrollTop(s), b.scrollmom.update(l, h), b.railh && b.railh.scrollable ? (b.setScrollLeft(m), b.showCursor(s, m)) : b.showCursor(s), f.isie10 && document.selection.clear());
                });
                f.ischrome && b.istouchcapable && (g = !1);
                if (g) return b.cancelEvent(d);
              }
            };
          }

          b.onmousedown = function (d, c) {
            if (!(b.rail.drag && 1 != b.rail.drag.pt)) {
              if (b.locked) return b.cancelEvent(d);
              b.cancelScroll();
              b.rail.drag = {
                x: d.clientX,
                y: d.clientY,
                sx: b.scroll.x,
                sy: b.scroll.y,
                pt: 1,
                hr: !!c
              };
              var g = b.getTarget(d);
              !b.ispage && f.hasmousecapture && g.setCapture();
              b.isiframe && !f.hasmousecapture && (b.saved.csspointerevents = b.doc.css("pointer-events"), b.css(b.doc, {
                "pointer-events": "none"
              }));
              return b.cancelEvent(d);
            }
          };

          b.onmouseup = function (d) {
            if (b.rail.drag && (f.hasmousecapture && document.releaseCapture(), b.isiframe && !f.hasmousecapture && b.doc.css("pointer-events", b.saved.csspointerevents), 1 == b.rail.drag.pt)) return b.rail.drag = !1, b.cancelEvent(d);
          };

          b.onmousemove = function (d) {
            if (b.rail.drag && 1 == b.rail.drag.pt) {
              if (f.ischrome && 0 == d.which) return b.onmouseup(d);
              b.cursorfreezed = !0;

              if (b.rail.drag.hr) {
                b.scroll.x = b.rail.drag.sx + (d.clientX - b.rail.drag.x);
                0 > b.scroll.x && (b.scroll.x = 0);
                var c = b.scrollvaluemaxw;
                b.scroll.x > c && (b.scroll.x = c);
              } else b.scroll.y = b.rail.drag.sy + (d.clientY - b.rail.drag.y), 0 > b.scroll.y && (b.scroll.y = 0), c = b.scrollvaluemax, b.scroll.y > c && (b.scroll.y = c);

              b.synched("mousemove", function () {
                b.rail.drag && 1 == b.rail.drag.pt && (b.showCursor(), b.rail.drag.hr ? b.doScrollLeft(Math.round(b.scroll.x * b.scrollratio.x), b.opt.cursordragspeed) : b.doScrollTop(Math.round(b.scroll.y * b.scrollratio.y), b.opt.cursordragspeed));
              });
              return b.cancelEvent(d);
            }
          };

          if (f.cantouch || b.opt.touchbehavior) b.onpreventclick = function (d) {
            if (b.preventclick) return b.preventclick.tg.onclick = b.preventclick.click, b.preventclick = !1, b.cancelEvent(d);
          }, b.bind(b.win, "mousedown", b.ontouchstart), b.onclick = f.isios ? !1 : function (d) {
            return b.lastmouseup ? (b.lastmouseup = !1, b.cancelEvent(d)) : !0;
          }, b.opt.grabcursorenabled && f.cursorgrabvalue && (b.css(b.ispage ? b.doc : b.win, {
            cursor: f.cursorgrabvalue
          }), b.css(b.rail, {
            cursor: f.cursorgrabvalue
          }));else {
            var r = function r(d) {
              if (b.selectiondrag) {
                if (d) {
                  var c = b.win.outerHeight();
                  d = d.pageY - b.selectiondrag.top;
                  0 < d && d < c && (d = 0);
                  d >= c && (d -= c);
                  b.selectiondrag.df = d;
                }

                0 != b.selectiondrag.df && (b.doScrollBy(2 * -Math.floor(b.selectiondrag.df / 6)), b.debounced("doselectionscroll", function () {
                  r();
                }, 50));
              }
            };

            b.hasTextSelected = "getSelection" in document ? function () {
              return 0 < document.getSelection().rangeCount;
            } : "selection" in document ? function () {
              return "None" != document.selection.type;
            } : function () {
              return !1;
            };

            b.onselectionstart = function (d) {
              b.ispage || (b.selectiondrag = b.win.offset());
            };

            b.onselectionend = function (d) {
              b.selectiondrag = !1;
            };

            b.onselectiondrag = function (d) {
              b.selectiondrag && b.hasTextSelected() && b.debounced("selectionscroll", function () {
                r(d);
              }, 250);
            };
          }
          f.hasmstouch && (b.css(b.rail, {
            "-ms-touch-action": "none"
          }), b.css(b.cursor, {
            "-ms-touch-action": "none"
          }), b.bind(b.win, "MSPointerDown", b.ontouchstart), b.bind(document, "MSPointerUp", b.ontouchend), b.bind(document, "MSPointerMove", b.ontouchmove), b.bind(b.cursor, "MSGestureHold", function (b) {
            b.preventDefault();
          }), b.bind(b.cursor, "contextmenu", function (b) {
            b.preventDefault();
          }));
          this.istouchcapable && (b.bind(b.win, "touchstart", b.ontouchstart), b.bind(document, "touchend", b.ontouchend), b.bind(document, "touchcancel", b.ontouchend), b.bind(document, "touchmove", b.ontouchmove));
          b.bind(b.cursor, "mousedown", b.onmousedown);
          b.bind(b.cursor, "mouseup", b.onmouseup);
          b.railh && (b.bind(b.cursorh, "mousedown", function (d) {
            b.onmousedown(d, !0);
          }), b.bind(b.cursorh, "mouseup", function (d) {
            if (!(b.rail.drag && 2 == b.rail.drag.pt)) return b.rail.drag = !1, b.hasmoving = !1, b.hideCursor(), f.hasmousecapture && document.releaseCapture(), b.cancelEvent(d);
          }));
          if (b.opt.cursordragontouch || !f.cantouch && !b.opt.touchbehavior) b.rail.css({
            cursor: "default"
          }), b.railh && b.railh.css({
            cursor: "default"
          }), b.jqbind(b.rail, "mouseenter", function () {
            b.canshowonmouseevent && b.showCursor();
            b.rail.active = !0;
          }), b.jqbind(b.rail, "mouseleave", function () {
            b.rail.active = !1;
            b.rail.drag || b.hideCursor();
          }), b.opt.sensitiverail && (b.bind(b.rail, "click", function (d) {
            b.doRailClick(d, !1, !1);
          }), b.bind(b.rail, "dblclick", function (d) {
            b.doRailClick(d, !0, !1);
          }), b.bind(b.cursor, "click", function (d) {
            b.cancelEvent(d);
          }), b.bind(b.cursor, "dblclick", function (d) {
            b.cancelEvent(d);
          })), b.railh && (b.jqbind(b.railh, "mouseenter", function () {
            b.canshowonmouseevent && b.showCursor();
            b.rail.active = !0;
          }), b.jqbind(b.railh, "mouseleave", function () {
            b.rail.active = !1;
            b.rail.drag || b.hideCursor();
          }), b.opt.sensitiverail && (b.bind(b.railh, "click", function (d) {
            b.doRailClick(d, !1, !0);
          }), b.bind(b.railh, "dblclick", function (d) {
            b.doRailClick(d, !0, !0);
          }), b.bind(b.cursorh, "click", function (d) {
            b.cancelEvent(d);
          }), b.bind(b.cursorh, "dblclick", function (d) {
            b.cancelEvent(d);
          })));
          !f.cantouch && !b.opt.touchbehavior ? (b.bind(f.hasmousecapture ? b.win : document, "mouseup", b.onmouseup), b.bind(document, "mousemove", b.onmousemove), b.onclick && b.bind(document, "click", b.onclick), !b.ispage && b.opt.enablescrollonselection && (b.bind(b.win[0], "mousedown", b.onselectionstart), b.bind(document, "mouseup", b.onselectionend), b.bind(b.cursor, "mouseup", b.onselectionend), b.cursorh && b.bind(b.cursorh, "mouseup", b.onselectionend), b.bind(document, "mousemove", b.onselectiondrag)), b.zoom && (b.jqbind(b.zoom, "mouseenter", function () {
            b.canshowonmouseevent && b.showCursor();
            b.rail.active = !0;
          }), b.jqbind(b.zoom, "mouseleave", function () {
            b.rail.active = !1;
            b.rail.drag || b.hideCursor();
          }))) : (b.bind(f.hasmousecapture ? b.win : document, "mouseup", b.ontouchend), b.bind(document, "mousemove", b.ontouchmove), b.onclick && b.bind(document, "click", b.onclick), b.opt.cursordragontouch && (b.bind(b.cursor, "mousedown", b.onmousedown), b.bind(b.cursor, "mousemove", b.onmousemove), b.cursorh && b.bind(b.cursorh, "mousedown", b.onmousedown), b.cursorh && b.bind(b.cursorh, "mousemove", b.onmousemove)));
          b.opt.enablemousewheel && (b.isiframe || b.bind(f.isie && b.ispage ? document : b.docscroll, "mousewheel", b.onmousewheel), b.bind(b.rail, "mousewheel", b.onmousewheel), b.railh && b.bind(b.railh, "mousewheel", b.onmousewheelhr));
          !b.ispage && !f.cantouch && !/HTML|BODY/.test(b.win[0].nodeName) && (b.win.attr("tabindex") || b.win.attr({
            tabindex: J++
          }), b.jqbind(b.win, "focus", function (d) {
            y = b.getTarget(d).id || !0;
            b.hasfocus = !0;
            b.canshowonmouseevent && b.noticeCursor();
          }), b.jqbind(b.win, "blur", function (d) {
            y = !1;
            b.hasfocus = !1;
          }), b.jqbind(b.win, "mouseenter", function (d) {
            D = b.getTarget(d).id || !0;
            b.hasmousefocus = !0;
            b.canshowonmouseevent && b.noticeCursor();
          }), b.jqbind(b.win, "mouseleave", function () {
            D = !1;
            b.hasmousefocus = !1;
          }));
        }

        b.onkeypress = function (d) {
          if (b.locked && 0 == b.page.maxh) return !0;
          d = d ? d : window.e;
          var c = b.getTarget(d);
          if (c && /INPUT|TEXTAREA|SELECT|OPTION/.test(c.nodeName) && (!c.getAttribute("type") && !c.type || !/submit|button|cancel/i.tp)) return !0;

          if (b.hasfocus || b.hasmousefocus && !y || b.ispage && !y && !D) {
            c = d.keyCode;
            if (b.locked && 27 != c) return b.cancelEvent(d);
            var g = d.ctrlKey || !1,
                p = d.shiftKey || !1,
                f = !1;

            switch (c) {
              case 38:
              case 63233:
                b.doScrollBy(72);
                f = !0;
                break;

              case 40:
              case 63235:
                b.doScrollBy(-72);
                f = !0;
                break;

              case 37:
              case 63232:
                b.railh && (g ? b.doScrollLeft(0) : b.doScrollLeftBy(72), f = !0);
                break;

              case 39:
              case 63234:
                b.railh && (g ? b.doScrollLeft(b.page.maxw) : b.doScrollLeftBy(-72), f = !0);
                break;

              case 33:
              case 63276:
                b.doScrollBy(b.view.h);
                f = !0;
                break;

              case 34:
              case 63277:
                b.doScrollBy(-b.view.h);
                f = !0;
                break;

              case 36:
              case 63273:
                b.railh && g ? b.doScrollPos(0, 0) : b.doScrollTo(0);
                f = !0;
                break;

              case 35:
              case 63275:
                b.railh && g ? b.doScrollPos(b.page.maxw, b.page.maxh) : b.doScrollTo(b.page.maxh);
                f = !0;
                break;

              case 32:
                b.opt.spacebarenabled && (p ? b.doScrollBy(b.view.h) : b.doScrollBy(-b.view.h), f = !0);
                break;

              case 27:
                b.zoomactive && (b.doZoom(), f = !0);
            }

            if (f) return b.cancelEvent(d);
          }
        };

        b.opt.enablekeyboard && b.bind(document, f.isopera && !f.isopera12 ? "keypress" : "keydown", b.onkeypress);
        b.bind(window, "resize", b.lazyResize);
        b.bind(window, "orientationchange", b.lazyResize);
        b.bind(window, "load", b.lazyResize);

        if (f.ischrome && !b.ispage && !b.haswrapper) {
          var t = b.win.attr("style"),
              g = parseFloat(b.win.css("width")) + 1;
          b.win.css("width", g);
          b.synched("chromefix", function () {
            b.win.attr("style", t);
          });
        }

        b.onAttributeChange = function (d) {
          b.lazyResize(250);
        };

        !b.ispage && !b.haswrapper && (!1 !== z ? (b.observer = new z(function (d) {
          d.forEach(b.onAttributeChange);
        }), b.observer.observe(b.win[0], {
          childList: !0,
          characterData: !1,
          attributes: !0,
          subtree: !1
        }), b.observerremover = new z(function (d) {
          d.forEach(function (d) {
            if (0 < d.removedNodes.length) for (var c in d.removedNodes) {
              if (d.removedNodes[c] == b.win[0]) return b.remove();
            }
          });
        }), b.observerremover.observe(b.win[0].parentNode, {
          childList: !0,
          characterData: !1,
          attributes: !1,
          subtree: !1
        })) : (b.bind(b.win, f.isie && !f.isie9 ? "propertychange" : "DOMAttrModified", b.onAttributeChange), f.isie9 && b.win[0].attachEvent("onpropertychange", b.onAttributeChange), b.bind(b.win, "DOMNodeRemoved", function (d) {
          d.target == b.win[0] && b.remove();
        })));
        !b.ispage && b.opt.boxzoom && b.bind(window, "resize", b.resizeZoom);
        b.istextarea && b.bind(b.win, "mouseup", b.lazyResize);
        b.checkrtlmode = !0;
        b.lazyResize(30);
      }

      if ("IFRAME" == this.doc[0].nodeName) {
        var I = function I(d) {
          b.iframexd = !1;

          try {
            var c = "contentDocument" in this ? this.contentDocument : this.contentWindow.document;
          } catch (g) {
            b.iframexd = !0, c = !1;
          }

          if (b.iframexd) return "console" in window && console.log("NiceScroll error: policy restriced iframe"), !0;
          b.forcescreen = !0;
          b.isiframe && (b.iframe = {
            doc: e(c),
            html: b.doc.contents().find("html")[0],
            body: b.doc.contents().find("body")[0]
          }, b.getContentSize = function () {
            return {
              w: Math.max(b.iframe.html.scrollWidth, b.iframe.body.scrollWidth),
              h: Math.max(b.iframe.html.scrollHeight, b.iframe.body.scrollHeight)
            };
          }, b.docscroll = e(b.iframe.body));
          !f.isios && b.opt.iframeautoresize && !b.isiframe && (b.win.scrollTop(0), b.doc.height(""), d = Math.max(c.getElementsByTagName("html")[0].scrollHeight, c.body.scrollHeight), b.doc.height(d));
          b.lazyResize(30);
          f.isie7 && b.css(e(b.iframe.html), {
            "overflow-y": "hidden"
          });
          b.css(e(b.iframe.body), {
            "overflow-y": "hidden"
          });
          "contentWindow" in this ? b.bind(this.contentWindow, "scroll", b.onscroll) : b.bind(c, "scroll", b.onscroll);
          b.opt.enablemousewheel && b.bind(c, "mousewheel", b.onmousewheel);
          b.opt.enablekeyboard && b.bind(c, f.isopera ? "keypress" : "keydown", b.onkeypress);
          if (f.cantouch || b.opt.touchbehavior) b.bind(c, "mousedown", b.onmousedown), b.bind(c, "mousemove", function (d) {
            b.onmousemove(d, !0);
          }), b.opt.grabcursorenabled && f.cursorgrabvalue && b.css(e(c.body), {
            cursor: f.cursorgrabvalue
          });
          b.bind(c, "mouseup", b.onmouseup);
          b.zoom && (b.opt.dblclickzoom && b.bind(c, "dblclick", b.doZoom), b.ongesturezoom && b.bind(c, "gestureend", b.ongesturezoom));
        };

        this.doc[0].readyState && "complete" == this.doc[0].readyState && setTimeout(function () {
          I.call(b.doc[0], !1);
        }, 500);
        b.bind(this.doc, "load", I);
      }
    };

    this.showCursor = function (d, c) {
      b.cursortimeout && (clearTimeout(b.cursortimeout), b.cursortimeout = 0);

      if (b.rail) {
        b.autohidedom && (b.autohidedom.stop().css({
          opacity: b.opt.cursoropacitymax
        }), b.cursoractive = !0);
        if (!b.rail.drag || 1 != b.rail.drag.pt) "undefined" != typeof d && !1 !== d && (b.scroll.y = Math.round(1 * d / b.scrollratio.y)), "undefined" != typeof c && (b.scroll.x = Math.round(1 * c / b.scrollratio.x));
        b.cursor.css({
          height: b.cursorheight,
          top: b.scroll.y
        });
        b.cursorh && (!b.rail.align && b.rail.visibility ? b.cursorh.css({
          width: b.cursorwidth,
          left: b.scroll.x + b.rail.width
        }) : b.cursorh.css({
          width: b.cursorwidth,
          left: b.scroll.x
        }), b.cursoractive = !0);
        b.zoom && b.zoom.stop().css({
          opacity: b.opt.cursoropacitymax
        });
      }
    };

    this.hideCursor = function (d) {
      !b.cursortimeout && b.rail && b.autohidedom && (b.cursortimeout = setTimeout(function () {
        if (!b.rail.active || !b.showonmouseevent) b.autohidedom.stop().animate({
          opacity: b.opt.cursoropacitymin
        }), b.zoom && b.zoom.stop().animate({
          opacity: b.opt.cursoropacitymin
        }), b.cursoractive = !1;
        b.cursortimeout = 0;
      }, d || b.opt.hidecursordelay));
    };

    this.noticeCursor = function (d, c, g) {
      b.showCursor(c, g);
      b.rail.active || b.hideCursor(d);
    };

    this.getContentSize = b.ispage ? function () {
      return {
        w: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        h: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
      };
    } : b.haswrapper ? function () {
      return {
        w: b.doc.outerWidth() + parseInt(b.win.css("paddingLeft")) + parseInt(b.win.css("paddingRight")),
        h: b.doc.outerHeight() + parseInt(b.win.css("paddingTop")) + parseInt(b.win.css("paddingBottom"))
      };
    } : function () {
      return {
        w: b.docscroll[0].scrollWidth,
        h: b.docscroll[0].scrollHeight
      };
    };

    this.onResize = function (d, c) {
      if (!b.win) return !1;

      if (!b.haswrapper && !b.ispage) {
        if ("none" == b.win.css("display")) return b.visibility && b.hideRail().hideRailHr(), !1;
        !b.hidden && !b.visibility && b.showRail().showRailHr();
      }

      var g = b.page.maxh,
          f = b.page.maxw,
          e = b.view.w;
      b.view = {
        w: b.ispage ? b.win.width() : parseInt(b.win[0].clientWidth),
        h: b.ispage ? b.win.height() : parseInt(b.win[0].clientHeight)
      };
      b.page = c ? c : b.getContentSize();
      b.page.maxh = Math.max(0, b.page.h - b.view.h);
      b.page.maxw = Math.max(0, b.page.w - b.view.w);

      if (b.page.maxh == g && b.page.maxw == f && b.view.w == e) {
        if (b.ispage) return b;
        g = b.win.offset();
        if (b.lastposition && (f = b.lastposition, f.top == g.top && f.left == g.left)) return b;
        b.lastposition = g;
      }

      0 == b.page.maxh ? (b.hideRail(), b.scrollvaluemax = 0, b.scroll.y = 0, b.scrollratio.y = 0, b.cursorheight = 0, b.setScrollTop(0), b.rail.scrollable = !1) : b.rail.scrollable = !0;
      0 == b.page.maxw ? (b.hideRailHr(), b.scrollvaluemaxw = 0, b.scroll.x = 0, b.scrollratio.x = 0, b.cursorwidth = 0, b.setScrollLeft(0), b.railh.scrollable = !1) : b.railh.scrollable = !0;
      b.locked = 0 == b.page.maxh && 0 == b.page.maxw;
      if (b.locked) return b.ispage || b.updateScrollBar(b.view), !1;
      !b.hidden && !b.visibility ? b.showRail().showRailHr() : !b.hidden && !b.railh.visibility && b.showRailHr();
      b.istextarea && b.win.css("resize") && "none" != b.win.css("resize") && (b.view.h -= 20);
      b.cursorheight = Math.min(b.view.h, Math.round(b.view.h * (b.view.h / b.page.h)));
      b.cursorheight = b.opt.cursorfixedheight ? b.opt.cursorfixedheight : Math.max(b.opt.cursorminheight, b.cursorheight);
      b.cursorwidth = Math.min(b.view.w, Math.round(b.view.w * (b.view.w / b.page.w)));
      b.cursorwidth = b.opt.cursorfixedheight ? b.opt.cursorfixedheight : Math.max(b.opt.cursorminheight, b.cursorwidth);
      b.scrollvaluemax = b.view.h - b.cursorheight - b.cursor.hborder;
      b.railh && (b.railh.width = 0 < b.page.maxh ? b.view.w - b.rail.width : b.view.w, b.scrollvaluemaxw = b.railh.width - b.cursorwidth - b.cursorh.wborder);
      b.checkrtlmode && b.railh && (b.checkrtlmode = !1, b.opt.rtlmode && 0 == b.scroll.x && b.setScrollLeft(b.page.maxw));
      b.ispage || b.updateScrollBar(b.view);
      b.scrollratio = {
        x: b.page.maxw / b.scrollvaluemaxw,
        y: b.page.maxh / b.scrollvaluemax
      };
      b.getScrollTop() > b.page.maxh ? b.doScrollTop(b.page.maxh) : (b.scroll.y = Math.round(b.getScrollTop() * (1 / b.scrollratio.y)), b.scroll.x = Math.round(b.getScrollLeft() * (1 / b.scrollratio.x)), b.cursoractive && b.noticeCursor());
      b.scroll.y && 0 == b.getScrollTop() && b.doScrollTo(Math.floor(b.scroll.y * b.scrollratio.y));
      return b;
    };

    this.resize = b.onResize;

    this.lazyResize = function (d) {
      d = isNaN(d) ? 30 : d;
      b.delayed("resize", b.resize, d);
      return b;
    };

    this._bind = function (d, c, g, f) {
      b.events.push({
        e: d,
        n: c,
        f: g,
        b: f,
        q: !1
      });
      d.addEventListener ? d.addEventListener(c, g, f || !1) : d.attachEvent ? d.attachEvent("on" + c, g) : d["on" + c] = g;
    };

    this.jqbind = function (d, c, g) {
      b.events.push({
        e: d,
        n: c,
        f: g,
        q: !0
      });
      e(d).bind(c, g);
    };

    this.bind = function (d, c, g, e) {
      var h = "jquery" in d ? d[0] : d;
      "mousewheel" == c ? "onwheel" in b.win ? b._bind(h, "wheel", g, e || !1) : (d = "undefined" != typeof document.onmousewheel ? "mousewheel" : "DOMMouseScroll", n(h, d, g, e || !1), "DOMMouseScroll" == d && n(h, "MozMousePixelScroll", g, e || !1)) : h.addEventListener ? (f.cantouch && /mouseup|mousedown|mousemove/.test(c) && b._bind(h, "mousedown" == c ? "touchstart" : "mouseup" == c ? "touchend" : "touchmove", function (b) {
        if (b.touches) {
          if (2 > b.touches.length) {
            var d = b.touches.length ? b.touches[0] : b;
            d.original = b;
            g.call(this, d);
          }
        } else b.changedTouches && (d = b.changedTouches[0], d.original = b, g.call(this, d));
      }, e || !1), b._bind(h, c, g, e || !1), f.cantouch && "mouseup" == c && b._bind(h, "touchcancel", g, e || !1)) : b._bind(h, c, function (d) {
        if ((d = d || window.event || !1) && d.srcElement) d.target = d.srcElement;
        "pageY" in d || (d.pageX = d.clientX + document.documentElement.scrollLeft, d.pageY = d.clientY + document.documentElement.scrollTop);
        return !1 === g.call(h, d) || !1 === e ? b.cancelEvent(d) : !0;
      });
    };

    this._unbind = function (b, c, g, f) {
      b.removeEventListener ? b.removeEventListener(c, g, f) : b.detachEvent ? b.detachEvent("on" + c, g) : b["on" + c] = !1;
    };

    this.unbindAll = function () {
      for (var d = 0; d < b.events.length; d++) {
        var c = b.events[d];
        c.q ? c.e.unbind(c.n, c.f) : b._unbind(c.e, c.n, c.f, c.b);
      }
    };

    this.cancelEvent = function (b) {
      b = b.original ? b.original : b ? b : window.event || !1;
      if (!b) return !1;
      b.preventDefault && b.preventDefault();
      b.stopPropagation && b.stopPropagation();
      b.preventManipulation && b.preventManipulation();
      b.cancelBubble = !0;
      b.cancel = !0;
      return b.returnValue = !1;
    };

    this.stopPropagation = function (b) {
      b = b.original ? b.original : b ? b : window.event || !1;
      if (!b) return !1;
      if (b.stopPropagation) return b.stopPropagation();
      b.cancelBubble && (b.cancelBubble = !0);
      return !1;
    };

    this.showRail = function () {
      if (0 != b.page.maxh && (b.ispage || "none" != b.win.css("display"))) b.visibility = !0, b.rail.visibility = !0, b.rail.css("display", "block");
      return b;
    };

    this.showRailHr = function () {
      if (!b.railh) return b;
      if (0 != b.page.maxw && (b.ispage || "none" != b.win.css("display"))) b.railh.visibility = !0, b.railh.css("display", "block");
      return b;
    };

    this.hideRail = function () {
      b.visibility = !1;
      b.rail.visibility = !1;
      b.rail.css("display", "none");
      return b;
    };

    this.hideRailHr = function () {
      if (!b.railh) return b;
      b.railh.visibility = !1;
      b.railh.css("display", "none");
      return b;
    };

    this.show = function () {
      b.hidden = !1;
      b.locked = !1;
      return b.showRail().showRailHr();
    };

    this.hide = function () {
      b.hidden = !0;
      b.locked = !0;
      return b.hideRail().hideRailHr();
    };

    this.toggle = function () {
      return b.hidden ? b.show() : b.hide();
    };

    this.remove = function () {
      b.stop();
      b.cursortimeout && clearTimeout(b.cursortimeout);
      b.doZoomOut();
      b.unbindAll();
      !1 !== b.observer && b.observer.disconnect();
      !1 !== b.observerremover && b.observerremover.disconnect();
      b.events = [];
      b.cursor && (b.cursor.remove(), b.cursor = null);
      b.cursorh && (b.cursorh.remove(), b.cursorh = null);
      b.rail && (b.rail.remove(), b.rail = null);
      b.railh && (b.railh.remove(), b.railh = null);
      b.zoom && (b.zoom.remove(), b.zoom = null);

      for (var d = 0; d < b.saved.css.length; d++) {
        var c = b.saved.css[d];
        c[0].css(c[1], "undefined" == typeof c[2] ? "" : c[2]);
      }

      b.saved = !1;
      b.me.data("__nicescroll", "");
      b.me = null;
      b.doc = null;
      b.docscroll = null;
      b.win = null;
      return b;
    };

    this.scrollstart = function (d) {
      this.onscrollstart = d;
      return b;
    };

    this.scrollend = function (d) {
      this.onscrollend = d;
      return b;
    };

    this.scrollcancel = function (d) {
      this.onscrollcancel = d;
      return b;
    };

    this.zoomin = function (d) {
      this.onzoomin = d;
      return b;
    };

    this.zoomout = function (d) {
      this.onzoomout = d;
      return b;
    };

    this.isScrollable = function (b) {
      b = b.target ? b.target : b;
      if ("OPTION" == b.nodeName) return !0;

      for (; b && 1 == b.nodeType && !/BODY|HTML/.test(b.nodeName);) {
        var c = e(b),
            c = c.css("overflowY") || c.css("overflowX") || c.css("overflow") || "";
        if (/scroll|auto/.test(c)) return b.clientHeight != b.scrollHeight;
        b = b.parentNode ? b.parentNode : !1;
      }

      return !1;
    };

    this.getViewport = function (b) {
      for (b = b && b.parentNode ? b.parentNode : !1; b && 1 == b.nodeType && !/BODY|HTML/.test(b.nodeName);) {
        var c = e(b),
            g = c.css("overflowY") || c.css("overflowX") || c.css("overflow") || "";
        if (/scroll|auto/.test(g) && b.clientHeight != b.scrollHeight || 0 < c.getNiceScroll().length) return c;
        b = b.parentNode ? b.parentNode : !1;
      }

      return !1;
    };

    this.onmousewheel = function (d) {
      if (b.locked) return !0;
      if (b.rail.drag) return b.cancelEvent(d);
      if (!b.rail.scrollable) return b.railh && b.railh.scrollable ? b.onmousewheelhr(d) : !0;
      var c = +new Date(),
          g = !1;
      b.opt.preservenativescrolling && b.checkarea + 600 < c && (b.nativescrollingarea = b.isScrollable(d), g = !0);
      b.checkarea = c;
      if (b.nativescrollingarea) return !0;
      if (d = t(d, !1, g)) b.checkarea = 0;
      return d;
    };

    this.onmousewheelhr = function (d) {
      if (b.locked || !b.railh.scrollable) return !0;
      if (b.rail.drag) return b.cancelEvent(d);
      var c = +new Date(),
          g = !1;
      b.opt.preservenativescrolling && b.checkarea + 600 < c && (b.nativescrollingarea = b.isScrollable(d), g = !0);
      b.checkarea = c;
      return b.nativescrollingarea ? !0 : b.locked ? b.cancelEvent(d) : t(d, !0, g);
    };

    this.stop = function () {
      b.cancelScroll();
      b.scrollmon && b.scrollmon.stop();
      b.cursorfreezed = !1;
      b.scroll.y = Math.round(b.getScrollTop() * (1 / b.scrollratio.y));
      b.noticeCursor();
      return b;
    };

    this.getTransitionSpeed = function (c) {
      var f = Math.round(10 * b.opt.scrollspeed);
      c = Math.min(f, Math.round(c / 20 * b.opt.scrollspeed));
      return 20 < c ? c : 0;
    };

    b.opt.smoothscroll ? b.ishwscroll && f.hastransition && b.opt.usetransition ? (this.prepareTransition = function (c, e) {
      var g = e ? 20 < c ? c : 0 : b.getTransitionSpeed(c),
          h = g ? f.prefixstyle + "transform " + g + "ms ease-out" : "";
      if (!b.lasttransitionstyle || b.lasttransitionstyle != h) b.lasttransitionstyle = h, b.doc.css(f.transitionstyle, h);
      return g;
    }, this.doScrollLeft = function (c, f) {
      var g = b.scrollrunning ? b.newscrolly : b.getScrollTop();
      b.doScrollPos(c, g, f);
    }, this.doScrollTop = function (c, f) {
      var g = b.scrollrunning ? b.newscrollx : b.getScrollLeft();
      b.doScrollPos(g, c, f);
    }, this.doScrollPos = function (c, e, g) {
      var h = b.getScrollTop(),
          l = b.getScrollLeft();
      (0 > (b.newscrolly - h) * (e - h) || 0 > (b.newscrollx - l) * (c - l)) && b.cancelScroll();
      !1 == b.opt.bouncescroll && (0 > e ? e = 0 : e > b.page.maxh && (e = b.page.maxh), 0 > c ? c = 0 : c > b.page.maxw && (c = b.page.maxw));
      if (b.scrollrunning && c == b.newscrollx && e == b.newscrolly) return !1;
      b.newscrolly = e;
      b.newscrollx = c;
      b.newscrollspeed = g || !1;
      if (b.timer) return !1;
      b.timer = setTimeout(function () {
        var g = b.getScrollTop(),
            h = b.getScrollLeft(),
            l,
            k;
        l = c - h;
        k = e - g;
        l = Math.round(Math.sqrt(Math.pow(l, 2) + Math.pow(k, 2)));
        l = b.newscrollspeed && 1 < b.newscrollspeed ? b.newscrollspeed : b.getTransitionSpeed(l);
        b.newscrollspeed && 1 >= b.newscrollspeed && (l *= b.newscrollspeed);
        b.prepareTransition(l, !0);
        b.timerscroll && b.timerscroll.tm && clearInterval(b.timerscroll.tm);
        0 < l && (!b.scrollrunning && b.onscrollstart && b.onscrollstart.call(b, {
          type: "scrollstart",
          current: {
            x: h,
            y: g
          },
          request: {
            x: c,
            y: e
          },
          end: {
            x: b.newscrollx,
            y: b.newscrolly
          },
          speed: l
        }), f.transitionend ? b.scrollendtrapped || (b.scrollendtrapped = !0, b.bind(b.doc, f.transitionend, b.onScrollEnd, !1)) : (b.scrollendtrapped && clearTimeout(b.scrollendtrapped), b.scrollendtrapped = setTimeout(b.onScrollEnd, l)), b.timerscroll = {
          bz: new BezierClass(g, b.newscrolly, l, 0, 0, 0.58, 1),
          bh: new BezierClass(h, b.newscrollx, l, 0, 0, 0.58, 1)
        }, b.cursorfreezed || (b.timerscroll.tm = setInterval(function () {
          b.showCursor(b.getScrollTop(), b.getScrollLeft());
        }, 60)));
        b.synched("doScroll-set", function () {
          b.timer = 0;
          b.scrollendtrapped && (b.scrollrunning = !0);
          b.setScrollTop(b.newscrolly);
          b.setScrollLeft(b.newscrollx);
          if (!b.scrollendtrapped) b.onScrollEnd();
        });
      }, 50);
    }, this.cancelScroll = function () {
      if (!b.scrollendtrapped) return !0;
      var c = b.getScrollTop(),
          e = b.getScrollLeft();
      b.scrollrunning = !1;
      f.transitionend || clearTimeout(f.transitionend);
      b.scrollendtrapped = !1;

      b._unbind(b.doc, f.transitionend, b.onScrollEnd);

      b.prepareTransition(0);
      b.setScrollTop(c);
      b.railh && b.setScrollLeft(e);
      b.timerscroll && b.timerscroll.tm && clearInterval(b.timerscroll.tm);
      b.timerscroll = !1;
      b.cursorfreezed = !1;
      b.showCursor(c, e);
      return b;
    }, this.onScrollEnd = function () {
      b.scrollendtrapped && b._unbind(b.doc, f.transitionend, b.onScrollEnd);
      b.scrollendtrapped = !1;
      b.prepareTransition(0);
      b.timerscroll && b.timerscroll.tm && clearInterval(b.timerscroll.tm);
      b.timerscroll = !1;
      var c = b.getScrollTop(),
          e = b.getScrollLeft();
      b.setScrollTop(c);
      b.railh && b.setScrollLeft(e);
      b.noticeCursor(!1, c, e);
      b.cursorfreezed = !1;
      0 > c ? c = 0 : c > b.page.maxh && (c = b.page.maxh);
      0 > e ? e = 0 : e > b.page.maxw && (e = b.page.maxw);
      if (c != b.newscrolly || e != b.newscrollx) return b.doScrollPos(e, c, b.opt.snapbackspeed);
      b.onscrollend && b.scrollrunning && b.onscrollend.call(b, {
        type: "scrollend",
        current: {
          x: e,
          y: c
        },
        end: {
          x: b.newscrollx,
          y: b.newscrolly
        }
      });
      b.scrollrunning = !1;
    }) : (this.doScrollLeft = function (c, f) {
      var g = b.scrollrunning ? b.newscrolly : b.getScrollTop();
      b.doScrollPos(c, g, f);
    }, this.doScrollTop = function (c, f) {
      var g = b.scrollrunning ? b.newscrollx : b.getScrollLeft();
      b.doScrollPos(g, c, f);
    }, this.doScrollPos = function (c, f, g) {
      function e() {
        if (b.cancelAnimationFrame) return !0;
        b.scrollrunning = !0;
        if (r = 1 - r) return b.timer = v(e) || 1;
        var c = 0,
            d = sy = b.getScrollTop();

        if (b.dst.ay) {
          var d = b.bzscroll ? b.dst.py + b.bzscroll.getNow() * b.dst.ay : b.newscrolly,
              g = d - sy;
          if (0 > g && d < b.newscrolly || 0 < g && d > b.newscrolly) d = b.newscrolly;
          b.setScrollTop(d);
          d == b.newscrolly && (c = 1);
        } else c = 1;

        var f = sx = b.getScrollLeft();

        if (b.dst.ax) {
          f = b.bzscroll ? b.dst.px + b.bzscroll.getNow() * b.dst.ax : b.newscrollx;
          g = f - sx;
          if (0 > g && f < b.newscrollx || 0 < g && f > b.newscrollx) f = b.newscrollx;
          b.setScrollLeft(f);
          f == b.newscrollx && (c += 1);
        } else c += 1;

        2 == c ? (b.timer = 0, b.cursorfreezed = !1, b.bzscroll = !1, b.scrollrunning = !1, 0 > d ? d = 0 : d > b.page.maxh && (d = b.page.maxh), 0 > f ? f = 0 : f > b.page.maxw && (f = b.page.maxw), f != b.newscrollx || d != b.newscrolly ? b.doScrollPos(f, d) : b.onscrollend && b.onscrollend.call(b, {
          type: "scrollend",
          current: {
            x: sx,
            y: sy
          },
          end: {
            x: b.newscrollx,
            y: b.newscrolly
          }
        })) : b.timer = v(e) || 1;
      }

      f = "undefined" == typeof f || !1 === f ? b.getScrollTop(!0) : f;
      if (b.timer && b.newscrolly == f && b.newscrollx == c) return !0;
      b.timer && w(b.timer);
      b.timer = 0;
      var h = b.getScrollTop(),
          l = b.getScrollLeft();
      (0 > (b.newscrolly - h) * (f - h) || 0 > (b.newscrollx - l) * (c - l)) && b.cancelScroll();
      b.newscrolly = f;
      b.newscrollx = c;
      if (!b.bouncescroll || !b.rail.visibility) 0 > b.newscrolly ? b.newscrolly = 0 : b.newscrolly > b.page.maxh && (b.newscrolly = b.page.maxh);
      if (!b.bouncescroll || !b.railh.visibility) 0 > b.newscrollx ? b.newscrollx = 0 : b.newscrollx > b.page.maxw && (b.newscrollx = b.page.maxw);
      b.dst = {};
      b.dst.x = c - l;
      b.dst.y = f - h;
      b.dst.px = l;
      b.dst.py = h;
      var k = Math.round(Math.sqrt(Math.pow(b.dst.x, 2) + Math.pow(b.dst.y, 2)));
      b.dst.ax = b.dst.x / k;
      b.dst.ay = b.dst.y / k;
      var n = 0,
          q = k;
      0 == b.dst.x ? (n = h, q = f, b.dst.ay = 1, b.dst.py = 0) : 0 == b.dst.y && (n = l, q = c, b.dst.ax = 1, b.dst.px = 0);
      k = b.getTransitionSpeed(k);
      g && 1 >= g && (k *= g);
      b.bzscroll = 0 < k ? b.bzscroll ? b.bzscroll.update(q, k) : new BezierClass(n, q, k, 0, 1, 0, 1) : !1;

      if (!b.timer) {
        (h == b.page.maxh && f >= b.page.maxh || l == b.page.maxw && c >= b.page.maxw) && b.checkContentSize();
        var r = 1;
        b.cancelAnimationFrame = !1;
        b.timer = 1;
        b.onscrollstart && !b.scrollrunning && b.onscrollstart.call(b, {
          type: "scrollstart",
          current: {
            x: l,
            y: h
          },
          request: {
            x: c,
            y: f
          },
          end: {
            x: b.newscrollx,
            y: b.newscrolly
          },
          speed: k
        });
        e();
        (h == b.page.maxh && f >= h || l == b.page.maxw && c >= l) && b.checkContentSize();
        b.noticeCursor();
      }
    }, this.cancelScroll = function () {
      b.timer && w(b.timer);
      b.timer = 0;
      b.bzscroll = !1;
      b.scrollrunning = !1;
      return b;
    }) : (this.doScrollLeft = function (c, f) {
      var g = b.getScrollTop();
      b.doScrollPos(c, g, f);
    }, this.doScrollTop = function (c, f) {
      var g = b.getScrollLeft();
      b.doScrollPos(g, c, f);
    }, this.doScrollPos = function (c, f, g) {
      var e = c > b.page.maxw ? b.page.maxw : c;
      0 > e && (e = 0);
      var h = f > b.page.maxh ? b.page.maxh : f;
      0 > h && (h = 0);
      b.synched("scroll", function () {
        b.setScrollTop(h);
        b.setScrollLeft(e);
      });
    }, this.cancelScroll = function () {});

    this.doScrollBy = function (c, f) {
      var g = 0,
          g = f ? Math.floor((b.scroll.y - c) * b.scrollratio.y) : (b.timer ? b.newscrolly : b.getScrollTop(!0)) - c;

      if (b.bouncescroll) {
        var e = Math.round(b.view.h / 2);
        g < -e ? g = -e : g > b.page.maxh + e && (g = b.page.maxh + e);
      }

      b.cursorfreezed = !1;
      py = b.getScrollTop(!0);
      if (0 > g && 0 >= py) return b.noticeCursor();
      if (g > b.page.maxh && py >= b.page.maxh) return b.checkContentSize(), b.noticeCursor();
      b.doScrollTop(g);
    };

    this.doScrollLeftBy = function (c, f) {
      var g = 0,
          g = f ? Math.floor((b.scroll.x - c) * b.scrollratio.x) : (b.timer ? b.newscrollx : b.getScrollLeft(!0)) - c;

      if (b.bouncescroll) {
        var e = Math.round(b.view.w / 2);
        g < -e ? g = -e : g > b.page.maxw + e && (g = b.page.maxw + e);
      }

      b.cursorfreezed = !1;
      px = b.getScrollLeft(!0);
      if (0 > g && 0 >= px || g > b.page.maxw && px >= b.page.maxw) return b.noticeCursor();
      b.doScrollLeft(g);
    };

    this.doScrollTo = function (c, f) {
      f && Math.round(c * b.scrollratio.y);
      b.cursorfreezed = !1;
      b.doScrollTop(c);
    };

    this.checkContentSize = function () {
      var c = b.getContentSize();
      (c.h != b.page.h || c.w != b.page.w) && b.resize(!1, c);
    };

    b.onscroll = function (c) {
      b.rail.drag || b.cursorfreezed || b.synched("scroll", function () {
        b.scroll.y = Math.round(b.getScrollTop() * (1 / b.scrollratio.y));
        b.railh && (b.scroll.x = Math.round(b.getScrollLeft() * (1 / b.scrollratio.x)));
        b.noticeCursor();
      });
    };

    b.bind(b.docscroll, "scroll", b.onscroll);

    this.doZoomIn = function (c) {
      if (!b.zoomactive) {
        b.zoomactive = !0;
        b.zoomrestore = {
          style: {}
        };
        var h = "position top left zIndex backgroundColor marginTop marginBottom marginLeft marginRight".split(" "),
            g = b.win[0].style,
            l;

        for (l in h) {
          var k = h[l];
          b.zoomrestore.style[k] = "undefined" != typeof g[k] ? g[k] : "";
        }

        b.zoomrestore.style.width = b.win.css("width");
        b.zoomrestore.style.height = b.win.css("height");
        b.zoomrestore.padding = {
          w: b.win.outerWidth() - b.win.width(),
          h: b.win.outerHeight() - b.win.height()
        };
        f.isios4 && (b.zoomrestore.scrollTop = e(window).scrollTop(), e(window).scrollTop(0));
        b.win.css({
          position: f.isios4 ? "absolute" : "fixed",
          top: 0,
          left: 0,
          "z-index": x + 100,
          margin: "0px"
        });
        h = b.win.css("backgroundColor");
        ("" == h || /transparent|rgba\(0, 0, 0, 0\)|rgba\(0,0,0,0\)/.test(h)) && b.win.css("backgroundColor", "#fff");
        b.rail.css({
          "z-index": x + 101
        });
        b.zoom.css({
          "z-index": x + 102
        });
        b.zoom.css("backgroundPosition", "0px -18px");
        b.resizeZoom();
        b.onzoomin && b.onzoomin.call(b);
        return b.cancelEvent(c);
      }
    };

    this.doZoomOut = function (c) {
      if (b.zoomactive) return b.zoomactive = !1, b.win.css("margin", ""), b.win.css(b.zoomrestore.style), f.isios4 && e(window).scrollTop(b.zoomrestore.scrollTop), b.rail.css({
        "z-index": b.zindex
      }), b.zoom.css({
        "z-index": b.zindex
      }), b.zoomrestore = !1, b.zoom.css("backgroundPosition", "0px 0px"), b.onResize(), b.onzoomout && b.onzoomout.call(b), b.cancelEvent(c);
    };

    this.doZoom = function (c) {
      return b.zoomactive ? b.doZoomOut(c) : b.doZoomIn(c);
    };

    this.resizeZoom = function () {
      if (b.zoomactive) {
        var c = b.getScrollTop();
        b.win.css({
          width: e(window).width() - b.zoomrestore.padding.w + "px",
          height: e(window).height() - b.zoomrestore.padding.h + "px"
        });
        b.onResize();
        b.setScrollTop(Math.min(b.page.maxh, c));
      }
    };

    this.init();
    e.nicescroll.push(this);
  },
      H = function H(e) {
    var c = this;
    this.nc = e;
    this.steptime = this.lasttime = this.speedy = this.speedx = this.lasty = this.lastx = 0;
    this.snapy = this.snapx = !1;
    this.demuly = this.demulx = 0;
    this.lastscrolly = this.lastscrollx = -1;
    this.timer = this.chky = this.chkx = 0;

    this.time = function () {
      return +new Date();
    };

    this.reset = function (e, l) {
      c.stop();
      var k = c.time();
      c.steptime = 0;
      c.lasttime = k;
      c.speedx = 0;
      c.speedy = 0;
      c.lastx = e;
      c.lasty = l;
      c.lastscrollx = -1;
      c.lastscrolly = -1;
    };

    this.update = function (e, l) {
      var k = c.time();
      c.steptime = k - c.lasttime;
      c.lasttime = k;
      var k = l - c.lasty,
          t = e - c.lastx,
          b = c.nc.getScrollTop(),
          q = c.nc.getScrollLeft(),
          b = b + k,
          q = q + t;
      c.snapx = 0 > q || q > c.nc.page.maxw;
      c.snapy = 0 > b || b > c.nc.page.maxh;
      c.speedx = t;
      c.speedy = k;
      c.lastx = e;
      c.lasty = l;
    };

    this.stop = function () {
      c.nc.unsynched("domomentum2d");
      c.timer && clearTimeout(c.timer);
      c.timer = 0;
      c.lastscrollx = -1;
      c.lastscrolly = -1;
    };

    this.doSnapy = function (e, l) {
      var k = !1;
      0 > l ? (l = 0, k = !0) : l > c.nc.page.maxh && (l = c.nc.page.maxh, k = !0);
      0 > e ? (e = 0, k = !0) : e > c.nc.page.maxw && (e = c.nc.page.maxw, k = !0);
      k && c.nc.doScrollPos(e, l, c.nc.opt.snapbackspeed);
    };

    this.doMomentum = function (e) {
      var l = c.time(),
          k = e ? l + e : c.lasttime;
      e = c.nc.getScrollLeft();
      var t = c.nc.getScrollTop(),
          b = c.nc.page.maxh,
          q = c.nc.page.maxw;
      c.speedx = 0 < q ? Math.min(60, c.speedx) : 0;
      c.speedy = 0 < b ? Math.min(60, c.speedy) : 0;
      k = k && 50 >= l - k;
      if (0 > t || t > b || 0 > e || e > q) k = !1;
      e = c.speedx && k ? c.speedx : !1;

      if (c.speedy && k && c.speedy || e) {
        var f = Math.max(16, c.steptime);
        50 < f && (e = f / 50, c.speedx *= e, c.speedy *= e, f = 50);
        c.demulxy = 0;
        c.lastscrollx = c.nc.getScrollLeft();
        c.chkx = c.lastscrollx;
        c.lastscrolly = c.nc.getScrollTop();
        c.chky = c.lastscrolly;

        var r = c.lastscrollx,
            u = c.lastscrolly,
            d = function d() {
          var e = 600 < c.time() - l ? 0.04 : 0.02;
          if (c.speedx && (r = Math.floor(c.lastscrollx - c.speedx * (1 - c.demulxy)), c.lastscrollx = r, 0 > r || r > q)) e = 0.1;
          if (c.speedy && (u = Math.floor(c.lastscrolly - c.speedy * (1 - c.demulxy)), c.lastscrolly = u, 0 > u || u > b)) e = 0.1;
          c.demulxy = Math.min(1, c.demulxy + e);
          c.nc.synched("domomentum2d", function () {
            c.speedx && (c.nc.getScrollLeft() != c.chkx && c.stop(), c.chkx = r, c.nc.setScrollLeft(r));
            c.speedy && (c.nc.getScrollTop() != c.chky && c.stop(), c.chky = u, c.nc.setScrollTop(u));
            c.timer || (c.nc.hideCursor(), c.doSnapy(r, u));
          });
          1 > c.demulxy ? c.timer = setTimeout(d, f) : (c.stop(), c.nc.hideCursor(), c.doSnapy(r, u));
        };

        d();
      } else c.doSnapy(c.nc.getScrollLeft(), c.nc.getScrollTop());
    };
  },
      A = e.fn.scrollTop;

  e.cssHooks.pageYOffset = {
    get: function get(k, c, h) {
      return (c = e.data(k, "__nicescroll") || !1) && c.ishwscroll ? c.getScrollTop() : A.call(k);
    },
    set: function set(k, c) {
      var h = e.data(k, "__nicescroll") || !1;
      h && h.ishwscroll ? h.setScrollTop(parseInt(c)) : A.call(k, c);
      return this;
    }
  };

  e.fn.scrollTop = function (k) {
    if ("undefined" == typeof k) {
      var c = this[0] ? e.data(this[0], "__nicescroll") || !1 : !1;
      return c && c.ishwscroll ? c.getScrollTop() : A.call(this);
    }

    return this.each(function () {
      var c = e.data(this, "__nicescroll") || !1;
      c && c.ishwscroll ? c.setScrollTop(parseInt(k)) : A.call(e(this), k);
    });
  };

  var B = e.fn.scrollLeft;
  e.cssHooks.pageXOffset = {
    get: function get(k, c, h) {
      return (c = e.data(k, "__nicescroll") || !1) && c.ishwscroll ? c.getScrollLeft() : B.call(k);
    },
    set: function set(k, c) {
      var h = e.data(k, "__nicescroll") || !1;
      h && h.ishwscroll ? h.setScrollLeft(parseInt(c)) : B.call(k, c);
      return this;
    }
  };

  e.fn.scrollLeft = function (k) {
    if ("undefined" == typeof k) {
      var c = this[0] ? e.data(this[0], "__nicescroll") || !1 : !1;
      return c && c.ishwscroll ? c.getScrollLeft() : B.call(this);
    }

    return this.each(function () {
      var c = e.data(this, "__nicescroll") || !1;
      c && c.ishwscroll ? c.setScrollLeft(parseInt(k)) : B.call(e(this), k);
    });
  };

  var C = function C(k) {
    var c = this;
    this.length = 0;
    this.name = "nicescrollarray";

    this.each = function (e) {
      for (var h = 0; h < c.length; h++) {
        e.call(c[h]);
      }

      return c;
    };

    this.push = function (e) {
      c[c.length] = e;
      c.length++;
    };

    this.eq = function (e) {
      return c[e];
    };

    if (k) for (a = 0; a < k.length; a++) {
      var h = e.data(k[a], "__nicescroll") || !1;
      h && (this[this.length] = h, this.length++);
    }
    return this;
  };

  (function (e, c, h) {
    for (var l = 0; l < c.length; l++) {
      h(e, c[l]);
    }
  })(C.prototype, "show hide toggle onResize resize remove stop doScrollPos".split(" "), function (e, c) {
    e[c] = function () {
      var e = arguments;
      return this.each(function () {
        this[c].apply(this, e);
      });
    };
  });

  e.fn.getNiceScroll = function (k) {
    return "undefined" == typeof k ? new C(this) : e.data(this[k], "__nicescroll") || !1;
  };

  e.extend(e.expr[":"], {
    nicescroll: function nicescroll(k) {
      return e.data(k, "__nicescroll") ? !0 : !1;
    }
  });

  e.fn.niceScroll = function (k, c) {
    "undefined" == typeof c && "object" == _typeof(k) && !("jquery" in k) && (c = k, k = !1);
    var h = new C();
    "undefined" == typeof c && (c = {});
    k && (c.doc = e(k), c.win = e(this));
    var l = !("doc" in c);
    !l && !("win" in c) && (c.win = e(this));
    this.each(function () {
      var k = e(this).data("__nicescroll") || !1;
      k || (c.doc = l ? e(this) : c.doc, k = new N(c, e(this)), e(this).data("__nicescroll", k));
      h.push(k);
    });
    return 1 == h.length ? h[0] : h;
  };

  window.NiceScroll = {
    getjQuery: function getjQuery() {
      return e;
    }
  };
  e.nicescroll || (e.nicescroll = new C(), e.nicescroll.options = F);
})(jQuery);
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*!
 * parallax.js v1.5.0 (http://pixelcog.github.io/parallax.js/)
 * @copyright 2016 PixelCog, Inc.
 * @license MIT (https://github.com/pixelcog/parallax.js/blob/master/LICENSE)
 */
;

(function ($, window, document, undefined) {
  // Polyfill for requestAnimationFrame
  // via: https://gist.github.com/paulirish/1579671
  (function () {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];

    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) window.requestAnimationFrame = function (callback) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function () {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
    if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function (id) {
      clearTimeout(id);
    };
  })(); // Parallax Constructor


  function Parallax(element, options) {
    var self = this;

    if (_typeof(options) == 'object') {
      delete options.refresh;
      delete options.render;
      $.extend(this, options);
    }

    this.$element = $(element);

    if (!this.imageSrc && this.$element.is('img')) {
      this.imageSrc = this.$element.attr('src');
    }

    var positions = (this.position + '').toLowerCase().match(/\S+/g) || [];

    if (positions.length < 1) {
      positions.push('center');
    }

    if (positions.length == 1) {
      positions.push(positions[0]);
    }

    if (positions[0] == 'top' || positions[0] == 'bottom' || positions[1] == 'left' || positions[1] == 'right') {
      positions = [positions[1], positions[0]];
    }

    if (this.positionX !== undefined) positions[0] = this.positionX.toLowerCase();
    if (this.positionY !== undefined) positions[1] = this.positionY.toLowerCase();
    self.positionX = positions[0];
    self.positionY = positions[1];

    if (this.positionX != 'left' && this.positionX != 'right') {
      if (isNaN(parseInt(this.positionX))) {
        this.positionX = 'center';
      } else {
        this.positionX = parseInt(this.positionX);
      }
    }

    if (this.positionY != 'top' && this.positionY != 'bottom') {
      if (isNaN(parseInt(this.positionY))) {
        this.positionY = 'center';
      } else {
        this.positionY = parseInt(this.positionY);
      }
    }

    this.position = this.positionX + (isNaN(this.positionX) ? '' : 'px') + ' ' + this.positionY + (isNaN(this.positionY) ? '' : 'px');

    if (navigator.userAgent.match(/(iPod|iPhone|iPad)/)) {
      if (this.imageSrc && this.iosFix && !this.$element.is('img')) {
        this.$element.css({
          backgroundImage: 'url(' + this.imageSrc + ')',
          backgroundSize: 'cover',
          backgroundPosition: this.position
        });
      }

      return this;
    }

    if (navigator.userAgent.match(/(Android)/)) {
      if (this.imageSrc && this.androidFix && !this.$element.is('img')) {
        this.$element.css({
          backgroundImage: 'url(' + this.imageSrc + ')',
          backgroundSize: 'cover',
          backgroundPosition: this.position
        });
      }

      return this;
    }

    this.$mirror = $('<div />').prependTo(this.mirrorContainer);
    var slider = this.$element.find('>.parallax-slider');
    var sliderExisted = false;
    if (slider.length == 0) this.$slider = $('<img />').prependTo(this.$mirror);else {
      this.$slider = slider.prependTo(this.$mirror);
      sliderExisted = true;
    }
    this.$mirror.addClass('parallax-mirror').css({
      visibility: 'hidden',
      zIndex: this.zIndex,
      position: 'fixed',
      top: 0,
      left: 0,
      overflow: 'hidden'
    });
    this.$slider.addClass('parallax-slider').one('load', function () {
      if (!self.naturalHeight || !self.naturalWidth) {
        self.naturalHeight = this.naturalHeight || this.height || 1;
        self.naturalWidth = this.naturalWidth || this.width || 1;
      }

      self.aspectRatio = self.naturalWidth / self.naturalHeight;
      Parallax.isSetup || Parallax.setup();
      Parallax.sliders.push(self);
      Parallax.isFresh = false;
      Parallax.requestRender();
    });
    if (!sliderExisted) this.$slider[0].src = this.imageSrc;

    if (this.naturalHeight && this.naturalWidth || this.$slider[0].complete || slider.length > 0) {
      this.$slider.trigger('load');
    }
  } // Parallax Instance Methods


  $.extend(Parallax.prototype, {
    speed: 0.2,
    bleed: 0,
    zIndex: -100,
    iosFix: true,
    androidFix: true,
    position: 'center',
    overScrollFix: false,
    mirrorContainer: 'body',
    refresh: function refresh() {
      this.boxWidth = this.$element.outerWidth();
      this.boxHeight = this.$element.outerHeight() + this.bleed * 2;
      this.boxOffsetTop = this.$element.offset().top - this.bleed;
      this.boxOffsetLeft = this.$element.offset().left;
      this.boxOffsetBottom = this.boxOffsetTop + this.boxHeight;
      var winHeight = Parallax.winHeight;
      var docHeight = Parallax.docHeight;
      var maxOffset = Math.min(this.boxOffsetTop, docHeight - winHeight);
      var minOffset = Math.max(this.boxOffsetTop + this.boxHeight - winHeight, 0);
      var imageHeightMin = this.boxHeight + (maxOffset - minOffset) * (1 - this.speed) | 0;
      var imageOffsetMin = (this.boxOffsetTop - maxOffset) * (1 - this.speed) | 0;
      var margin;

      if (imageHeightMin * this.aspectRatio >= this.boxWidth) {
        this.imageWidth = imageHeightMin * this.aspectRatio | 0;
        this.imageHeight = imageHeightMin;
        this.offsetBaseTop = imageOffsetMin;
        margin = this.imageWidth - this.boxWidth;

        if (this.positionX == 'left') {
          this.offsetLeft = 0;
        } else if (this.positionX == 'right') {
          this.offsetLeft = -margin;
        } else if (!isNaN(this.positionX)) {
          this.offsetLeft = Math.max(this.positionX, -margin);
        } else {
          this.offsetLeft = -margin / 2 | 0;
        }
      } else {
        this.imageWidth = this.boxWidth;
        this.imageHeight = this.boxWidth / this.aspectRatio | 0;
        this.offsetLeft = 0;
        margin = this.imageHeight - imageHeightMin;

        if (this.positionY == 'top') {
          this.offsetBaseTop = imageOffsetMin;
        } else if (this.positionY == 'bottom') {
          this.offsetBaseTop = imageOffsetMin - margin;
        } else if (!isNaN(this.positionY)) {
          this.offsetBaseTop = imageOffsetMin + Math.max(this.positionY, -margin);
        } else {
          this.offsetBaseTop = imageOffsetMin - margin / 2 | 0;
        }
      }
    },
    render: function render() {
      var scrollTop = Parallax.scrollTop;
      var scrollLeft = Parallax.scrollLeft;
      var overScroll = this.overScrollFix ? Parallax.overScroll : 0;
      var scrollBottom = scrollTop + Parallax.winHeight;

      if (this.boxOffsetBottom > scrollTop && this.boxOffsetTop <= scrollBottom) {
        this.visibility = 'visible';
        this.mirrorTop = this.boxOffsetTop - scrollTop;
        this.mirrorLeft = this.boxOffsetLeft - scrollLeft;
        this.offsetTop = this.offsetBaseTop - this.mirrorTop * (1 - this.speed);
      } else {
        this.visibility = 'hidden';
      }

      this.$mirror.css({
        transform: 'translate3d(' + this.mirrorLeft + 'px, ' + (this.mirrorTop - overScroll) + 'px, 0px)',
        visibility: this.visibility,
        height: this.boxHeight,
        width: this.boxWidth
      });
      this.$slider.css({
        transform: 'translate3d(' + this.offsetLeft + 'px, ' + this.offsetTop + 'px, 0px)',
        position: 'absolute',
        height: this.imageHeight,
        width: this.imageWidth,
        maxWidth: 'none'
      });
    }
  }); // Parallax Static Methods

  $.extend(Parallax, {
    scrollTop: 0,
    scrollLeft: 0,
    winHeight: 0,
    winWidth: 0,
    docHeight: 1 << 30,
    docWidth: 1 << 30,
    sliders: [],
    isReady: false,
    isFresh: false,
    isBusy: false,
    setup: function setup() {
      if (this.isReady) return;
      var self = this;
      var $doc = $(document),
          $win = $(window);

      var loadDimensions = function loadDimensions() {
        Parallax.winHeight = $win.height();
        Parallax.winWidth = $win.width();
        Parallax.docHeight = $doc.height();
        Parallax.docWidth = $doc.width();
      };

      var loadScrollPosition = function loadScrollPosition() {
        var winScrollTop = $win.scrollTop();
        var scrollTopMax = Parallax.docHeight - Parallax.winHeight;
        var scrollLeftMax = Parallax.docWidth - Parallax.winWidth;
        Parallax.scrollTop = Math.max(0, Math.min(scrollTopMax, winScrollTop));
        Parallax.scrollLeft = Math.max(0, Math.min(scrollLeftMax, $win.scrollLeft()));
        Parallax.overScroll = Math.max(winScrollTop - scrollTopMax, Math.min(winScrollTop, 0));
      };

      $win.on('resize.px.parallax load.px.parallax', function () {
        loadDimensions();
        self.refresh();
        Parallax.isFresh = false;
        Parallax.requestRender();
      }).on('scroll.px.parallax load.px.parallax', function () {
        loadScrollPosition();
        Parallax.requestRender();
      });
      loadDimensions();
      loadScrollPosition();
      this.isReady = true;
      var lastPosition = -1;

      function frameLoop() {
        if (lastPosition == window.pageYOffset) {
          // Avoid overcalculations
          window.requestAnimationFrame(frameLoop);
          return false;
        } else lastPosition = window.pageYOffset;

        self.render();
        window.requestAnimationFrame(frameLoop);
      }

      frameLoop();
    },
    configure: function configure(options) {
      if (_typeof(options) == 'object') {
        delete options.refresh;
        delete options.render;
        $.extend(this.prototype, options);
      }
    },
    refresh: function refresh() {
      $.each(this.sliders, function () {
        this.refresh();
      });
      this.isFresh = true;
    },
    render: function render() {
      this.isFresh || this.refresh();
      $.each(this.sliders, function () {
        this.render();
      });
    },
    requestRender: function requestRender() {
      var self = this;
      self.render();
      self.isBusy = false;
    },
    destroy: function destroy(el) {
      var i,
          parallaxElement = $(el).data('px.parallax');
      parallaxElement.$mirror.remove();

      for (i = 0; i < this.sliders.length; i += 1) {
        if (this.sliders[i] == parallaxElement) {
          this.sliders.splice(i, 1);
        }
      }

      $(el).data('px.parallax', false);

      if (this.sliders.length === 0) {
        $(window).off('scroll.px.parallax resize.px.parallax load.px.parallax');
        this.isReady = false;
        Parallax.isSetup = false;
      }
    }
  }); // Parallax Plugin Definition

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this);
      var options = _typeof(option) == 'object' && option;

      if (this == window || this == document || $this.is('body')) {
        Parallax.configure(options);
      } else if (!$this.data('px.parallax')) {
        options = $.extend({}, $this.data(), options);
        $this.data('px.parallax', new Parallax(this, options));
      } else if (_typeof(option) == 'object') {
        $.extend($this.data('px.parallax'), options);
      }

      if (typeof option == 'string') {
        if (option == 'destroy') {
          Parallax.destroy(this);
        } else {
          Parallax[option]();
        }
      }
    });
  }

  var old = $.fn.parallax;
  $.fn.parallax = Plugin;
  $.fn.parallax.Constructor = Parallax; // Parallax No Conflict

  $.fn.parallax.noConflict = function () {
    $.fn.parallax = old;
    return this;
  }; // Parallax Data-API


  $(function () {
    $('[data-parallax="scroll"]').parallax();
  });
})(jQuery, window, document);
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*! Select2 4.0.13 | https://github.com/select2/select2/blob/master/LICENSE.md */
!function (n) {
  "function" == typeof define && define.amd ? define(["jquery"], n) : "object" == (typeof module === "undefined" ? "undefined" : _typeof(module)) && module.exports ? module.exports = function (e, t) {
    return void 0 === t && (t = "undefined" != typeof window ? require("jquery") : require("jquery")(e)), n(t), t;
  } : n(jQuery);
}(function (d) {
  var e = function () {
    if (d && d.fn && d.fn.select2 && d.fn.select2.amd) var e = d.fn.select2.amd;

    var t, n, i, h, o, _s, f, g, m, v, y, _, r, a, w, l;

    function b(e, t) {
      return r.call(e, t);
    }

    function c(e, t) {
      var n,
          i,
          r,
          o,
          s,
          a,
          l,
          c,
          u,
          d,
          p,
          h = t && t.split("/"),
          f = y.map,
          g = f && f["*"] || {};

      if (e) {
        for (s = (e = e.split("/")).length - 1, y.nodeIdCompat && w.test(e[s]) && (e[s] = e[s].replace(w, "")), "." === e[0].charAt(0) && h && (e = h.slice(0, h.length - 1).concat(e)), u = 0; u < e.length; u++) {
          if ("." === (p = e[u])) e.splice(u, 1), --u;else if (".." === p) {
            if (0 === u || 1 === u && ".." === e[2] || ".." === e[u - 1]) continue;
            0 < u && (e.splice(u - 1, 2), u -= 2);
          }
        }

        e = e.join("/");
      }

      if ((h || g) && f) {
        for (u = (n = e.split("/")).length; 0 < u; --u) {
          if (i = n.slice(0, u).join("/"), h) for (d = h.length; 0 < d; --d) {
            if (r = (r = f[h.slice(0, d).join("/")]) && r[i]) {
              o = r, a = u;
              break;
            }
          }
          if (o) break;
          !l && g && g[i] && (l = g[i], c = u);
        }

        !o && l && (o = l, a = c), o && (n.splice(0, a, o), e = n.join("/"));
      }

      return e;
    }

    function A(t, n) {
      return function () {
        var e = a.call(arguments, 0);
        return "string" != typeof e[0] && 1 === e.length && e.push(null), _s.apply(h, e.concat([t, n]));
      };
    }

    function x(t) {
      return function (e) {
        m[t] = e;
      };
    }

    function D(e) {
      if (b(v, e)) {
        var t = v[e];
        delete v[e], _[e] = !0, o.apply(h, t);
      }

      if (!b(m, e) && !b(_, e)) throw new Error("No " + e);
      return m[e];
    }

    function u(e) {
      var t,
          n = e ? e.indexOf("!") : -1;
      return -1 < n && (t = e.substring(0, n), e = e.substring(n + 1, e.length)), [t, e];
    }

    function S(e) {
      return e ? u(e) : [];
    }

    return e && e.requirejs || (e ? n = e : e = {}, m = {}, v = {}, y = {}, _ = {}, r = Object.prototype.hasOwnProperty, a = [].slice, w = /\.js$/, f = function f(e, t) {
      var n,
          i,
          r = u(e),
          o = r[0],
          s = t[1];
      return e = r[1], o && (n = D(o = c(o, s))), o ? e = n && n.normalize ? n.normalize(e, (i = s, function (e) {
        return c(e, i);
      })) : c(e, s) : (o = (r = u(e = c(e, s)))[0], e = r[1], o && (n = D(o))), {
        f: o ? o + "!" + e : e,
        n: e,
        pr: o,
        p: n
      };
    }, g = {
      require: function require(e) {
        return A(e);
      },
      exports: function exports(e) {
        var t = m[e];
        return void 0 !== t ? t : m[e] = {};
      },
      module: function module(e) {
        return {
          id: e,
          uri: "",
          exports: m[e],
          config: (t = e, function () {
            return y && y.config && y.config[t] || {};
          })
        };
        var t;
      }
    }, o = function o(e, t, n, i) {
      var r,
          o,
          s,
          a,
          l,
          c,
          u,
          d = [],
          p = _typeof(n);

      if (c = S(i = i || e), "undefined" == p || "function" == p) {
        for (t = !t.length && n.length ? ["require", "exports", "module"] : t, l = 0; l < t.length; l += 1) {
          if ("require" === (o = (a = f(t[l], c)).f)) d[l] = g.require(e);else if ("exports" === o) d[l] = g.exports(e), u = !0;else if ("module" === o) r = d[l] = g.module(e);else if (b(m, o) || b(v, o) || b(_, o)) d[l] = D(o);else {
            if (!a.p) throw new Error(e + " missing " + o);
            a.p.load(a.n, A(i, !0), x(o), {}), d[l] = m[o];
          }
        }

        s = n ? n.apply(m[e], d) : void 0, e && (r && r.exports !== h && r.exports !== m[e] ? m[e] = r.exports : s === h && u || (m[e] = s));
      } else e && (m[e] = n);
    }, t = n = _s = function s(e, t, n, i, r) {
      if ("string" == typeof e) return g[e] ? g[e](t) : D(f(e, S(t)).f);

      if (!e.splice) {
        if ((y = e).deps && _s(y.deps, y.callback), !t) return;
        t.splice ? (e = t, t = n, n = null) : e = h;
      }

      return t = t || function () {}, "function" == typeof n && (n = i, i = r), i ? o(h, e, t, n) : setTimeout(function () {
        o(h, e, t, n);
      }, 4), _s;
    }, _s.config = function (e) {
      return _s(e);
    }, t._defined = m, (i = function i(e, t, n) {
      if ("string" != typeof e) throw new Error("See almond README: incorrect module build, no module name");
      t.splice || (n = t, t = []), b(m, e) || b(v, e) || (v[e] = [e, t, n]);
    }).amd = {
      jQuery: !0
    }, e.requirejs = t, e.require = n, e.define = i), e.define("almond", function () {}), e.define("jquery", [], function () {
      var e = d || $;
      return null == e && console && console.error && console.error("Select2: An instance of jQuery or a jQuery-compatible library was not found. Make sure that you are including jQuery before Select2 on your web page."), e;
    }), e.define("select2/utils", ["jquery"], function (o) {
      var r = {};

      function u(e) {
        var t = e.prototype,
            n = [];

        for (var i in t) {
          "function" == typeof t[i] && "constructor" !== i && n.push(i);
        }

        return n;
      }

      r.Extend = function (e, t) {
        var n = {}.hasOwnProperty;

        function i() {
          this.constructor = e;
        }

        for (var r in t) {
          n.call(t, r) && (e[r] = t[r]);
        }

        return i.prototype = t.prototype, e.prototype = new i(), e.__super__ = t.prototype, e;
      }, r.Decorate = function (i, r) {
        var e = u(r),
            t = u(i);

        function o() {
          var e = Array.prototype.unshift,
              t = r.prototype.constructor.length,
              n = i.prototype.constructor;
          0 < t && (e.call(arguments, i.prototype.constructor), n = r.prototype.constructor), n.apply(this, arguments);
        }

        r.displayName = i.displayName, o.prototype = new function () {
          this.constructor = o;
        }();

        for (var n = 0; n < t.length; n++) {
          var s = t[n];
          o.prototype[s] = i.prototype[s];
        }

        function a(e) {
          var t = function t() {};

          e in o.prototype && (t = o.prototype[e]);
          var n = r.prototype[e];
          return function () {
            return Array.prototype.unshift.call(arguments, t), n.apply(this, arguments);
          };
        }

        for (var l = 0; l < e.length; l++) {
          var c = e[l];
          o.prototype[c] = a(c);
        }

        return o;
      };

      function e() {
        this.listeners = {};
      }

      e.prototype.on = function (e, t) {
        this.listeners = this.listeners || {}, e in this.listeners ? this.listeners[e].push(t) : this.listeners[e] = [t];
      }, e.prototype.trigger = function (e) {
        var t = Array.prototype.slice,
            n = t.call(arguments, 1);
        this.listeners = this.listeners || {}, null == n && (n = []), 0 === n.length && n.push({}), (n[0]._type = e) in this.listeners && this.invoke(this.listeners[e], t.call(arguments, 1)), "*" in this.listeners && this.invoke(this.listeners["*"], arguments);
      }, e.prototype.invoke = function (e, t) {
        for (var n = 0, i = e.length; n < i; n++) {
          e[n].apply(this, t);
        }
      }, r.Observable = e, r.generateChars = function (e) {
        for (var t = "", n = 0; n < e; n++) {
          t += Math.floor(36 * Math.random()).toString(36);
        }

        return t;
      }, r.bind = function (e, t) {
        return function () {
          e.apply(t, arguments);
        };
      }, r._convertData = function (e) {
        for (var t in e) {
          var n = t.split("-"),
              i = e;

          if (1 !== n.length) {
            for (var r = 0; r < n.length; r++) {
              var o = n[r];
              (o = o.substring(0, 1).toLowerCase() + o.substring(1)) in i || (i[o] = {}), r == n.length - 1 && (i[o] = e[t]), i = i[o];
            }

            delete e[t];
          }
        }

        return e;
      }, r.hasScroll = function (e, t) {
        var n = o(t),
            i = t.style.overflowX,
            r = t.style.overflowY;
        return (i !== r || "hidden" !== r && "visible" !== r) && ("scroll" === i || "scroll" === r || n.innerHeight() < t.scrollHeight || n.innerWidth() < t.scrollWidth);
      }, r.escapeMarkup = function (e) {
        var t = {
          "\\": "&#92;",
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
          "/": "&#47;"
        };
        return "string" != typeof e ? e : String(e).replace(/[&<>"'\/\\]/g, function (e) {
          return t[e];
        });
      }, r.appendMany = function (e, t) {
        if ("1.7" === o.fn.jquery.substr(0, 3)) {
          var n = o();
          o.map(t, function (e) {
            n = n.add(e);
          }), t = n;
        }

        e.append(t);
      }, r.__cache = {};
      var n = 0;
      return r.GetUniqueElementId = function (e) {
        var t = e.getAttribute("data-select2-id");
        return null == t && (e.id ? (t = e.id, e.setAttribute("data-select2-id", t)) : (e.setAttribute("data-select2-id", ++n), t = n.toString())), t;
      }, r.StoreData = function (e, t, n) {
        var i = r.GetUniqueElementId(e);
        r.__cache[i] || (r.__cache[i] = {}), r.__cache[i][t] = n;
      }, r.GetData = function (e, t) {
        var n = r.GetUniqueElementId(e);
        return t ? r.__cache[n] && null != r.__cache[n][t] ? r.__cache[n][t] : o(e).data(t) : r.__cache[n];
      }, r.RemoveData = function (e) {
        var t = r.GetUniqueElementId(e);
        null != r.__cache[t] && delete r.__cache[t], e.removeAttribute("data-select2-id");
      }, r;
    }), e.define("select2/results", ["jquery", "./utils"], function (h, f) {
      function i(e, t, n) {
        this.$element = e, this.data = n, this.options = t, i.__super__.constructor.call(this);
      }

      return f.Extend(i, f.Observable), i.prototype.render = function () {
        var e = h('<ul class="select2-results__options" role="listbox"></ul>');
        return this.options.get("multiple") && e.attr("aria-multiselectable", "true"), this.$results = e;
      }, i.prototype.clear = function () {
        this.$results.empty();
      }, i.prototype.displayMessage = function (e) {
        var t = this.options.get("escapeMarkup");
        this.clear(), this.hideLoading();
        var n = h('<li role="alert" aria-live="assertive" class="select2-results__option"></li>'),
            i = this.options.get("translations").get(e.message);
        n.append(t(i(e.args))), n[0].className += " select2-results__message", this.$results.append(n);
      }, i.prototype.hideMessages = function () {
        this.$results.find(".select2-results__message").remove();
      }, i.prototype.append = function (e) {
        this.hideLoading();
        var t = [];

        if (null != e.results && 0 !== e.results.length) {
          e.results = this.sort(e.results);

          for (var n = 0; n < e.results.length; n++) {
            var i = e.results[n],
                r = this.option(i);
            t.push(r);
          }

          this.$results.append(t);
        } else 0 === this.$results.children().length && this.trigger("results:message", {
          message: "noResults"
        });
      }, i.prototype.position = function (e, t) {
        t.find(".select2-results").append(e);
      }, i.prototype.sort = function (e) {
        return this.options.get("sorter")(e);
      }, i.prototype.highlightFirstItem = function () {
        var e = this.$results.find(".select2-results__option[aria-selected]"),
            t = e.filter("[aria-selected=true]");
        0 < t.length ? t.first().trigger("mouseenter") : e.first().trigger("mouseenter"), this.ensureHighlightVisible();
      }, i.prototype.setClasses = function () {
        var t = this;
        this.data.current(function (e) {
          var i = h.map(e, function (e) {
            return e.id.toString();
          });
          t.$results.find(".select2-results__option[aria-selected]").each(function () {
            var e = h(this),
                t = f.GetData(this, "data"),
                n = "" + t.id;
            null != t.element && t.element.selected || null == t.element && -1 < h.inArray(n, i) ? e.attr("aria-selected", "true") : e.attr("aria-selected", "false");
          });
        });
      }, i.prototype.showLoading = function (e) {
        this.hideLoading();
        var t = {
          disabled: !0,
          loading: !0,
          text: this.options.get("translations").get("searching")(e)
        },
            n = this.option(t);
        n.className += " loading-results", this.$results.prepend(n);
      }, i.prototype.hideLoading = function () {
        this.$results.find(".loading-results").remove();
      }, i.prototype.option = function (e) {
        var t = document.createElement("li");
        t.className = "select2-results__option";
        var n = {
          role: "option",
          "aria-selected": "false"
        },
            i = window.Element.prototype.matches || window.Element.prototype.msMatchesSelector || window.Element.prototype.webkitMatchesSelector;

        for (var r in (null != e.element && i.call(e.element, ":disabled") || null == e.element && e.disabled) && (delete n["aria-selected"], n["aria-disabled"] = "true"), null == e.id && delete n["aria-selected"], null != e._resultId && (t.id = e._resultId), e.title && (t.title = e.title), e.children && (n.role = "group", n["aria-label"] = e.text, delete n["aria-selected"]), n) {
          var o = n[r];
          t.setAttribute(r, o);
        }

        if (e.children) {
          var s = h(t),
              a = document.createElement("strong");
          a.className = "select2-results__group";
          h(a);
          this.template(e, a);

          for (var l = [], c = 0; c < e.children.length; c++) {
            var u = e.children[c],
                d = this.option(u);
            l.push(d);
          }

          var p = h("<ul></ul>", {
            class: "select2-results__options select2-results__options--nested"
          });
          p.append(l), s.append(a), s.append(p);
        } else this.template(e, t);

        return f.StoreData(t, "data", e), t;
      }, i.prototype.bind = function (t, e) {
        var l = this,
            n = t.id + "-results";
        this.$results.attr("id", n), t.on("results:all", function (e) {
          l.clear(), l.append(e.data), t.isOpen() && (l.setClasses(), l.highlightFirstItem());
        }), t.on("results:append", function (e) {
          l.append(e.data), t.isOpen() && l.setClasses();
        }), t.on("query", function (e) {
          l.hideMessages(), l.showLoading(e);
        }), t.on("select", function () {
          t.isOpen() && (l.setClasses(), l.options.get("scrollAfterSelect") && l.highlightFirstItem());
        }), t.on("unselect", function () {
          t.isOpen() && (l.setClasses(), l.options.get("scrollAfterSelect") && l.highlightFirstItem());
        }), t.on("open", function () {
          l.$results.attr("aria-expanded", "true"), l.$results.attr("aria-hidden", "false"), l.setClasses(), l.ensureHighlightVisible();
        }), t.on("close", function () {
          l.$results.attr("aria-expanded", "false"), l.$results.attr("aria-hidden", "true"), l.$results.removeAttr("aria-activedescendant");
        }), t.on("results:toggle", function () {
          var e = l.getHighlightedResults();
          0 !== e.length && e.trigger("mouseup");
        }), t.on("results:select", function () {
          var e = l.getHighlightedResults();

          if (0 !== e.length) {
            var t = f.GetData(e[0], "data");
            "true" == e.attr("aria-selected") ? l.trigger("close", {}) : l.trigger("select", {
              data: t
            });
          }
        }), t.on("results:previous", function () {
          var e = l.getHighlightedResults(),
              t = l.$results.find("[aria-selected]"),
              n = t.index(e);

          if (!(n <= 0)) {
            var i = n - 1;
            0 === e.length && (i = 0);
            var r = t.eq(i);
            r.trigger("mouseenter");
            var o = l.$results.offset().top,
                s = r.offset().top,
                a = l.$results.scrollTop() + (s - o);
            0 === i ? l.$results.scrollTop(0) : s - o < 0 && l.$results.scrollTop(a);
          }
        }), t.on("results:next", function () {
          var e = l.getHighlightedResults(),
              t = l.$results.find("[aria-selected]"),
              n = t.index(e) + 1;

          if (!(n >= t.length)) {
            var i = t.eq(n);
            i.trigger("mouseenter");
            var r = l.$results.offset().top + l.$results.outerHeight(!1),
                o = i.offset().top + i.outerHeight(!1),
                s = l.$results.scrollTop() + o - r;
            0 === n ? l.$results.scrollTop(0) : r < o && l.$results.scrollTop(s);
          }
        }), t.on("results:focus", function (e) {
          e.element.addClass("select2-results__option--highlighted");
        }), t.on("results:message", function (e) {
          l.displayMessage(e);
        }), h.fn.mousewheel && this.$results.on("mousewheel", function (e) {
          var t = l.$results.scrollTop(),
              n = l.$results.get(0).scrollHeight - t + e.deltaY,
              i = 0 < e.deltaY && t - e.deltaY <= 0,
              r = e.deltaY < 0 && n <= l.$results.height();
          i ? (l.$results.scrollTop(0), e.preventDefault(), e.stopPropagation()) : r && (l.$results.scrollTop(l.$results.get(0).scrollHeight - l.$results.height()), e.preventDefault(), e.stopPropagation());
        }), this.$results.on("mouseup", ".select2-results__option[aria-selected]", function (e) {
          var t = h(this),
              n = f.GetData(this, "data");
          "true" !== t.attr("aria-selected") ? l.trigger("select", {
            originalEvent: e,
            data: n
          }) : l.options.get("multiple") ? l.trigger("unselect", {
            originalEvent: e,
            data: n
          }) : l.trigger("close", {});
        }), this.$results.on("mouseenter", ".select2-results__option[aria-selected]", function (e) {
          var t = f.GetData(this, "data");
          l.getHighlightedResults().removeClass("select2-results__option--highlighted"), l.trigger("results:focus", {
            data: t,
            element: h(this)
          });
        });
      }, i.prototype.getHighlightedResults = function () {
        return this.$results.find(".select2-results__option--highlighted");
      }, i.prototype.destroy = function () {
        this.$results.remove();
      }, i.prototype.ensureHighlightVisible = function () {
        var e = this.getHighlightedResults();

        if (0 !== e.length) {
          var t = this.$results.find("[aria-selected]").index(e),
              n = this.$results.offset().top,
              i = e.offset().top,
              r = this.$results.scrollTop() + (i - n),
              o = i - n;
          r -= 2 * e.outerHeight(!1), t <= 2 ? this.$results.scrollTop(0) : (o > this.$results.outerHeight() || o < 0) && this.$results.scrollTop(r);
        }
      }, i.prototype.template = function (e, t) {
        var n = this.options.get("templateResult"),
            i = this.options.get("escapeMarkup"),
            r = n(e, t);
        null == r ? t.style.display = "none" : "string" == typeof r ? t.innerHTML = i(r) : h(t).append(r);
      }, i;
    }), e.define("select2/keys", [], function () {
      return {
        BACKSPACE: 8,
        TAB: 9,
        ENTER: 13,
        SHIFT: 16,
        CTRL: 17,
        ALT: 18,
        ESC: 27,
        SPACE: 32,
        PAGE_UP: 33,
        PAGE_DOWN: 34,
        END: 35,
        HOME: 36,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        DELETE: 46
      };
    }), e.define("select2/selection/base", ["jquery", "../utils", "../keys"], function (n, i, r) {
      function o(e, t) {
        this.$element = e, this.options = t, o.__super__.constructor.call(this);
      }

      return i.Extend(o, i.Observable), o.prototype.render = function () {
        var e = n('<span class="select2-selection" role="combobox"  aria-haspopup="true" aria-expanded="false"></span>');
        return this._tabindex = 0, null != i.GetData(this.$element[0], "old-tabindex") ? this._tabindex = i.GetData(this.$element[0], "old-tabindex") : null != this.$element.attr("tabindex") && (this._tabindex = this.$element.attr("tabindex")), e.attr("title", this.$element.attr("title")), e.attr("tabindex", this._tabindex), e.attr("aria-disabled", "false"), this.$selection = e;
      }, o.prototype.bind = function (e, t) {
        var n = this,
            i = e.id + "-results";
        this.container = e, this.$selection.on("focus", function (e) {
          n.trigger("focus", e);
        }), this.$selection.on("blur", function (e) {
          n._handleBlur(e);
        }), this.$selection.on("keydown", function (e) {
          n.trigger("keypress", e), e.which === r.SPACE && e.preventDefault();
        }), e.on("results:focus", function (e) {
          n.$selection.attr("aria-activedescendant", e.data._resultId);
        }), e.on("selection:update", function (e) {
          n.update(e.data);
        }), e.on("open", function () {
          n.$selection.attr("aria-expanded", "true"), n.$selection.attr("aria-owns", i), n._attachCloseHandler(e);
        }), e.on("close", function () {
          n.$selection.attr("aria-expanded", "false"), n.$selection.removeAttr("aria-activedescendant"), n.$selection.removeAttr("aria-owns"), n.$selection.trigger("focus"), n._detachCloseHandler(e);
        }), e.on("enable", function () {
          n.$selection.attr("tabindex", n._tabindex), n.$selection.attr("aria-disabled", "false");
        }), e.on("disable", function () {
          n.$selection.attr("tabindex", "-1"), n.$selection.attr("aria-disabled", "true");
        });
      }, o.prototype._handleBlur = function (e) {
        var t = this;
        window.setTimeout(function () {
          document.activeElement == t.$selection[0] || n.contains(t.$selection[0], document.activeElement) || t.trigger("blur", e);
        }, 1);
      }, o.prototype._attachCloseHandler = function (e) {
        n(document.body).on("mousedown.select2." + e.id, function (e) {
          var t = n(e.target).closest(".select2");
          n(".select2.select2-container--open").each(function () {
            this != t[0] && i.GetData(this, "element").select2("close");
          });
        });
      }, o.prototype._detachCloseHandler = function (e) {
        n(document.body).off("mousedown.select2." + e.id);
      }, o.prototype.position = function (e, t) {
        t.find(".selection").append(e);
      }, o.prototype.destroy = function () {
        this._detachCloseHandler(this.container);
      }, o.prototype.update = function (e) {
        throw new Error("The `update` method must be defined in child classes.");
      }, o.prototype.isEnabled = function () {
        return !this.isDisabled();
      }, o.prototype.isDisabled = function () {
        return this.options.get("disabled");
      }, o;
    }), e.define("select2/selection/single", ["jquery", "./base", "../utils", "../keys"], function (e, t, n, i) {
      function r() {
        r.__super__.constructor.apply(this, arguments);
      }

      return n.Extend(r, t), r.prototype.render = function () {
        var e = r.__super__.render.call(this);

        return e.addClass("select2-selection--single"), e.html('<span class="select2-selection__rendered"></span><span class="select2-selection__arrow" role="presentation"><b role="presentation"></b></span>'), e;
      }, r.prototype.bind = function (t, e) {
        var n = this;

        r.__super__.bind.apply(this, arguments);

        var i = t.id + "-container";
        this.$selection.find(".select2-selection__rendered").attr("id", i).attr("role", "textbox").attr("aria-readonly", "true"), this.$selection.attr("aria-labelledby", i), this.$selection.on("mousedown", function (e) {
          1 === e.which && n.trigger("toggle", {
            originalEvent: e
          });
        }), this.$selection.on("focus", function (e) {}), this.$selection.on("blur", function (e) {}), t.on("focus", function (e) {
          t.isOpen() || n.$selection.trigger("focus");
        });
      }, r.prototype.clear = function () {
        var e = this.$selection.find(".select2-selection__rendered");
        e.empty(), e.removeAttr("title");
      }, r.prototype.display = function (e, t) {
        var n = this.options.get("templateSelection");
        return this.options.get("escapeMarkup")(n(e, t));
      }, r.prototype.selectionContainer = function () {
        return e("<span></span>");
      }, r.prototype.update = function (e) {
        if (0 !== e.length) {
          var t = e[0],
              n = this.$selection.find(".select2-selection__rendered"),
              i = this.display(t, n);
          n.empty().append(i);
          var r = t.title || t.text;
          r ? n.attr("title", r) : n.removeAttr("title");
        } else this.clear();
      }, r;
    }), e.define("select2/selection/multiple", ["jquery", "./base", "../utils"], function (r, e, l) {
      function n(e, t) {
        n.__super__.constructor.apply(this, arguments);
      }

      return l.Extend(n, e), n.prototype.render = function () {
        var e = n.__super__.render.call(this);

        return e.addClass("select2-selection--multiple"), e.html('<ul class="select2-selection__rendered"></ul>'), e;
      }, n.prototype.bind = function (e, t) {
        var i = this;
        n.__super__.bind.apply(this, arguments), this.$selection.on("click", function (e) {
          i.trigger("toggle", {
            originalEvent: e
          });
        }), this.$selection.on("click", ".select2-selection__choice__remove", function (e) {
          if (!i.isDisabled()) {
            var t = r(this).parent(),
                n = l.GetData(t[0], "data");
            i.trigger("unselect", {
              originalEvent: e,
              data: n
            });
          }
        });
      }, n.prototype.clear = function () {
        var e = this.$selection.find(".select2-selection__rendered");
        e.empty(), e.removeAttr("title");
      }, n.prototype.display = function (e, t) {
        var n = this.options.get("templateSelection");
        return this.options.get("escapeMarkup")(n(e, t));
      }, n.prototype.selectionContainer = function () {
        return r('<li class="select2-selection__choice"><span class="select2-selection__choice__remove" role="presentation">&times;</span></li>');
      }, n.prototype.update = function (e) {
        if (this.clear(), 0 !== e.length) {
          for (var t = [], n = 0; n < e.length; n++) {
            var i = e[n],
                r = this.selectionContainer(),
                o = this.display(i, r);
            r.append(o);
            var s = i.title || i.text;
            s && r.attr("title", s), l.StoreData(r[0], "data", i), t.push(r);
          }

          var a = this.$selection.find(".select2-selection__rendered");
          l.appendMany(a, t);
        }
      }, n;
    }), e.define("select2/selection/placeholder", ["../utils"], function (e) {
      function t(e, t, n) {
        this.placeholder = this.normalizePlaceholder(n.get("placeholder")), e.call(this, t, n);
      }

      return t.prototype.normalizePlaceholder = function (e, t) {
        return "string" == typeof t && (t = {
          id: "",
          text: t
        }), t;
      }, t.prototype.createPlaceholder = function (e, t) {
        var n = this.selectionContainer();
        return n.html(this.display(t)), n.addClass("select2-selection__placeholder").removeClass("select2-selection__choice"), n;
      }, t.prototype.update = function (e, t) {
        var n = 1 == t.length && t[0].id != this.placeholder.id;
        if (1 < t.length || n) return e.call(this, t);
        this.clear();
        var i = this.createPlaceholder(this.placeholder);
        this.$selection.find(".select2-selection__rendered").append(i);
      }, t;
    }), e.define("select2/selection/allowClear", ["jquery", "../keys", "../utils"], function (r, i, a) {
      function e() {}

      return e.prototype.bind = function (e, t, n) {
        var i = this;
        e.call(this, t, n), null == this.placeholder && this.options.get("debug") && window.console && console.error && console.error("Select2: The `allowClear` option should be used in combination with the `placeholder` option."), this.$selection.on("mousedown", ".select2-selection__clear", function (e) {
          i._handleClear(e);
        }), t.on("keypress", function (e) {
          i._handleKeyboardClear(e, t);
        });
      }, e.prototype._handleClear = function (e, t) {
        if (!this.isDisabled()) {
          var n = this.$selection.find(".select2-selection__clear");

          if (0 !== n.length) {
            t.stopPropagation();
            var i = a.GetData(n[0], "data"),
                r = this.$element.val();
            this.$element.val(this.placeholder.id);
            var o = {
              data: i
            };
            if (this.trigger("clear", o), o.prevented) this.$element.val(r);else {
              for (var s = 0; s < i.length; s++) {
                if (o = {
                  data: i[s]
                }, this.trigger("unselect", o), o.prevented) return void this.$element.val(r);
              }

              this.$element.trigger("input").trigger("change"), this.trigger("toggle", {});
            }
          }
        }
      }, e.prototype._handleKeyboardClear = function (e, t, n) {
        n.isOpen() || t.which != i.DELETE && t.which != i.BACKSPACE || this._handleClear(t);
      }, e.prototype.update = function (e, t) {
        if (e.call(this, t), !(0 < this.$selection.find(".select2-selection__placeholder").length || 0 === t.length)) {
          var n = this.options.get("translations").get("removeAllItems"),
              i = r('<span class="select2-selection__clear" title="' + n() + '">&times;</span>');
          a.StoreData(i[0], "data", t), this.$selection.find(".select2-selection__rendered").prepend(i);
        }
      }, e;
    }), e.define("select2/selection/search", ["jquery", "../utils", "../keys"], function (i, a, l) {
      function e(e, t, n) {
        e.call(this, t, n);
      }

      return e.prototype.render = function (e) {
        var t = i('<li class="select2-search select2-search--inline"><input class="select2-search__field" type="search" tabindex="-1" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" role="searchbox" aria-autocomplete="list" /></li>');
        this.$searchContainer = t, this.$search = t.find("input");
        var n = e.call(this);
        return this._transferTabIndex(), n;
      }, e.prototype.bind = function (e, t, n) {
        var i = this,
            r = t.id + "-results";
        e.call(this, t, n), t.on("open", function () {
          i.$search.attr("aria-controls", r), i.$search.trigger("focus");
        }), t.on("close", function () {
          i.$search.val(""), i.$search.removeAttr("aria-controls"), i.$search.removeAttr("aria-activedescendant"), i.$search.trigger("focus");
        }), t.on("enable", function () {
          i.$search.prop("disabled", !1), i._transferTabIndex();
        }), t.on("disable", function () {
          i.$search.prop("disabled", !0);
        }), t.on("focus", function (e) {
          i.$search.trigger("focus");
        }), t.on("results:focus", function (e) {
          e.data._resultId ? i.$search.attr("aria-activedescendant", e.data._resultId) : i.$search.removeAttr("aria-activedescendant");
        }), this.$selection.on("focusin", ".select2-search--inline", function (e) {
          i.trigger("focus", e);
        }), this.$selection.on("focusout", ".select2-search--inline", function (e) {
          i._handleBlur(e);
        }), this.$selection.on("keydown", ".select2-search--inline", function (e) {
          if (e.stopPropagation(), i.trigger("keypress", e), i._keyUpPrevented = e.isDefaultPrevented(), e.which === l.BACKSPACE && "" === i.$search.val()) {
            var t = i.$searchContainer.prev(".select2-selection__choice");

            if (0 < t.length) {
              var n = a.GetData(t[0], "data");
              i.searchRemoveChoice(n), e.preventDefault();
            }
          }
        }), this.$selection.on("click", ".select2-search--inline", function (e) {
          i.$search.val() && e.stopPropagation();
        });
        var o = document.documentMode,
            s = o && o <= 11;
        this.$selection.on("input.searchcheck", ".select2-search--inline", function (e) {
          s ? i.$selection.off("input.search input.searchcheck") : i.$selection.off("keyup.search");
        }), this.$selection.on("keyup.search input.search", ".select2-search--inline", function (e) {
          if (s && "input" === e.type) i.$selection.off("input.search input.searchcheck");else {
            var t = e.which;
            t != l.SHIFT && t != l.CTRL && t != l.ALT && t != l.TAB && i.handleSearch(e);
          }
        });
      }, e.prototype._transferTabIndex = function (e) {
        this.$search.attr("tabindex", this.$selection.attr("tabindex")), this.$selection.attr("tabindex", "-1");
      }, e.prototype.createPlaceholder = function (e, t) {
        this.$search.attr("placeholder", t.text);
      }, e.prototype.update = function (e, t) {
        var n = this.$search[0] == document.activeElement;
        this.$search.attr("placeholder", ""), e.call(this, t), this.$selection.find(".select2-selection__rendered").append(this.$searchContainer), this.resizeSearch(), n && this.$search.trigger("focus");
      }, e.prototype.handleSearch = function () {
        if (this.resizeSearch(), !this._keyUpPrevented) {
          var e = this.$search.val();
          this.trigger("query", {
            term: e
          });
        }

        this._keyUpPrevented = !1;
      }, e.prototype.searchRemoveChoice = function (e, t) {
        this.trigger("unselect", {
          data: t
        }), this.$search.val(t.text), this.handleSearch();
      }, e.prototype.resizeSearch = function () {
        this.$search.css("width", "25px");
        var e = "";
        "" !== this.$search.attr("placeholder") ? e = this.$selection.find(".select2-selection__rendered").width() : e = .75 * (this.$search.val().length + 1) + "em";
        this.$search.css("width", e);
      }, e;
    }), e.define("select2/selection/eventRelay", ["jquery"], function (s) {
      function e() {}

      return e.prototype.bind = function (e, t, n) {
        var i = this,
            r = ["open", "opening", "close", "closing", "select", "selecting", "unselect", "unselecting", "clear", "clearing"],
            o = ["opening", "closing", "selecting", "unselecting", "clearing"];
        e.call(this, t, n), t.on("*", function (e, t) {
          if (-1 !== s.inArray(e, r)) {
            t = t || {};
            var n = s.Event("select2:" + e, {
              params: t
            });
            i.$element.trigger(n), -1 !== s.inArray(e, o) && (t.prevented = n.isDefaultPrevented());
          }
        });
      }, e;
    }), e.define("select2/translation", ["jquery", "require"], function (t, n) {
      function i(e) {
        this.dict = e || {};
      }

      return i.prototype.all = function () {
        return this.dict;
      }, i.prototype.get = function (e) {
        return this.dict[e];
      }, i.prototype.extend = function (e) {
        this.dict = t.extend({}, e.all(), this.dict);
      }, i._cache = {}, i.loadPath = function (e) {
        if (!(e in i._cache)) {
          var t = n(e);
          i._cache[e] = t;
        }

        return new i(i._cache[e]);
      }, i;
    }), e.define("select2/diacritics", [], function () {
      return {
        "Ⓐ": "A",
        "Ａ": "A",
        "À": "A",
        "Á": "A",
        "Â": "A",
        "Ầ": "A",
        "Ấ": "A",
        "Ẫ": "A",
        "Ẩ": "A",
        "Ã": "A",
        "Ā": "A",
        "Ă": "A",
        "Ằ": "A",
        "Ắ": "A",
        "Ẵ": "A",
        "Ẳ": "A",
        "Ȧ": "A",
        "Ǡ": "A",
        "Ä": "A",
        "Ǟ": "A",
        "Ả": "A",
        "Å": "A",
        "Ǻ": "A",
        "Ǎ": "A",
        "Ȁ": "A",
        "Ȃ": "A",
        "Ạ": "A",
        "Ậ": "A",
        "Ặ": "A",
        "Ḁ": "A",
        "Ą": "A",
        "Ⱥ": "A",
        "Ɐ": "A",
        "Ꜳ": "AA",
        "Æ": "AE",
        "Ǽ": "AE",
        "Ǣ": "AE",
        "Ꜵ": "AO",
        "Ꜷ": "AU",
        "Ꜹ": "AV",
        "Ꜻ": "AV",
        "Ꜽ": "AY",
        "Ⓑ": "B",
        "Ｂ": "B",
        "Ḃ": "B",
        "Ḅ": "B",
        "Ḇ": "B",
        "Ƀ": "B",
        "Ƃ": "B",
        "Ɓ": "B",
        "Ⓒ": "C",
        "Ｃ": "C",
        "Ć": "C",
        "Ĉ": "C",
        "Ċ": "C",
        "Č": "C",
        "Ç": "C",
        "Ḉ": "C",
        "Ƈ": "C",
        "Ȼ": "C",
        "Ꜿ": "C",
        "Ⓓ": "D",
        "Ｄ": "D",
        "Ḋ": "D",
        "Ď": "D",
        "Ḍ": "D",
        "Ḑ": "D",
        "Ḓ": "D",
        "Ḏ": "D",
        "Đ": "D",
        "Ƌ": "D",
        "Ɗ": "D",
        "Ɖ": "D",
        "Ꝺ": "D",
        "Ǳ": "DZ",
        "Ǆ": "DZ",
        "ǲ": "Dz",
        "ǅ": "Dz",
        "Ⓔ": "E",
        "Ｅ": "E",
        "È": "E",
        "É": "E",
        "Ê": "E",
        "Ề": "E",
        "Ế": "E",
        "Ễ": "E",
        "Ể": "E",
        "Ẽ": "E",
        "Ē": "E",
        "Ḕ": "E",
        "Ḗ": "E",
        "Ĕ": "E",
        "Ė": "E",
        "Ë": "E",
        "Ẻ": "E",
        "Ě": "E",
        "Ȅ": "E",
        "Ȇ": "E",
        "Ẹ": "E",
        "Ệ": "E",
        "Ȩ": "E",
        "Ḝ": "E",
        "Ę": "E",
        "Ḙ": "E",
        "Ḛ": "E",
        "Ɛ": "E",
        "Ǝ": "E",
        "Ⓕ": "F",
        "Ｆ": "F",
        "Ḟ": "F",
        "Ƒ": "F",
        "Ꝼ": "F",
        "Ⓖ": "G",
        "Ｇ": "G",
        "Ǵ": "G",
        "Ĝ": "G",
        "Ḡ": "G",
        "Ğ": "G",
        "Ġ": "G",
        "Ǧ": "G",
        "Ģ": "G",
        "Ǥ": "G",
        "Ɠ": "G",
        "Ꞡ": "G",
        "Ᵹ": "G",
        "Ꝿ": "G",
        "Ⓗ": "H",
        "Ｈ": "H",
        "Ĥ": "H",
        "Ḣ": "H",
        "Ḧ": "H",
        "Ȟ": "H",
        "Ḥ": "H",
        "Ḩ": "H",
        "Ḫ": "H",
        "Ħ": "H",
        "Ⱨ": "H",
        "Ⱶ": "H",
        "Ɥ": "H",
        "Ⓘ": "I",
        "Ｉ": "I",
        "Ì": "I",
        "Í": "I",
        "Î": "I",
        "Ĩ": "I",
        "Ī": "I",
        "Ĭ": "I",
        "İ": "I",
        "Ï": "I",
        "Ḯ": "I",
        "Ỉ": "I",
        "Ǐ": "I",
        "Ȉ": "I",
        "Ȋ": "I",
        "Ị": "I",
        "Į": "I",
        "Ḭ": "I",
        "Ɨ": "I",
        "Ⓙ": "J",
        "Ｊ": "J",
        "Ĵ": "J",
        "Ɉ": "J",
        "Ⓚ": "K",
        "Ｋ": "K",
        "Ḱ": "K",
        "Ǩ": "K",
        "Ḳ": "K",
        "Ķ": "K",
        "Ḵ": "K",
        "Ƙ": "K",
        "Ⱪ": "K",
        "Ꝁ": "K",
        "Ꝃ": "K",
        "Ꝅ": "K",
        "Ꞣ": "K",
        "Ⓛ": "L",
        "Ｌ": "L",
        "Ŀ": "L",
        "Ĺ": "L",
        "Ľ": "L",
        "Ḷ": "L",
        "Ḹ": "L",
        "Ļ": "L",
        "Ḽ": "L",
        "Ḻ": "L",
        "Ł": "L",
        "Ƚ": "L",
        "Ɫ": "L",
        "Ⱡ": "L",
        "Ꝉ": "L",
        "Ꝇ": "L",
        "Ꞁ": "L",
        "Ǉ": "LJ",
        "ǈ": "Lj",
        "Ⓜ": "M",
        "Ｍ": "M",
        "Ḿ": "M",
        "Ṁ": "M",
        "Ṃ": "M",
        "Ɱ": "M",
        "Ɯ": "M",
        "Ⓝ": "N",
        "Ｎ": "N",
        "Ǹ": "N",
        "Ń": "N",
        "Ñ": "N",
        "Ṅ": "N",
        "Ň": "N",
        "Ṇ": "N",
        "Ņ": "N",
        "Ṋ": "N",
        "Ṉ": "N",
        "Ƞ": "N",
        "Ɲ": "N",
        "Ꞑ": "N",
        "Ꞥ": "N",
        "Ǌ": "NJ",
        "ǋ": "Nj",
        "Ⓞ": "O",
        "Ｏ": "O",
        "Ò": "O",
        "Ó": "O",
        "Ô": "O",
        "Ồ": "O",
        "Ố": "O",
        "Ỗ": "O",
        "Ổ": "O",
        "Õ": "O",
        "Ṍ": "O",
        "Ȭ": "O",
        "Ṏ": "O",
        "Ō": "O",
        "Ṑ": "O",
        "Ṓ": "O",
        "Ŏ": "O",
        "Ȯ": "O",
        "Ȱ": "O",
        "Ö": "O",
        "Ȫ": "O",
        "Ỏ": "O",
        "Ő": "O",
        "Ǒ": "O",
        "Ȍ": "O",
        "Ȏ": "O",
        "Ơ": "O",
        "Ờ": "O",
        "Ớ": "O",
        "Ỡ": "O",
        "Ở": "O",
        "Ợ": "O",
        "Ọ": "O",
        "Ộ": "O",
        "Ǫ": "O",
        "Ǭ": "O",
        "Ø": "O",
        "Ǿ": "O",
        "Ɔ": "O",
        "Ɵ": "O",
        "Ꝋ": "O",
        "Ꝍ": "O",
        "Œ": "OE",
        "Ƣ": "OI",
        "Ꝏ": "OO",
        "Ȣ": "OU",
        "Ⓟ": "P",
        "Ｐ": "P",
        "Ṕ": "P",
        "Ṗ": "P",
        "Ƥ": "P",
        "Ᵽ": "P",
        "Ꝑ": "P",
        "Ꝓ": "P",
        "Ꝕ": "P",
        "Ⓠ": "Q",
        "Ｑ": "Q",
        "Ꝗ": "Q",
        "Ꝙ": "Q",
        "Ɋ": "Q",
        "Ⓡ": "R",
        "Ｒ": "R",
        "Ŕ": "R",
        "Ṙ": "R",
        "Ř": "R",
        "Ȑ": "R",
        "Ȓ": "R",
        "Ṛ": "R",
        "Ṝ": "R",
        "Ŗ": "R",
        "Ṟ": "R",
        "Ɍ": "R",
        "Ɽ": "R",
        "Ꝛ": "R",
        "Ꞧ": "R",
        "Ꞃ": "R",
        "Ⓢ": "S",
        "Ｓ": "S",
        "ẞ": "S",
        "Ś": "S",
        "Ṥ": "S",
        "Ŝ": "S",
        "Ṡ": "S",
        "Š": "S",
        "Ṧ": "S",
        "Ṣ": "S",
        "Ṩ": "S",
        "Ș": "S",
        "Ş": "S",
        "Ȿ": "S",
        "Ꞩ": "S",
        "Ꞅ": "S",
        "Ⓣ": "T",
        "Ｔ": "T",
        "Ṫ": "T",
        "Ť": "T",
        "Ṭ": "T",
        "Ț": "T",
        "Ţ": "T",
        "Ṱ": "T",
        "Ṯ": "T",
        "Ŧ": "T",
        "Ƭ": "T",
        "Ʈ": "T",
        "Ⱦ": "T",
        "Ꞇ": "T",
        "Ꜩ": "TZ",
        "Ⓤ": "U",
        "Ｕ": "U",
        "Ù": "U",
        "Ú": "U",
        "Û": "U",
        "Ũ": "U",
        "Ṹ": "U",
        "Ū": "U",
        "Ṻ": "U",
        "Ŭ": "U",
        "Ü": "U",
        "Ǜ": "U",
        "Ǘ": "U",
        "Ǖ": "U",
        "Ǚ": "U",
        "Ủ": "U",
        "Ů": "U",
        "Ű": "U",
        "Ǔ": "U",
        "Ȕ": "U",
        "Ȗ": "U",
        "Ư": "U",
        "Ừ": "U",
        "Ứ": "U",
        "Ữ": "U",
        "Ử": "U",
        "Ự": "U",
        "Ụ": "U",
        "Ṳ": "U",
        "Ų": "U",
        "Ṷ": "U",
        "Ṵ": "U",
        "Ʉ": "U",
        "Ⓥ": "V",
        "Ｖ": "V",
        "Ṽ": "V",
        "Ṿ": "V",
        "Ʋ": "V",
        "Ꝟ": "V",
        "Ʌ": "V",
        "Ꝡ": "VY",
        "Ⓦ": "W",
        "Ｗ": "W",
        "Ẁ": "W",
        "Ẃ": "W",
        "Ŵ": "W",
        "Ẇ": "W",
        "Ẅ": "W",
        "Ẉ": "W",
        "Ⱳ": "W",
        "Ⓧ": "X",
        "Ｘ": "X",
        "Ẋ": "X",
        "Ẍ": "X",
        "Ⓨ": "Y",
        "Ｙ": "Y",
        "Ỳ": "Y",
        "Ý": "Y",
        "Ŷ": "Y",
        "Ỹ": "Y",
        "Ȳ": "Y",
        "Ẏ": "Y",
        "Ÿ": "Y",
        "Ỷ": "Y",
        "Ỵ": "Y",
        "Ƴ": "Y",
        "Ɏ": "Y",
        "Ỿ": "Y",
        "Ⓩ": "Z",
        "Ｚ": "Z",
        "Ź": "Z",
        "Ẑ": "Z",
        "Ż": "Z",
        "Ž": "Z",
        "Ẓ": "Z",
        "Ẕ": "Z",
        "Ƶ": "Z",
        "Ȥ": "Z",
        "Ɀ": "Z",
        "Ⱬ": "Z",
        "Ꝣ": "Z",
        "ⓐ": "a",
        "ａ": "a",
        "ẚ": "a",
        "à": "a",
        "á": "a",
        "â": "a",
        "ầ": "a",
        "ấ": "a",
        "ẫ": "a",
        "ẩ": "a",
        "ã": "a",
        "ā": "a",
        "ă": "a",
        "ằ": "a",
        "ắ": "a",
        "ẵ": "a",
        "ẳ": "a",
        "ȧ": "a",
        "ǡ": "a",
        "ä": "a",
        "ǟ": "a",
        "ả": "a",
        "å": "a",
        "ǻ": "a",
        "ǎ": "a",
        "ȁ": "a",
        "ȃ": "a",
        "ạ": "a",
        "ậ": "a",
        "ặ": "a",
        "ḁ": "a",
        "ą": "a",
        "ⱥ": "a",
        "ɐ": "a",
        "ꜳ": "aa",
        "æ": "ae",
        "ǽ": "ae",
        "ǣ": "ae",
        "ꜵ": "ao",
        "ꜷ": "au",
        "ꜹ": "av",
        "ꜻ": "av",
        "ꜽ": "ay",
        "ⓑ": "b",
        "ｂ": "b",
        "ḃ": "b",
        "ḅ": "b",
        "ḇ": "b",
        "ƀ": "b",
        "ƃ": "b",
        "ɓ": "b",
        "ⓒ": "c",
        "ｃ": "c",
        "ć": "c",
        "ĉ": "c",
        "ċ": "c",
        "č": "c",
        "ç": "c",
        "ḉ": "c",
        "ƈ": "c",
        "ȼ": "c",
        "ꜿ": "c",
        "ↄ": "c",
        "ⓓ": "d",
        "ｄ": "d",
        "ḋ": "d",
        "ď": "d",
        "ḍ": "d",
        "ḑ": "d",
        "ḓ": "d",
        "ḏ": "d",
        "đ": "d",
        "ƌ": "d",
        "ɖ": "d",
        "ɗ": "d",
        "ꝺ": "d",
        "ǳ": "dz",
        "ǆ": "dz",
        "ⓔ": "e",
        "ｅ": "e",
        "è": "e",
        "é": "e",
        "ê": "e",
        "ề": "e",
        "ế": "e",
        "ễ": "e",
        "ể": "e",
        "ẽ": "e",
        "ē": "e",
        "ḕ": "e",
        "ḗ": "e",
        "ĕ": "e",
        "ė": "e",
        "ë": "e",
        "ẻ": "e",
        "ě": "e",
        "ȅ": "e",
        "ȇ": "e",
        "ẹ": "e",
        "ệ": "e",
        "ȩ": "e",
        "ḝ": "e",
        "ę": "e",
        "ḙ": "e",
        "ḛ": "e",
        "ɇ": "e",
        "ɛ": "e",
        "ǝ": "e",
        "ⓕ": "f",
        "ｆ": "f",
        "ḟ": "f",
        "ƒ": "f",
        "ꝼ": "f",
        "ⓖ": "g",
        "ｇ": "g",
        "ǵ": "g",
        "ĝ": "g",
        "ḡ": "g",
        "ğ": "g",
        "ġ": "g",
        "ǧ": "g",
        "ģ": "g",
        "ǥ": "g",
        "ɠ": "g",
        "ꞡ": "g",
        "ᵹ": "g",
        "ꝿ": "g",
        "ⓗ": "h",
        "ｈ": "h",
        "ĥ": "h",
        "ḣ": "h",
        "ḧ": "h",
        "ȟ": "h",
        "ḥ": "h",
        "ḩ": "h",
        "ḫ": "h",
        "ẖ": "h",
        "ħ": "h",
        "ⱨ": "h",
        "ⱶ": "h",
        "ɥ": "h",
        "ƕ": "hv",
        "ⓘ": "i",
        "ｉ": "i",
        "ì": "i",
        "í": "i",
        "î": "i",
        "ĩ": "i",
        "ī": "i",
        "ĭ": "i",
        "ï": "i",
        "ḯ": "i",
        "ỉ": "i",
        "ǐ": "i",
        "ȉ": "i",
        "ȋ": "i",
        "ị": "i",
        "į": "i",
        "ḭ": "i",
        "ɨ": "i",
        "ı": "i",
        "ⓙ": "j",
        "ｊ": "j",
        "ĵ": "j",
        "ǰ": "j",
        "ɉ": "j",
        "ⓚ": "k",
        "ｋ": "k",
        "ḱ": "k",
        "ǩ": "k",
        "ḳ": "k",
        "ķ": "k",
        "ḵ": "k",
        "ƙ": "k",
        "ⱪ": "k",
        "ꝁ": "k",
        "ꝃ": "k",
        "ꝅ": "k",
        "ꞣ": "k",
        "ⓛ": "l",
        "ｌ": "l",
        "ŀ": "l",
        "ĺ": "l",
        "ľ": "l",
        "ḷ": "l",
        "ḹ": "l",
        "ļ": "l",
        "ḽ": "l",
        "ḻ": "l",
        "ſ": "l",
        "ł": "l",
        "ƚ": "l",
        "ɫ": "l",
        "ⱡ": "l",
        "ꝉ": "l",
        "ꞁ": "l",
        "ꝇ": "l",
        "ǉ": "lj",
        "ⓜ": "m",
        "ｍ": "m",
        "ḿ": "m",
        "ṁ": "m",
        "ṃ": "m",
        "ɱ": "m",
        "ɯ": "m",
        "ⓝ": "n",
        "ｎ": "n",
        "ǹ": "n",
        "ń": "n",
        "ñ": "n",
        "ṅ": "n",
        "ň": "n",
        "ṇ": "n",
        "ņ": "n",
        "ṋ": "n",
        "ṉ": "n",
        "ƞ": "n",
        "ɲ": "n",
        "ŉ": "n",
        "ꞑ": "n",
        "ꞥ": "n",
        "ǌ": "nj",
        "ⓞ": "o",
        "ｏ": "o",
        "ò": "o",
        "ó": "o",
        "ô": "o",
        "ồ": "o",
        "ố": "o",
        "ỗ": "o",
        "ổ": "o",
        "õ": "o",
        "ṍ": "o",
        "ȭ": "o",
        "ṏ": "o",
        "ō": "o",
        "ṑ": "o",
        "ṓ": "o",
        "ŏ": "o",
        "ȯ": "o",
        "ȱ": "o",
        "ö": "o",
        "ȫ": "o",
        "ỏ": "o",
        "ő": "o",
        "ǒ": "o",
        "ȍ": "o",
        "ȏ": "o",
        "ơ": "o",
        "ờ": "o",
        "ớ": "o",
        "ỡ": "o",
        "ở": "o",
        "ợ": "o",
        "ọ": "o",
        "ộ": "o",
        "ǫ": "o",
        "ǭ": "o",
        "ø": "o",
        "ǿ": "o",
        "ɔ": "o",
        "ꝋ": "o",
        "ꝍ": "o",
        "ɵ": "o",
        "œ": "oe",
        "ƣ": "oi",
        "ȣ": "ou",
        "ꝏ": "oo",
        "ⓟ": "p",
        "ｐ": "p",
        "ṕ": "p",
        "ṗ": "p",
        "ƥ": "p",
        "ᵽ": "p",
        "ꝑ": "p",
        "ꝓ": "p",
        "ꝕ": "p",
        "ⓠ": "q",
        "ｑ": "q",
        "ɋ": "q",
        "ꝗ": "q",
        "ꝙ": "q",
        "ⓡ": "r",
        "ｒ": "r",
        "ŕ": "r",
        "ṙ": "r",
        "ř": "r",
        "ȑ": "r",
        "ȓ": "r",
        "ṛ": "r",
        "ṝ": "r",
        "ŗ": "r",
        "ṟ": "r",
        "ɍ": "r",
        "ɽ": "r",
        "ꝛ": "r",
        "ꞧ": "r",
        "ꞃ": "r",
        "ⓢ": "s",
        "ｓ": "s",
        "ß": "s",
        "ś": "s",
        "ṥ": "s",
        "ŝ": "s",
        "ṡ": "s",
        "š": "s",
        "ṧ": "s",
        "ṣ": "s",
        "ṩ": "s",
        "ș": "s",
        "ş": "s",
        "ȿ": "s",
        "ꞩ": "s",
        "ꞅ": "s",
        "ẛ": "s",
        "ⓣ": "t",
        "ｔ": "t",
        "ṫ": "t",
        "ẗ": "t",
        "ť": "t",
        "ṭ": "t",
        "ț": "t",
        "ţ": "t",
        "ṱ": "t",
        "ṯ": "t",
        "ŧ": "t",
        "ƭ": "t",
        "ʈ": "t",
        "ⱦ": "t",
        "ꞇ": "t",
        "ꜩ": "tz",
        "ⓤ": "u",
        "ｕ": "u",
        "ù": "u",
        "ú": "u",
        "û": "u",
        "ũ": "u",
        "ṹ": "u",
        "ū": "u",
        "ṻ": "u",
        "ŭ": "u",
        "ü": "u",
        "ǜ": "u",
        "ǘ": "u",
        "ǖ": "u",
        "ǚ": "u",
        "ủ": "u",
        "ů": "u",
        "ű": "u",
        "ǔ": "u",
        "ȕ": "u",
        "ȗ": "u",
        "ư": "u",
        "ừ": "u",
        "ứ": "u",
        "ữ": "u",
        "ử": "u",
        "ự": "u",
        "ụ": "u",
        "ṳ": "u",
        "ų": "u",
        "ṷ": "u",
        "ṵ": "u",
        "ʉ": "u",
        "ⓥ": "v",
        "ｖ": "v",
        "ṽ": "v",
        "ṿ": "v",
        "ʋ": "v",
        "ꝟ": "v",
        "ʌ": "v",
        "ꝡ": "vy",
        "ⓦ": "w",
        "ｗ": "w",
        "ẁ": "w",
        "ẃ": "w",
        "ŵ": "w",
        "ẇ": "w",
        "ẅ": "w",
        "ẘ": "w",
        "ẉ": "w",
        "ⱳ": "w",
        "ⓧ": "x",
        "ｘ": "x",
        "ẋ": "x",
        "ẍ": "x",
        "ⓨ": "y",
        "ｙ": "y",
        "ỳ": "y",
        "ý": "y",
        "ŷ": "y",
        "ỹ": "y",
        "ȳ": "y",
        "ẏ": "y",
        "ÿ": "y",
        "ỷ": "y",
        "ẙ": "y",
        "ỵ": "y",
        "ƴ": "y",
        "ɏ": "y",
        "ỿ": "y",
        "ⓩ": "z",
        "ｚ": "z",
        "ź": "z",
        "ẑ": "z",
        "ż": "z",
        "ž": "z",
        "ẓ": "z",
        "ẕ": "z",
        "ƶ": "z",
        "ȥ": "z",
        "ɀ": "z",
        "ⱬ": "z",
        "ꝣ": "z",
        "Ά": "Α",
        "Έ": "Ε",
        "Ή": "Η",
        "Ί": "Ι",
        "Ϊ": "Ι",
        "Ό": "Ο",
        "Ύ": "Υ",
        "Ϋ": "Υ",
        "Ώ": "Ω",
        "ά": "α",
        "έ": "ε",
        "ή": "η",
        "ί": "ι",
        "ϊ": "ι",
        "ΐ": "ι",
        "ό": "ο",
        "ύ": "υ",
        "ϋ": "υ",
        "ΰ": "υ",
        "ώ": "ω",
        "ς": "σ",
        "’": "'"
      };
    }), e.define("select2/data/base", ["../utils"], function (i) {
      function n(e, t) {
        n.__super__.constructor.call(this);
      }

      return i.Extend(n, i.Observable), n.prototype.current = function (e) {
        throw new Error("The `current` method must be defined in child classes.");
      }, n.prototype.query = function (e, t) {
        throw new Error("The `query` method must be defined in child classes.");
      }, n.prototype.bind = function (e, t) {}, n.prototype.destroy = function () {}, n.prototype.generateResultId = function (e, t) {
        var n = e.id + "-result-";
        return n += i.generateChars(4), null != t.id ? n += "-" + t.id.toString() : n += "-" + i.generateChars(4), n;
      }, n;
    }), e.define("select2/data/select", ["./base", "../utils", "jquery"], function (e, a, l) {
      function n(e, t) {
        this.$element = e, this.options = t, n.__super__.constructor.call(this);
      }

      return a.Extend(n, e), n.prototype.current = function (e) {
        var n = [],
            i = this;
        this.$element.find(":selected").each(function () {
          var e = l(this),
              t = i.item(e);
          n.push(t);
        }), e(n);
      }, n.prototype.select = function (r) {
        var o = this;
        if (r.selected = !0, l(r.element).is("option")) return r.element.selected = !0, void this.$element.trigger("input").trigger("change");
        if (this.$element.prop("multiple")) this.current(function (e) {
          var t = [];
          (r = [r]).push.apply(r, e);

          for (var n = 0; n < r.length; n++) {
            var i = r[n].id;
            -1 === l.inArray(i, t) && t.push(i);
          }

          o.$element.val(t), o.$element.trigger("input").trigger("change");
        });else {
          var e = r.id;
          this.$element.val(e), this.$element.trigger("input").trigger("change");
        }
      }, n.prototype.unselect = function (r) {
        var o = this;

        if (this.$element.prop("multiple")) {
          if (r.selected = !1, l(r.element).is("option")) return r.element.selected = !1, void this.$element.trigger("input").trigger("change");
          this.current(function (e) {
            for (var t = [], n = 0; n < e.length; n++) {
              var i = e[n].id;
              i !== r.id && -1 === l.inArray(i, t) && t.push(i);
            }

            o.$element.val(t), o.$element.trigger("input").trigger("change");
          });
        }
      }, n.prototype.bind = function (e, t) {
        var n = this;
        (this.container = e).on("select", function (e) {
          n.select(e.data);
        }), e.on("unselect", function (e) {
          n.unselect(e.data);
        });
      }, n.prototype.destroy = function () {
        this.$element.find("*").each(function () {
          a.RemoveData(this);
        });
      }, n.prototype.query = function (i, e) {
        var r = [],
            o = this;
        this.$element.children().each(function () {
          var e = l(this);

          if (e.is("option") || e.is("optgroup")) {
            var t = o.item(e),
                n = o.matches(i, t);
            null !== n && r.push(n);
          }
        }), e({
          results: r
        });
      }, n.prototype.addOptions = function (e) {
        a.appendMany(this.$element, e);
      }, n.prototype.option = function (e) {
        var t;
        e.children ? (t = document.createElement("optgroup")).label = e.text : void 0 !== (t = document.createElement("option")).textContent ? t.textContent = e.text : t.innerText = e.text, void 0 !== e.id && (t.value = e.id), e.disabled && (t.disabled = !0), e.selected && (t.selected = !0), e.title && (t.title = e.title);

        var n = l(t),
            i = this._normalizeItem(e);

        return i.element = t, a.StoreData(t, "data", i), n;
      }, n.prototype.item = function (e) {
        var t = {};
        if (null != (t = a.GetData(e[0], "data"))) return t;
        if (e.is("option")) t = {
          id: e.val(),
          text: e.text(),
          disabled: e.prop("disabled"),
          selected: e.prop("selected"),
          title: e.prop("title")
        };else if (e.is("optgroup")) {
          t = {
            text: e.prop("label"),
            children: [],
            title: e.prop("title")
          };

          for (var n = e.children("option"), i = [], r = 0; r < n.length; r++) {
            var o = l(n[r]),
                s = this.item(o);
            i.push(s);
          }

          t.children = i;
        }
        return (t = this._normalizeItem(t)).element = e[0], a.StoreData(e[0], "data", t), t;
      }, n.prototype._normalizeItem = function (e) {
        e !== Object(e) && (e = {
          id: e,
          text: e
        });
        return null != (e = l.extend({}, {
          text: ""
        }, e)).id && (e.id = e.id.toString()), null != e.text && (e.text = e.text.toString()), null == e._resultId && e.id && null != this.container && (e._resultId = this.generateResultId(this.container, e)), l.extend({}, {
          selected: !1,
          disabled: !1
        }, e);
      }, n.prototype.matches = function (e, t) {
        return this.options.get("matcher")(e, t);
      }, n;
    }), e.define("select2/data/array", ["./select", "../utils", "jquery"], function (e, f, g) {
      function i(e, t) {
        this._dataToConvert = t.get("data") || [], i.__super__.constructor.call(this, e, t);
      }

      return f.Extend(i, e), i.prototype.bind = function (e, t) {
        i.__super__.bind.call(this, e, t), this.addOptions(this.convertToOptions(this._dataToConvert));
      }, i.prototype.select = function (n) {
        var e = this.$element.find("option").filter(function (e, t) {
          return t.value == n.id.toString();
        });
        0 === e.length && (e = this.option(n), this.addOptions(e)), i.__super__.select.call(this, n);
      }, i.prototype.convertToOptions = function (e) {
        var t = this,
            n = this.$element.find("option"),
            i = n.map(function () {
          return t.item(g(this)).id;
        }).get(),
            r = [];

        function o(e) {
          return function () {
            return g(this).val() == e.id;
          };
        }

        for (var s = 0; s < e.length; s++) {
          var a = this._normalizeItem(e[s]);

          if (0 <= g.inArray(a.id, i)) {
            var l = n.filter(o(a)),
                c = this.item(l),
                u = g.extend(!0, {}, a, c),
                d = this.option(u);
            l.replaceWith(d);
          } else {
            var p = this.option(a);

            if (a.children) {
              var h = this.convertToOptions(a.children);
              f.appendMany(p, h);
            }

            r.push(p);
          }
        }

        return r;
      }, i;
    }), e.define("select2/data/ajax", ["./array", "../utils", "jquery"], function (e, t, o) {
      function n(e, t) {
        this.ajaxOptions = this._applyDefaults(t.get("ajax")), null != this.ajaxOptions.processResults && (this.processResults = this.ajaxOptions.processResults), n.__super__.constructor.call(this, e, t);
      }

      return t.Extend(n, e), n.prototype._applyDefaults = function (e) {
        var t = {
          data: function data(e) {
            return o.extend({}, e, {
              q: e.term
            });
          },
          transport: function transport(e, t, n) {
            var i = o.ajax(e);
            return i.then(t), i.fail(n), i;
          }
        };
        return o.extend({}, t, e, !0);
      }, n.prototype.processResults = function (e) {
        return e;
      }, n.prototype.query = function (n, i) {
        var r = this;
        null != this._request && (o.isFunction(this._request.abort) && this._request.abort(), this._request = null);
        var t = o.extend({
          type: "GET"
        }, this.ajaxOptions);

        function e() {
          var e = t.transport(t, function (e) {
            var t = r.processResults(e, n);
            r.options.get("debug") && window.console && console.error && (t && t.results && o.isArray(t.results) || console.error("Select2: The AJAX results did not return an array in the `results` key of the response.")), i(t);
          }, function () {
            "status" in e && (0 === e.status || "0" === e.status) || r.trigger("results:message", {
              message: "errorLoading"
            });
          });
          r._request = e;
        }

        "function" == typeof t.url && (t.url = t.url.call(this.$element, n)), "function" == typeof t.data && (t.data = t.data.call(this.$element, n)), this.ajaxOptions.delay && null != n.term ? (this._queryTimeout && window.clearTimeout(this._queryTimeout), this._queryTimeout = window.setTimeout(e, this.ajaxOptions.delay)) : e();
      }, n;
    }), e.define("select2/data/tags", ["jquery"], function (u) {
      function e(e, t, n) {
        var i = n.get("tags"),
            r = n.get("createTag");
        void 0 !== r && (this.createTag = r);
        var o = n.get("insertTag");
        if (void 0 !== o && (this.insertTag = o), e.call(this, t, n), u.isArray(i)) for (var s = 0; s < i.length; s++) {
          var a = i[s],
              l = this._normalizeItem(a),
              c = this.option(l);

          this.$element.append(c);
        }
      }

      return e.prototype.query = function (e, c, u) {
        var d = this;
        this._removeOldTags(), null != c.term && null == c.page ? e.call(this, c, function e(t, n) {
          for (var i = t.results, r = 0; r < i.length; r++) {
            var o = i[r],
                s = null != o.children && !e({
              results: o.children
            }, !0);
            if ((o.text || "").toUpperCase() === (c.term || "").toUpperCase() || s) return !n && (t.data = i, void u(t));
          }

          if (n) return !0;
          var a = d.createTag(c);

          if (null != a) {
            var l = d.option(a);
            l.attr("data-select2-tag", !0), d.addOptions([l]), d.insertTag(i, a);
          }

          t.results = i, u(t);
        }) : e.call(this, c, u);
      }, e.prototype.createTag = function (e, t) {
        var n = u.trim(t.term);
        return "" === n ? null : {
          id: n,
          text: n
        };
      }, e.prototype.insertTag = function (e, t, n) {
        t.unshift(n);
      }, e.prototype._removeOldTags = function (e) {
        this.$element.find("option[data-select2-tag]").each(function () {
          this.selected || u(this).remove();
        });
      }, e;
    }), e.define("select2/data/tokenizer", ["jquery"], function (d) {
      function e(e, t, n) {
        var i = n.get("tokenizer");
        void 0 !== i && (this.tokenizer = i), e.call(this, t, n);
      }

      return e.prototype.bind = function (e, t, n) {
        e.call(this, t, n), this.$search = t.dropdown.$search || t.selection.$search || n.find(".select2-search__field");
      }, e.prototype.query = function (e, t, n) {
        var r = this;
        t.term = t.term || "";
        var i = this.tokenizer(t, this.options, function (e) {
          var t,
              n = r._normalizeItem(e);

          if (!r.$element.find("option").filter(function () {
            return d(this).val() === n.id;
          }).length) {
            var i = r.option(n);
            i.attr("data-select2-tag", !0), r._removeOldTags(), r.addOptions([i]);
          }

          t = n, r.trigger("select", {
            data: t
          });
        });
        i.term !== t.term && (this.$search.length && (this.$search.val(i.term), this.$search.trigger("focus")), t.term = i.term), e.call(this, t, n);
      }, e.prototype.tokenizer = function (e, t, n, i) {
        for (var r = n.get("tokenSeparators") || [], o = t.term, s = 0, a = this.createTag || function (e) {
          return {
            id: e.term,
            text: e.term
          };
        }; s < o.length;) {
          var l = o[s];

          if (-1 !== d.inArray(l, r)) {
            var c = o.substr(0, s),
                u = a(d.extend({}, t, {
              term: c
            }));
            null != u ? (i(u), o = o.substr(s + 1) || "", s = 0) : s++;
          } else s++;
        }

        return {
          term: o
        };
      }, e;
    }), e.define("select2/data/minimumInputLength", [], function () {
      function e(e, t, n) {
        this.minimumInputLength = n.get("minimumInputLength"), e.call(this, t, n);
      }

      return e.prototype.query = function (e, t, n) {
        t.term = t.term || "", t.term.length < this.minimumInputLength ? this.trigger("results:message", {
          message: "inputTooShort",
          args: {
            minimum: this.minimumInputLength,
            input: t.term,
            params: t
          }
        }) : e.call(this, t, n);
      }, e;
    }), e.define("select2/data/maximumInputLength", [], function () {
      function e(e, t, n) {
        this.maximumInputLength = n.get("maximumInputLength"), e.call(this, t, n);
      }

      return e.prototype.query = function (e, t, n) {
        t.term = t.term || "", 0 < this.maximumInputLength && t.term.length > this.maximumInputLength ? this.trigger("results:message", {
          message: "inputTooLong",
          args: {
            maximum: this.maximumInputLength,
            input: t.term,
            params: t
          }
        }) : e.call(this, t, n);
      }, e;
    }), e.define("select2/data/maximumSelectionLength", [], function () {
      function e(e, t, n) {
        this.maximumSelectionLength = n.get("maximumSelectionLength"), e.call(this, t, n);
      }

      return e.prototype.bind = function (e, t, n) {
        var i = this;
        e.call(this, t, n), t.on("select", function () {
          i._checkIfMaximumSelected();
        });
      }, e.prototype.query = function (e, t, n) {
        var i = this;

        this._checkIfMaximumSelected(function () {
          e.call(i, t, n);
        });
      }, e.prototype._checkIfMaximumSelected = function (e, n) {
        var i = this;
        this.current(function (e) {
          var t = null != e ? e.length : 0;
          0 < i.maximumSelectionLength && t >= i.maximumSelectionLength ? i.trigger("results:message", {
            message: "maximumSelected",
            args: {
              maximum: i.maximumSelectionLength
            }
          }) : n && n();
        });
      }, e;
    }), e.define("select2/dropdown", ["jquery", "./utils"], function (t, e) {
      function n(e, t) {
        this.$element = e, this.options = t, n.__super__.constructor.call(this);
      }

      return e.Extend(n, e.Observable), n.prototype.render = function () {
        var e = t('<span class="select2-dropdown"><span class="select2-results"></span></span>');
        return e.attr("dir", this.options.get("dir")), this.$dropdown = e;
      }, n.prototype.bind = function () {}, n.prototype.position = function (e, t) {}, n.prototype.destroy = function () {
        this.$dropdown.remove();
      }, n;
    }), e.define("select2/dropdown/search", ["jquery", "../utils"], function (o, e) {
      function t() {}

      return t.prototype.render = function (e) {
        var t = e.call(this),
            n = o('<span class="select2-search select2-search--dropdown"><input class="select2-search__field" type="search" tabindex="-1" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" role="searchbox" aria-autocomplete="list" /></span>');
        return this.$searchContainer = n, this.$search = n.find("input"), t.prepend(n), t;
      }, t.prototype.bind = function (e, t, n) {
        var i = this,
            r = t.id + "-results";
        e.call(this, t, n), this.$search.on("keydown", function (e) {
          i.trigger("keypress", e), i._keyUpPrevented = e.isDefaultPrevented();
        }), this.$search.on("input", function (e) {
          o(this).off("keyup");
        }), this.$search.on("keyup input", function (e) {
          i.handleSearch(e);
        }), t.on("open", function () {
          i.$search.attr("tabindex", 0), i.$search.attr("aria-controls", r), i.$search.trigger("focus"), window.setTimeout(function () {
            i.$search.trigger("focus");
          }, 0);
        }), t.on("close", function () {
          i.$search.attr("tabindex", -1), i.$search.removeAttr("aria-controls"), i.$search.removeAttr("aria-activedescendant"), i.$search.val(""), i.$search.trigger("blur");
        }), t.on("focus", function () {
          t.isOpen() || i.$search.trigger("focus");
        }), t.on("results:all", function (e) {
          null != e.query.term && "" !== e.query.term || (i.showSearch(e) ? i.$searchContainer.removeClass("select2-search--hide") : i.$searchContainer.addClass("select2-search--hide"));
        }), t.on("results:focus", function (e) {
          e.data._resultId ? i.$search.attr("aria-activedescendant", e.data._resultId) : i.$search.removeAttr("aria-activedescendant");
        });
      }, t.prototype.handleSearch = function (e) {
        if (!this._keyUpPrevented) {
          var t = this.$search.val();
          this.trigger("query", {
            term: t
          });
        }

        this._keyUpPrevented = !1;
      }, t.prototype.showSearch = function (e, t) {
        return !0;
      }, t;
    }), e.define("select2/dropdown/hidePlaceholder", [], function () {
      function e(e, t, n, i) {
        this.placeholder = this.normalizePlaceholder(n.get("placeholder")), e.call(this, t, n, i);
      }

      return e.prototype.append = function (e, t) {
        t.results = this.removePlaceholder(t.results), e.call(this, t);
      }, e.prototype.normalizePlaceholder = function (e, t) {
        return "string" == typeof t && (t = {
          id: "",
          text: t
        }), t;
      }, e.prototype.removePlaceholder = function (e, t) {
        for (var n = t.slice(0), i = t.length - 1; 0 <= i; i--) {
          var r = t[i];
          this.placeholder.id === r.id && n.splice(i, 1);
        }

        return n;
      }, e;
    }), e.define("select2/dropdown/infiniteScroll", ["jquery"], function (n) {
      function e(e, t, n, i) {
        this.lastParams = {}, e.call(this, t, n, i), this.$loadingMore = this.createLoadingMore(), this.loading = !1;
      }

      return e.prototype.append = function (e, t) {
        this.$loadingMore.remove(), this.loading = !1, e.call(this, t), this.showLoadingMore(t) && (this.$results.append(this.$loadingMore), this.loadMoreIfNeeded());
      }, e.prototype.bind = function (e, t, n) {
        var i = this;
        e.call(this, t, n), t.on("query", function (e) {
          i.lastParams = e, i.loading = !0;
        }), t.on("query:append", function (e) {
          i.lastParams = e, i.loading = !0;
        }), this.$results.on("scroll", this.loadMoreIfNeeded.bind(this));
      }, e.prototype.loadMoreIfNeeded = function () {
        var e = n.contains(document.documentElement, this.$loadingMore[0]);

        if (!this.loading && e) {
          var t = this.$results.offset().top + this.$results.outerHeight(!1);
          this.$loadingMore.offset().top + this.$loadingMore.outerHeight(!1) <= t + 50 && this.loadMore();
        }
      }, e.prototype.loadMore = function () {
        this.loading = !0;
        var e = n.extend({}, {
          page: 1
        }, this.lastParams);
        e.page++, this.trigger("query:append", e);
      }, e.prototype.showLoadingMore = function (e, t) {
        return t.pagination && t.pagination.more;
      }, e.prototype.createLoadingMore = function () {
        var e = n('<li class="select2-results__option select2-results__option--load-more"role="option" aria-disabled="true"></li>'),
            t = this.options.get("translations").get("loadingMore");
        return e.html(t(this.lastParams)), e;
      }, e;
    }), e.define("select2/dropdown/attachBody", ["jquery", "../utils"], function (f, a) {
      function e(e, t, n) {
        this.$dropdownParent = f(n.get("dropdownParent") || document.body), e.call(this, t, n);
      }

      return e.prototype.bind = function (e, t, n) {
        var i = this;
        e.call(this, t, n), t.on("open", function () {
          i._showDropdown(), i._attachPositioningHandler(t), i._bindContainerResultHandlers(t);
        }), t.on("close", function () {
          i._hideDropdown(), i._detachPositioningHandler(t);
        }), this.$dropdownContainer.on("mousedown", function (e) {
          e.stopPropagation();
        });
      }, e.prototype.destroy = function (e) {
        e.call(this), this.$dropdownContainer.remove();
      }, e.prototype.position = function (e, t, n) {
        t.attr("class", n.attr("class")), t.removeClass("select2"), t.addClass("select2-container--open"), t.css({
          position: "absolute",
          top: -999999
        }), this.$container = n;
      }, e.prototype.render = function (e) {
        var t = f("<span></span>"),
            n = e.call(this);
        return t.append(n), this.$dropdownContainer = t;
      }, e.prototype._hideDropdown = function (e) {
        this.$dropdownContainer.detach();
      }, e.prototype._bindContainerResultHandlers = function (e, t) {
        if (!this._containerResultsHandlersBound) {
          var n = this;
          t.on("results:all", function () {
            n._positionDropdown(), n._resizeDropdown();
          }), t.on("results:append", function () {
            n._positionDropdown(), n._resizeDropdown();
          }), t.on("results:message", function () {
            n._positionDropdown(), n._resizeDropdown();
          }), t.on("select", function () {
            n._positionDropdown(), n._resizeDropdown();
          }), t.on("unselect", function () {
            n._positionDropdown(), n._resizeDropdown();
          }), this._containerResultsHandlersBound = !0;
        }
      }, e.prototype._attachPositioningHandler = function (e, t) {
        var n = this,
            i = "scroll.select2." + t.id,
            r = "resize.select2." + t.id,
            o = "orientationchange.select2." + t.id,
            s = this.$container.parents().filter(a.hasScroll);
        s.each(function () {
          a.StoreData(this, "select2-scroll-position", {
            x: f(this).scrollLeft(),
            y: f(this).scrollTop()
          });
        }), s.on(i, function (e) {
          var t = a.GetData(this, "select2-scroll-position");
          f(this).scrollTop(t.y);
        }), f(window).on(i + " " + r + " " + o, function (e) {
          n._positionDropdown(), n._resizeDropdown();
        });
      }, e.prototype._detachPositioningHandler = function (e, t) {
        var n = "scroll.select2." + t.id,
            i = "resize.select2." + t.id,
            r = "orientationchange.select2." + t.id;
        this.$container.parents().filter(a.hasScroll).off(n), f(window).off(n + " " + i + " " + r);
      }, e.prototype._positionDropdown = function () {
        var e = f(window),
            t = this.$dropdown.hasClass("select2-dropdown--above"),
            n = this.$dropdown.hasClass("select2-dropdown--below"),
            i = null,
            r = this.$container.offset();
        r.bottom = r.top + this.$container.outerHeight(!1);
        var o = {
          height: this.$container.outerHeight(!1)
        };
        o.top = r.top, o.bottom = r.top + o.height;
        var s = this.$dropdown.outerHeight(!1),
            a = e.scrollTop(),
            l = e.scrollTop() + e.height(),
            c = a < r.top - s,
            u = l > r.bottom + s,
            d = {
          left: r.left,
          top: o.bottom
        },
            p = this.$dropdownParent;
        "static" === p.css("position") && (p = p.offsetParent());
        var h = {
          top: 0,
          left: 0
        };
        (f.contains(document.body, p[0]) || p[0].isConnected) && (h = p.offset()), d.top -= h.top, d.left -= h.left, t || n || (i = "below"), u || !c || t ? !c && u && t && (i = "below") : i = "above", ("above" == i || t && "below" !== i) && (d.top = o.top - h.top - s), null != i && (this.$dropdown.removeClass("select2-dropdown--below select2-dropdown--above").addClass("select2-dropdown--" + i), this.$container.removeClass("select2-container--below select2-container--above").addClass("select2-container--" + i)), this.$dropdownContainer.css(d);
      }, e.prototype._resizeDropdown = function () {
        var e = {
          width: this.$container.outerWidth(!1) + "px"
        };
        this.options.get("dropdownAutoWidth") && (e.minWidth = e.width, e.position = "relative", e.width = "auto"), this.$dropdown.css(e);
      }, e.prototype._showDropdown = function (e) {
        this.$dropdownContainer.appendTo(this.$dropdownParent), this._positionDropdown(), this._resizeDropdown();
      }, e;
    }), e.define("select2/dropdown/minimumResultsForSearch", [], function () {
      function e(e, t, n, i) {
        this.minimumResultsForSearch = n.get("minimumResultsForSearch"), this.minimumResultsForSearch < 0 && (this.minimumResultsForSearch = 1 / 0), e.call(this, t, n, i);
      }

      return e.prototype.showSearch = function (e, t) {
        return !(function e(t) {
          for (var n = 0, i = 0; i < t.length; i++) {
            var r = t[i];
            r.children ? n += e(r.children) : n++;
          }

          return n;
        }(t.data.results) < this.minimumResultsForSearch) && e.call(this, t);
      }, e;
    }), e.define("select2/dropdown/selectOnClose", ["../utils"], function (o) {
      function e() {}

      return e.prototype.bind = function (e, t, n) {
        var i = this;
        e.call(this, t, n), t.on("close", function (e) {
          i._handleSelectOnClose(e);
        });
      }, e.prototype._handleSelectOnClose = function (e, t) {
        if (t && null != t.originalSelect2Event) {
          var n = t.originalSelect2Event;
          if ("select" === n._type || "unselect" === n._type) return;
        }

        var i = this.getHighlightedResults();

        if (!(i.length < 1)) {
          var r = o.GetData(i[0], "data");
          null != r.element && r.element.selected || null == r.element && r.selected || this.trigger("select", {
            data: r
          });
        }
      }, e;
    }), e.define("select2/dropdown/closeOnSelect", [], function () {
      function e() {}

      return e.prototype.bind = function (e, t, n) {
        var i = this;
        e.call(this, t, n), t.on("select", function (e) {
          i._selectTriggered(e);
        }), t.on("unselect", function (e) {
          i._selectTriggered(e);
        });
      }, e.prototype._selectTriggered = function (e, t) {
        var n = t.originalEvent;
        n && (n.ctrlKey || n.metaKey) || this.trigger("close", {
          originalEvent: n,
          originalSelect2Event: t
        });
      }, e;
    }), e.define("select2/i18n/en", [], function () {
      return {
        errorLoading: function errorLoading() {
          return "The results could not be loaded.";
        },
        inputTooLong: function inputTooLong(e) {
          var t = e.input.length - e.maximum,
              n = "Please delete " + t + " character";
          return 1 != t && (n += "s"), n;
        },
        inputTooShort: function inputTooShort(e) {
          return "Please enter " + (e.minimum - e.input.length) + " or more characters";
        },
        loadingMore: function loadingMore() {
          return "Loading more results…";
        },
        maximumSelected: function maximumSelected(e) {
          var t = "You can only select " + e.maximum + " item";
          return 1 != e.maximum && (t += "s"), t;
        },
        noResults: function noResults() {
          return "No results found";
        },
        searching: function searching() {
          return "Searching…";
        },
        removeAllItems: function removeAllItems() {
          return "Remove all items";
        }
      };
    }), e.define("select2/defaults", ["jquery", "require", "./results", "./selection/single", "./selection/multiple", "./selection/placeholder", "./selection/allowClear", "./selection/search", "./selection/eventRelay", "./utils", "./translation", "./diacritics", "./data/select", "./data/array", "./data/ajax", "./data/tags", "./data/tokenizer", "./data/minimumInputLength", "./data/maximumInputLength", "./data/maximumSelectionLength", "./dropdown", "./dropdown/search", "./dropdown/hidePlaceholder", "./dropdown/infiniteScroll", "./dropdown/attachBody", "./dropdown/minimumResultsForSearch", "./dropdown/selectOnClose", "./dropdown/closeOnSelect", "./i18n/en"], function (c, u, d, p, h, f, g, m, v, y, s, t, _, w, $, b, A, x, D, S, C, E, O, T, q, j, L, I, e) {
      function n() {
        this.reset();
      }

      return n.prototype.apply = function (e) {
        if (null == (e = c.extend(!0, {}, this.defaults, e)).dataAdapter) {
          if (null != e.ajax ? e.dataAdapter = $ : null != e.data ? e.dataAdapter = w : e.dataAdapter = _, 0 < e.minimumInputLength && (e.dataAdapter = y.Decorate(e.dataAdapter, x)), 0 < e.maximumInputLength && (e.dataAdapter = y.Decorate(e.dataAdapter, D)), 0 < e.maximumSelectionLength && (e.dataAdapter = y.Decorate(e.dataAdapter, S)), e.tags && (e.dataAdapter = y.Decorate(e.dataAdapter, b)), null == e.tokenSeparators && null == e.tokenizer || (e.dataAdapter = y.Decorate(e.dataAdapter, A)), null != e.query) {
            var t = u(e.amdBase + "compat/query");
            e.dataAdapter = y.Decorate(e.dataAdapter, t);
          }

          if (null != e.initSelection) {
            var n = u(e.amdBase + "compat/initSelection");
            e.dataAdapter = y.Decorate(e.dataAdapter, n);
          }
        }

        if (null == e.resultsAdapter && (e.resultsAdapter = d, null != e.ajax && (e.resultsAdapter = y.Decorate(e.resultsAdapter, T)), null != e.placeholder && (e.resultsAdapter = y.Decorate(e.resultsAdapter, O)), e.selectOnClose && (e.resultsAdapter = y.Decorate(e.resultsAdapter, L))), null == e.dropdownAdapter) {
          if (e.multiple) e.dropdownAdapter = C;else {
            var i = y.Decorate(C, E);
            e.dropdownAdapter = i;
          }

          if (0 !== e.minimumResultsForSearch && (e.dropdownAdapter = y.Decorate(e.dropdownAdapter, j)), e.closeOnSelect && (e.dropdownAdapter = y.Decorate(e.dropdownAdapter, I)), null != e.dropdownCssClass || null != e.dropdownCss || null != e.adaptDropdownCssClass) {
            var r = u(e.amdBase + "compat/dropdownCss");
            e.dropdownAdapter = y.Decorate(e.dropdownAdapter, r);
          }

          e.dropdownAdapter = y.Decorate(e.dropdownAdapter, q);
        }

        if (null == e.selectionAdapter) {
          if (e.multiple ? e.selectionAdapter = h : e.selectionAdapter = p, null != e.placeholder && (e.selectionAdapter = y.Decorate(e.selectionAdapter, f)), e.allowClear && (e.selectionAdapter = y.Decorate(e.selectionAdapter, g)), e.multiple && (e.selectionAdapter = y.Decorate(e.selectionAdapter, m)), null != e.containerCssClass || null != e.containerCss || null != e.adaptContainerCssClass) {
            var o = u(e.amdBase + "compat/containerCss");
            e.selectionAdapter = y.Decorate(e.selectionAdapter, o);
          }

          e.selectionAdapter = y.Decorate(e.selectionAdapter, v);
        }

        e.language = this._resolveLanguage(e.language), e.language.push("en");

        for (var s = [], a = 0; a < e.language.length; a++) {
          var l = e.language[a];
          -1 === s.indexOf(l) && s.push(l);
        }

        return e.language = s, e.translations = this._processTranslations(e.language, e.debug), e;
      }, n.prototype.reset = function () {
        function a(e) {
          return e.replace(/[^\u0000-\u007E]/g, function (e) {
            return t[e] || e;
          });
        }

        this.defaults = {
          amdBase: "./",
          amdLanguageBase: "./i18n/",
          closeOnSelect: !0,
          debug: !1,
          dropdownAutoWidth: !1,
          escapeMarkup: y.escapeMarkup,
          language: {},
          matcher: function e(t, n) {
            if ("" === c.trim(t.term)) return n;

            if (n.children && 0 < n.children.length) {
              for (var i = c.extend(!0, {}, n), r = n.children.length - 1; 0 <= r; r--) {
                null == e(t, n.children[r]) && i.children.splice(r, 1);
              }

              return 0 < i.children.length ? i : e(t, i);
            }

            var o = a(n.text).toUpperCase(),
                s = a(t.term).toUpperCase();
            return -1 < o.indexOf(s) ? n : null;
          },
          minimumInputLength: 0,
          maximumInputLength: 0,
          maximumSelectionLength: 0,
          minimumResultsForSearch: 0,
          selectOnClose: !1,
          scrollAfterSelect: !1,
          sorter: function sorter(e) {
            return e;
          },
          templateResult: function templateResult(e) {
            return e.text;
          },
          templateSelection: function templateSelection(e) {
            return e.text;
          },
          theme: "default",
          width: "resolve"
        };
      }, n.prototype.applyFromElement = function (e, t) {
        var n = e.language,
            i = this.defaults.language,
            r = t.prop("lang"),
            o = t.closest("[lang]").prop("lang"),
            s = Array.prototype.concat.call(this._resolveLanguage(r), this._resolveLanguage(n), this._resolveLanguage(i), this._resolveLanguage(o));
        return e.language = s, e;
      }, n.prototype._resolveLanguage = function (e) {
        if (!e) return [];
        if (c.isEmptyObject(e)) return [];
        if (c.isPlainObject(e)) return [e];
        var t;
        t = c.isArray(e) ? e : [e];

        for (var n = [], i = 0; i < t.length; i++) {
          if (n.push(t[i]), "string" == typeof t[i] && 0 < t[i].indexOf("-")) {
            var r = t[i].split("-")[0];
            n.push(r);
          }
        }

        return n;
      }, n.prototype._processTranslations = function (e, t) {
        for (var n = new s(), i = 0; i < e.length; i++) {
          var r = new s(),
              o = e[i];
          if ("string" == typeof o) try {
            r = s.loadPath(o);
          } catch (e) {
            try {
              o = this.defaults.amdLanguageBase + o, r = s.loadPath(o);
            } catch (e) {
              t && window.console && console.warn && console.warn('Select2: The language file for "' + o + '" could not be automatically loaded. A fallback will be used instead.');
            }
          } else r = c.isPlainObject(o) ? new s(o) : o;
          n.extend(r);
        }

        return n;
      }, n.prototype.set = function (e, t) {
        var n = {};
        n[c.camelCase(e)] = t;

        var i = y._convertData(n);

        c.extend(!0, this.defaults, i);
      }, new n();
    }), e.define("select2/options", ["require", "jquery", "./defaults", "./utils"], function (i, d, r, p) {
      function e(e, t) {
        if (this.options = e, null != t && this.fromElement(t), null != t && (this.options = r.applyFromElement(this.options, t)), this.options = r.apply(this.options), t && t.is("input")) {
          var n = i(this.get("amdBase") + "compat/inputData");
          this.options.dataAdapter = p.Decorate(this.options.dataAdapter, n);
        }
      }

      return e.prototype.fromElement = function (e) {
        var t = ["select2"];
        null == this.options.multiple && (this.options.multiple = e.prop("multiple")), null == this.options.disabled && (this.options.disabled = e.prop("disabled")), null == this.options.dir && (e.prop("dir") ? this.options.dir = e.prop("dir") : e.closest("[dir]").prop("dir") ? this.options.dir = e.closest("[dir]").prop("dir") : this.options.dir = "ltr"), e.prop("disabled", this.options.disabled), e.prop("multiple", this.options.multiple), p.GetData(e[0], "select2Tags") && (this.options.debug && window.console && console.warn && console.warn('Select2: The `data-select2-tags` attribute has been changed to use the `data-data` and `data-tags="true"` attributes and will be removed in future versions of Select2.'), p.StoreData(e[0], "data", p.GetData(e[0], "select2Tags")), p.StoreData(e[0], "tags", !0)), p.GetData(e[0], "ajaxUrl") && (this.options.debug && window.console && console.warn && console.warn("Select2: The `data-ajax-url` attribute has been changed to `data-ajax--url` and support for the old attribute will be removed in future versions of Select2."), e.attr("ajax--url", p.GetData(e[0], "ajaxUrl")), p.StoreData(e[0], "ajax-Url", p.GetData(e[0], "ajaxUrl")));
        var n = {};

        function i(e, t) {
          return t.toUpperCase();
        }

        for (var r = 0; r < e[0].attributes.length; r++) {
          var o = e[0].attributes[r].name,
              s = "data-";

          if (o.substr(0, s.length) == s) {
            var a = o.substring(s.length),
                l = p.GetData(e[0], a);
            n[a.replace(/-([a-z])/g, i)] = l;
          }
        }

        d.fn.jquery && "1." == d.fn.jquery.substr(0, 2) && e[0].dataset && (n = d.extend(!0, {}, e[0].dataset, n));
        var c = d.extend(!0, {}, p.GetData(e[0]), n);

        for (var u in c = p._convertData(c)) {
          -1 < d.inArray(u, t) || (d.isPlainObject(this.options[u]) ? d.extend(this.options[u], c[u]) : this.options[u] = c[u]);
        }

        return this;
      }, e.prototype.get = function (e) {
        return this.options[e];
      }, e.prototype.set = function (e, t) {
        this.options[e] = t;
      }, e;
    }), e.define("select2/core", ["jquery", "./options", "./utils", "./keys"], function (o, c, u, i) {
      var d = function d(e, t) {
        null != u.GetData(e[0], "select2") && u.GetData(e[0], "select2").destroy(), this.$element = e, this.id = this._generateId(e), t = t || {}, this.options = new c(t, e), d.__super__.constructor.call(this);
        var n = e.attr("tabindex") || 0;
        u.StoreData(e[0], "old-tabindex", n), e.attr("tabindex", "-1");
        var i = this.options.get("dataAdapter");
        this.dataAdapter = new i(e, this.options);
        var r = this.render();

        this._placeContainer(r);

        var o = this.options.get("selectionAdapter");
        this.selection = new o(e, this.options), this.$selection = this.selection.render(), this.selection.position(this.$selection, r);
        var s = this.options.get("dropdownAdapter");
        this.dropdown = new s(e, this.options), this.$dropdown = this.dropdown.render(), this.dropdown.position(this.$dropdown, r);
        var a = this.options.get("resultsAdapter");
        this.results = new a(e, this.options, this.dataAdapter), this.$results = this.results.render(), this.results.position(this.$results, this.$dropdown);
        var l = this;
        this._bindAdapters(), this._registerDomEvents(), this._registerDataEvents(), this._registerSelectionEvents(), this._registerDropdownEvents(), this._registerResultsEvents(), this._registerEvents(), this.dataAdapter.current(function (e) {
          l.trigger("selection:update", {
            data: e
          });
        }), e.addClass("select2-hidden-accessible"), e.attr("aria-hidden", "true"), this._syncAttributes(), u.StoreData(e[0], "select2", this), e.data("select2", this);
      };

      return u.Extend(d, u.Observable), d.prototype._generateId = function (e) {
        return "select2-" + (null != e.attr("id") ? e.attr("id") : null != e.attr("name") ? e.attr("name") + "-" + u.generateChars(2) : u.generateChars(4)).replace(/(:|\.|\[|\]|,)/g, "");
      }, d.prototype._placeContainer = function (e) {
        e.insertAfter(this.$element);

        var t = this._resolveWidth(this.$element, this.options.get("width"));

        null != t && e.css("width", t);
      }, d.prototype._resolveWidth = function (e, t) {
        var n = /^width:(([-+]?([0-9]*\.)?[0-9]+)(px|em|ex|%|in|cm|mm|pt|pc))/i;

        if ("resolve" == t) {
          var i = this._resolveWidth(e, "style");

          return null != i ? i : this._resolveWidth(e, "element");
        }

        if ("element" == t) {
          var r = e.outerWidth(!1);
          return r <= 0 ? "auto" : r + "px";
        }

        if ("style" != t) return "computedstyle" != t ? t : window.getComputedStyle(e[0]).width;
        var o = e.attr("style");
        if ("string" != typeof o) return null;

        for (var s = o.split(";"), a = 0, l = s.length; a < l; a += 1) {
          var c = s[a].replace(/\s/g, "").match(n);
          if (null !== c && 1 <= c.length) return c[1];
        }

        return null;
      }, d.prototype._bindAdapters = function () {
        this.dataAdapter.bind(this, this.$container), this.selection.bind(this, this.$container), this.dropdown.bind(this, this.$container), this.results.bind(this, this.$container);
      }, d.prototype._registerDomEvents = function () {
        var t = this;
        this.$element.on("change.select2", function () {
          t.dataAdapter.current(function (e) {
            t.trigger("selection:update", {
              data: e
            });
          });
        }), this.$element.on("focus.select2", function (e) {
          t.trigger("focus", e);
        }), this._syncA = u.bind(this._syncAttributes, this), this._syncS = u.bind(this._syncSubtree, this), this.$element[0].attachEvent && this.$element[0].attachEvent("onpropertychange", this._syncA);
        var e = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        null != e ? (this._observer = new e(function (e) {
          t._syncA(), t._syncS(null, e);
        }), this._observer.observe(this.$element[0], {
          attributes: !0,
          childList: !0,
          subtree: !1
        })) : this.$element[0].addEventListener && (this.$element[0].addEventListener("DOMAttrModified", t._syncA, !1), this.$element[0].addEventListener("DOMNodeInserted", t._syncS, !1), this.$element[0].addEventListener("DOMNodeRemoved", t._syncS, !1));
      }, d.prototype._registerDataEvents = function () {
        var n = this;
        this.dataAdapter.on("*", function (e, t) {
          n.trigger(e, t);
        });
      }, d.prototype._registerSelectionEvents = function () {
        var n = this,
            i = ["toggle", "focus"];
        this.selection.on("toggle", function () {
          n.toggleDropdown();
        }), this.selection.on("focus", function (e) {
          n.focus(e);
        }), this.selection.on("*", function (e, t) {
          -1 === o.inArray(e, i) && n.trigger(e, t);
        });
      }, d.prototype._registerDropdownEvents = function () {
        var n = this;
        this.dropdown.on("*", function (e, t) {
          n.trigger(e, t);
        });
      }, d.prototype._registerResultsEvents = function () {
        var n = this;
        this.results.on("*", function (e, t) {
          n.trigger(e, t);
        });
      }, d.prototype._registerEvents = function () {
        var n = this;
        this.on("open", function () {
          n.$container.addClass("select2-container--open");
        }), this.on("close", function () {
          n.$container.removeClass("select2-container--open");
        }), this.on("enable", function () {
          n.$container.removeClass("select2-container--disabled");
        }), this.on("disable", function () {
          n.$container.addClass("select2-container--disabled");
        }), this.on("blur", function () {
          n.$container.removeClass("select2-container--focus");
        }), this.on("query", function (t) {
          n.isOpen() || n.trigger("open", {}), this.dataAdapter.query(t, function (e) {
            n.trigger("results:all", {
              data: e,
              query: t
            });
          });
        }), this.on("query:append", function (t) {
          this.dataAdapter.query(t, function (e) {
            n.trigger("results:append", {
              data: e,
              query: t
            });
          });
        }), this.on("keypress", function (e) {
          var t = e.which;
          n.isOpen() ? t === i.ESC || t === i.TAB || t === i.UP && e.altKey ? (n.close(e), e.preventDefault()) : t === i.ENTER ? (n.trigger("results:select", {}), e.preventDefault()) : t === i.SPACE && e.ctrlKey ? (n.trigger("results:toggle", {}), e.preventDefault()) : t === i.UP ? (n.trigger("results:previous", {}), e.preventDefault()) : t === i.DOWN && (n.trigger("results:next", {}), e.preventDefault()) : (t === i.ENTER || t === i.SPACE || t === i.DOWN && e.altKey) && (n.open(), e.preventDefault());
        });
      }, d.prototype._syncAttributes = function () {
        this.options.set("disabled", this.$element.prop("disabled")), this.isDisabled() ? (this.isOpen() && this.close(), this.trigger("disable", {})) : this.trigger("enable", {});
      }, d.prototype._isChangeMutation = function (e, t) {
        var n = !1,
            i = this;

        if (!e || !e.target || "OPTION" === e.target.nodeName || "OPTGROUP" === e.target.nodeName) {
          if (t) {
            if (t.addedNodes && 0 < t.addedNodes.length) for (var r = 0; r < t.addedNodes.length; r++) {
              t.addedNodes[r].selected && (n = !0);
            } else t.removedNodes && 0 < t.removedNodes.length ? n = !0 : o.isArray(t) && o.each(t, function (e, t) {
              if (i._isChangeMutation(e, t)) return !(n = !0);
            });
          } else n = !0;
          return n;
        }
      }, d.prototype._syncSubtree = function (e, t) {
        var n = this._isChangeMutation(e, t),
            i = this;

        n && this.dataAdapter.current(function (e) {
          i.trigger("selection:update", {
            data: e
          });
        });
      }, d.prototype.trigger = function (e, t) {
        var n = d.__super__.trigger,
            i = {
          open: "opening",
          close: "closing",
          select: "selecting",
          unselect: "unselecting",
          clear: "clearing"
        };

        if (void 0 === t && (t = {}), e in i) {
          var r = i[e],
              o = {
            prevented: !1,
            name: e,
            args: t
          };
          if (n.call(this, r, o), o.prevented) return void (t.prevented = !0);
        }

        n.call(this, e, t);
      }, d.prototype.toggleDropdown = function () {
        this.isDisabled() || (this.isOpen() ? this.close() : this.open());
      }, d.prototype.open = function () {
        this.isOpen() || this.isDisabled() || this.trigger("query", {});
      }, d.prototype.close = function (e) {
        this.isOpen() && this.trigger("close", {
          originalEvent: e
        });
      }, d.prototype.isEnabled = function () {
        return !this.isDisabled();
      }, d.prototype.isDisabled = function () {
        return this.options.get("disabled");
      }, d.prototype.isOpen = function () {
        return this.$container.hasClass("select2-container--open");
      }, d.prototype.hasFocus = function () {
        return this.$container.hasClass("select2-container--focus");
      }, d.prototype.focus = function (e) {
        this.hasFocus() || (this.$container.addClass("select2-container--focus"), this.trigger("focus", {}));
      }, d.prototype.enable = function (e) {
        this.options.get("debug") && window.console && console.warn && console.warn('Select2: The `select2("enable")` method has been deprecated and will be removed in later Select2 versions. Use $element.prop("disabled") instead.'), null != e && 0 !== e.length || (e = [!0]);
        var t = !e[0];
        this.$element.prop("disabled", t);
      }, d.prototype.data = function () {
        this.options.get("debug") && 0 < arguments.length && window.console && console.warn && console.warn('Select2: Data can no longer be set using `select2("data")`. You should consider setting the value instead using `$element.val()`.');
        var t = [];
        return this.dataAdapter.current(function (e) {
          t = e;
        }), t;
      }, d.prototype.val = function (e) {
        if (this.options.get("debug") && window.console && console.warn && console.warn('Select2: The `select2("val")` method has been deprecated and will be removed in later Select2 versions. Use $element.val() instead.'), null == e || 0 === e.length) return this.$element.val();
        var t = e[0];
        o.isArray(t) && (t = o.map(t, function (e) {
          return e.toString();
        })), this.$element.val(t).trigger("input").trigger("change");
      }, d.prototype.destroy = function () {
        this.$container.remove(), this.$element[0].detachEvent && this.$element[0].detachEvent("onpropertychange", this._syncA), null != this._observer ? (this._observer.disconnect(), this._observer = null) : this.$element[0].removeEventListener && (this.$element[0].removeEventListener("DOMAttrModified", this._syncA, !1), this.$element[0].removeEventListener("DOMNodeInserted", this._syncS, !1), this.$element[0].removeEventListener("DOMNodeRemoved", this._syncS, !1)), this._syncA = null, this._syncS = null, this.$element.off(".select2"), this.$element.attr("tabindex", u.GetData(this.$element[0], "old-tabindex")), this.$element.removeClass("select2-hidden-accessible"), this.$element.attr("aria-hidden", "false"), u.RemoveData(this.$element[0]), this.$element.removeData("select2"), this.dataAdapter.destroy(), this.selection.destroy(), this.dropdown.destroy(), this.results.destroy(), this.dataAdapter = null, this.selection = null, this.dropdown = null, this.results = null;
      }, d.prototype.render = function () {
        var e = o('<span class="select2 select2-container"><span class="selection"></span><span class="dropdown-wrapper" aria-hidden="true"></span></span>');
        return e.attr("dir", this.options.get("dir")), this.$container = e, this.$container.addClass("select2-container--" + this.options.get("theme")), u.StoreData(e[0], "element", this.$element), e;
      }, d;
    }), e.define("select2/compat/utils", ["jquery"], function (s) {
      return {
        syncCssClasses: function syncCssClasses(e, t, n) {
          var i,
              r,
              o = [];
          (i = s.trim(e.attr("class"))) && s((i = "" + i).split(/\s+/)).each(function () {
            0 === this.indexOf("select2-") && o.push(this);
          }), (i = s.trim(t.attr("class"))) && s((i = "" + i).split(/\s+/)).each(function () {
            0 !== this.indexOf("select2-") && null != (r = n(this)) && o.push(r);
          }), e.attr("class", o.join(" "));
        }
      };
    }), e.define("select2/compat/containerCss", ["jquery", "./utils"], function (s, a) {
      function l(e) {
        return null;
      }

      function e() {}

      return e.prototype.render = function (e) {
        var t = e.call(this),
            n = this.options.get("containerCssClass") || "";
        s.isFunction(n) && (n = n(this.$element));
        var i = this.options.get("adaptContainerCssClass");

        if (i = i || l, -1 !== n.indexOf(":all:")) {
          n = n.replace(":all:", "");
          var r = i;

          i = function i(e) {
            var t = r(e);
            return null != t ? t + " " + e : e;
          };
        }

        var o = this.options.get("containerCss") || {};
        return s.isFunction(o) && (o = o(this.$element)), a.syncCssClasses(t, this.$element, i), t.css(o), t.addClass(n), t;
      }, e;
    }), e.define("select2/compat/dropdownCss", ["jquery", "./utils"], function (s, a) {
      function l(e) {
        return null;
      }

      function e() {}

      return e.prototype.render = function (e) {
        var t = e.call(this),
            n = this.options.get("dropdownCssClass") || "";
        s.isFunction(n) && (n = n(this.$element));
        var i = this.options.get("adaptDropdownCssClass");

        if (i = i || l, -1 !== n.indexOf(":all:")) {
          n = n.replace(":all:", "");
          var r = i;

          i = function i(e) {
            var t = r(e);
            return null != t ? t + " " + e : e;
          };
        }

        var o = this.options.get("dropdownCss") || {};
        return s.isFunction(o) && (o = o(this.$element)), a.syncCssClasses(t, this.$element, i), t.css(o), t.addClass(n), t;
      }, e;
    }), e.define("select2/compat/initSelection", ["jquery"], function (i) {
      function e(e, t, n) {
        n.get("debug") && window.console && console.warn && console.warn("Select2: The `initSelection` option has been deprecated in favor of a custom data adapter that overrides the `current` method. This method is now called multiple times instead of a single time when the instance is initialized. Support will be removed for the `initSelection` option in future versions of Select2"), this.initSelection = n.get("initSelection"), this._isInitialized = !1, e.call(this, t, n);
      }

      return e.prototype.current = function (e, t) {
        var n = this;
        this._isInitialized ? e.call(this, t) : this.initSelection.call(null, this.$element, function (e) {
          n._isInitialized = !0, i.isArray(e) || (e = [e]), t(e);
        });
      }, e;
    }), e.define("select2/compat/inputData", ["jquery", "../utils"], function (s, i) {
      function e(e, t, n) {
        this._currentData = [], this._valueSeparator = n.get("valueSeparator") || ",", "hidden" === t.prop("type") && n.get("debug") && console && console.warn && console.warn("Select2: Using a hidden input with Select2 is no longer supported and may stop working in the future. It is recommended to use a `<select>` element instead."), e.call(this, t, n);
      }

      return e.prototype.current = function (e, t) {
        function i(e, t) {
          var n = [];
          return e.selected || -1 !== s.inArray(e.id, t) ? (e.selected = !0, n.push(e)) : e.selected = !1, e.children && n.push.apply(n, i(e.children, t)), n;
        }

        for (var n = [], r = 0; r < this._currentData.length; r++) {
          var o = this._currentData[r];
          n.push.apply(n, i(o, this.$element.val().split(this._valueSeparator)));
        }

        t(n);
      }, e.prototype.select = function (e, t) {
        if (this.options.get("multiple")) {
          var n = this.$element.val();
          n += this._valueSeparator + t.id, this.$element.val(n), this.$element.trigger("input").trigger("change");
        } else this.current(function (e) {
          s.map(e, function (e) {
            e.selected = !1;
          });
        }), this.$element.val(t.id), this.$element.trigger("input").trigger("change");
      }, e.prototype.unselect = function (e, r) {
        var o = this;
        r.selected = !1, this.current(function (e) {
          for (var t = [], n = 0; n < e.length; n++) {
            var i = e[n];
            r.id != i.id && t.push(i.id);
          }

          o.$element.val(t.join(o._valueSeparator)), o.$element.trigger("input").trigger("change");
        });
      }, e.prototype.query = function (e, t, n) {
        for (var i = [], r = 0; r < this._currentData.length; r++) {
          var o = this._currentData[r],
              s = this.matches(t, o);
          null !== s && i.push(s);
        }

        n({
          results: i
        });
      }, e.prototype.addOptions = function (e, t) {
        var n = s.map(t, function (e) {
          return i.GetData(e[0], "data");
        });

        this._currentData.push.apply(this._currentData, n);
      }, e;
    }), e.define("select2/compat/matcher", ["jquery"], function (s) {
      return function (o) {
        return function (e, t) {
          var n = s.extend(!0, {}, t);
          if (null == e.term || "" === s.trim(e.term)) return n;

          if (t.children) {
            for (var i = t.children.length - 1; 0 <= i; i--) {
              var r = t.children[i];
              o(e.term, r.text, r) || n.children.splice(i, 1);
            }

            if (0 < n.children.length) return n;
          }

          return o(e.term, t.text, t) ? n : null;
        };
      };
    }), e.define("select2/compat/query", [], function () {
      function e(e, t, n) {
        n.get("debug") && window.console && console.warn && console.warn("Select2: The `query` option has been deprecated in favor of a custom data adapter that overrides the `query` method. Support will be removed for the `query` option in future versions of Select2."), e.call(this, t, n);
      }

      return e.prototype.query = function (e, t, n) {
        t.callback = n, this.options.get("query").call(null, t);
      }, e;
    }), e.define("select2/dropdown/attachContainer", [], function () {
      function e(e, t, n) {
        e.call(this, t, n);
      }

      return e.prototype.position = function (e, t, n) {
        n.find(".dropdown-wrapper").append(t), t.addClass("select2-dropdown--below"), n.addClass("select2-container--below");
      }, e;
    }), e.define("select2/dropdown/stopPropagation", [], function () {
      function e() {}

      return e.prototype.bind = function (e, t, n) {
        e.call(this, t, n);
        this.$dropdown.on(["blur", "change", "click", "dblclick", "focus", "focusin", "focusout", "input", "keydown", "keyup", "keypress", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseover", "mouseup", "search", "touchend", "touchstart"].join(" "), function (e) {
          e.stopPropagation();
        });
      }, e;
    }), e.define("select2/selection/stopPropagation", [], function () {
      function e() {}

      return e.prototype.bind = function (e, t, n) {
        e.call(this, t, n);
        this.$selection.on(["blur", "change", "click", "dblclick", "focus", "focusin", "focusout", "input", "keydown", "keyup", "keypress", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseover", "mouseup", "search", "touchend", "touchstart"].join(" "), function (e) {
          e.stopPropagation();
        });
      }, e;
    }), l = function l(p) {
      var h,
          f,
          e = ["wheel", "mousewheel", "DOMMouseScroll", "MozMousePixelScroll"],
          t = "onwheel" in document || 9 <= document.documentMode ? ["wheel"] : ["mousewheel", "DomMouseScroll", "MozMousePixelScroll"],
          g = Array.prototype.slice;
      if (p.event.fixHooks) for (var n = e.length; n;) {
        p.event.fixHooks[e[--n]] = p.event.mouseHooks;
      }
      var m = p.event.special.mousewheel = {
        version: "3.1.12",
        setup: function setup() {
          if (this.addEventListener) for (var e = t.length; e;) {
            this.addEventListener(t[--e], i, !1);
          } else this.onmousewheel = i;
          p.data(this, "mousewheel-line-height", m.getLineHeight(this)), p.data(this, "mousewheel-page-height", m.getPageHeight(this));
        },
        teardown: function teardown() {
          if (this.removeEventListener) for (var e = t.length; e;) {
            this.removeEventListener(t[--e], i, !1);
          } else this.onmousewheel = null;
          p.removeData(this, "mousewheel-line-height"), p.removeData(this, "mousewheel-page-height");
        },
        getLineHeight: function getLineHeight(e) {
          var t = p(e),
              n = t["offsetParent" in p.fn ? "offsetParent" : "parent"]();
          return n.length || (n = p("body")), parseInt(n.css("fontSize"), 10) || parseInt(t.css("fontSize"), 10) || 16;
        },
        getPageHeight: function getPageHeight(e) {
          return p(e).height();
        },
        settings: {
          adjustOldDeltas: !0,
          normalizeOffset: !0
        }
      };

      function i(e) {
        var t,
            n = e || window.event,
            i = g.call(arguments, 1),
            r = 0,
            o = 0,
            s = 0,
            a = 0,
            l = 0;

        if ((e = p.event.fix(n)).type = "mousewheel", "detail" in n && (s = -1 * n.detail), "wheelDelta" in n && (s = n.wheelDelta), "wheelDeltaY" in n && (s = n.wheelDeltaY), "wheelDeltaX" in n && (o = -1 * n.wheelDeltaX), "axis" in n && n.axis === n.HORIZONTAL_AXIS && (o = -1 * s, s = 0), r = 0 === s ? o : s, "deltaY" in n && (r = s = -1 * n.deltaY), "deltaX" in n && (o = n.deltaX, 0 === s && (r = -1 * o)), 0 !== s || 0 !== o) {
          if (1 === n.deltaMode) {
            var c = p.data(this, "mousewheel-line-height");
            r *= c, s *= c, o *= c;
          } else if (2 === n.deltaMode) {
            var u = p.data(this, "mousewheel-page-height");
            r *= u, s *= u, o *= u;
          }

          if (t = Math.max(Math.abs(s), Math.abs(o)), (!f || t < f) && y(n, f = t) && (f /= 40), y(n, t) && (r /= 40, o /= 40, s /= 40), r = Math[1 <= r ? "floor" : "ceil"](r / f), o = Math[1 <= o ? "floor" : "ceil"](o / f), s = Math[1 <= s ? "floor" : "ceil"](s / f), m.settings.normalizeOffset && this.getBoundingClientRect) {
            var d = this.getBoundingClientRect();
            a = e.clientX - d.left, l = e.clientY - d.top;
          }

          return e.deltaX = o, e.deltaY = s, e.deltaFactor = f, e.offsetX = a, e.offsetY = l, e.deltaMode = 0, i.unshift(e, r, o, s), h && clearTimeout(h), h = setTimeout(v, 200), (p.event.dispatch || p.event.handle).apply(this, i);
        }
      }

      function v() {
        f = null;
      }

      function y(e, t) {
        return m.settings.adjustOldDeltas && "mousewheel" === e.type && t % 120 == 0;
      }

      p.fn.extend({
        mousewheel: function mousewheel(e) {
          return e ? this.bind("mousewheel", e) : this.trigger("mousewheel");
        },
        unmousewheel: function unmousewheel(e) {
          return this.unbind("mousewheel", e);
        }
      });
    }, "function" == typeof e.define && e.define.amd ? e.define("jquery-mousewheel", ["jquery"], l) : "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) ? module.exports = l : l(d), e.define("jquery.select2", ["jquery", "jquery-mousewheel", "./select2/core", "./select2/defaults", "./select2/utils"], function (r, e, o, t, s) {
      if (null == r.fn.select2) {
        var a = ["open", "close", "destroy"];

        r.fn.select2 = function (t) {
          if ("object" == _typeof(t = t || {})) return this.each(function () {
            var e = r.extend(!0, {}, t);
            new o(r(this), e);
          }), this;
          if ("string" != typeof t) throw new Error("Invalid arguments for Select2: " + t);
          var n,
              i = Array.prototype.slice.call(arguments, 1);
          return this.each(function () {
            var e = s.GetData(this, "select2");
            null == e && window.console && console.error && console.error("The select2('" + t + "') method was called on an element that is not using Select2."), n = e[t].apply(e, i);
          }), -1 < r.inArray(t, a) ? this : n;
        };
      }

      return null == r.fn.select2.defaults && (r.fn.select2.defaults = t), o;
    }), {
      define: e.define,
      require: e.require
    };
  }(),
      t = e.require("jquery.select2");

  return d.fn.select2.amd = e, t;
});
"use strict";

/**
 * skip-link-focus-fix.js
 *
 * Helps with accessibility for keyboard only users.
 *
 * Learn more: https://git.io/vWdr2
 */
(function () {
  var is_webkit = navigator.userAgent.toLowerCase().indexOf('webkit') > -1,
      is_opera = navigator.userAgent.toLowerCase().indexOf('opera') > -1,
      is_ie = navigator.userAgent.toLowerCase().indexOf('msie') > -1;

  if ((is_webkit || is_opera || is_ie) && document.getElementById && window.addEventListener) {
    window.addEventListener('hashchange', function () {
      var id = location.hash.substring(1),
          element;

      if (!/^[A-z0-9_-]+$/.test(id)) {
        return;
      }

      element = document.getElementById(id);

      if (element) {
        if (!/^(?:a|select|input|button|textarea)$/i.test(element.tagName)) {
          element.tabIndex = -1;
        }

        element.focus();
      }
    }, false);
  }
})();
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

!function (i) {
  "use strict";

  "function" == typeof define && define.amd ? define(["jquery"], i) : "undefined" != typeof exports ? module.exports = i(require("jquery")) : i(jQuery);
}(function (i) {
  "use strict";

  var e = window.Slick || {};
  (e = function () {
    var e = 0;
    return function (t, o) {
      var s,
          n = this;
      n.defaults = {
        accessibility: !0,
        adaptiveHeight: !1,
        appendArrows: i(t),
        appendDots: i(t),
        arrows: !0,
        asNavFor: null,
        prevArrow: '<button class="slick-prev" aria-label="Previous" type="button">Previous</button>',
        nextArrow: '<button class="slick-next" aria-label="Next" type="button">Next</button>',
        autoplay: !1,
        autoplaySpeed: 3e3,
        centerMode: !1,
        centerPadding: "50px",
        cssEase: "ease",
        customPaging: function customPaging(e, t) {
          return i('<button type="button" />').text(t + 1);
        },
        dots: !1,
        dotsClass: "slick-dots",
        draggable: !0,
        easing: "linear",
        edgeFriction: .35,
        fade: !1,
        focusOnSelect: !1,
        focusOnChange: !1,
        infinite: !0,
        initialSlide: 0,
        lazyLoad: "ondemand",
        mobileFirst: !1,
        pauseOnHover: !0,
        pauseOnFocus: !0,
        pauseOnDotsHover: !1,
        respondTo: "window",
        responsive: null,
        rows: 1,
        rtl: !1,
        slide: "",
        slidesPerRow: 1,
        slidesToShow: 1,
        slidesToScroll: 1,
        speed: 500,
        swipe: !0,
        swipeToSlide: !1,
        touchMove: !0,
        touchThreshold: 5,
        useCSS: !0,
        useTransform: !0,
        variableWidth: !1,
        vertical: !1,
        verticalSwiping: !1,
        waitForAnimate: !0,
        zIndex: 1e3
      }, n.initials = {
        animating: !1,
        dragging: !1,
        autoPlayTimer: null,
        currentDirection: 0,
        currentLeft: null,
        currentSlide: 0,
        direction: 1,
        $dots: null,
        listWidth: null,
        listHeight: null,
        loadIndex: 0,
        $nextArrow: null,
        $prevArrow: null,
        scrolling: !1,
        slideCount: null,
        slideWidth: null,
        $slideTrack: null,
        $slides: null,
        sliding: !1,
        slideOffset: 0,
        swipeLeft: null,
        swiping: !1,
        $list: null,
        touchObject: {},
        transformsEnabled: !1,
        unslicked: !1
      }, i.extend(n, n.initials), n.activeBreakpoint = null, n.animType = null, n.animProp = null, n.breakpoints = [], n.breakpointSettings = [], n.cssTransitions = !1, n.focussed = !1, n.interrupted = !1, n.hidden = "hidden", n.paused = !0, n.positionProp = null, n.respondTo = null, n.rowCount = 1, n.shouldClick = !0, n.$slider = i(t), n.$slidesCache = null, n.transformType = null, n.transitionType = null, n.visibilityChange = "visibilitychange", n.windowWidth = 0, n.windowTimer = null, s = i(t).data("slick") || {}, n.options = i.extend({}, n.defaults, o, s), n.currentSlide = n.options.initialSlide, n.originalSettings = n.options, void 0 !== document.mozHidden ? (n.hidden = "mozHidden", n.visibilityChange = "mozvisibilitychange") : void 0 !== document.webkitHidden && (n.hidden = "webkitHidden", n.visibilityChange = "webkitvisibilitychange"), n.autoPlay = i.proxy(n.autoPlay, n), n.autoPlayClear = i.proxy(n.autoPlayClear, n), n.autoPlayIterator = i.proxy(n.autoPlayIterator, n), n.changeSlide = i.proxy(n.changeSlide, n), n.clickHandler = i.proxy(n.clickHandler, n), n.selectHandler = i.proxy(n.selectHandler, n), n.setPosition = i.proxy(n.setPosition, n), n.swipeHandler = i.proxy(n.swipeHandler, n), n.dragHandler = i.proxy(n.dragHandler, n), n.keyHandler = i.proxy(n.keyHandler, n), n.instanceUid = e++, n.htmlExpr = /^(?:\s*(<[\w\W]+>)[^>]*)$/, n.registerBreakpoints(), n.init(!0);
    };
  }()).prototype.activateADA = function () {
    this.$slideTrack.find(".slick-active").attr({
      "aria-hidden": "false"
    }).find("a, input, button, select").attr({
      tabindex: "0"
    });
  }, e.prototype.addSlide = e.prototype.slickAdd = function (e, t, o) {
    var s = this;
    if ("boolean" == typeof t) o = t, t = null;else if (t < 0 || t >= s.slideCount) return !1;
    s.unload(), "number" == typeof t ? 0 === t && 0 === s.$slides.length ? i(e).appendTo(s.$slideTrack) : o ? i(e).insertBefore(s.$slides.eq(t)) : i(e).insertAfter(s.$slides.eq(t)) : !0 === o ? i(e).prependTo(s.$slideTrack) : i(e).appendTo(s.$slideTrack), s.$slides = s.$slideTrack.children(this.options.slide), s.$slideTrack.children(this.options.slide).detach(), s.$slideTrack.append(s.$slides), s.$slides.each(function (e, t) {
      i(t).attr("data-slick-index", e);
    }), s.$slidesCache = s.$slides, s.reinit();
  }, e.prototype.animateHeight = function () {
    var i = this;

    if (1 === i.options.slidesToShow && !0 === i.options.adaptiveHeight && !1 === i.options.vertical) {
      var e = i.$slides.eq(i.currentSlide).outerHeight(!0);
      i.$list.animate({
        height: e
      }, i.options.speed);
    }
  }, e.prototype.animateSlide = function (e, t) {
    var o = {},
        s = this;
    s.animateHeight(), !0 === s.options.rtl && !1 === s.options.vertical && (e = -e), !1 === s.transformsEnabled ? !1 === s.options.vertical ? s.$slideTrack.animate({
      left: e
    }, s.options.speed, s.options.easing, t) : s.$slideTrack.animate({
      top: e
    }, s.options.speed, s.options.easing, t) : !1 === s.cssTransitions ? (!0 === s.options.rtl && (s.currentLeft = -s.currentLeft), i({
      animStart: s.currentLeft
    }).animate({
      animStart: e
    }, {
      duration: s.options.speed,
      easing: s.options.easing,
      step: function step(i) {
        i = Math.ceil(i), !1 === s.options.vertical ? (o[s.animType] = "translate(" + i + "px, 0px)", s.$slideTrack.css(o)) : (o[s.animType] = "translate(0px," + i + "px)", s.$slideTrack.css(o));
      },
      complete: function complete() {
        t && t.call();
      }
    })) : (s.applyTransition(), e = Math.ceil(e), !1 === s.options.vertical ? o[s.animType] = "translate3d(" + e + "px, 0px, 0px)" : o[s.animType] = "translate3d(0px," + e + "px, 0px)", s.$slideTrack.css(o), t && setTimeout(function () {
      s.disableTransition(), t.call();
    }, s.options.speed));
  }, e.prototype.getNavTarget = function () {
    var e = this,
        t = e.options.asNavFor;
    return t && null !== t && (t = i(t).not(e.$slider)), t;
  }, e.prototype.asNavFor = function (e) {
    var t = this.getNavTarget();
    null !== t && "object" == _typeof(t) && t.each(function () {
      var t = i(this).slick("getSlick");
      t.unslicked || t.slideHandler(e, !0);
    });
  }, e.prototype.applyTransition = function (i) {
    var e = this,
        t = {};
    !1 === e.options.fade ? t[e.transitionType] = e.transformType + " " + e.options.speed + "ms " + e.options.cssEase : t[e.transitionType] = "opacity " + e.options.speed + "ms " + e.options.cssEase, !1 === e.options.fade ? e.$slideTrack.css(t) : e.$slides.eq(i).css(t);
  }, e.prototype.autoPlay = function () {
    var i = this;
    i.autoPlayClear(), i.slideCount > i.options.slidesToShow && (i.autoPlayTimer = setInterval(i.autoPlayIterator, i.options.autoplaySpeed));
  }, e.prototype.autoPlayClear = function () {
    var i = this;
    i.autoPlayTimer && clearInterval(i.autoPlayTimer);
  }, e.prototype.autoPlayIterator = function () {
    var i = this,
        e = i.currentSlide + i.options.slidesToScroll;
    i.paused || i.interrupted || i.focussed || (!1 === i.options.infinite && (1 === i.direction && i.currentSlide + 1 === i.slideCount - 1 ? i.direction = 0 : 0 === i.direction && (e = i.currentSlide - i.options.slidesToScroll, i.currentSlide - 1 == 0 && (i.direction = 1))), i.slideHandler(e));
  }, e.prototype.buildArrows = function () {
    var e = this;
    !0 === e.options.arrows && (e.$prevArrow = i(e.options.prevArrow).addClass("slick-arrow"), e.$nextArrow = i(e.options.nextArrow).addClass("slick-arrow"), e.slideCount > e.options.slidesToShow ? (e.$prevArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"), e.$nextArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"), e.htmlExpr.test(e.options.prevArrow) && e.$prevArrow.prependTo(e.options.appendArrows), e.htmlExpr.test(e.options.nextArrow) && e.$nextArrow.appendTo(e.options.appendArrows), !0 !== e.options.infinite && e.$prevArrow.addClass("slick-disabled").attr("aria-disabled", "true")) : e.$prevArrow.add(e.$nextArrow).addClass("slick-hidden").attr({
      "aria-disabled": "true",
      tabindex: "-1"
    }));
  }, e.prototype.buildDots = function () {
    var e,
        t,
        o = this;

    if (!0 === o.options.dots) {
      for (o.$slider.addClass("slick-dotted"), t = i("<ul />").addClass(o.options.dotsClass), e = 0; e <= o.getDotCount(); e += 1) {
        t.append(i("<li />").append(o.options.customPaging.call(this, o, e)));
      }

      o.$dots = t.appendTo(o.options.appendDots), o.$dots.find("li").first().addClass("slick-active");
    }
  }, e.prototype.buildOut = function () {
    var e = this;
    e.$slides = e.$slider.children(e.options.slide + ":not(.slick-cloned)").addClass("slick-slide"), e.slideCount = e.$slides.length, e.$slides.each(function (e, t) {
      i(t).attr("data-slick-index", e).data("originalStyling", i(t).attr("style") || "");
    }), e.$slider.addClass("slick-slider"), e.$slideTrack = 0 === e.slideCount ? i('<div class="slick-track"/>').appendTo(e.$slider) : e.$slides.wrapAll('<div class="slick-track"/>').parent(), e.$list = e.$slideTrack.wrap('<div class="slick-list"/>').parent(), e.$slideTrack.css("opacity", 0), !0 !== e.options.centerMode && !0 !== e.options.swipeToSlide || (e.options.slidesToScroll = 1), i("img[data-lazy]", e.$slider).not("[src]").addClass("slick-loading"), e.setupInfinite(), e.buildArrows(), e.buildDots(), e.updateDots(), e.setSlideClasses("number" == typeof e.currentSlide ? e.currentSlide : 0), !0 === e.options.draggable && e.$list.addClass("draggable");
  }, e.prototype.buildRows = function () {
    var i,
        e,
        t,
        o,
        s,
        n,
        r,
        l = this;

    if (o = document.createDocumentFragment(), n = l.$slider.children(), l.options.rows > 1) {
      for (r = l.options.slidesPerRow * l.options.rows, s = Math.ceil(n.length / r), i = 0; i < s; i++) {
        var d = document.createElement("div");

        for (e = 0; e < l.options.rows; e++) {
          var a = document.createElement("div");

          for (t = 0; t < l.options.slidesPerRow; t++) {
            var c = i * r + (e * l.options.slidesPerRow + t);
            n.get(c) && a.appendChild(n.get(c));
          }

          d.appendChild(a);
        }

        o.appendChild(d);
      }

      l.$slider.empty().append(o), l.$slider.children().children().children().css({
        width: 100 / l.options.slidesPerRow + "%",
        display: "inline-block"
      });
    }
  }, e.prototype.checkResponsive = function (e, t) {
    var o,
        s,
        n,
        r = this,
        l = !1,
        d = r.$slider.width(),
        a = window.innerWidth || i(window).width();

    if ("window" === r.respondTo ? n = a : "slider" === r.respondTo ? n = d : "min" === r.respondTo && (n = Math.min(a, d)), r.options.responsive && r.options.responsive.length && null !== r.options.responsive) {
      s = null;

      for (o in r.breakpoints) {
        r.breakpoints.hasOwnProperty(o) && (!1 === r.originalSettings.mobileFirst ? n < r.breakpoints[o] && (s = r.breakpoints[o]) : n > r.breakpoints[o] && (s = r.breakpoints[o]));
      }

      null !== s ? null !== r.activeBreakpoint ? (s !== r.activeBreakpoint || t) && (r.activeBreakpoint = s, "unslick" === r.breakpointSettings[s] ? r.unslick(s) : (r.options = i.extend({}, r.originalSettings, r.breakpointSettings[s]), !0 === e && (r.currentSlide = r.options.initialSlide), r.refresh(e)), l = s) : (r.activeBreakpoint = s, "unslick" === r.breakpointSettings[s] ? r.unslick(s) : (r.options = i.extend({}, r.originalSettings, r.breakpointSettings[s]), !0 === e && (r.currentSlide = r.options.initialSlide), r.refresh(e)), l = s) : null !== r.activeBreakpoint && (r.activeBreakpoint = null, r.options = r.originalSettings, !0 === e && (r.currentSlide = r.options.initialSlide), r.refresh(e), l = s), e || !1 === l || r.$slider.trigger("breakpoint", [r, l]);
    }
  }, e.prototype.changeSlide = function (e, t) {
    var o,
        s,
        n,
        r = this,
        l = i(e.currentTarget);

    switch (l.is("a") && e.preventDefault(), l.is("li") || (l = l.closest("li")), n = r.slideCount % r.options.slidesToScroll != 0, o = n ? 0 : (r.slideCount - r.currentSlide) % r.options.slidesToScroll, e.data.message) {
      case "previous":
        s = 0 === o ? r.options.slidesToScroll : r.options.slidesToShow - o, r.slideCount > r.options.slidesToShow && r.slideHandler(r.currentSlide - s, !1, t);
        break;

      case "next":
        s = 0 === o ? r.options.slidesToScroll : o, r.slideCount > r.options.slidesToShow && r.slideHandler(r.currentSlide + s, !1, t);
        break;

      case "index":
        var d = 0 === e.data.index ? 0 : e.data.index || l.index() * r.options.slidesToScroll;
        r.slideHandler(r.checkNavigable(d), !1, t), l.children().trigger("focus");
        break;

      default:
        return;
    }
  }, e.prototype.checkNavigable = function (i) {
    var e, t;
    if (e = this.getNavigableIndexes(), t = 0, i > e[e.length - 1]) i = e[e.length - 1];else for (var o in e) {
      if (i < e[o]) {
        i = t;
        break;
      }

      t = e[o];
    }
    return i;
  }, e.prototype.cleanUpEvents = function () {
    var e = this;
    e.options.dots && null !== e.$dots && (i("li", e.$dots).off("click.slick", e.changeSlide).off("mouseenter.slick", i.proxy(e.interrupt, e, !0)).off("mouseleave.slick", i.proxy(e.interrupt, e, !1)), !0 === e.options.accessibility && e.$dots.off("keydown.slick", e.keyHandler)), e.$slider.off("focus.slick blur.slick"), !0 === e.options.arrows && e.slideCount > e.options.slidesToShow && (e.$prevArrow && e.$prevArrow.off("click.slick", e.changeSlide), e.$nextArrow && e.$nextArrow.off("click.slick", e.changeSlide), !0 === e.options.accessibility && (e.$prevArrow && e.$prevArrow.off("keydown.slick", e.keyHandler), e.$nextArrow && e.$nextArrow.off("keydown.slick", e.keyHandler))), e.$list.off("touchstart.slick mousedown.slick", e.swipeHandler), e.$list.off("touchmove.slick mousemove.slick", e.swipeHandler), e.$list.off("touchend.slick mouseup.slick", e.swipeHandler), e.$list.off("touchcancel.slick mouseleave.slick", e.swipeHandler), e.$list.off("click.slick", e.clickHandler), i(document).off(e.visibilityChange, e.visibility), e.cleanUpSlideEvents(), !0 === e.options.accessibility && e.$list.off("keydown.slick", e.keyHandler), !0 === e.options.focusOnSelect && i(e.$slideTrack).children().off("click.slick", e.selectHandler), i(window).off("orientationchange.slick.slick-" + e.instanceUid, e.orientationChange), i(window).off("resize.slick.slick-" + e.instanceUid, e.resize), i("[draggable!=true]", e.$slideTrack).off("dragstart", e.preventDefault), i(window).off("load.slick.slick-" + e.instanceUid, e.setPosition);
  }, e.prototype.cleanUpSlideEvents = function () {
    var e = this;
    e.$list.off("mouseenter.slick", i.proxy(e.interrupt, e, !0)), e.$list.off("mouseleave.slick", i.proxy(e.interrupt, e, !1));
  }, e.prototype.cleanUpRows = function () {
    var i,
        e = this;
    e.options.rows > 1 && ((i = e.$slides.children().children()).removeAttr("style"), e.$slider.empty().append(i));
  }, e.prototype.clickHandler = function (i) {
    !1 === this.shouldClick && (i.stopImmediatePropagation(), i.stopPropagation(), i.preventDefault());
  }, e.prototype.destroy = function (e) {
    var t = this;
    t.autoPlayClear(), t.touchObject = {}, t.cleanUpEvents(), i(".slick-cloned", t.$slider).detach(), t.$dots && t.$dots.remove(), t.$prevArrow && t.$prevArrow.length && (t.$prevArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display", ""), t.htmlExpr.test(t.options.prevArrow) && t.$prevArrow.remove()), t.$nextArrow && t.$nextArrow.length && (t.$nextArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display", ""), t.htmlExpr.test(t.options.nextArrow) && t.$nextArrow.remove()), t.$slides && (t.$slides.removeClass("slick-slide slick-active slick-center slick-visible slick-current").removeAttr("aria-hidden").removeAttr("data-slick-index").each(function () {
      i(this).attr("style", i(this).data("originalStyling"));
    }), t.$slideTrack.children(this.options.slide).detach(), t.$slideTrack.detach(), t.$list.detach(), t.$slider.append(t.$slides)), t.cleanUpRows(), t.$slider.removeClass("slick-slider"), t.$slider.removeClass("slick-initialized"), t.$slider.removeClass("slick-dotted"), t.unslicked = !0, e || t.$slider.trigger("destroy", [t]);
  }, e.prototype.disableTransition = function (i) {
    var e = this,
        t = {};
    t[e.transitionType] = "", !1 === e.options.fade ? e.$slideTrack.css(t) : e.$slides.eq(i).css(t);
  }, e.prototype.fadeSlide = function (i, e) {
    var t = this;
    !1 === t.cssTransitions ? (t.$slides.eq(i).css({
      zIndex: t.options.zIndex
    }), t.$slides.eq(i).animate({
      opacity: 1
    }, t.options.speed, t.options.easing, e)) : (t.applyTransition(i), t.$slides.eq(i).css({
      opacity: 1,
      zIndex: t.options.zIndex
    }), e && setTimeout(function () {
      t.disableTransition(i), e.call();
    }, t.options.speed));
  }, e.prototype.fadeSlideOut = function (i) {
    var e = this;
    !1 === e.cssTransitions ? e.$slides.eq(i).animate({
      opacity: 0,
      zIndex: e.options.zIndex - 2
    }, e.options.speed, e.options.easing) : (e.applyTransition(i), e.$slides.eq(i).css({
      opacity: 0,
      zIndex: e.options.zIndex - 2
    }));
  }, e.prototype.filterSlides = e.prototype.slickFilter = function (i) {
    var e = this;
    null !== i && (e.$slidesCache = e.$slides, e.unload(), e.$slideTrack.children(this.options.slide).detach(), e.$slidesCache.filter(i).appendTo(e.$slideTrack), e.reinit());
  }, e.prototype.focusHandler = function () {
    var e = this;
    e.$slider.off("focus.slick blur.slick").on("focus.slick blur.slick", "*", function (t) {
      t.stopImmediatePropagation();
      var o = i(this);
      setTimeout(function () {
        e.options.pauseOnFocus && (e.focussed = o.is(":focus"), e.autoPlay());
      }, 0);
    });
  }, e.prototype.getCurrent = e.prototype.slickCurrentSlide = function () {
    return this.currentSlide;
  }, e.prototype.getDotCount = function () {
    var i = this,
        e = 0,
        t = 0,
        o = 0;
    if (!0 === i.options.infinite) {
      if (i.slideCount <= i.options.slidesToShow) ++o;else for (; e < i.slideCount;) {
        ++o, e = t + i.options.slidesToScroll, t += i.options.slidesToScroll <= i.options.slidesToShow ? i.options.slidesToScroll : i.options.slidesToShow;
      }
    } else if (!0 === i.options.centerMode) o = i.slideCount;else if (i.options.asNavFor) for (; e < i.slideCount;) {
      ++o, e = t + i.options.slidesToScroll, t += i.options.slidesToScroll <= i.options.slidesToShow ? i.options.slidesToScroll : i.options.slidesToShow;
    } else o = 1 + Math.ceil((i.slideCount - i.options.slidesToShow) / i.options.slidesToScroll);
    return o - 1;
  }, e.prototype.getLeft = function (i) {
    var e,
        t,
        o,
        s,
        n = this,
        r = 0;
    return n.slideOffset = 0, t = n.$slides.first().outerHeight(!0), !0 === n.options.infinite ? (n.slideCount > n.options.slidesToShow && (n.slideOffset = n.slideWidth * n.options.slidesToShow * -1, s = -1, !0 === n.options.vertical && !0 === n.options.centerMode && (2 === n.options.slidesToShow ? s = -1.5 : 1 === n.options.slidesToShow && (s = -2)), r = t * n.options.slidesToShow * s), n.slideCount % n.options.slidesToScroll != 0 && i + n.options.slidesToScroll > n.slideCount && n.slideCount > n.options.slidesToShow && (i > n.slideCount ? (n.slideOffset = (n.options.slidesToShow - (i - n.slideCount)) * n.slideWidth * -1, r = (n.options.slidesToShow - (i - n.slideCount)) * t * -1) : (n.slideOffset = n.slideCount % n.options.slidesToScroll * n.slideWidth * -1, r = n.slideCount % n.options.slidesToScroll * t * -1))) : i + n.options.slidesToShow > n.slideCount && (n.slideOffset = (i + n.options.slidesToShow - n.slideCount) * n.slideWidth, r = (i + n.options.slidesToShow - n.slideCount) * t), n.slideCount <= n.options.slidesToShow && (n.slideOffset = 0, r = 0), !0 === n.options.centerMode && n.slideCount <= n.options.slidesToShow ? n.slideOffset = n.slideWidth * Math.floor(n.options.slidesToShow) / 2 - n.slideWidth * n.slideCount / 2 : !0 === n.options.centerMode && !0 === n.options.infinite ? n.slideOffset += n.slideWidth * Math.floor(n.options.slidesToShow / 2) - n.slideWidth : !0 === n.options.centerMode && (n.slideOffset = 0, n.slideOffset += n.slideWidth * Math.floor(n.options.slidesToShow / 2)), e = !1 === n.options.vertical ? i * n.slideWidth * -1 + n.slideOffset : i * t * -1 + r, !0 === n.options.variableWidth && (o = n.slideCount <= n.options.slidesToShow || !1 === n.options.infinite ? n.$slideTrack.children(".slick-slide").eq(i) : n.$slideTrack.children(".slick-slide").eq(i + n.options.slidesToShow), e = !0 === n.options.rtl ? o[0] ? -1 * (n.$slideTrack.width() - o[0].offsetLeft - o.width()) : 0 : o[0] ? -1 * o[0].offsetLeft : 0, !0 === n.options.centerMode && (o = n.slideCount <= n.options.slidesToShow || !1 === n.options.infinite ? n.$slideTrack.children(".slick-slide").eq(i) : n.$slideTrack.children(".slick-slide").eq(i + n.options.slidesToShow + 1), e = !0 === n.options.rtl ? o[0] ? -1 * (n.$slideTrack.width() - o[0].offsetLeft - o.width()) : 0 : o[0] ? -1 * o[0].offsetLeft : 0, e += (n.$list.width() - o.outerWidth()) / 2)), e;
  }, e.prototype.getOption = e.prototype.slickGetOption = function (i) {
    return this.options[i];
  }, e.prototype.getNavigableIndexes = function () {
    var i,
        e = this,
        t = 0,
        o = 0,
        s = [];

    for (!1 === e.options.infinite ? i = e.slideCount : (t = -1 * e.options.slidesToScroll, o = -1 * e.options.slidesToScroll, i = 2 * e.slideCount); t < i;) {
      s.push(t), t = o + e.options.slidesToScroll, o += e.options.slidesToScroll <= e.options.slidesToShow ? e.options.slidesToScroll : e.options.slidesToShow;
    }

    return s;
  }, e.prototype.getSlick = function () {
    return this;
  }, e.prototype.getSlideCount = function () {
    var e,
        t,
        o = this;
    return t = !0 === o.options.centerMode ? o.slideWidth * Math.floor(o.options.slidesToShow / 2) : 0, !0 === o.options.swipeToSlide ? (o.$slideTrack.find(".slick-slide").each(function (s, n) {
      if (n.offsetLeft - t + i(n).outerWidth() / 2 > -1 * o.swipeLeft) return e = n, !1;
    }), Math.abs(i(e).attr("data-slick-index") - o.currentSlide) || 1) : o.options.slidesToScroll;
  }, e.prototype.goTo = e.prototype.slickGoTo = function (i, e) {
    this.changeSlide({
      data: {
        message: "index",
        index: parseInt(i)
      }
    }, e);
  }, e.prototype.init = function (e) {
    var t = this;
    i(t.$slider).hasClass("slick-initialized") || (i(t.$slider).addClass("slick-initialized"), t.buildRows(), t.buildOut(), t.setProps(), t.startLoad(), t.loadSlider(), t.initializeEvents(), t.updateArrows(), t.updateDots(), t.checkResponsive(!0), t.focusHandler()), e && t.$slider.trigger("init", [t]), !0 === t.options.accessibility && t.initADA(), t.options.autoplay && (t.paused = !1, t.autoPlay());
  }, e.prototype.initADA = function () {
    var e = this,
        t = Math.ceil(e.slideCount / e.options.slidesToShow),
        o = e.getNavigableIndexes().filter(function (i) {
      return i >= 0 && i < e.slideCount;
    });
    e.$slides.add(e.$slideTrack.find(".slick-cloned")).attr({
      "aria-hidden": "true",
      tabindex: "-1"
    }).find("a, input, button, select").attr({
      tabindex: "-1"
    }), null !== e.$dots && (e.$slides.not(e.$slideTrack.find(".slick-cloned")).each(function (t) {
      var s = o.indexOf(t);
      i(this).attr({
        role: "tabpanel",
        id: "slick-slide" + e.instanceUid + t,
        tabindex: -1
      }), -1 !== s && i(this).attr({
        "aria-describedby": "slick-slide-control" + e.instanceUid + s
      });
    }), e.$dots.attr("role", "tablist").find("li").each(function (s) {
      var n = o[s];
      i(this).attr({
        role: "presentation"
      }), i(this).find("button").first().attr({
        role: "tab",
        id: "slick-slide-control" + e.instanceUid + s,
        "aria-controls": "slick-slide" + e.instanceUid + n,
        "aria-label": s + 1 + " of " + t,
        "aria-selected": null,
        tabindex: "-1"
      });
    }).eq(e.currentSlide).find("button").attr({
      "aria-selected": "true",
      tabindex: "0"
    }).end());

    for (var s = e.currentSlide, n = s + e.options.slidesToShow; s < n; s++) {
      e.$slides.eq(s).attr("tabindex", 0);
    }

    e.activateADA();
  }, e.prototype.initArrowEvents = function () {
    var i = this;
    !0 === i.options.arrows && i.slideCount > i.options.slidesToShow && (i.$prevArrow.off("click.slick").on("click.slick", {
      message: "previous"
    }, i.changeSlide), i.$nextArrow.off("click.slick").on("click.slick", {
      message: "next"
    }, i.changeSlide), !0 === i.options.accessibility && (i.$prevArrow.on("keydown.slick", i.keyHandler), i.$nextArrow.on("keydown.slick", i.keyHandler)));
  }, e.prototype.initDotEvents = function () {
    var e = this;
    !0 === e.options.dots && (i("li", e.$dots).on("click.slick", {
      message: "index"
    }, e.changeSlide), !0 === e.options.accessibility && e.$dots.on("keydown.slick", e.keyHandler)), !0 === e.options.dots && !0 === e.options.pauseOnDotsHover && i("li", e.$dots).on("mouseenter.slick", i.proxy(e.interrupt, e, !0)).on("mouseleave.slick", i.proxy(e.interrupt, e, !1));
  }, e.prototype.initSlideEvents = function () {
    var e = this;
    e.options.pauseOnHover && (e.$list.on("mouseenter.slick", i.proxy(e.interrupt, e, !0)), e.$list.on("mouseleave.slick", i.proxy(e.interrupt, e, !1)));
  }, e.prototype.initializeEvents = function () {
    var e = this;
    e.initArrowEvents(), e.initDotEvents(), e.initSlideEvents(), e.$list.on("touchstart.slick mousedown.slick", {
      action: "start"
    }, e.swipeHandler), e.$list.on("touchmove.slick mousemove.slick", {
      action: "move"
    }, e.swipeHandler), e.$list.on("touchend.slick mouseup.slick", {
      action: "end"
    }, e.swipeHandler), e.$list.on("touchcancel.slick mouseleave.slick", {
      action: "end"
    }, e.swipeHandler), e.$list.on("click.slick", e.clickHandler), i(document).on(e.visibilityChange, i.proxy(e.visibility, e)), !0 === e.options.accessibility && e.$list.on("keydown.slick", e.keyHandler), !0 === e.options.focusOnSelect && i(e.$slideTrack).children().on("click.slick", e.selectHandler), i(window).on("orientationchange.slick.slick-" + e.instanceUid, i.proxy(e.orientationChange, e)), i(window).on("resize.slick.slick-" + e.instanceUid, i.proxy(e.resize, e)), i("[draggable!=true]", e.$slideTrack).on("dragstart", e.preventDefault), i(window).on("load.slick.slick-" + e.instanceUid, e.setPosition), i(e.setPosition);
  }, e.prototype.initUI = function () {
    var i = this;
    !0 === i.options.arrows && i.slideCount > i.options.slidesToShow && (i.$prevArrow.show(), i.$nextArrow.show()), !0 === i.options.dots && i.slideCount > i.options.slidesToShow && i.$dots.show();
  }, e.prototype.keyHandler = function (i) {
    var e = this;
    i.target.tagName.match("TEXTAREA|INPUT|SELECT") || (37 === i.keyCode && !0 === e.options.accessibility ? e.changeSlide({
      data: {
        message: !0 === e.options.rtl ? "next" : "previous"
      }
    }) : 39 === i.keyCode && !0 === e.options.accessibility && e.changeSlide({
      data: {
        message: !0 === e.options.rtl ? "previous" : "next"
      }
    }));
  }, e.prototype.lazyLoad = function () {
    function e(e) {
      i("img[data-lazy]", e).each(function () {
        var e = i(this),
            t = i(this).attr("data-lazy"),
            o = i(this).attr("data-srcset"),
            s = i(this).attr("data-sizes") || n.$slider.attr("data-sizes"),
            r = document.createElement("img");
        r.onload = function () {
          e.animate({
            opacity: 0
          }, 100, function () {
            o && (e.attr("srcset", o), s && e.attr("sizes", s)), e.attr("src", t).animate({
              opacity: 1
            }, 200, function () {
              e.removeAttr("data-lazy data-srcset data-sizes").removeClass("slick-loading");
            }), n.$slider.trigger("lazyLoaded", [n, e, t]);
          });
        }, r.onerror = function () {
          e.removeAttr("data-lazy").removeClass("slick-loading").addClass("slick-lazyload-error"), n.$slider.trigger("lazyLoadError", [n, e, t]);
        }, r.src = t;
      });
    }

    var t,
        o,
        s,
        n = this;
    if (!0 === n.options.centerMode ? !0 === n.options.infinite ? s = (o = n.currentSlide + (n.options.slidesToShow / 2 + 1)) + n.options.slidesToShow + 2 : (o = Math.max(0, n.currentSlide - (n.options.slidesToShow / 2 + 1)), s = n.options.slidesToShow / 2 + 1 + 2 + n.currentSlide) : (o = n.options.infinite ? n.options.slidesToShow + n.currentSlide : n.currentSlide, s = Math.ceil(o + n.options.slidesToShow), !0 === n.options.fade && (o > 0 && o--, s <= n.slideCount && s++)), t = n.$slider.find(".slick-slide").slice(o, s), "anticipated" === n.options.lazyLoad) for (var r = o - 1, l = s, d = n.$slider.find(".slick-slide"), a = 0; a < n.options.slidesToScroll; a++) {
      r < 0 && (r = n.slideCount - 1), t = (t = t.add(d.eq(r))).add(d.eq(l)), r--, l++;
    }
    e(t), n.slideCount <= n.options.slidesToShow ? e(n.$slider.find(".slick-slide")) : n.currentSlide >= n.slideCount - n.options.slidesToShow ? e(n.$slider.find(".slick-cloned").slice(0, n.options.slidesToShow)) : 0 === n.currentSlide && e(n.$slider.find(".slick-cloned").slice(-1 * n.options.slidesToShow));
  }, e.prototype.loadSlider = function () {
    var i = this;
    i.setPosition(), i.$slideTrack.css({
      opacity: 1
    }), i.$slider.removeClass("slick-loading"), i.initUI(), "progressive" === i.options.lazyLoad && i.progressiveLazyLoad();
  }, e.prototype.next = e.prototype.slickNext = function () {
    this.changeSlide({
      data: {
        message: "next"
      }
    });
  }, e.prototype.orientationChange = function () {
    var i = this;
    i.checkResponsive(), i.setPosition();
  }, e.prototype.pause = e.prototype.slickPause = function () {
    var i = this;
    i.autoPlayClear(), i.paused = !0;
  }, e.prototype.play = e.prototype.slickPlay = function () {
    var i = this;
    i.autoPlay(), i.options.autoplay = !0, i.paused = !1, i.focussed = !1, i.interrupted = !1;
  }, e.prototype.postSlide = function (e) {
    var t = this;
    t.unslicked || (t.$slider.trigger("afterChange", [t, e]), t.animating = !1, t.slideCount > t.options.slidesToShow && t.setPosition(), t.swipeLeft = null, t.options.autoplay && t.autoPlay(), !0 === t.options.accessibility && (t.initADA(), t.options.focusOnChange && i(t.$slides.get(t.currentSlide)).attr("tabindex", 0).focus()));
  }, e.prototype.prev = e.prototype.slickPrev = function () {
    this.changeSlide({
      data: {
        message: "previous"
      }
    });
  }, e.prototype.preventDefault = function (i) {
    i.preventDefault();
  }, e.prototype.progressiveLazyLoad = function (e) {
    e = e || 1;
    var t,
        o,
        s,
        n,
        r,
        l = this,
        d = i("img[data-lazy]", l.$slider);
    d.length ? (t = d.first(), o = t.attr("data-lazy"), s = t.attr("data-srcset"), n = t.attr("data-sizes") || l.$slider.attr("data-sizes"), (r = document.createElement("img")).onload = function () {
      s && (t.attr("srcset", s), n && t.attr("sizes", n)), t.attr("src", o).removeAttr("data-lazy data-srcset data-sizes").removeClass("slick-loading"), !0 === l.options.adaptiveHeight && l.setPosition(), l.$slider.trigger("lazyLoaded", [l, t, o]), l.progressiveLazyLoad();
    }, r.onerror = function () {
      e < 3 ? setTimeout(function () {
        l.progressiveLazyLoad(e + 1);
      }, 500) : (t.removeAttr("data-lazy").removeClass("slick-loading").addClass("slick-lazyload-error"), l.$slider.trigger("lazyLoadError", [l, t, o]), l.progressiveLazyLoad());
    }, r.src = o) : l.$slider.trigger("allImagesLoaded", [l]);
  }, e.prototype.refresh = function (e) {
    var t,
        o,
        s = this;
    o = s.slideCount - s.options.slidesToShow, !s.options.infinite && s.currentSlide > o && (s.currentSlide = o), s.slideCount <= s.options.slidesToShow && (s.currentSlide = 0), t = s.currentSlide, s.destroy(!0), i.extend(s, s.initials, {
      currentSlide: t
    }), s.init(), e || s.changeSlide({
      data: {
        message: "index",
        index: t
      }
    }, !1);
  }, e.prototype.registerBreakpoints = function () {
    var e,
        t,
        o,
        s = this,
        n = s.options.responsive || null;

    if ("array" === i.type(n) && n.length) {
      s.respondTo = s.options.respondTo || "window";

      for (e in n) {
        if (o = s.breakpoints.length - 1, n.hasOwnProperty(e)) {
          for (t = n[e].breakpoint; o >= 0;) {
            s.breakpoints[o] && s.breakpoints[o] === t && s.breakpoints.splice(o, 1), o--;
          }

          s.breakpoints.push(t), s.breakpointSettings[t] = n[e].settings;
        }
      }

      s.breakpoints.sort(function (i, e) {
        return s.options.mobileFirst ? i - e : e - i;
      });
    }
  }, e.prototype.reinit = function () {
    var e = this;
    e.$slides = e.$slideTrack.children(e.options.slide).addClass("slick-slide"), e.slideCount = e.$slides.length, e.currentSlide >= e.slideCount && 0 !== e.currentSlide && (e.currentSlide = e.currentSlide - e.options.slidesToScroll), e.slideCount <= e.options.slidesToShow && (e.currentSlide = 0), e.registerBreakpoints(), e.setProps(), e.setupInfinite(), e.buildArrows(), e.updateArrows(), e.initArrowEvents(), e.buildDots(), e.updateDots(), e.initDotEvents(), e.cleanUpSlideEvents(), e.initSlideEvents(), e.checkResponsive(!1, !0), !0 === e.options.focusOnSelect && i(e.$slideTrack).children().on("click.slick", e.selectHandler), e.setSlideClasses("number" == typeof e.currentSlide ? e.currentSlide : 0), e.setPosition(), e.focusHandler(), e.paused = !e.options.autoplay, e.autoPlay(), e.$slider.trigger("reInit", [e]);
  }, e.prototype.resize = function () {
    var e = this;
    i(window).width() !== e.windowWidth && (clearTimeout(e.windowDelay), e.windowDelay = window.setTimeout(function () {
      e.windowWidth = i(window).width(), e.checkResponsive(), e.unslicked || e.setPosition();
    }, 50));
  }, e.prototype.removeSlide = e.prototype.slickRemove = function (i, e, t) {
    var o = this;
    if (i = "boolean" == typeof i ? !0 === (e = i) ? 0 : o.slideCount - 1 : !0 === e ? --i : i, o.slideCount < 1 || i < 0 || i > o.slideCount - 1) return !1;
    o.unload(), !0 === t ? o.$slideTrack.children().remove() : o.$slideTrack.children(this.options.slide).eq(i).remove(), o.$slides = o.$slideTrack.children(this.options.slide), o.$slideTrack.children(this.options.slide).detach(), o.$slideTrack.append(o.$slides), o.$slidesCache = o.$slides, o.reinit();
  }, e.prototype.setCSS = function (i) {
    var e,
        t,
        o = this,
        s = {};
    !0 === o.options.rtl && (i = -i), e = "left" == o.positionProp ? Math.ceil(i) + "px" : "0px", t = "top" == o.positionProp ? Math.ceil(i) + "px" : "0px", s[o.positionProp] = i, !1 === o.transformsEnabled ? o.$slideTrack.css(s) : (s = {}, !1 === o.cssTransitions ? (s[o.animType] = "translate(" + e + ", " + t + ")", o.$slideTrack.css(s)) : (s[o.animType] = "translate3d(" + e + ", " + t + ", 0px)", o.$slideTrack.css(s)));
  }, e.prototype.setDimensions = function () {
    var i = this;
    !1 === i.options.vertical ? !0 === i.options.centerMode && i.$list.css({
      padding: "0px " + i.options.centerPadding
    }) : (i.$list.height(i.$slides.first().outerHeight(!0) * i.options.slidesToShow), !0 === i.options.centerMode && i.$list.css({
      padding: i.options.centerPadding + " 0px"
    })), i.listWidth = i.$list.width(), i.listHeight = i.$list.height(), !1 === i.options.vertical && !1 === i.options.variableWidth ? (i.slideWidth = Math.ceil(i.listWidth / i.options.slidesToShow), i.$slideTrack.width(Math.ceil(i.slideWidth * i.$slideTrack.children(".slick-slide").length))) : !0 === i.options.variableWidth ? i.$slideTrack.width(5e3 * i.slideCount) : (i.slideWidth = Math.ceil(i.listWidth), i.$slideTrack.height(Math.ceil(i.$slides.first().outerHeight(!0) * i.$slideTrack.children(".slick-slide").length)));
    var e = i.$slides.first().outerWidth(!0) - i.$slides.first().width();
    !1 === i.options.variableWidth && i.$slideTrack.children(".slick-slide").width(i.slideWidth - e);
  }, e.prototype.setFade = function () {
    var e,
        t = this;
    t.$slides.each(function (o, s) {
      e = t.slideWidth * o * -1, !0 === t.options.rtl ? i(s).css({
        position: "relative",
        right: e,
        top: 0,
        zIndex: t.options.zIndex - 2,
        opacity: 0
      }) : i(s).css({
        position: "relative",
        left: e,
        top: 0,
        zIndex: t.options.zIndex - 2,
        opacity: 0
      });
    }), t.$slides.eq(t.currentSlide).css({
      zIndex: t.options.zIndex - 1,
      opacity: 1
    });
  }, e.prototype.setHeight = function () {
    var i = this;

    if (1 === i.options.slidesToShow && !0 === i.options.adaptiveHeight && !1 === i.options.vertical) {
      var e = i.$slides.eq(i.currentSlide).outerHeight(!0);
      i.$list.css("height", e);
    }
  }, e.prototype.setOption = e.prototype.slickSetOption = function () {
    var e,
        t,
        o,
        s,
        n,
        r = this,
        l = !1;
    if ("object" === i.type(arguments[0]) ? (o = arguments[0], l = arguments[1], n = "multiple") : "string" === i.type(arguments[0]) && (o = arguments[0], s = arguments[1], l = arguments[2], "responsive" === arguments[0] && "array" === i.type(arguments[1]) ? n = "responsive" : void 0 !== arguments[1] && (n = "single")), "single" === n) r.options[o] = s;else if ("multiple" === n) i.each(o, function (i, e) {
      r.options[i] = e;
    });else if ("responsive" === n) for (t in s) {
      if ("array" !== i.type(r.options.responsive)) r.options.responsive = [s[t]];else {
        for (e = r.options.responsive.length - 1; e >= 0;) {
          r.options.responsive[e].breakpoint === s[t].breakpoint && r.options.responsive.splice(e, 1), e--;
        }

        r.options.responsive.push(s[t]);
      }
    }
    l && (r.unload(), r.reinit());
  }, e.prototype.setPosition = function () {
    var i = this;
    i.setDimensions(), i.setHeight(), !1 === i.options.fade ? i.setCSS(i.getLeft(i.currentSlide)) : i.setFade(), i.$slider.trigger("setPosition", [i]);
  }, e.prototype.setProps = function () {
    var i = this,
        e = document.body.style;
    i.positionProp = !0 === i.options.vertical ? "top" : "left", "top" === i.positionProp ? i.$slider.addClass("slick-vertical") : i.$slider.removeClass("slick-vertical"), void 0 === e.WebkitTransition && void 0 === e.MozTransition && void 0 === e.msTransition || !0 === i.options.useCSS && (i.cssTransitions = !0), i.options.fade && ("number" == typeof i.options.zIndex ? i.options.zIndex < 3 && (i.options.zIndex = 3) : i.options.zIndex = i.defaults.zIndex), void 0 !== e.OTransform && (i.animType = "OTransform", i.transformType = "-o-transform", i.transitionType = "OTransition", void 0 === e.perspectiveProperty && void 0 === e.webkitPerspective && (i.animType = !1)), void 0 !== e.MozTransform && (i.animType = "MozTransform", i.transformType = "-moz-transform", i.transitionType = "MozTransition", void 0 === e.perspectiveProperty && void 0 === e.MozPerspective && (i.animType = !1)), void 0 !== e.webkitTransform && (i.animType = "webkitTransform", i.transformType = "-webkit-transform", i.transitionType = "webkitTransition", void 0 === e.perspectiveProperty && void 0 === e.webkitPerspective && (i.animType = !1)), void 0 !== e.msTransform && (i.animType = "msTransform", i.transformType = "-ms-transform", i.transitionType = "msTransition", void 0 === e.msTransform && (i.animType = !1)), void 0 !== e.transform && !1 !== i.animType && (i.animType = "transform", i.transformType = "transform", i.transitionType = "transition"), i.transformsEnabled = i.options.useTransform && null !== i.animType && !1 !== i.animType;
  }, e.prototype.setSlideClasses = function (i) {
    var e,
        t,
        o,
        s,
        n = this;

    if (t = n.$slider.find(".slick-slide").removeClass("slick-active slick-center slick-current").attr("aria-hidden", "true"), n.$slides.eq(i).addClass("slick-current"), !0 === n.options.centerMode) {
      var r = n.options.slidesToShow % 2 == 0 ? 1 : 0;
      e = Math.floor(n.options.slidesToShow / 2), !0 === n.options.infinite && (i >= e && i <= n.slideCount - 1 - e ? n.$slides.slice(i - e + r, i + e + 1).addClass("slick-active").attr("aria-hidden", "false") : (o = n.options.slidesToShow + i, t.slice(o - e + 1 + r, o + e + 2).addClass("slick-active").attr("aria-hidden", "false")), 0 === i ? t.eq(t.length - 1 - n.options.slidesToShow).addClass("slick-center") : i === n.slideCount - 1 && t.eq(n.options.slidesToShow).addClass("slick-center")), n.$slides.eq(i).addClass("slick-center");
    } else i >= 0 && i <= n.slideCount - n.options.slidesToShow ? n.$slides.slice(i, i + n.options.slidesToShow).addClass("slick-active").attr("aria-hidden", "false") : t.length <= n.options.slidesToShow ? t.addClass("slick-active").attr("aria-hidden", "false") : (s = n.slideCount % n.options.slidesToShow, o = !0 === n.options.infinite ? n.options.slidesToShow + i : i, n.options.slidesToShow == n.options.slidesToScroll && n.slideCount - i < n.options.slidesToShow ? t.slice(o - (n.options.slidesToShow - s), o + s).addClass("slick-active").attr("aria-hidden", "false") : t.slice(o, o + n.options.slidesToShow).addClass("slick-active").attr("aria-hidden", "false"));

    "ondemand" !== n.options.lazyLoad && "anticipated" !== n.options.lazyLoad || n.lazyLoad();
  }, e.prototype.setupInfinite = function () {
    var e,
        t,
        o,
        s = this;

    if (!0 === s.options.fade && (s.options.centerMode = !1), !0 === s.options.infinite && !1 === s.options.fade && (t = null, s.slideCount > s.options.slidesToShow)) {
      for (o = !0 === s.options.centerMode ? s.options.slidesToShow + 1 : s.options.slidesToShow, e = s.slideCount; e > s.slideCount - o; e -= 1) {
        t = e - 1, i(s.$slides[t]).clone(!0).attr("id", "").attr("data-slick-index", t - s.slideCount).prependTo(s.$slideTrack).addClass("slick-cloned");
      }

      for (e = 0; e < o + s.slideCount; e += 1) {
        t = e, i(s.$slides[t]).clone(!0).attr("id", "").attr("data-slick-index", t + s.slideCount).appendTo(s.$slideTrack).addClass("slick-cloned");
      }

      s.$slideTrack.find(".slick-cloned").find("[id]").each(function () {
        i(this).attr("id", "");
      });
    }
  }, e.prototype.interrupt = function (i) {
    var e = this;
    i || e.autoPlay(), e.interrupted = i;
  }, e.prototype.selectHandler = function (e) {
    var t = this,
        o = i(e.target).is(".slick-slide") ? i(e.target) : i(e.target).parents(".slick-slide"),
        s = parseInt(o.attr("data-slick-index"));
    s || (s = 0), t.slideCount <= t.options.slidesToShow ? t.slideHandler(s, !1, !0) : t.slideHandler(s);
  }, e.prototype.slideHandler = function (i, e, t) {
    var o,
        s,
        n,
        r,
        l,
        d = null,
        a = this;
    if (e = e || !1, !(!0 === a.animating && !0 === a.options.waitForAnimate || !0 === a.options.fade && a.currentSlide === i)) if (!1 === e && a.asNavFor(i), o = i, d = a.getLeft(o), r = a.getLeft(a.currentSlide), a.currentLeft = null === a.swipeLeft ? r : a.swipeLeft, !1 === a.options.infinite && !1 === a.options.centerMode && (i < 0 || i > a.getDotCount() * a.options.slidesToScroll)) !1 === a.options.fade && (o = a.currentSlide, !0 !== t ? a.animateSlide(r, function () {
      a.postSlide(o);
    }) : a.postSlide(o));else if (!1 === a.options.infinite && !0 === a.options.centerMode && (i < 0 || i > a.slideCount - a.options.slidesToScroll)) !1 === a.options.fade && (o = a.currentSlide, !0 !== t ? a.animateSlide(r, function () {
      a.postSlide(o);
    }) : a.postSlide(o));else {
      if (a.options.autoplay && clearInterval(a.autoPlayTimer), s = o < 0 ? a.slideCount % a.options.slidesToScroll != 0 ? a.slideCount - a.slideCount % a.options.slidesToScroll : a.slideCount + o : o >= a.slideCount ? a.slideCount % a.options.slidesToScroll != 0 ? 0 : o - a.slideCount : o, a.animating = !0, a.$slider.trigger("beforeChange", [a, a.currentSlide, s]), n = a.currentSlide, a.currentSlide = s, a.setSlideClasses(a.currentSlide), a.options.asNavFor && (l = (l = a.getNavTarget()).slick("getSlick")).slideCount <= l.options.slidesToShow && l.setSlideClasses(a.currentSlide), a.updateDots(), a.updateArrows(), !0 === a.options.fade) return !0 !== t ? (a.fadeSlideOut(n), a.fadeSlide(s, function () {
        a.postSlide(s);
      })) : a.postSlide(s), void a.animateHeight();
      !0 !== t ? a.animateSlide(d, function () {
        a.postSlide(s);
      }) : a.postSlide(s);
    }
  }, e.prototype.startLoad = function () {
    var i = this;
    !0 === i.options.arrows && i.slideCount > i.options.slidesToShow && (i.$prevArrow.hide(), i.$nextArrow.hide()), !0 === i.options.dots && i.slideCount > i.options.slidesToShow && i.$dots.hide(), i.$slider.addClass("slick-loading");
  }, e.prototype.swipeDirection = function () {
    var i,
        e,
        t,
        o,
        s = this;
    return i = s.touchObject.startX - s.touchObject.curX, e = s.touchObject.startY - s.touchObject.curY, t = Math.atan2(e, i), (o = Math.round(180 * t / Math.PI)) < 0 && (o = 360 - Math.abs(o)), o <= 45 && o >= 0 ? !1 === s.options.rtl ? "left" : "right" : o <= 360 && o >= 315 ? !1 === s.options.rtl ? "left" : "right" : o >= 135 && o <= 225 ? !1 === s.options.rtl ? "right" : "left" : !0 === s.options.verticalSwiping ? o >= 35 && o <= 135 ? "down" : "up" : "vertical";
  }, e.prototype.swipeEnd = function (i) {
    var e,
        t,
        o = this;
    if (o.dragging = !1, o.swiping = !1, o.scrolling) return o.scrolling = !1, !1;
    if (o.interrupted = !1, o.shouldClick = !(o.touchObject.swipeLength > 10), void 0 === o.touchObject.curX) return !1;

    if (!0 === o.touchObject.edgeHit && o.$slider.trigger("edge", [o, o.swipeDirection()]), o.touchObject.swipeLength >= o.touchObject.minSwipe) {
      switch (t = o.swipeDirection()) {
        case "left":
        case "down":
          e = o.options.swipeToSlide ? o.checkNavigable(o.currentSlide + o.getSlideCount()) : o.currentSlide + o.getSlideCount(), o.currentDirection = 0;
          break;

        case "right":
        case "up":
          e = o.options.swipeToSlide ? o.checkNavigable(o.currentSlide - o.getSlideCount()) : o.currentSlide - o.getSlideCount(), o.currentDirection = 1;
      }

      "vertical" != t && (o.slideHandler(e), o.touchObject = {}, o.$slider.trigger("swipe", [o, t]));
    } else o.touchObject.startX !== o.touchObject.curX && (o.slideHandler(o.currentSlide), o.touchObject = {});
  }, e.prototype.swipeHandler = function (i) {
    var e = this;
    if (!(!1 === e.options.swipe || "ontouchend" in document && !1 === e.options.swipe || !1 === e.options.draggable && -1 !== i.type.indexOf("mouse"))) switch (e.touchObject.fingerCount = i.originalEvent && void 0 !== i.originalEvent.touches ? i.originalEvent.touches.length : 1, e.touchObject.minSwipe = e.listWidth / e.options.touchThreshold, !0 === e.options.verticalSwiping && (e.touchObject.minSwipe = e.listHeight / e.options.touchThreshold), i.data.action) {
      case "start":
        e.swipeStart(i);
        break;

      case "move":
        e.swipeMove(i);
        break;

      case "end":
        e.swipeEnd(i);
    }
  }, e.prototype.swipeMove = function (i) {
    var e,
        t,
        o,
        s,
        n,
        r,
        l = this;
    return n = void 0 !== i.originalEvent ? i.originalEvent.touches : null, !(!l.dragging || l.scrolling || n && 1 !== n.length) && (e = l.getLeft(l.currentSlide), l.touchObject.curX = void 0 !== n ? n[0].pageX : i.clientX, l.touchObject.curY = void 0 !== n ? n[0].pageY : i.clientY, l.touchObject.swipeLength = Math.round(Math.sqrt(Math.pow(l.touchObject.curX - l.touchObject.startX, 2))), r = Math.round(Math.sqrt(Math.pow(l.touchObject.curY - l.touchObject.startY, 2))), !l.options.verticalSwiping && !l.swiping && r > 4 ? (l.scrolling = !0, !1) : (!0 === l.options.verticalSwiping && (l.touchObject.swipeLength = r), t = l.swipeDirection(), void 0 !== i.originalEvent && l.touchObject.swipeLength > 4 && (l.swiping = !0, i.preventDefault()), s = (!1 === l.options.rtl ? 1 : -1) * (l.touchObject.curX > l.touchObject.startX ? 1 : -1), !0 === l.options.verticalSwiping && (s = l.touchObject.curY > l.touchObject.startY ? 1 : -1), o = l.touchObject.swipeLength, l.touchObject.edgeHit = !1, !1 === l.options.infinite && (0 === l.currentSlide && "right" === t || l.currentSlide >= l.getDotCount() && "left" === t) && (o = l.touchObject.swipeLength * l.options.edgeFriction, l.touchObject.edgeHit = !0), !1 === l.options.vertical ? l.swipeLeft = e + o * s : l.swipeLeft = e + o * (l.$list.height() / l.listWidth) * s, !0 === l.options.verticalSwiping && (l.swipeLeft = e + o * s), !0 !== l.options.fade && !1 !== l.options.touchMove && (!0 === l.animating ? (l.swipeLeft = null, !1) : void l.setCSS(l.swipeLeft))));
  }, e.prototype.swipeStart = function (i) {
    var e,
        t = this;
    if (t.interrupted = !0, 1 !== t.touchObject.fingerCount || t.slideCount <= t.options.slidesToShow) return t.touchObject = {}, !1;
    void 0 !== i.originalEvent && void 0 !== i.originalEvent.touches && (e = i.originalEvent.touches[0]), t.touchObject.startX = t.touchObject.curX = void 0 !== e ? e.pageX : i.clientX, t.touchObject.startY = t.touchObject.curY = void 0 !== e ? e.pageY : i.clientY, t.dragging = !0;
  }, e.prototype.unfilterSlides = e.prototype.slickUnfilter = function () {
    var i = this;
    null !== i.$slidesCache && (i.unload(), i.$slideTrack.children(this.options.slide).detach(), i.$slidesCache.appendTo(i.$slideTrack), i.reinit());
  }, e.prototype.unload = function () {
    var e = this;
    i(".slick-cloned", e.$slider).remove(), e.$dots && e.$dots.remove(), e.$prevArrow && e.htmlExpr.test(e.options.prevArrow) && e.$prevArrow.remove(), e.$nextArrow && e.htmlExpr.test(e.options.nextArrow) && e.$nextArrow.remove(), e.$slides.removeClass("slick-slide slick-active slick-visible slick-current").attr("aria-hidden", "true").css("width", "");
  }, e.prototype.unslick = function (i) {
    var e = this;
    e.$slider.trigger("unslick", [e, i]), e.destroy();
  }, e.prototype.updateArrows = function () {
    var i = this;
    Math.floor(i.options.slidesToShow / 2), !0 === i.options.arrows && i.slideCount > i.options.slidesToShow && !i.options.infinite && (i.$prevArrow.removeClass("slick-disabled").attr("aria-disabled", "false"), i.$nextArrow.removeClass("slick-disabled").attr("aria-disabled", "false"), 0 === i.currentSlide ? (i.$prevArrow.addClass("slick-disabled").attr("aria-disabled", "true"), i.$nextArrow.removeClass("slick-disabled").attr("aria-disabled", "false")) : i.currentSlide >= i.slideCount - i.options.slidesToShow && !1 === i.options.centerMode ? (i.$nextArrow.addClass("slick-disabled").attr("aria-disabled", "true"), i.$prevArrow.removeClass("slick-disabled").attr("aria-disabled", "false")) : i.currentSlide >= i.slideCount - 1 && !0 === i.options.centerMode && (i.$nextArrow.addClass("slick-disabled").attr("aria-disabled", "true"), i.$prevArrow.removeClass("slick-disabled").attr("aria-disabled", "false")));
  }, e.prototype.updateDots = function () {
    var i = this;
    null !== i.$dots && (i.$dots.find("li").removeClass("slick-active").end(), i.$dots.find("li").eq(Math.floor(i.currentSlide / i.options.slidesToScroll)).addClass("slick-active"));
  }, e.prototype.visibility = function () {
    var i = this;
    i.options.autoplay && (document[i.hidden] ? i.interrupted = !0 : i.interrupted = !1);
  }, i.fn.slick = function () {
    var i,
        t,
        o = this,
        s = arguments[0],
        n = Array.prototype.slice.call(arguments, 1),
        r = o.length;

    for (i = 0; i < r; i++) {
      if ("object" == _typeof(s) || void 0 === s ? o[i].slick = new e(o[i], s) : t = o[i].slick[s].apply(o[i].slick, n), void 0 !== t) return t;
    }

    return o;
  };
});
"use strict";

/*! WOW - v1.0.2 - 2014-10-28
* Copyright (c) 2014 Matthieu Aussaguel; Licensed MIT */
(function () {
  var a,
      b,
      c,
      d,
      e,
      f = function f(a, b) {
    return function () {
      return a.apply(b, arguments);
    };
  },
      g = [].indexOf || function (a) {
    for (var b = 0, c = this.length; c > b; b++) {
      if (b in this && this[b] === a) return b;
    }

    return -1;
  };

  b = function () {
    function a() {}

    return a.prototype.extend = function (a, b) {
      var c, d;

      for (c in b) {
        d = b[c], null == a[c] && (a[c] = d);
      }

      return a;
    }, a.prototype.isMobile = function (a) {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(a);
    }, a.prototype.addEvent = function (a, b, c) {
      return null != a.addEventListener ? a.addEventListener(b, c, !1) : null != a.attachEvent ? a.attachEvent("on" + b, c) : a[b] = c;
    }, a.prototype.removeEvent = function (a, b, c) {
      return null != a.removeEventListener ? a.removeEventListener(b, c, !1) : null != a.detachEvent ? a.detachEvent("on" + b, c) : delete a[b];
    }, a.prototype.innerHeight = function () {
      return "innerHeight" in window ? window.innerHeight : document.documentElement.clientHeight;
    }, a;
  }(), c = this.WeakMap || this.MozWeakMap || (c = function () {
    function a() {
      this.keys = [], this.values = [];
    }

    return a.prototype.get = function (a) {
      var b, c, d, e, f;

      for (f = this.keys, b = d = 0, e = f.length; e > d; b = ++d) {
        if (c = f[b], c === a) return this.values[b];
      }
    }, a.prototype.set = function (a, b) {
      var c, d, e, f, g;

      for (g = this.keys, c = e = 0, f = g.length; f > e; c = ++e) {
        if (d = g[c], d === a) return void (this.values[c] = b);
      }

      return this.keys.push(a), this.values.push(b);
    }, a;
  }()), a = this.MutationObserver || this.WebkitMutationObserver || this.MozMutationObserver || (a = function () {
    function a() {
      "undefined" != typeof console && null !== console && console.warn("MutationObserver is not supported by your browser."), "undefined" != typeof console && null !== console && console.warn("WOW.js cannot detect dom mutations, please call .sync() after loading new content.");
    }

    return a.notSupported = !0, a.prototype.observe = function () {}, a;
  }()), d = this.getComputedStyle || function (a) {
    return this.getPropertyValue = function (b) {
      var c;
      return "float" === b && (b = "styleFloat"), e.test(b) && b.replace(e, function (a, b) {
        return b.toUpperCase();
      }), (null != (c = a.currentStyle) ? c[b] : void 0) || null;
    }, this;
  }, e = /(\-([a-z]){1})/g, this.WOW = function () {
    function e(a) {
      null == a && (a = {}), this.scrollCallback = f(this.scrollCallback, this), this.scrollHandler = f(this.scrollHandler, this), this.start = f(this.start, this), this.scrolled = !0, this.config = this.util().extend(a, this.defaults), this.animationNameCache = new c();
    }

    return e.prototype.defaults = {
      boxClass: "wow",
      animateClass: "animated",
      offset: 0,
      mobile: !0,
      live: !0
    }, e.prototype.init = function () {
      var a;
      return this.element = window.document.documentElement, "interactive" === (a = document.readyState) || "complete" === a ? this.start() : this.util().addEvent(document, "DOMContentLoaded", this.start), this.finished = [];
    }, e.prototype.start = function () {
      var b, c, d, e;
      if (this.stopped = !1, this.boxes = function () {
        var a, c, d, e;

        for (d = this.element.querySelectorAll("." + this.config.boxClass), e = [], a = 0, c = d.length; c > a; a++) {
          b = d[a], e.push(b);
        }

        return e;
      }.call(this), this.all = function () {
        var a, c, d, e;

        for (d = this.boxes, e = [], a = 0, c = d.length; c > a; a++) {
          b = d[a], e.push(b);
        }

        return e;
      }.call(this), this.boxes.length) if (this.disabled()) this.resetStyle();else for (e = this.boxes, c = 0, d = e.length; d > c; c++) {
        b = e[c], this.applyStyle(b, !0);
      }
      return this.disabled() || (this.util().addEvent(window, "scroll", this.scrollHandler), this.util().addEvent(window, "resize", this.scrollHandler), this.interval = setInterval(this.scrollCallback, 50)), this.config.live ? new a(function (a) {
        return function (b) {
          var c, d, e, f, g;

          for (g = [], e = 0, f = b.length; f > e; e++) {
            d = b[e], g.push(function () {
              var a, b, e, f;

              for (e = d.addedNodes || [], f = [], a = 0, b = e.length; b > a; a++) {
                c = e[a], f.push(this.doSync(c));
              }

              return f;
            }.call(a));
          }

          return g;
        };
      }(this)).observe(document.body, {
        childList: !0,
        subtree: !0
      }) : void 0;
    }, e.prototype.stop = function () {
      return this.stopped = !0, this.util().removeEvent(window, "scroll", this.scrollHandler), this.util().removeEvent(window, "resize", this.scrollHandler), null != this.interval ? clearInterval(this.interval) : void 0;
    }, e.prototype.sync = function () {
      return a.notSupported ? this.doSync(this.element) : void 0;
    }, e.prototype.doSync = function (a) {
      var b, c, d, e, f;

      if (null == a && (a = this.element), 1 === a.nodeType) {
        for (a = a.parentNode || a, e = a.querySelectorAll("." + this.config.boxClass), f = [], c = 0, d = e.length; d > c; c++) {
          b = e[c], g.call(this.all, b) < 0 ? (this.boxes.push(b), this.all.push(b), this.stopped || this.disabled() ? this.resetStyle() : this.applyStyle(b, !0), f.push(this.scrolled = !0)) : f.push(void 0);
        }

        return f;
      }
    }, e.prototype.show = function (a) {
      return this.applyStyle(a), a.className = "" + a.className + " " + this.config.animateClass;
    }, e.prototype.applyStyle = function (a, b) {
      var c, d, e;
      return d = a.getAttribute("data-wow-duration"), c = a.getAttribute("data-wow-delay"), e = a.getAttribute("data-wow-iteration"), this.animate(function (f) {
        return function () {
          return f.customStyle(a, b, d, c, e);
        };
      }(this));
    }, e.prototype.animate = function () {
      return "requestAnimationFrame" in window ? function (a) {
        return window.requestAnimationFrame(a);
      } : function (a) {
        return a();
      };
    }(), e.prototype.resetStyle = function () {
      var a, b, c, d, e;

      for (d = this.boxes, e = [], b = 0, c = d.length; c > b; b++) {
        a = d[b], e.push(a.style.visibility = "visible");
      }

      return e;
    }, e.prototype.customStyle = function (a, b, c, d, e) {
      return b && this.cacheAnimationName(a), a.style.visibility = b ? "hidden" : "visible", c && this.vendorSet(a.style, {
        animationDuration: c
      }), d && this.vendorSet(a.style, {
        animationDelay: d
      }), e && this.vendorSet(a.style, {
        animationIterationCount: e
      }), this.vendorSet(a.style, {
        animationName: b ? "none" : this.cachedAnimationName(a)
      }), a;
    }, e.prototype.vendors = ["moz", "webkit"], e.prototype.vendorSet = function (a, b) {
      var c, d, e, f;
      f = [];

      for (c in b) {
        d = b[c], a["" + c] = d, f.push(function () {
          var b, f, g, h;

          for (g = this.vendors, h = [], b = 0, f = g.length; f > b; b++) {
            e = g[b], h.push(a["" + e + c.charAt(0).toUpperCase() + c.substr(1)] = d);
          }

          return h;
        }.call(this));
      }

      return f;
    }, e.prototype.vendorCSS = function (a, b) {
      var c, e, f, g, h, i;

      for (e = d(a), c = e.getPropertyCSSValue(b), i = this.vendors, g = 0, h = i.length; h > g; g++) {
        f = i[g], c = c || e.getPropertyCSSValue("-" + f + "-" + b);
      }

      return c;
    }, e.prototype.animationName = function (a) {
      var b;

      try {
        b = this.vendorCSS(a, "animation-name").cssText;
      } catch (c) {
        b = d(a).getPropertyValue("animation-name");
      }

      return "none" === b ? "" : b;
    }, e.prototype.cacheAnimationName = function (a) {
      return this.animationNameCache.set(a, this.animationName(a));
    }, e.prototype.cachedAnimationName = function (a) {
      return this.animationNameCache.get(a);
    }, e.prototype.scrollHandler = function () {
      return this.scrolled = !0;
    }, e.prototype.scrollCallback = function () {
      var a;
      return !this.scrolled || (this.scrolled = !1, this.boxes = function () {
        var b, c, d, e;

        for (d = this.boxes, e = [], b = 0, c = d.length; c > b; b++) {
          a = d[b], a && (this.isVisible(a) ? this.show(a) : e.push(a));
        }

        return e;
      }.call(this), this.boxes.length || this.config.live) ? void 0 : this.stop();
    }, e.prototype.offsetTop = function (a) {
      for (var b; void 0 === a.offsetTop;) {
        a = a.parentNode;
      }

      for (b = a.offsetTop; a = a.offsetParent;) {
        b += a.offsetTop;
      }

      return b;
    }, e.prototype.isVisible = function (a) {
      var b, c, d, e, f;
      return c = a.getAttribute("data-wow-offset") || this.config.offset, f = window.pageYOffset, e = f + Math.min(this.element.clientHeight, this.util().innerHeight()) - c, d = this.offsetTop(a), b = d + a.clientHeight, e >= d && b >= f;
    }, e.prototype.util = function () {
      return null != this._util ? this._util : this._util = new b();
    }, e.prototype.disabled = function () {
      return !this.config.mobile && this.util().isMobile(navigator.userAgent);
    }, e;
  }();
}).call(void 0);