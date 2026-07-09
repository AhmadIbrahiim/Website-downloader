(function ($) {
	"use strict";
    
     $(window).on("elementor/frontend/init", function () {
        elementorFrontend.hooks.addAction("frontend/element_ready/mgposts_ticker.default", function (scope, $) {

        	
       
            var mpTicker = $(scope).find(".mptickers");
            var mpPause = mpTicker.data('pause');
            var mpDirection = mpTicker.data('direction');
            
              $(mpTicker).easyTicker({
                  direction: mpDirection,
                  easing: 'swing',
                  speed: 'slow',
                  interval: 2000,
                  visible: 1,
                  mousePause: mpPause,
                  height: 'auto',
              });
              $('.mgpd-sticker ul').show();
            
        });
    })
   


}(jQuery));	


