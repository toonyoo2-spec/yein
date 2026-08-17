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
