//TODO:
// - expose _extended_ settings (first slide, shuffle, transition, duration, etc.)
// - shuffle slides manually (if needed)
// - load the first and set cover mode
// - store cover mode in settings

// http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
function shadeBlend(p,c0,c1) {
    var n=p<0?p*-1:p,u=Math.round,w=parseInt;
    if(c0.length>7){
        var f=c0.split(","),t=(c1?c1:p<0?"rgb(0,0,0)":"rgb(255,255,255)").split(","),R=w(f[0].slice(4)),G=w(f[1]),B=w(f[2]);
        return "rgb("+(u((w(t[0].slice(4))-R)*n)+R)+","+(u((w(t[1])-G)*n)+G)+","+(u((w(t[2])-B)*n)+B)+")"
    }else{
        var f=w(c0.slice(1),16),t=w((c1?c1:p<0?"#000000":"#FFFFFF").slice(1),16),R1=f>>16,G1=f>>8&0x00FF,B1=f&0x0000FF;
        return "#"+(0x1000000+(u(((t>>16)-R1)*n)+R1)*0x10000+(u(((t>>8&0x00FF)-G1)*n)+G1)*0x100+(u(((t&0x0000FF)-B1)*n)+B1)).toString(16).slice(1)
    }
}

function isMobile() {
	return /(Android|webOS|Phone|iPad|iPod|BlackBerry|Windows Phone)/i.test(navigator.userAgent);
}

function arrayToRGB(arr) {
	return "rgb(" + arr.join(",") + ")";	
}

$(document).ready(function() {

	var isDebug = true; // toggle this to turn on / off for debug
	if (isDebug) var debug = console.log.bind(window.console)
	else var debug = function(){};

	var $elmt = $("#content");
	
	// don't use overlay on mobiles
	var overlay = isMobile() ? false : 'js/vegas/overlays/overlay.png';
	
	var slides = [
		//{ src: "photo/slide00.jpg" },
		{ src: "photo/slide01.jpg" },
		{ src: "photo/slide02.jpg" },
		{ src: "photo/slide03.jpg" },
		{ src: "photo/slide04.jpg" },
		{ src: "photo/slide06.jpg" },
		{ src: "photo/slide07.jpg" },
		{ src: "photo/slide08.jpg" },
		{ src: "photo/slide09.jpg" },
		{ src: "photo/slide10.jpg" },
		{ src: "photo/slide11.jpg" },
		{ src: "photo/slide12.jpg" },
		{ src: "photo/slide13.jpg" },
		{ src: "photo/slide14.jpg" },
		{ src: "photo/slide15.jpg" },
		{ src: "photo/slide16.jpg" },
	];

	// vegas
	$elmt.vegas({
		delay: 7000,
		timer: true,
		//overlay: false,
		overlay: overlay,
		cover: true,
		shuffle: true,
		transition: ['fade2', 'fade'],
		transitionDuration: 3000,
		animation: 'random',
		slides: slides,
	}).on('click', function() { 	// fullscreen toggle
		/*if (screenfull.enabled) {
			screenfull.toggle(this);
		}*/
	});
	
	// toggle menu
	var menuHidden = true;
	$('.overlay').hide();
	$(".logo").on('click', toggleMenu);
	function toggleMenu() {
		debug("toggle menu");
		$('.logo').toggleClass('menu-open');
		if (menuHidden) {
			$('.pulsate').hide();
			$('.overlay').fadeIn(500);
		} else $('.overlay').fadeOut(500, function() { $('.pulsate').show(); });
		menuHidden = !menuHidden;
	}
	
	// calc palettes while loading images
	var paletteSize = 4;
	var colorThief = new ColorThief();
	for (i = 0; i < slides.length; i++) {
		var img = new Image();
		var curr = i;
		img.onload = (function(curr) {
			return function() {
				var palette = colorThief.getPalette(this, paletteSize);
				slides[curr].palette = palette;
				slides[curr].size = {w:this.width, h:this.height};
				$elmt.vegas('options', 'slides', slides);
			}
		})(i);
		img.src = slides[i].src;
	}
	
	debug("first slide is ", slides[$elmt.vegas('current')]);
	
	// set colors when changing slide
	$elmt.vegas('options', 'walk', function (idx, slideSettings) {
		
		var slide = slides[idx];
		
		$elmt.find(".vegas-timer .vegas-timer-progress").css("background-color", arrayToRGB(slide.palette[0]));
		$(".site-title span").stop().animate({color: arrayToRGB(slide.palette[2])}, 1500);
		if ($("#palette div").length == 0) {
			for (i = 0; i < slide.palette.length; i++) {
				$("<div>").appendTo("#palette");
			}
		}
		for (i = 0; i < slide.palette.length; i++) {
			$("#palette div:eq(" + i + ")").stop().animate({backgroundColor: arrayToRGB(slide.palette[i])}, 1500);
		}
		/*$(".menu .social li:eq(" + 0 + ") a").css("color", arrayToRGB(slide.palette[0]));
		$(".menu .social li:eq(" + 1 + ") a").css("color", arrayToRGB(slide.palette[1]));
		$(".menu .social li:eq(" + 2 + ") a").css("color", arrayToRGB(slide.palette[3]));*/
		
		setCoverModeFor(idx + 1);
	});
	
	// set cover mode for the specified slide index
	function setCoverModeFor(idx) {
		idx = (idx + slides.length) % slides.length;
		var slide = slides[idx];
		debug("set cover for " + idx, slide);
		if (slide && slide.size) {
			var ratio = slide.size.w / slide.size.h;
			$elmt.vegas('options', 'cover', ratio >= 1);
			debug([idx, slide]);
		}
		else $elmt.vegas('options', 'cover', true);
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
	$(document).on('keydown', function(e) {
		if (e.which == 37) // left
			prev();
		else if (e.which == 39) // right
			next();
	});
	
	// create a simple instance of Hammer
	// by default, it only adds horizontal recognizers
	//delete Hammer.defaults.cssProps.userSelect;
	var hammer = new Hammer($elmt.get(0));
	hammer.get('swipe').set({velocity:.2});
	hammer.on('swipeleft swiperight', function(e) {
		//debug(e.type);
		if (e.type == 'swiperight')
			prev();
		else if (e.type == 'swipeleft')
			next();
	});
});