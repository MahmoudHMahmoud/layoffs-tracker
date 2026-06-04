// ============================================
// ANIMATIONS — Counters, observers, transitions
// ============================================

export function animateCounter(element, target, duration = 1200, prefix = '', suffix = '') {
  if (!element) return;
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
    const current = Math.round(start + (target - start) * eased);
    element.textContent = prefix + current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

export function animateCounterFloat(element, target, duration = 1200, prefix = '', suffix = '', decimals = 1) {
  if (!element) return;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    const current = (target * eased).toFixed(decimals);
    element.textContent = prefix + current + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

export function observeElements(selector, callback, options = {}) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry.target);
        if (!options.repeat) observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: options.threshold || 0.1,
    rootMargin: options.rootMargin || '0px'
  });

  document.querySelectorAll(selector).forEach(el => observer.observe(el));
  return observer;
}

export function staggerChildren(parent, delay = 80) {
  if (!parent) return;
  const children = parent.children;
  Array.from(children).forEach((child, i) => {
    child.style.opacity = '0';
    child.style.transform = 'translateY(16px)';
    child.style.transition = `opacity 0.4s ease ${i * delay}ms, transform 0.4s ease ${i * delay}ms`;
    requestAnimationFrame(() => {
      child.style.opacity = '1';
      child.style.transform = 'translateY(0)';
    });
  });
}

export function fadeIn(element, duration = 300) {
  if (!element) return;
  element.style.opacity = '0';
  element.style.transition = `opacity ${duration}ms ease`;
  requestAnimationFrame(() => { element.style.opacity = '1'; });
}
