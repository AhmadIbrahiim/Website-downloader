(function ($) {
	"use strict";
    
    // Document ready function
    jQuery(document).ready(function($){
        // Show sticker lists
        $('.mgpd-sticker ul').show();
    });
    
// Enhanced masonry initialization for multiple containers
$(window).on('load', function() {
    $('.mgpd-masonry').each(function() {
        var $container = $(this);
        var $wrapper = $container.closest('.mgpd-masonry-container');
        var container = this;
        
        // Wait for images to load before initializing masonry
        imagesLoaded(container, function() {
            try {
                var masonryInstance = new Masonry(container, {
                    itemSelector: '.mgpd-masonry-item',
                    percentPosition: true,
                    gutter: 0,
                    horizontalOrder: true,
                    fitWidth: false,
                    transitionDuration: 0 // Disable animation for initial load
                });
                
                // Store masonry instance for later use
                $container.data('masonry', masonryInstance);
                
                // Force layout calculation after initialization
                setTimeout(function() {
                    masonryInstance.layout();
                    $container.css('height', 'auto');
                }, 100);
                
                // Add loaded class for smooth appearance
                $wrapper.addClass('masonry-loaded');
                
            } catch (error) {
                console.error('MGPD: Error initializing masonry:', error);
            }
        });
    });
    
    // Initialize Premium Features if available
    if (typeof initMGPDPremiumFeatures === 'function') {
        initMGPDPremiumFeatures();
    }
}); 

// Also initialize on DOM ready for faster loading
$(document).ready(function() {
    // Pre-initialize masonry containers
    $('.mgpd-masonry').each(function() {
        var $container = $(this);
        $container.css('min-height', '600px'); // Temporary min-height
    });
});

// Global function to reinitialize masonry (can be called by premium features)
// Add throttling to prevent excessive calls
var mgpdMasonryThrottle = false;

window.mgpdReinitializeMasonry = function() {
    if (mgpdMasonryThrottle) {
        return; // Silent throttle
    }
    
    mgpdMasonryThrottle = true;
    
    setTimeout(function() {
        mgpdMasonryThrottle = false;
    }, 500); // Throttle for 500ms
    
    $('.mgpd-masonry').each(function() {
        var $container = $(this);
        var container = this;
        var masonryInstance = $container.data('masonry');
        
        // Check if masonry is already initialized on this container
        if (masonryInstance) {
            // Masonry is initialized, reload items
            imagesLoaded(container, function() {
                try {
                    // Use direct instance methods instead of jQuery plugin
                    masonryInstance.reloadItems();
                    masonryInstance.layout();
                    
                    // Reset height to auto to allow proper calculation
                    $container.css('height', 'auto');
                    
                } catch (error) {
                    console.error('MGPD: Error reloading masonry:', error);
                }
            });
        } else {
            // Masonry not initialized, initialize it first
            imagesLoaded(container, function() {
                try {
                    var newMasonryInstance = new Masonry(container, {
                        itemSelector: '.mgpd-masonry-item',
                        percentPosition: true,
                        gutter: 0,
                        horizontalOrder: true,
                        fitWidth: false
                    });
                    
                    // Store masonry instance
                    $container.data('masonry', newMasonryInstance);
                    
                    // Add loaded class for smooth appearance
                    $container.closest('.mgpd-masonry-container').addClass('masonry-loaded');
                    
                } catch (error) {
                    console.error('MGPD: Error initializing masonry:', error);
                }
            });
        }
    });
};

}(jQuery));


