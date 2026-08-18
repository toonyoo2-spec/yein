(function () {
  "use strict";

  // Always start at the top of the page, ignoring any restored scroll
  // position or a #hash in the URL (e.g. a shared/bookmarked #leadform link).
  // Skips once the visitor has actually started interacting, so it never
  // yanks a scrolling user back to the top.
  var userInteracted = false;
  ["touchstart", "wheel", "keydown"].forEach(function (evt) {
    window.addEventListener(
      evt,
      function () {
        userInteracted = true;
      },
      { passive: true }
    );
  });

  function forceScrollTop() {
    if (userInteracted) return;
    window.scrollTo(0, 0);
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }
  forceScrollTop();
  window.addEventListener("load", forceScrollTop);
  // Covers mobile browsers restoring the page from bfcache (tab switch /
  // back-forward) without firing "load" again.
  window.addEventListener("pageshow", forceScrollTop);
  // Covers late native anchor-scroll on mobile (e.g. after the address bar
  // collapses and the layout is recalculated).
  setTimeout(forceScrollTop, 300);
  setTimeout(forceScrollTop, 1000);

  // Mobile nav toggle
  var navToggle = document.getElementById("navToggle");
  var mobileNav = document.getElementById("mobileNav");

  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      mobileNav.classList.toggle("open");
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileNav.classList.remove("open");
      });
    });
  }

  // Scroll reveal
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("in-view");
    });
  }

  // 5-step carousel — auto-slides left-to-right, and can also be
  // dragged/scrolled by hand (mouse drag or native touch scroll).
  var stepTrack = document.querySelector(".step-track");
  if (stepTrack) {
    var stepPeriod = 1800; // width of one full card-set (5 cards x 340px + 5 gaps x 20px)
    var stepSpeed = stepPeriod / 34000; // px per ms, matches the previous 34s loop

    // Duplicate the real cards once more so there are 3 full sets in a row
    // (real + existing dup + this clone). That gives enough buffer on both
    // sides to scroll/drag either direction and wrap seamlessly.
    var realStepCards = stepTrack.querySelectorAll(":scope > .step-card");
    realStepCards.forEach(function (card) {
      var clone = card.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      stepTrack.appendChild(clone);
    });

    // Start in the middle set so there's room to drag/scroll left.
    stepTrack.scrollLeft = stepPeriod;

    var stepInteracting = false;
    var stepHovering = false;
    var stepResumeTimer = null;
    var stepLastTs = null;
    var stepDragStartX = 0;
    var stepDragStartScroll = 0;
    var stepDragged = false;

    function wrapStepScroll() {
      if (stepTrack.scrollLeft <= 0) {
        stepTrack.scrollLeft += stepPeriod;
      } else if (stepTrack.scrollLeft >= stepPeriod * 2) {
        stepTrack.scrollLeft -= stepPeriod;
      }
    }

    function stepTick(ts) {
      if (stepLastTs === null) stepLastTs = ts;
      var dt = ts - stepLastTs;
      stepLastTs = ts;
      if (!stepInteracting && !stepHovering) {
        stepTrack.scrollLeft += stepSpeed * dt;
      }
      wrapStepScroll();
      requestAnimationFrame(stepTick);
    }
    requestAnimationFrame(stepTick);

    function scheduleResume() {
      if (stepResumeTimer) clearTimeout(stepResumeTimer);
      stepResumeTimer = setTimeout(function () {
        stepInteracting = false;
      }, 900);
    }

    // Mouse drag-to-scroll (desktop)
    stepTrack.addEventListener("mousedown", function (e) {
      stepInteracting = true;
      stepDragged = false;
      stepTrack.classList.add("dragging");
      stepDragStartX = e.pageX;
      stepDragStartScroll = stepTrack.scrollLeft;
      if (stepResumeTimer) clearTimeout(stepResumeTimer);
    });
    window.addEventListener("mousemove", function (e) {
      if (!stepTrack.classList.contains("dragging")) return;
      var dx = e.pageX - stepDragStartX;
      if (Math.abs(dx) > 3) stepDragged = true;
      stepTrack.scrollLeft = stepDragStartScroll - dx;
    });
    window.addEventListener("mouseup", function () {
      if (!stepTrack.classList.contains("dragging")) return;
      stepTrack.classList.remove("dragging");
      scheduleResume();
    });
    stepTrack.addEventListener(
      "click",
      function (e) {
        if (stepDragged) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );

    // Touch scroll / hover — just pause the auto-slide while the visitor
    // is actually interacting, native scrolling handles the rest.
    stepTrack.addEventListener(
      "touchstart",
      function () {
        stepInteracting = true;
        if (stepResumeTimer) clearTimeout(stepResumeTimer);
      },
      { passive: true }
    );
    stepTrack.addEventListener(
      "touchend",
      function () {
        scheduleResume();
      },
      { passive: true }
    );
    stepTrack.addEventListener("mouseenter", function () {
      stepHovering = true;
    });
    stepTrack.addEventListener("mouseleave", function () {
      stepHovering = false;
    });
  }

  // Back-to-top button
  var toTopBtn = document.getElementById("toTopBtn");
  if (toTopBtn) {
    function updateToTopBtn() {
      if (window.scrollY > 480) {
        toTopBtn.classList.add("visible");
      } else {
        toTopBtn.classList.remove("visible");
      }
    }
    updateToTopBtn();
    window.addEventListener("scroll", updateToTopBtn, { passive: true });
    toTopBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Before/After image lightbox
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxClose = document.getElementById("lightboxClose");
  var baImages = document.querySelectorAll(".ba-images img");

  function openLightbox(img) {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.classList.add("open");
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    lightboxImg.src = "";
  }

  if (lightbox && lightboxImg && lightboxClose && baImages.length) {
    baImages.forEach(function (img) {
      img.addEventListener("click", function () {
        openLightbox(img);
      });
    });

    lightboxImg.addEventListener("click", closeLightbox);
    lightboxClose.addEventListener("click", closeLightbox);
  }

  // Lead form — submits to FormSubmit.co, which emails the inquiry to the office
  var leadForm = document.getElementById("leadForm");
  var formMsg = document.getElementById("formMsg");
  var LEAD_EMAIL = "0404ksks@naver.com";

  if (leadForm && formMsg) {
    leadForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var submitBtn = leadForm.querySelector("button[type=submit]");
      if (submitBtn) submitBtn.disabled = true;

      fetch("https://formsubmit.co/ajax/" + LEAD_EMAIL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          접수자성함: leadForm.name.value,
          연락처: leadForm.phone.value,
          지역: leadForm.region.value,
          문의내용: leadForm.message.value,
          _subject: "[예인건설산업] 새 무료 견적 문의가 접수되었습니다",
        }),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("submit failed");
          formMsg.classList.remove("error");
          formMsg.classList.add("success");
          formMsg.textContent =
            "감사합니다! 접수가 완료되었습니다. 빠른 시간 내에 연락드리겠습니다.";
          leadForm.reset();
        })
        .catch(function () {
          formMsg.classList.remove("success");
          formMsg.classList.add("error");
          formMsg.textContent =
            "전송에 실패했습니다. 전화(010-8257-0404)로 문의해 주세요.";
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
          formMsg.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
    });
  }
})();
