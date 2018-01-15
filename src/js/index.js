"use strict";

//TODO:
// - expose _extended_ settings (first slide, shuffle, transition, duration, etc.)
// - shuffle slides manually (if needed)
// - load the first and set cover mode
// - store cover mode in settings

// http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
function shadeBlend(p, c0, c1) {
	var n = p < 0 ? p * -1 : p,
	u = Math.round,
	w = parseInt;
	if (c0.length > 7) {
		var f = c0.split(","),
		t = (c1 ? c1 : p < 0 ? "rgb(0,0,0)" : "rgb(255,255,255)").split(","),
		R = w(f[0].slice(4)),
		G = w(f[1]),
		B = w(f[2]);
		return "rgb(" + (u((w(t[0].slice(4)) - R) * n) + R) + "," + (u((w(t[1]) - G) * n) + G) + "," + (u((w(t[2]) - B) * n) + B) + ")"
	} else {
		var f = w(c0.slice(1), 16),
		t = w((c1 ? c1 : p < 0 ? "#000000" : "#FFFFFF").slice(1), 16),
		R1 = f >> 16,
		G1 = f >> 8 & 0x00FF,
		B1 = f & 0x0000FF;
		return "#" + (0x1000000 + (u(((t >> 16) - R1) * n) + R1) * 0x10000 + (u(((t >> 8 & 0x00FF) - G1) * n) + G1) * 0x100 + (u(((t & 0x0000FF) - B1) * n) + B1)).toString(16).slice(1)
	}
}

var debugMode = false; // toggle debug (also enabled passing '?debug')
var debug;
var slides;
var $elmt;
var defaultPalette = [[176, 169, 135], [196, 189, 155], [132, 127, 100], [202, 188, 178], [103, 110, 82], [154, 165, 132], [82, 92, 112], [142, 147, 162], [164, 92, 60], [46, 50, 37], [255, 250, 250]];
var preCalcedPalettes = [[[85, 72, 30], [127, 190, 234], [214, 229, 231], [99, 153, 188]], [[158, 164, 170], [48, 95, 109], [121, 106, 59], [81, 74, 94]], [[60, 52, 36], [211, 198, 176], [156, 156, 148], [152, 146, 151]], [[118, 104, 83], [204, 182, 159], [187, 171, 156], [187, 180, 155]], [[168, 168, 168], [37, 37, 37], [76, 76, 76], [84, 84, 84]], [[146, 142, 139], [47, 39, 34], [75, 55, 46], [85, 70, 57]], [[73, 72, 71], [178, 170, 160], [155, 164, 163], [153, 156, 164]], [[176, 158, 138], [44, 50, 49], [127, 96, 50], [106, 58, 47]], [[198, 181, 172], [78, 77, 72], [124, 88, 67], [153, 84, 96]], [[76, 79, 74], [205, 193, 187], [159, 160, 168], [163, 164, 155]], [[51, 57, 27], [190, 193, 184], [147, 157, 149], [140, 145, 144]], [[87, 73, 42], [208, 172, 105], [163, 171, 166], [121, 143, 156]], [[70, 73, 65], [197, 196, 196], [134, 151, 173], [156, 180, 203]], [[66, 68, 49], [196, 188, 155], [154, 165, 132], [143, 147, 162]], [[52, 54, 54], [186, 179, 179], [115, 139, 159], [146, 156, 161]], [[44, 71, 93], [192, 183, 171], [145, 172, 186], [139, 162, 188]], [[29, 70, 113], [180, 170, 153], [137, 174, 201], [124, 161, 198]], [[87, 87, 85], [201, 187, 184], [171, 172, 172], [160, 158, 173]], [[153, 132, 107], [229, 223, 215], [54, 53, 48], [83, 57, 35]], [[54, 59, 61], [194, 192, 193], [141, 146, 157], [146, 156, 164]], [[186, 171, 159], [56, 58, 51], [98, 95, 60], [93, 69, 58]], [[219, 199, 198], [125, 87, 86], [132, 95, 122], [124, 116, 116]], [[58, 68, 54], [196, 190, 187], [141, 147, 160], [147, 164, 142]]];

function isMobile() {
	return /(Android|webOS|Phone|iPad|iPod|BlackBerry|Windows Phone)/i.test(navigator.userAgent);
}

function arrayToRGB(arr) {
	return "rgb(" + arr.join(",") + ")";
}

function shuffle(a) {
	var j,
	x,
	i;
	for (i = a.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		x = a[i];
		a[i] = a[j];
		a[j] = x;
	}
}

function parseQueryString(query) {
	var vars = query.split("&");
	var query_string = {};
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split("=");
		// If first entry with this name
		if (typeof query_string[pair[0]] === "undefined") {
			query_string[pair[0]] = decodeURIComponent(pair[1]);
			// If second entry with this name
		} else if (typeof query_string[pair[0]] === "string") {
			var arr = [query_string[pair[0]], decodeURIComponent(pair[1])];
			query_string[pair[0]] = arr;
			// If third or later entry with this name
		} else {
			query_string[pair[0]].push(decodeURIComponent(pair[1]));
		}
	}
	return query_string;
}

function downloadAs(fullpath, type = 'image/jpeg', suggestedName) {
	debug("downloading '" + fullpath + "' (type:" + type + ")...");

	try {
		var req = new XMLHttpRequest();
		req.open("GET", fullpath, true);
		req.responseType = "arraybuffer";

		req.onload = function (evt) {
			try {
				suggestedName = suggestedName || fullpath.split('/').pop();
				var blob = new Blob([req.response], {
						type: type
					});
				saveAs(blob, suggestedName);
			} catch (e) {
				window.open("data:" + type + "," + encodeURIComponent(data), '_blank', '');
			}
			debug("DONE: downloaded '" + fullpath + "' (type:" + type + ")...");		};

		req.onerror = function () {
			console.error("ERROR downloading '" + fullpath + "'");
		}

		req.send();
	} catch (e) {
		console.error("ERROR downloading '" + fullpath + "'");
	}
}

var stopwatch = new StopWatch(" - ");
function StopWatch(prefix = "") {
	var prefix = prefix;
	var timings = {};
	var t0 = Date.now();

	var start = function (name, msg) {
		if (name) {
			timings[name] = {
				t0: Date.now(),
				msg: msg
			}
		} else {
			t0 = Date.now();
		}
	}

	var end = function (name) {
		var timing = timings[name];

		if (!timing && name) {
			debug(prefix + "Timing for '" + name + "' not found!");
			return;
		}

		if (timing) {
			timing.delta = Date.now() - timing.t0;
			debug(prefix + timing.msg + ' (' + formatDiff(timing.delta) + 's)');
		} else {
			debug(prefix + 'elapsed ' + formatDiff(Date.now() - t0) + 's');
		}
	}

	var getTimingsDict = function () {
		return timings;
	}

	var formatDiff = function (diff) {
		return (diff / 1000.).toFixed(2);
	}

	return {
		start: start,
		end: end,
		getTimingsDict: getTimingsDict,
		t0: t0,
	};
}

function urlParamToBool(urlParams, param, defaultValue) {
	if (urlParams.hasOwnProperty(param)) {
		var val = urlParams[param];
		if (val === 'undefined' || val.trim().toLowerCase() === 'true' || (val == "1") || (+val == 1))
			return true;
		else
			return false;
	} else {
		return defaultValue;
	}
}

$(document).ready(function () {
	var urlParams = parseQueryString(location.search.substr(1));
	console.info("urlParams", urlParams);

	if (urlParamToBool(urlParams, 'noui', false)) {
		$('.site-branding, #footer, #top-buttons').css('display', 'none');
	}
	
	debugMode = urlParamToBool(urlParams, 'debug', debugMode);
	
	// photo overlay & animations
	var overlay = urlParamToBool(urlParams, 'overlay', false);
	var kenburns = [
		'kenburns',
		'kenburnsLeft', 'kenburnsRight',
		'kenburnsUp', 'kenburnsUpLeft', 'kenburnsUpRight',
		'kenburnsDown', 'kenburnsDownLeft', 'kenburnsDownRight'
	];
	var invertedKenburns = kenburns.map(function (name) { return name + '-in'; });
	var randomAnimations = invertedKenburns;
	var animation = urlParamToBool(urlParams, 'animation', false) ? randomAnimations : false;
	
	if (debugMode) {
		debug = console.log.bind(window.console);
	} else
		debug = function () {};
	console.info('DEBUG', debugMode);
	console.info('overlay', overlay);
	console.info('animation', animation);
		// remove unneeded nodes in kiosk mode	if (urlParamToBool(urlParams, 'kiosk', false)) {		$('#top-buttons').hide();		$('#help-controls').text('www.fotoadrianonicastro.it');	};	
	$elmt = $("#content");

	slides = [
		{ src: "photo/2017/opt/photo100.jpg" },
		{ src: "photo/2017/opt/photo101.jpg" },
		{ src: "photo/2017/opt/photo102.jpg" },
		{ src: "photo/2017/opt/photo103.jpg" },
		{ src: "photo/2017/opt/photo104.jpg" },
		{ src: "photo/2017/opt/photo105.jpg" },
		{ src: "photo/2017/opt/photo106.jpg" },
		{ src: "photo/2017/opt/photo107.jpg" },
		{ src: "photo/2017/opt/photo108.jpg" },
		{ src: "photo/2017/opt/photo109.jpg" },
		{ src: "photo/2017/opt/photo110.jpg" },
		{ src: "photo/2017/opt/photo111.jpg" },
		{ src: "photo/2017/opt/photo112.jpg" },
		{ src: "photo/2017/opt/photo113.jpg" },
		{ src: "photo/2017/opt/photo114.jpg" },
		{ src: "photo/2017/opt/photo115.jpg" },
		{ src: "photo/2017/opt/photo116.jpg" },
		{ src: "photo/2017/opt/photo117.jpg" },
		{ src: "photo/2017/opt/photo118.jpg" },
		{ src: "photo/2017/opt/photo119.jpg" },
		{ src: "photo/2017/opt/photo120.jpg" },
		{ src: "photo/2017/opt/photo121.jpg" },
		{ src: "photo/2017/opt/photo122.jpg"},
	];
	for (var i = 0; i < slides.length; i++) { // save idx before shuffling
		slides[i].idx = i;
	};

	// shuffle slides after nFirstSlides
	var fromIdx = +urlParams['from'] || 0;
	var nFirstSlides = 1;
	var firstSlides = slides.splice(fromIdx, nFirstSlides);
	// reorder slides to obtain [nFirstSlides...slidesAfter...slidesBefore]
	slides = slides.slice(fromIdx + nFirstSlides - 1).concat(slides.slice(0, fromIdx));
	if (urlParamToBool(urlParams, 'shuffle', true))
		shuffle(slides);
	slides = firstSlides.concat(slides);
	if (urlParams['n']) {
		slides = slides.slice(0, parseInt(urlParams['n']));
	}
	debug('shuffled', slides.map(function (item, i) {
		return item.src.split('/').pop();
	}));
	
	// vegas
	$elmt.vegas({
		delay: 7000,
		timer: true,
		overlay: true, // but starts hidden
		cover: true,
		shuffle: false, // done manually
		transition: ['fade2', 'fade'],
		transitionDuration: 3000,
		animation: animation,
		slides: slides,
	}).on('click', function () { // full screen
		/*if (screenfull.enabled) {
		screenfull.toggle(this);
		}*/
	});
	
	// hide vegas timer if only 1 slide
	if (slides.length <= 1) $(".vegas-timer").addClass("hidden");
	
	// toggle photo overlay
	var $photoOverlay = $elmt.find('.vegas-overlay');
	$photoOverlay.css('display', (overlay ? 'inline-block' : 'none'));

	// split .site-title h1 initials into spans
	var $author = $('h1.site-title a');
	var withSpanInitials = $author.text().replace((/\b\w/g), "<span>$&</span>");
	$author.html(withSpanInitials);

	// toggle menu
	var menuHidden = true;
	$('.overlay').hide();
	function toggleMenu() {
		debug("toggle menu");
		$('.logo').toggleClass('menu-open');
		if (menuHidden) {
			$('.logo-anim .pulsate').hide();
			$('.overlay').css('visibility', 'initial');
			$('.overlay').fadeIn(500);
		} else {
			$('.overlay').fadeOut(500, function() {
				$('.logo-anim').show();
			});
		}
		menuHidden = !menuHidden;
	}
	$(".logo").on('click', toggleMenu);

	// calc palettes while loading images
	var paletteSize = 4;
	var paletteQuality = undefined;
	var colorThief = new ColorThief();
	var usePalette = urlParams['palette'] == 'recalc' ? 'recalc' : urlParamToBool(urlParams, 'palette', true);
	if (urlParams['palette'] == 'recalc') preCalcedPalettes = [];
	for (var i = 0; i < slides.length; i++) {
		var img = new Image();
		var curr = i;
		var cnt = slides.length;
		img.onload = (function (curr) {
			return function () {
				stopwatch.end("LOAD_" + slides[curr].src);

				if (usePalette) {
					stopwatch.start("PAL_" + slides[curr].src, "Palette " + slides[curr].src);
					var palette = preCalcedPalettes[slides[curr].idx];
					if (!palette)
						palette = colorThief.getPalette(this, paletteSize, paletteQuality);

					slides[curr].palette = palette;
					stopwatch.end("PAL_" + slides[curr].src);
				}

				slides[curr].size = {
					w: this.width,
					h: this.height
				};
				$elmt.vegas('options', 'slides', slides);

				if (slides[curr].idx == fromIdx) { // first photo loaded
					debug("1st foto loaded", "idx: " + fromIdx);
					$(".logo-anim").removeClass("spinner-double").addClass("pulsate");
				}
				
				if (--cnt == 0) { // finished loading
					// print calced palettes
					if (usePalette && debugMode) {
						var allPalettes = [];
						for (var s = 0; s < slides.length; s++) {
							allPalettes.push(slides[s].palette);
						}
						debug.apply(null, ["palettes:", JSON.stringify(allPalettes)]);
					}
					debug("All images loaded");
					stopwatch.end();
				}
			}
		})(i);
		img.src = slides[i].src;
		stopwatch.start("LOAD_" + slides[i].src, "Loaded " + slides[i].src);
	}

	debug("first slide is ", slides[$elmt.vegas('current')], "n", nFirstSlides);

	// set colors when changing slide
	var firstSlideEver = true;
	$elmt.vegas('options', 'animation', null); // no animation for first slide ever
	
	$elmt.vegas('options', 'walk', function (idx, slideSettings) {

		// make download button visible
		$("#top-buttons #photo-download").addClass("icon-visible");
	
		if (idx != 0 && $('#help-controls').css('visibility') === 'hidden') {
			debug('show help controls');
			$('#help-controls').css('visibility', 'initial').show().hide().fadeIn(3000); //css('visibility', 'initial');
		}

		// reset animation after first slide
		if (firstSlideEver) {
			debug(animation);
			$elmt.vegas('options', 'animation', animation);
			firstSlideEver = false;
		}
		
		var slide = slides[idx];		var filepath = slide.src.split('/');		var filename = filepath.pop();		filepath = filepath.join('/');		// help controls
		$('#help-controls .slide-idx').text(idx + '/' + (slides.length - 1));
		$('#help-controls .slide-name').text(':' + filename);

		// full photo download
		$("#photo-download")
		.attr("data-href", "/" + (filepath + "/" + filename).replace("/opt/", "/full-"))
		.off('click')		.on('click', function (evt) {
			var fullpath = $(this).attr("data-href");
			downloadAs(fullpath);
		});

		// palette
		if (!slide.palette)
			debug('No palette yet for ' + slide.src + '. Using default.');
		var currPalette = slide.palette || defaultPalette;
		while (currPalette.length < paletteSize) { // fix for bug in color-thief not always returning exactly 'paletteSize' colors
			currPalette.push(currPalette[currPalette.length - 1]);
		}

		var randIdx = Math.floor(Math.random() * paletteSize);
		var randPaletteColor = arrayToRGB(currPalette[randIdx]);
		var msg = "";
		var styles = [];
		for (var c = 0; c < paletteSize; c++) {
			msg += '%c ' + c + ' ';
			styles.push('background: ' + arrayToRGB(currPalette[c]));
			if (randIdx == c)
				styles[c] += '; color:white;';
		}
		debug.apply(null, [slide.src.split('/').pop() + ' ' + msg].concat(styles));

		$elmt.find(".vegas-timer .vegas-timer-progress").css("background-color", arrayToRGB(currPalette[0]));
		$(".site-title span").stop().animate({
			color: randPaletteColor
		}, 1500);
		/*if ($("#palette div").length == 0) {
		for (var i = 0; i < currPalette.length; i++) {
		$("<div>").appendTo("#palette");
		}
		}
		for (var i = 0; i < currPalette.length; i++) {
		$("#palette div:eq(" + i + ")").stop().animate({backgroundColor: arrayToRGB(currPalette[i])}, 1500);
		}*/
		/*$(".menu .social li:eq(" + 0 + ") a").css("color", arrayToRGB(currPalette[0]));
		$(".menu .social li:eq(" + 1 + ") a").css("color", arrayToRGB(currPalette[1]));
		$(".menu .social li:eq(" + 2 + ") a").css("color", arrayToRGB(currPalette[3]));*/

		setCoverModeFor(idx + 1);
	});
	debug('Vegas inited!');

	// set cover mode for the specified slide index
	function setCoverModeFor(idx) {
		idx = (idx + slides.length) % slides.length;
		var slide = slides[idx];
		debug("set cover for " + idx, slide);
		if (slide && slide.size) {
			var ratio = slide.size.w / slide.size.h;
			$elmt.vegas('options', 'cover', ratio > 1);
		} else
			$elmt.vegas('options', 'cover', true);
	}

	// next slide
	function next() {
		var succIdx = $elmt.vegas('current') + 1;
		setCoverModeFor(succIdx);
		$elmt.vegas('next');
	}

	// prev slide
	function prev() {
		var succIdx = $elmt.vegas('current') - 1;
		setCoverModeFor(succIdx);
		$elmt.vegas('previous');
	}

	// key navigation
	$(document).on('keydown', function (e) {
		if (e.which == 37) // left
			prev();
		else if (e.which == 39) // right
			next();
		else {
			debug("key", e.which);
			if (e.which == 79) { // 'o' overlay
				debug("toggle overlay");
				var $overlay = $elmt.find('.vegas-overlay');
				var visible = $overlay.css('display') != 'none';
				$overlay.css('display', (visible ? 'none' : 'inline-block'));
			}
			if (e.which == 32) { // 'space' pause
				debug("toggle pause");
				$elmt.vegas('toggle');
				e.preventDefault();
			}
			if (e.which == 65) { // 'a' animation
				debug("toggle animation");
				var currAnimation = $elmt.vegas('options', 'animation');
				$elmt.vegas('options', 'animation', currAnimation ? null : randomAnimations);
				next();
			}
			if (e.which == 77) { // 'm' toggle map
				debug("toggle map");
				$('.map-toggle').click();
			}
		}
	});

	// create a simple instance of Hammer
	// by default, it only adds horizontal recognizers
	//delete Hammer.defaults.cssProps.userSelect;
	var hammer = new Hammer($elmt.get(0));
	hammer.get('swipe').set({
		velocity: .2
	});
	hammer.on('swipeleft swiperight', function (e) {
		//debug(e.type);
		if (e.type == 'swiperight')
			prev();
		else if (e.type == 'swipeleft')
			next();
	});
});