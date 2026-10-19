/**
 * Mobile Sidebar Toggle
 * Vanilla JS - no dependencies
 */

(function() {
  'use strict';

  // Elements
  const menuBtn = document.querySelector('.header__btn--menu');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const body = document.body;

  // State
  let isOpen = false;

  // Open sidebar
  function openSidebar() {
    isOpen = true;
    sidebar.classList.add('sidebar--open');
    overlay.classList.add('sidebar-overlay--visible');
    body.classList.add('sidebar-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    // Trap focus
    trapFocus(sidebar);
  }

  // Close sidebar
  function closeSidebar() {
    isOpen = false;
    sidebar.classList.remove('sidebar--open');
    overlay.classList.remove('sidebar-overlay--visible');
    body.classList.remove('sidebar-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    // Return focus to menu button
    menuBtn.focus();
  }

  // Toggle sidebar
  function toggleSidebar() {
    if (isOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  // Focus trapping for accessibility
  function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleTabKey(e) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    }

    element.addEventListener('keydown', handleTabKey);
    // Store handler for cleanup if needed
    element._trapFocusHandler = handleTabKey;

    // Focus first element
    if (firstFocusable) {
      firstFocusable.focus();
    }
  }

  // Event listeners
  if (menuBtn) {
    menuBtn.addEventListener('click', toggleSidebar);
  }

  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) {
      closeSidebar();
    }
  });

  // Close sidebar when clicking a chat item (mobile UX)
  const chatButtons = document.querySelectorAll('.chat-btn');
  chatButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      if (window.innerWidth < 1024) {
        closeSidebar();
      }
    });
  });

  // Handle resize - close sidebar if switched to desktop
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      if (window.innerWidth >= 1024 && isOpen) {
        closeSidebar();
      }
    }, 150);
  });

  // Switcher tabs (visual only, no actual panel switching in MVP)
  const switcherItems = document.querySelectorAll('.switcher__item');
  switcherItems.forEach(item => {
    item.addEventListener('click', function() {
      const switcher = this.closest('.switcher');
      if (!switcher) return;

      switcher.querySelectorAll('.switcher__item').forEach(btn => {
        btn.classList.remove('switcher__item--active');
        btn.setAttribute('aria-selected', 'false');
      });
      this.classList.add('switcher__item--active');
      this.setAttribute('aria-selected', 'true');
    });
  });

  // Selector buttons (visual feedback only)
  const selectors = document.querySelectorAll('.selector');
  selectors.forEach(selector => {
    selector.addEventListener('click', function() {
      // Could add dropdown logic here in future
      console.log('Selector clicked:', this.querySelector('.selector__text').textContent);
    });
  });

  // Form submissions (prevent default for demo)
  const forms = document.querySelectorAll('.input-message');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const input = this.querySelector('.input-message__field');
      if (input.value.trim()) {
        console.log('Submit:', input.value.trim());
        input.value = '';
      }
    });
  });

})();