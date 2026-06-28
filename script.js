/* ============================================
   RubyHome — script.js
   Organized into IIFE modules with early-return guards.
   Each module no-ops if its root elements are missing,
   so the file is safe to run on any page (index / privacy).
   Fixes B-1 (slider crash on privacy.html breaking nav).
   ============================================ */

/* Shared constants — "magic numbers" centralized (q-4) */
const SCROLL_OFFSET = 100;
const SLIDER_GAP = 30;
const SLIDER_DESKTOP_BREAKPOINT = 768;
const DRAG_THRESHOLD_MOUSE = 60;
const DRAG_THRESHOLD_TOUCH = 50;
const MODAL_OPEN_DELAY = 50;
const SUCCESS_AUTO_CLOSE_DELAY = 3000;
const SUCCESS_OPEN_DELAY = 300;
const RESIZE_DEBOUNCE = 150;
const TOAST_VISIBLE_DELAY = 3500;
const TOAST_REMOVE_DELAY = 300;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================
   AOS INIT + FALLBACK
   ============================================ */
(() => {
  if (window.AOS) {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: true,
      offset: 80,
      delay: 0,
      disable: () => prefersReducedMotion,
    });
  } else {
    /* AOS library failed to load — reveal all animated elements */
    document.documentElement.classList.add('aos-fallback');
  }
})();

/* ============================================
   SHARED DIALOG HELPERS
   Focus trap (C-4), focus return (C-5), inert on closed dialogs (C-3).
   ============================================ */
const getFocusable = (root) => Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
  if (el.hasAttribute('disabled')) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
});

const setInert = (root, inert) => {
  if (!root) return;
  if (inert) {
    root.setAttribute('aria-hidden', 'true');
    if ('inert' in HTMLElement.prototype) {
      root.inert = true;
    } else {
      root.querySelectorAll(FOCUSABLE_SELECTOR).forEach((el) => {
        if (el.dataset.tabindexRestored === undefined) {
          const prev = el.getAttribute('tabindex');
          el.dataset.tabindexRestored = prev === null ? 'none' : prev;
        }
        el.setAttribute('tabindex', '-1');
      });
    }
  } else {
    root.setAttribute('aria-hidden', 'false');
    if ('inert' in HTMLElement.prototype) {
      root.inert = false;
    } else {
      root.querySelectorAll(FOCUSABLE_SELECTOR).forEach((el) => {
        if (el.dataset.tabindexRestored !== undefined) {
          const prev = el.dataset.tabindexRestored;
          if (prev === 'none') {
            el.removeAttribute('tabindex');
          } else {
            el.setAttribute('tabindex', prev);
          }
          delete el.dataset.tabindexRestored;
        }
      });
    }
  }
};

const trapFocus = (root, event) => {
  if (event.key !== 'Tab') return;
  const focusable = getFocusable(root);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey) {
    if (active === first || !root.contains(active)) {
      event.preventDefault();
      last.focus();
    }
  } else if (active === last) {
    event.preventDefault();
    first.focus();
  }
};

/* ============================================
   MODAL + SUCCESS MODAL
   ============================================ */
(() => {
  const modal = document.getElementById('modal');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose = document.getElementById('modalClose');
  const modalForm = document.getElementById('modalForm');

  const successModal = document.getElementById('successModal');
  const successModalOverlay = document.getElementById('successModalOverlay');
  const successModalClose = document.getElementById('successModalClose');

  if (!modal || !modalForm) return;

  let lastFocused = null;

  const openModal = () => {
    lastFocused = document.activeElement;
    modal.classList.add('modal--open');
    setInert(modal, false);
    document.body.style.overflow = 'hidden';
    setTimeout(() => modalClose && modalClose.focus(), MODAL_OPEN_DELAY);
  };

  const closeModal = () => {
    modal.classList.remove('modal--open');
    setInert(modal, true);
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
      lastFocused = null;
    }
  };

  const openSuccessModal = () => {
    lastFocused = document.activeElement;
    successModal.classList.add('success-modal--open');
    setInert(successModal, false);
    document.body.style.overflow = 'hidden';
    setTimeout(() => successModalClose && successModalClose.focus(), MODAL_OPEN_DELAY);
  };

  const closeSuccessModal = () => {
    successModal.classList.remove('success-modal--open');
    setInert(successModal, true);
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
      lastFocused = null;
    }
  };

  /* Expose for the form module's success flow */
  window.__rubyhome = window.__rubyhome || {};
  window.__rubyhome.openModal = openModal;
  window.__rubyhome.closeModal = closeModal;
  window.__rubyhome.openSuccessModal = openSuccessModal;
  window.__rubyhome.closeSuccessModal = closeSuccessModal;

  /* Triggers — native <button> already fires click on Enter/Space (m-3 removes manual keydown) */
  document.querySelectorAll('.hero__button, .header__cta-btn, .property-card__btn').forEach((btn) => {
    btn.addEventListener('click', openModal);
  });

  if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (successModalOverlay) successModalOverlay.addEventListener('click', closeSuccessModal);
  if (successModalClose) successModalClose.addEventListener('click', closeSuccessModal);

  modal.addEventListener('keydown', (e) => trapFocus(modal, e));
  if (successModal) successModal.addEventListener('keydown', (e) => trapFocus(successModal, e));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modal.classList.contains('modal--open')) closeModal();
    if (successModal && successModal.classList.contains('success-modal--open')) closeSuccessModal();
  });

  /* Initialize closed dialogs as inert (C-3) */
  setInert(modal, true);
  if (successModal) setInert(successModal, true);
})();

/* ============================================
   FORM VALIDATION (shared validators — DRY, used by modal + CTA)
   ============================================ */
const validators = (() => {
  const validateName = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return { valid: false, error: 'Please enter your name' };
    if (trimmed.length < 2) return { valid: false, error: 'Name must be at least 2 characters' };
    if (!/^[a-zA-Zа-яА-ЯёЁ\s'-]+$/.test(trimmed)) return { valid: false, error: 'Name can only contain letters, spaces, hyphens and apostrophes' };
    return { valid: true, error: '' };
  };

  const validatePhone = (phone) => {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return { valid: false, error: 'Please enter your phone number' };
    if (digits.length < 10) return { valid: false, error: 'Phone number must be at least 10 digits' };
    if (digits.length > 15) return { valid: false, error: 'Phone number is too long' };
    return { valid: true, error: '' };
  };

  const validateEmail = (email) => {
    if (!email.trim()) return { valid: false, error: 'Please enter your email address' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return { valid: false, error: 'Please enter a valid email address' };
    return { valid: true, error: '' };
  };

  return { validateName, validatePhone, validateEmail };
})();

const formatPhoneNumber = (value) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `+${digits}`;
  if (digits.length <= 6) return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4)}`;
  if (digits.length <= 10) return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)} ${digits.slice(10)}`;
};

/* showError/clearError — set aria-invalid on inputs (accessibility), no unused boolean (q-5) */
const showError = (inputId, errorId, message) => {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) {
    input.classList.add('modal__input--error');
    input.setAttribute('aria-invalid', 'true');
  }
  if (error) error.textContent = message;
};

const clearError = (inputId, errorId) => {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) {
    input.classList.remove('modal__input--error');
    input.removeAttribute('aria-invalid');
  }
  if (error) error.textContent = '';
};

/* ============================================
   REQUEST FORM (modal) + Toggle Buy/Rent/Sell
   ============================================ */
(() => {
  const modalForm = document.getElementById('modalForm');
  const modalTypeHidden = document.getElementById('modalType');
  if (!modalForm) return;

  /* Toggle buttons Buy / Rent / Sell — native <button> (m-3 removes manual keydown) */
  const toggles = document.querySelectorAll('.modal__toggle');

  const setActiveToggle = (btn) => {
    toggles.forEach((b) => {
      b.classList.remove('modal__toggle--active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('modal__toggle--active');
    btn.setAttribute('aria-pressed', 'true');
    if (modalTypeHidden) modalTypeHidden.value = btn.dataset.value;
  };

  toggles.forEach((btn) => {
    btn.addEventListener('click', () => setActiveToggle(btn));
  });

  const validateModalForm = () => {
    let isValid = true;

    const name = document.getElementById('modalName');
    const nameValidation = validators.validateName(name.value);
    if (!nameValidation.valid) {
      showError('modalName', 'nameError', nameValidation.error);
      isValid = false;
    } else {
      clearError('modalName', 'nameError');
    }

    const phone = document.getElementById('modalPhone');
    const phoneValidation = validators.validatePhone(phone.value);
    if (!phoneValidation.valid) {
      showError('modalPhone', 'phoneError', phoneValidation.error);
      isValid = false;
    } else {
      clearError('modalPhone', 'phoneError');
    }

    const email = document.getElementById('modalEmail');
    const emailValidation = validators.validateEmail(email.value);
    if (!emailValidation.valid) {
      showError('modalEmail', 'emailError', emailValidation.error);
      isValid = false;
    } else {
      clearError('modalEmail', 'emailError');
    }

    const consent = document.getElementById('modalConsent');
    const consentError = document.getElementById('consentError');
    if (!consent.checked) {
      if (consentError) consentError.textContent = 'Please agree to the privacy policy';
      isValid = false;
    } else if (consentError) {
      consentError.textContent = '';
    }

    return isValid;
  };

  modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateModalForm()) return;

    /* Submit payload — production log removed (M-8) */
    modalForm.reset();

    /* form.reset() restores the hidden field and native state;
       re-apply the active "Buy" toggle only (D-3 removed the redundant manual reset). */
    const firstToggle = document.querySelector('.modal__toggle[data-value="buy"]');
    if (firstToggle) setActiveToggle(firstToggle);

    window.__rubyhome.closeModal();
    setTimeout(() => {
      window.__rubyhome.openSuccessModal();
      setTimeout(window.__rubyhome.closeSuccessModal, SUCCESS_AUTO_CLOSE_DELAY);
    }, SUCCESS_OPEN_DELAY);
  });

  /* Real-time validation for modal form fields */
  const modalName = document.getElementById('modalName');
  const modalPhone = document.getElementById('modalPhone');
  const modalEmail = document.getElementById('modalEmail');
  const modalConsent = document.getElementById('modalConsent');

  if (modalName) {
    modalName.addEventListener('input', () => {
      const validation = validators.validateName(modalName.value);
      if (!validation.valid && modalName.classList.contains('modal__input--error')) {
        showError('modalName', 'nameError', validation.error);
      } else if (validation.valid && modalName.classList.contains('modal__input--error')) {
        clearError('modalName', 'nameError');
      }
    });

    modalName.addEventListener('blur', () => {
      const validation = validators.validateName(modalName.value);
      if (!validation.valid) {
        showError('modalName', 'nameError', validation.error);
      } else {
        clearError('modalName', 'nameError');
      }
    });
  }

  if (modalPhone) {
    modalPhone.addEventListener('input', (e) => {
      const formatted = formatPhoneNumber(e.target.value);
      if (formatted !== e.target.value) e.target.value = formatted;

      const validation = validators.validatePhone(modalPhone.value);
      if (!validation.valid && modalPhone.classList.contains('modal__input--error')) {
        showError('modalPhone', 'phoneError', validation.error);
      } else if (validation.valid && modalPhone.classList.contains('modal__input--error')) {
        clearError('modalPhone', 'phoneError');
      }
    });

    modalPhone.addEventListener('blur', () => {
      const validation = validators.validatePhone(modalPhone.value);
      if (!validation.valid) {
        showError('modalPhone', 'phoneError', validation.error);
      } else {
        clearError('modalPhone', 'phoneError');
      }
    });
  }

  if (modalEmail) {
    modalEmail.addEventListener('input', () => {
      if (!modalEmail.value) return;
      const validation = validators.validateEmail(modalEmail.value);
      if (!validation.valid && modalEmail.classList.contains('modal__input--error')) {
        showError('modalEmail', 'emailError', validation.error);
      } else if (validation.valid && modalEmail.classList.contains('modal__input--error')) {
        clearError('modalEmail', 'emailError');
      }
    });

    modalEmail.addEventListener('blur', () => {
      if (!modalEmail.value) return;
      const validation = validators.validateEmail(modalEmail.value);
      if (!validation.valid) {
        showError('modalEmail', 'emailError', validation.error);
      } else {
        clearError('modalEmail', 'emailError');
      }
    });
  }

  if (modalConsent) {
    modalConsent.addEventListener('change', () => {
      const consentError = document.getElementById('consentError');
      if (!consentError) return;
      consentError.textContent = modalConsent.checked ? '' : 'Please agree to the privacy policy';
    });
  }
})();

/* ============================================
   SUCCESS TOAST (CTA feedback)
   ============================================ */
const showSuccessMessage = (message) => {
  const existing = document.querySelector('.success-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'success-toast';
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('success-toast--visible'));

  setTimeout(() => {
    toast.classList.remove('success-toast--visible');
    setTimeout(() => toast.remove(), TOAST_REMOVE_DELAY);
  }, TOAST_VISIBLE_DELAY);
};

/* ============================================
   CTA FORM
   ============================================ */
(() => {
  const ctaForm = document.getElementById('ctaForm');
  if (!ctaForm) return;

  const ctaEmail = document.getElementById('ctaEmail');
  if (!ctaEmail) return;

  const showCtaError = (message) => {
    let errorElement = ctaForm.querySelector('.cta__error');
    if (!errorElement) {
      errorElement = document.createElement('span');
      errorElement.className = 'cta__error';
      errorElement.setAttribute('role', 'alert');
      errorElement.setAttribute('aria-live', 'polite');
      ctaForm.appendChild(errorElement);
    }
    errorElement.textContent = message;
    ctaEmail.classList.add('cta__input--error');
    ctaEmail.setAttribute('aria-invalid', 'true');
  };

  const clearCtaError = () => {
    const errorElement = ctaForm.querySelector('.cta__error');
    if (errorElement) errorElement.textContent = '';
    ctaEmail.classList.remove('cta__input--error');
    ctaEmail.removeAttribute('aria-invalid');
  };

  ctaEmail.addEventListener('input', () => {
    if (!ctaEmail.value) {
      clearCtaError();
      return;
    }
    const validation = validators.validateEmail(ctaEmail.value);
    if (!validation.valid && ctaEmail.classList.contains('cta__input--error')) {
      showCtaError(validation.error);
    } else if (validation.valid && ctaEmail.classList.contains('cta__input--error')) {
      clearCtaError();
    }
  });

  ctaEmail.addEventListener('blur', () => {
    if (!ctaEmail.value) {
      clearCtaError();
      return;
    }
    const validation = validators.validateEmail(ctaEmail.value);
    if (!validation.valid) {
      showCtaError(validation.error);
    } else {
      clearCtaError();
    }
  });

  ctaForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const emailValidation = validators.validateEmail(ctaEmail.value);
    if (!emailValidation.valid) {
      showCtaError(emailValidation.error);
      ctaEmail.focus();
      return;
    }

    clearCtaError();
    /* production log removed (M-8) */
    ctaEmail.value = '';
    showSuccessMessage('Thank you! We will contact you soon.');
  });
})();

/* ============================================
   REVIEWS SLIDER
   Guarded: no-op on pages without slider (fixes B-1 / D-2).
   Carousel ARIA pattern (M-4): dots are plain buttons with aria-current.
   Keyboard arrows move focus to the new active dot (D-8).
   ============================================ */
(() => {
  const reviewsTrack = document.getElementById('reviewsTrack');
  const reviewsDots = document.getElementById('reviewsDots');
  const reviewCards = document.querySelectorAll('.review-card');

  if (!reviewsTrack || !reviewsDots || reviewCards.length === 0) return;

  let currentSlide = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragDeltaX = 0;
  let currentTranslateX = 0;

  const getCardsPerView = () => (window.innerWidth >= SLIDER_DESKTOP_BREAKPOINT ? 2 : 1);
  const getTotalPages = () => Math.max(1, Math.ceil(reviewCards.length / getCardsPerView()));

  const getCardWidth = () => {
    if (!reviewCards[0]) return 0;
    return reviewCards[0].offsetWidth + SLIDER_GAP;
  };

  const updateDots = () => {
    reviewsDots.querySelectorAll('.reviews__dot').forEach((dot, i) => {
      const isActive = i === currentSlide;
      dot.classList.toggle('reviews__dot--active', isActive);
      if (isActive) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
  };

  const goToSlide = (index) => {
    const total = getTotalPages();
    currentSlide = Math.max(0, Math.min(index, total - 1));
    const perView = getCardsPerView();
    currentTranslateX = -(currentSlide * perView * getCardWidth());
    reviewsTrack.style.transform = `translateX(${currentTranslateX}px)`;
    updateDots();
  };

  const focusActiveDot = () => {
    const active = reviewsDots.querySelector('.reviews__dot--active');
    if (active) active.focus();
  };

  const buildDots = () => {
    const total = getTotalPages();
    reviewsDots.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'reviews__dot' + (i === currentSlide ? ' reviews__dot--active' : '');
      dot.setAttribute('aria-label', `Go to review page ${i + 1} of ${total}`);
      if (i === currentSlide) dot.setAttribute('aria-current', 'true');

      dot.addEventListener('click', () => goToSlide(i));
      /* Only arrows need custom handling; Enter/Space fire natively as click (m-3). */
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          goToSlide(currentSlide + 1);
          focusActiveDot();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          goToSlide(currentSlide - 1);
          focusActiveDot();
        }
      });

      reviewsDots.appendChild(dot);
    }
  };

  buildDots();

  /* Drag — mouse */
  reviewsTrack.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragDeltaX = 0;
    reviewsTrack.classList.add('reviews__track--dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    dragDeltaX = e.clientX - dragStartX;
    reviewsTrack.style.transform = `translateX(${currentTranslateX + dragDeltaX}px)`;
  });

  const handleDragEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    reviewsTrack.classList.remove('reviews__track--dragging');
    if (dragDeltaX < -DRAG_THRESHOLD_MOUSE) goToSlide(currentSlide + 1);
    else if (dragDeltaX > DRAG_THRESHOLD_MOUSE) goToSlide(currentSlide - 1);
    else goToSlide(currentSlide);
    dragDeltaX = 0;
  };

  document.addEventListener('mouseup', handleDragEnd);
  document.addEventListener('mouseleave', handleDragEnd);

  /* Drag — touch (passive to keep page scroll, D-7) */
  reviewsTrack.addEventListener('touchstart', (e) => {
    dragStartX = e.touches[0].clientX;
    dragDeltaX = 0;
  }, { passive: true });

  reviewsTrack.addEventListener('touchmove', (e) => {
    dragDeltaX = e.touches[0].clientX - dragStartX;
    reviewsTrack.style.transform = `translateX(${currentTranslateX + dragDeltaX}px)`;
  }, { passive: true });

  reviewsTrack.addEventListener('touchend', () => {
    if (dragDeltaX < -DRAG_THRESHOLD_TOUCH) goToSlide(currentSlide + 1);
    else if (dragDeltaX > DRAG_THRESHOLD_TOUCH) goToSlide(currentSlide - 1);
    else goToSlide(currentSlide);
    dragDeltaX = 0;
  });

  /* Rebuild dots on resize (desktop↔mobile breakpoint) */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      buildDots();
      goToSlide(0);
    }, RESIZE_DEBOUNCE);
  });
})();

/* ============================================
   NAVIGATION — burger, smooth scroll, active link on scroll
   Guarded: no-op if burger / nav missing.
   ============================================ */
(() => {
  const burger = document.querySelector('.header__burger');
  const headerNav = document.getElementById('headerNav');
  if (!burger || !headerNav) return;

  const handleMenuToggle = () => {
    const isOpen = burger.classList.toggle('header__burger--active');
    headerNav.classList.toggle('header__nav--open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
  };

  const closeMenu = () => {
    burger.classList.remove('header__burger--active');
    headerNav.classList.remove('header__nav--open');
    burger.setAttribute('aria-expanded', 'false');
  };

  /* native <button> fires click on Enter/Space (m-3 removes manual keydown) */
  burger.addEventListener('click', handleMenuToggle);

  document.querySelectorAll('.header__nav-link').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  /* Smooth scroll — same-page hash anchors only */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* Active nav link on scroll */
  const navLinks = document.querySelectorAll('.header__nav-link');
  const sections = document.querySelectorAll('main section[id], header[id]');

  const handleScroll = () => {
    const scrollY = window.scrollY + SCROLL_OFFSET;

    sections.forEach((section) => {
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollY >= top && scrollY < bottom) {
        navLinks.forEach((link) => {
          link.classList.toggle(
            'header__nav-link--active',
            link.getAttribute('href') === `#${id}`
          );
        });
      }
    });
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
})();
