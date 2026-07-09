/**
 * MGP Bootstrap Replacement
 * Custom Tab and Accordion functionality without Bootstrap dependency
 * With smooth animations
 */
;(function($) {
    'use strict';

    // Animation duration in milliseconds
    var TRANSITION_DURATION = 300;

    // Tab functionality with smooth animation
    function initTabs() {
        // Handle tab clicks for both old Bootstrap and new mgp- classes
        $(document).on('click', '.nav-link, .mgp-nav-link, [data-mgbs-toggle="tab"], [data-toggle="tab"]', function(e) {
            e.preventDefault();
            
            var $this = $(this);
            var target = $this.data('mgbs-target') || $this.data('target') || $this.attr('href');
            
            if (!target || target === '#') return;
            
            var $target = $(target);
            var $tabList = $this.closest('.nav, .mgp-nav, ul');
            var $tabContent = $target.closest('.tab-content, .mgp-tab-content');
            var $currentActive = $tabContent.find('.tab-pane.active, .tab-pane.mgp-active, .mgp-tab-pane.active, .mgp-tab-pane.mgp-active');
            
            // Don't do anything if clicking on already active tab
            if ($this.hasClass('active') || $this.hasClass('mgp-active')) return;
            
            // Remove active class from all nav links in this tab group
            $tabList.find('.nav-link, .mgp-nav-link').removeClass('active mgp-active');
            
            // Add active class to clicked link
            $this.addClass('active mgp-active');
            
            // Animate out current tab
            if ($currentActive.length && $currentActive[0] !== $target[0]) {
                $currentActive.removeClass('mgp-show show');
                
                // After fade out, switch tabs
                setTimeout(function() {
                    $currentActive.removeClass('active mgp-active');
                    
                    // Show new tab
                    $target.addClass('active mgp-active');
                    
                    // Force reflow for animation
                    $target[0].offsetHeight;
                    
                    // Fade in new tab
                    $target.addClass('mgp-show show');
                    
                    // Trigger custom event
                    $this.trigger('shown.mgp.tab', {
                        target: $target
                    });
                }, TRANSITION_DURATION);
            } else {
                // No current active, just show target
                $target.addClass('active mgp-active');
                $target[0].offsetHeight; // Force reflow
                $target.addClass('mgp-show show');
            }
        });
    }

    // Accordion/Collapse functionality with smooth animation
    function initCollapse() {
        // Handle collapse triggers - use event delegation with broader selector
        $(document).on('click', '[data-mgbs-toggle="collapse"], [data-toggle="collapse"], .mgrc-title[data-mgbs-toggle="collapse"]', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            var $this = $(this);
            var target = $this.attr('data-mgbs-target') || $this.attr('data-target') || $this.attr('href');
            
            if (!target) return;
            
            var $target = $(target);
            
            // Check if target exists
            if (!$target.length) return;
            
            var parentSelector = $this.attr('data-mgbs-parent') || $this.attr('data-parent');
            var isExpanded = $this.attr('aria-expanded') === 'true';
            
            // If accordion mode (has parent), close other items with animation
            if (parentSelector) {
                var $parentEl = $(parentSelector);
                if ($parentEl.length) {
                    var $otherCollapses = $parentEl.find('.collapse.show, .collapse.mgp-show, .mgp-collapse.show, .mgp-collapse.mgp-show').not($target);
                    
                    $otherCollapses.each(function() {
                        var $collapse = $(this);
                        var collapseId = $collapse.attr('id');
                        
                        // Get current height
                        var currentHeight = $collapse.outerHeight();
                        
                        // Keep visible during animation
                        $collapse.css({
                            'display': 'block',
                            'height': currentHeight + 'px',
                            'overflow': 'hidden'
                        });
                        
                        // Force reflow before adding transition
                        $collapse[0].offsetHeight;
                        
                        // Add transition and animate to 0
                        $collapse.css({
                            'transition': 'height ' + TRANSITION_DURATION + 'ms ease',
                            'height': '0px'
                        });
                        
                        // Update trigger
                        if (collapseId) {
                            $parentEl.find('[data-mgbs-target="#' + collapseId + '"], [data-target="#' + collapseId + '"]')
                                .addClass('collapsed mgp-collapsed')
                                .attr('aria-expanded', 'false');
                        }
                        
                        // After animation, hide and clean up
                        setTimeout(function() {
                            $collapse.removeClass('show mgp-show');
                            $collapse.css({
                                'height': '',
                                'overflow': '',
                                'transition': '',
                                'display': 'none'
                            });
                        }, TRANSITION_DURATION);
                    });
                }
            }
            
            // Toggle current item with animation
            if (isExpanded) {
                // Collapse: animate height to 0
                var currentHeight = $target.outerHeight();
                
                // Keep it visible during animation
                $target.css({
                    'display': 'block',
                    'height': currentHeight + 'px',
                    'overflow': 'hidden'
                });
                
                // Force reflow before adding transition
                $target[0].offsetHeight;
                
                // Now add transition and animate to 0
                $target.css({
                    'transition': 'height ' + TRANSITION_DURATION + 'ms ease',
                    'height': '0px'
                });
                
                $this.addClass('collapsed mgp-collapsed').attr('aria-expanded', 'false');
                
                // After animation completes, hide and clean up
                setTimeout(function() {
                    $target.removeClass('show mgp-show');
                    $target.css({
                        'height': '',
                        'overflow': '',
                        'transition': '',
                        'display': 'none'
                    });
                    $this.trigger('hidden.mgp.collapse', { target: $target });
                }, TRANSITION_DURATION);
            } else {
                // Expand: animate height from 0 to auto
                // First, show the element to measure its height
                $target.css({
                    'display': 'block',
                    'height': '0px',
                    'overflow': 'hidden',
                    'transition': 'height ' + TRANSITION_DURATION + 'ms ease'
                });
                
                // Get the full height
                var fullHeight = $target[0].scrollHeight;
                
                // Force reflow
                $target[0].offsetHeight;
                
                // Animate to full height
                $target.css('height', fullHeight + 'px');
                
                $this.removeClass('collapsed mgp-collapsed').attr('aria-expanded', 'true');
                
                setTimeout(function() {
                    $target.addClass('show mgp-show');
                    $target.css({
                        'height': '',
                        'overflow': '',
                        'transition': '',
                        'display': ''
                    });
                    $this.trigger('shown.mgp.collapse', { target: $target });
                }, TRANSITION_DURATION);
            }
        });
    }

    // Initialize on document ready
    $(document).ready(function() {
        initTabs();
        initCollapse();
        
        // Make first tab active if none are active
        $('.mpdtab-nav-wrap').each(function() {
            var $navWrap = $(this);
            var $links = $navWrap.find('.nav-link, .mgp-nav-link');
            
            if ($links.filter('.active, .mgp-active').length === 0) {
                $links.first().addClass('active mgp-active');
                
                var firstTarget = $links.first().data('mgbs-target') || $links.first().attr('href');
                if (firstTarget && firstTarget !== '#') {
                    $(firstTarget).addClass('show active mgp-show mgp-active');
                }
            }
        });
        
        // Initialize accordion - show items marked as open
        $('.mgp-collapse.mgp-show, .collapse.show').each(function() {
            var $collapse = $(this);
            $collapse.css('display', 'block');
            var id = $collapse.attr('id');
            
            if (id) {
                $('[data-mgbs-target="#' + id + '"], [data-target="#' + id + '"]')
                    .removeClass('collapsed mgp-collapsed')
                    .attr('aria-expanded', 'true');
            }
        });
        
        // Initialize collapsed items - hide them
        $('.mgp-collapse:not(.mgp-show):not(.show), .collapse:not(.mgp-show):not(.show)').each(function() {
            $(this).css('display', 'none');
        });
    });

    // Expose functions globally if needed
    window.mgpTabs = {
        init: initTabs,
        show: function(tabId) {
            $(tabId).tab('show');
        }
    };

    window.mgpCollapse = {
        init: initCollapse,
        toggle: function(collapseId) {
            var $target = $(collapseId);
            $target.toggleClass('show mgp-show');
        }
    };

})(jQuery);
