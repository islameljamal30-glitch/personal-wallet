/*!
 * Personal Wallet website motion.
 * Uses GSAP 3 (ScrollTrigger, SplitText; GSAP standard licence) and Lenis (MIT).
 * The scroll reveal, spotlight, shiny text, count-up and magnet effects are adapted from React Bits
 * (https://github.com/DavidHDev/react-bits), Copyright (c) 2026 David Haz, MIT + Commons Clause
 * Licence Condition v1.0; full text in assets/js/LICENSE-react-bits.txt.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var euro = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp01(v) { return Math.min(Math.max(v, 0), 1); }

  /* ---------- Things that work without GSAP ---------- */

  // Questions: an accessible accordion; height animates with a CSS grid transition (interruptible).
  $$("[data-faq] .qa__q").forEach(function (button) {
    button.addEventListener("click", function () {
      var item = button.closest(".qa");
      var open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!open));
      item.classList.toggle("is-open", !open);
    });
  });

  // Videos: play only while on screen, never with reduced motion, and always pausable (WCAG 2.2.2).
  var videos = $$("video.js-autoplay");
  videos.forEach(function (video) {
    var toggle = video.closest(".phone") && $("[data-video-toggle]", video.closest(".phone"));
    var userPaused = reduce;
    var visible = false;
    function sync() {
      var shouldPlay = visible && !userPaused && !document.hidden;
      if (shouldPlay && video.paused) {
        if (video.preload === "none") video.preload = "auto";
        var p = video.play();
        if (p && p.catch) p.catch(function () { setState(true); });
      } else if (!shouldPlay && !video.paused) {
        video.pause();
      }
      setState(!shouldPlay && userPaused);
    }
    function setState(paused) {
      if (!toggle) return;
      toggle.setAttribute("data-state", paused ? "paused" : "playing");
      toggle.setAttribute("aria-label", paused ? "Play video" : "Pause video");
    }
    if (toggle) {
      toggle.addEventListener("click", function () { userPaused = !userPaused; sync(); });
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        sync();
      }, { threshold: 0.35 }).observe(video);
    } else {
      visible = true;
      sync();
    }
    document.addEventListener("visibilitychange", sync);
    setState(userPaused);
  });

  // Nav: solid once you scroll; dark over the privacy section.
  var nav = $("[data-nav]");
  var night = $(".night");
  function navState() {
    if (!nav) return;
    var y = window.scrollY || window.pageYOffset;
    nav.classList.toggle("is-scrolled", y > 8);
    if (night) {
      var r = night.getBoundingClientRect();
      var navH = nav.offsetHeight;
      nav.classList.toggle("is-dark", r.top < navH && r.bottom > navH);
    }
  }
  window.addEventListener("scroll", navState, { passive: true });
  navState();

  /* ---------- Motion (GSAP) ---------- */

  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.add("failsafe");
    return;
  }
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);

  // Lenis smooth scrolling, driven by GSAP's ticker (respects reduced motion by default).
  var lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    lenis.on("scroll", ScrollTrigger.update);
    lenis.on("scroll", navState);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // In-page links: smooth with Lenis, move focus to the section for keyboard and screen reader users.
  $$('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var id = link.getAttribute("href");
      if (!id || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      var offset = -((nav && nav.offsetHeight) || 0) - 8;
      if (lenis) lenis.scrollTo(id === "#top" ? 0 : target, { offset: offset });
      else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      if (history.replaceState) history.replaceState(null, "", id);
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  });

  var EASE = "expo.out";

  /* Hero entrance: one lead (the headline lines rising from a mask), support (lead copy, facts) and the phone. */
  function hero() {
    var h1 = $(".hero [data-split]");
    var support = $$(".hero [data-hero]");
    var visual = $("[data-hero-visual]");
    var floats = $$(".hero .float-card");
    // Reduced motion: the hero is simply there (it is never hidden without the .motion class).
    if (reduce) return;
    var tl = gsap.timeline({ defaults: { ease: EASE } });
    gsap.set(h1, { opacity: 1 });
    var lines = null;
    if (window.SplitText) {
      var split = window.SplitText.create(h1, { type: "lines", mask: "lines", linesClass: "line", aria: "auto" });
      lines = split.lines;
    }
    var pill = support[0];
    var rest = support.slice(1);
    tl.fromTo(pill, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8 }, 0.05);
    if (lines) tl.fromTo(lines, { yPercent: 105 }, { yPercent: 0, duration: 1.15, stagger: 0.12 }, 0.12);
    else tl.fromTo(h1, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1 }, 0.12);
    tl.fromTo(rest, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, 0.45);
    tl.fromTo(visual, { opacity: 0, y: 70, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 1.4 }, 0.15);
    tl.fromTo(floats, { opacity: 0, y: 24, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 1, stagger: 0.14 }, 0.75);
  }

  /* Scroll reveal for big statements (adapted from React Bits ScrollReveal: per-word opacity and blur, scrubbed). */
  function scrollReveal(el) {
    var text = el.textContent.replace(/\s+/g, " ").trim();
    var highlight = el.hasAttribute("data-highlight");
    if (reduce) return;
    // Keep authored line breaks (<br>): rebuild the heading word by word, line by line.
    var lines = [[]];
    Array.prototype.forEach.call(el.childNodes, function (node) {
      if (node.nodeName === "BR") { lines.push([]); return; }
      node.textContent.split(/\s+/).forEach(function (w) { if (w) lines[lines.length - 1].push(w); });
    });
    el.setAttribute("aria-label", text);
    el.textContent = "";
    var pieces = [];
    lines.forEach(function (words, li) {
      words.forEach(function (word, i) {
        var span = document.createElement("span");
        span.className = "sr-word";
        span.setAttribute("aria-hidden", "true");
        span.textContent = word;
        el.appendChild(span);
        pieces.push(span);
        if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      });
      if (li < lines.length - 1) { el.appendChild(document.createTextNode(" ")); el.appendChild(document.createElement("br")); }
    });
    var base = highlight ? 0.12 : 0.14;
    var useBlur = window.innerWidth > 760;
    var span = 0.5, gap = 0.05;
    var total = span + (pieces.length - 1) * gap;
    var last = pieces.map(function () { return -1; });
    function paint(progress) {
      var at = progress * total;
      pieces.forEach(function (piece, i) {
        var t = clamp01((at - i * gap) / span);
        t = Math.round(t * 100) / 100;
        if (t === last[i]) return;
        last[i] = t;
        var eased = 1 - Math.pow(1 - t, 3);
        piece.style.opacity = t >= 1 ? "" : String(base + (1 - base) * eased);
        piece.style.filter = useBlur && t < 1 ? "blur(" + (4 * (1 - eased)).toFixed(2) + "px)" : "";
        if (highlight) piece.classList.toggle("is-hl", t > 0.02 && t < 0.98);
      });
    }
    paint(0);
    ScrollTrigger.create({
      trigger: el,
      start: "top 82%",
      end: highlight ? "bottom 52%" : "bottom 58%",
      scrub: 0.4,
      onUpdate: function (self) { paint(self.progress); },
      onRefresh: function (self) { paint(self.progress); }
    });
  }

  /* Generic reveals: one entrance per container, small offsets, ease-out. */
  function reveals() {
    // Reduced motion: content is shown as it is; only small interaction transitions remain (CSS).
    if (reduce) return;
    $$("[data-reveal]").forEach(function (el) {
      var children = el.children.length > 1 && el.classList.contains("sec-head") ? Array.prototype.slice.call(el.children) : [el];
      gsap.fromTo(children, { opacity: 0, y: 34 }, {
        opacity: 1, y: 0, duration: 1.1, ease: EASE, stagger: 0.1,
        scrollTrigger: { trigger: el, start: "top 86%", once: true }
      });
    });

    var cards = $$("[data-card]");
    gsap.set(cards, { opacity: 0, y: 40 });
    var showCards = function (batch) {
      gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: EASE, stagger: { each: 0.09, ease: "power1.in" }, overwrite: true });
    };
    // onLeave too, so cards above the viewport (a deep link or a reload mid-page) are never left hidden.
    ScrollTrigger.batch(cards, { start: "top 90%", onEnter: showCards, onLeave: showCards });

    $$("[data-reveal-phone]").forEach(function (phone) {
      gsap.fromTo(phone, { opacity: 0, y: 60, scale: 0.97 }, {
        opacity: 1, y: 0, scale: 1, duration: 1.3, ease: EASE,
        scrollTrigger: { trigger: phone, start: "top 85%", once: true }
      });
    });
  }

  /* The money ribbon: the bar draws left to right, then the amounts roll up to the app's real numbers. */
  function ribbon() {
    var box = $("[data-ribbon]");
    if (!box) return;
    var bar = $(".ribbon__bar", box);
    var counters = $$("[data-count]", box.closest(".ribbon-sec"));
    var items = $$(".ribbon__legend li", box);
    function format(el, value) { el.textContent = euro.format(value); }
    if (reduce) return;
    counters.forEach(function (el) { format(el, 0); });
    gsap.set(bar, { clipPath: "inset(0 100% 0 0 round 999px)" });
    gsap.set(items, { opacity: 0, y: 14 });
    var tl = gsap.timeline({ paused: true });
    tl.to(bar, { clipPath: "inset(0 0% 0 0 round 999px)", duration: 1.6, ease: "power3.inOut" }, 0);
    tl.to(items, { opacity: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.12 }, 0.35);
    counters.forEach(function (el, i) {
      var target = parseFloat(el.getAttribute("data-count"));
      var state = { v: 0 };
      tl.to(state, {
        v: target, duration: 1.7, ease: "power3.out",
        onUpdate: function () { format(el, state.v); },
        onComplete: function () { format(el, target); }
      }, i === 0 ? 0 : 0.35 + (i - 1) * 0.12);
    });
    ScrollTrigger.create({ trigger: box, start: "top 78%", once: true, onEnter: function () { tl.play(); } });
  }

  /* How it works: the sticky phone swaps screens as each step reaches the middle of the screen. */
  function steps() {
    var mm = gsap.matchMedia();
    mm.add("(min-width: 961px)", function () {
      var stage = $(".how__stage");
      var screens = $$(".how__screen", stage);
      var items = $$(".step");
      var fill = $("[data-progress]");
      function setActive(index) {
        items.forEach(function (s, i) { s.classList.toggle("is-active", i === index); });
        screens.forEach(function (s, i) { s.classList.toggle("is-active", i === index); });
      }
      setActive(0);
      var triggers = items.map(function (step, i) {
        return ScrollTrigger.create({
          trigger: step, start: "top 55%", end: "bottom 55%",
          onToggle: function (self) { if (self.isActive) setActive(i); }
        });
      });
      var tween = gsap.fromTo(fill, { scaleY: 0.02 }, {
        scaleY: 1, ease: "none",
        scrollTrigger: { trigger: ".how__steps", start: "top 55%", end: "bottom 55%", scrub: 0.3 }
      });
      return function () { triggers.forEach(function (t) { t.kill(); }); tween.kill(); items.forEach(function (s) { s.classList.remove("is-active"); }); };
    });
    mm.add("(max-width: 960px)", function () {
      $$(".step").forEach(function (step) { step.classList.add("is-active"); });
      if (reduce) return;
      var phones = $$(".step__phone");
      var tweens = phones.map(function (phone) {
        return gsap.fromTo(phone, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.1, ease: EASE, scrollTrigger: { trigger: phone, start: "top 88%", once: true } });
      });
      return function () { tweens.forEach(function (t) { t.kill(); }); };
    });
  }

  /* Gentle depth on scroll: decoration only (floating cards, screenshots in cards, the hero phone). */
  function parallax() {
    if (reduce) return;
    var mm = gsap.matchMedia();
    mm.add("(min-width: 961px)", function () {
      $$("[data-float]").forEach(function (el) {
        var amount = parseFloat(el.getAttribute("data-float")) || 10;
        gsap.fromTo(el, { yPercent: amount }, { yPercent: -amount, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
      });
      gsap.to("[data-phone]", { yPercent: -6, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
      $$(".card__shot img").forEach(function (img) {
        gsap.fromTo(img, { y: 26 }, { y: -10, ease: "none", scrollTrigger: { trigger: img.closest(".card"), start: "top bottom", end: "bottom top", scrub: true } });
      });
    });
  }

  /* Privacy: the deepest room; its Bordeaux glow opens up as the section arrives. */
  function nightFall() {
    var section = $(".night");
    if (!section || reduce) return;
    var glow = $(".night__glow", section);
    gsap.fromTo(glow, { scale: 0.7, opacity: 0.4 }, { scale: 1.1, opacity: 1, ease: "none", scrollTrigger: { trigger: section, start: "top 80%", end: "center center", scrub: true } });
  }

  /* Spotlight tiles (adapted from React Bits SpotlightCard): a soft light that follows the pointer, smoothed. */
  function spotlights() {
    if (!finePointer || reduce) return;
    $$("[data-spotlight]").forEach(function (card) {
      var x = 0, y = 0, tx = 0, ty = 0, presence = 0, target = 0, raf = 0, last = 0;
      function tick(now) {
        raf = 0;
        var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
        last = now;
        var follow = 1 - Math.exp(-dt / 0.08);
        x += (tx - x) * follow;
        y += (ty - y) * follow;
        presence += (target - presence) * (1 - Math.exp(-dt / (target > presence ? 0.1 : 0.3)));
        card.style.setProperty("--mx", x.toFixed(1) + "px");
        card.style.setProperty("--my", y.toFixed(1) + "px");
        card.style.setProperty("--spot", presence.toFixed(3));
        if (Math.abs(tx - x) > 0.2 || Math.abs(ty - y) > 0.2 || Math.abs(target - presence) > 0.003) raf = requestAnimationFrame(tick);
      }
      function wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
      card.addEventListener("pointerenter", function (e) {
        var r = card.getBoundingClientRect();
        x = tx = e.clientX - r.left; y = ty = e.clientY - r.top; target = 1; wake();
      });
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top; wake();
      });
      card.addEventListener("pointerleave", function () { target = 0; wake(); });
    });
  }

  /* The closing icon leans toward the pointer (adapted from React Bits Magnet), springing back when it leaves. */
  function magnet() {
    var el = $("[data-magnet]");
    if (!el || !finePointer || reduce) return;
    var xTo = gsap.quickTo(el, "x", { duration: 0.7, ease: "power3.out" });
    var yTo = gsap.quickTo(el, "y", { duration: 0.7, ease: "power3.out" });
    var rTo = gsap.quickTo(el, "rotation", { duration: 0.9, ease: "power3.out" });
    var reach = 170;
    window.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      var d = Math.hypot(dx, dy);
      if (d < reach) { xTo(dx * 0.22); yTo(dy * 0.22); rTo(dx * 0.03); }
      else { xTo(0); yTo(0); rTo(0); }
    }, { passive: true });
  }

  function start() {
    hero();
    $$("[data-scroll-reveal]").forEach(scrollReveal);
    reveals();
    ribbon();
    steps();
    parallax();
    nightFall();
    spotlights();
    magnet();
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }

  if (document.fonts && document.fonts.ready) {
    var started = false;
    var go = function () { if (!started) { started = true; start(); } };
    document.fonts.ready.then(go);
    window.setTimeout(go, 1200);
  } else {
    start();
  }
})();
