/**
 * Magical Posts Display - Premium Features JavaScript
 * 
 * Handles AJAX filtering, infinite scroll, and enhanced hover effects
 * 
 * @package Magical Posts Display
 * @version 1.0.0
 */

jQuery(document).ready(function($) {
    'use strict';
    
    // Check if mgpd_ajax object exists
    if (typeof mgpd_ajax === 'undefined') {
        return;
    }
    
    // Check if required dependencies are loaded
    if (typeof imagesLoaded === 'undefined') {
        console.error('MGPD: imagesLoaded library not found');
    }
    
    if (typeof Masonry === 'undefined' && typeof $.fn.masonry === 'undefined') {
        console.error('MGPD: Masonry library not found');
    }
    
    console.log('MGPD: Premium features script loaded', mgpd_ajax);
    
    /**
     * AJAX Category Filter Functionality
     */
    if (mgpd_ajax.ajax_filter_enabled) {
        $('.mgpd-filter-btn').on('click', function(e) {
            e.preventDefault();
            
            var $button = $(this);
            var category = $button.data('category');
            var $container = $('#mgp-items');
            var $filterBtns = $('.mgpd-filter-btn');
            
            // Update active state
            $filterBtns.removeClass('active');
            $button.addClass('active');
            
            // Show loading state
            $container.addClass('mgpd-loading');
            
            // Prepare AJAX data
            var ajaxData = {
                action: 'mgpd_ajax_filter_posts',
                category: category,
                settings: mgpd_ajax.settings,
                nonce: mgpd_ajax.nonce,
                post_type: mgpd_ajax.post_type
            };
            
            // Make AJAX request
            $.ajax({
                url: mgpd_ajax.ajaxurl,
                type: 'POST',
                data: ajaxData,
                timeout: 30000, // 30 seconds timeout
                success: function(response) {
                    if (response && response.success && response.data) {
                        // Update content
                        $container.find('.mgp-row').html(response.data);
                        $container.removeClass('mgpd-loading');
                        
                        // Reinitialize masonry if enabled
                        if (mgpd_ajax.layout_type === 'masonry') {
                            setTimeout(function() {
                                if (typeof window.mgpdReinitializeMasonry === 'function') {
                                    window.mgpdReinitializeMasonry();
                                } else {
                                    console.warn('MGPD: mgpdReinitializeMasonry function not found');
                                    // Fallback initialization
                                    var $masonry = $container.find('.mgpd-masonry');
                                    if ($masonry.length && typeof $.fn.masonry !== 'undefined') {
                                        // Check if masonry is initialized before calling methods
                                        if ($masonry.data('masonry')) {
                                            var masonryInstance = $masonry.data('masonry');
                                            masonryInstance.reloadItems();
                                            masonryInstance.layout();
                                        } else {
                                            // Initialize masonry first
                                            imagesLoaded($masonry[0], function() {
                                                var newMasonryInstance = new Masonry($masonry[0], {
                                                    itemSelector: '.mgpd-masonry-item',
                                                    percentPosition: true,
                                                    gutter: 0,
                                                    horizontalOrder: true
                                                });
                                                $masonry.data('masonry', newMasonryInstance);
                                            });
                                        }
                                    }
                                }
                            }, 300); // Increased delay
                        }
                        
                        // Reinitialize hover effects
                        initHoverEffects();
                        
                        // Reinitialize VenoBox for videos
                        if (typeof jQuery.fn.venobox !== 'undefined') {
                            $container.find('.venobox').venobox();
                        }
                        
                    } else {
                        $container.removeClass('mgpd-loading');
                        showError(mgpd_ajax.texts.error_loading);
                    }
                },
                error: function(xhr, status, error) {
                    $container.removeClass('mgpd-loading');
                    console.error('AJAX Filter Error:', error);
                    showError(mgpd_ajax.texts.error_loading);
                }
            });
        });
    }
    
    /**
     * Infinite Scroll Functionality
     */
    if (mgpd_ajax.infinite_scroll_enabled && mgpd_ajax.max_pages > 1) {
        var loading = false;
        var currentPage = parseInt(mgpd_ajax.current_page);
        var maxPages = parseInt(mgpd_ajax.max_pages);
        
        $(window).on('scroll.mgpd', function() {
            if (loading || currentPage >= maxPages) {
                return;
            }
            
            var $trigger = $('.mgpd-infinite-scroll-trigger');
            if (!$trigger.length) {
                return;
            }
            
            var triggerTop = $trigger.offset().top;
            var windowBottom = $(window).scrollTop() + $(window).height();
            
            // Check if trigger is in viewport
            if (windowBottom >= triggerTop - 100) { // 100px buffer
                loading = true;
                currentPage++;
                
                var $spinner = $('.mgpd-loading-spinner');
                $spinner.show();
                
                // Prepare AJAX data
                var ajaxData = {
                    action: 'mgpd_infinite_scroll_posts',
                    page: currentPage,
                    settings: mgpd_ajax.settings,
                    nonce: mgpd_ajax.nonce,
                    post_type: mgpd_ajax.post_type
                };
                
                // Make AJAX request
                $.ajax({
                    url: mgpd_ajax.ajaxurl,
                    type: 'POST',
                    data: ajaxData,
                    timeout: 30000,
                    success: function(response) {
                        if (response && response.success && response.data) {
                            var $newItems = $(response.data);
                            var $container = $('#mgp-items .mgp-row');
                            
                            // Append new items
                            $container.append($newItems);
                            
                            // Reinitialize masonry if enabled
                            if (mgpd_ajax.layout_type === 'masonry') {
                                setTimeout(function() {
                                    if (typeof window.mgpdReinitializeMasonry === 'function') {
                                        window.mgpdReinitializeMasonry();
                                    } else {
                                        console.warn('MGPD: mgpdReinitializeMasonry function not found for infinite scroll');
                                        var $masonry = $('#mgp-items .mgpd-masonry');
                                        if ($masonry.length && typeof $.fn.masonry !== 'undefined') {
                                            // Check if masonry is initialized before calling methods
                                            if ($masonry.data('masonry')) {
                                                var masonryInstance = $masonry.data('masonry');
                                                $masonry.append($newItems);
                                                masonryInstance.appended($newItems);
                                                masonryInstance.layout();
                                            } else {
                                                // Initialize masonry first, then append
                                                imagesLoaded($masonry[0], function() {
                                                    var newMasonryInstance = new Masonry($masonry[0], {
                                                        itemSelector: '.mgpd-masonry-item',
                                                        percentPosition: true,
                                                        gutter: 0,
                                                        horizontalOrder: true
                                                    });
                                                    $masonry.data('masonry', newMasonryInstance);
                                                });
                                            }
                                        }
                                    }
                                }, 300); // Increased delay to prevent excessive calls
                            }
                            
                            // Reinitialize hover effects for new items
                            initHoverEffects($newItems);
                            
                            // Reinitialize VenoBox for videos in new items
                            if (typeof jQuery.fn.venobox !== 'undefined') {
                                $newItems.find('.venobox').venobox();
                            }
                        }
                        
                        $spinner.hide();
                        loading = false;
                    },
                    error: function(xhr, status, error) {
                        console.error('Infinite Scroll Error:', error);
                        $spinner.hide();
                        loading = false;
                        currentPage--; // Reset page counter on error
                    }
                });
            }
        });
    }
    
    /**
     * Enhanced Hover Effects
     */
    function initHoverEffects($context) {
        if (!mgpd_ajax.hover_effects_enabled) {
            return;
        }
        
        var $cards = $context ? $context.find('.mgp-card') : $('.mgp-card');
        
        $cards.off('mouseenter.mgpd mouseleave.mgpd').on('mouseenter.mgpd', function() {
            $(this).addClass('mgpd-hover-active');
        }).on('mouseleave.mgpd', function() {
            $(this).removeClass('mgpd-hover-active');
        });
    }
    
    /**
     * Show Error Message
     */
    function showError(message) {
        // Create error notification
        var $error = $('<div class="mgpd-error-message">' + message + '</div>');
        $error.css({
            'position': 'fixed',
            'top': '20px',
            'right': '20px',
            'background': '#f44336',
            'color': '#fff',
            'padding': '12px 20px',
            'border-radius': '4px',
            'z-index': '9999',
            'box-shadow': '0 2px 10px rgba(0,0,0,0.2)'
        });
        
        $('body').append($error);
        
        // Remove after 5 seconds
        setTimeout(function() {
            $error.fadeOut(300, function() {
                $error.remove();
            });
        }, 5000);
    }
    
    /**
     * Initialize on page load
     */
    initHoverEffects();
    
    /**
     * Debug mode logging
     */
    if (window.console && typeof console.log === 'function') {
        console.log('MGPD Premium Features Initialized:', {
            ajax_filter: mgpd_ajax.ajax_filter_enabled,
            infinite_scroll: mgpd_ajax.infinite_scroll_enabled,
            hover_effects: mgpd_ajax.hover_effects_enabled,
            layout_type: mgpd_ajax.layout_type,
            current_page: mgpd_ajax.current_page,
            max_pages: mgpd_ajax.max_pages
        });
    }
});

/**
 * Utility function to reinitialize premium features after dynamic content changes
 * Can be called by other scripts if needed
 */
window.mgpdReinitialize = function() {
    if (typeof jQuery !== 'undefined') {
        jQuery(document).trigger('mgpd:reinitialize');
    }
};