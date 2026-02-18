"use client";

/**
 * Detects if the current browser is Safari (including iOS Safari).
 * This is useful for handling Safari-specific quirks like popup blocking
 * or third-party cookie restrictions.
 */
export function isSafari(): boolean {
    if (typeof window === 'undefined') return false;

    const ua = window.navigator.userAgent.toLowerCase();

    // Check for iOS devices (iPhone, iPad, iPod)
    const isIos = /ipad|iphone|ipod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Check for Safari browser (but not Chrome/Chromium-based)
    const isSafariBrowser = ua.indexOf('safari') !== -1 &&
        ua.indexOf('chrome') === -1 &&
        ua.indexOf('crios') === -1 &&  // Chrome on iOS
        ua.indexOf('fxios') === -1;    // Firefox on iOS

    console.log('🔍 Browser Detection:', {
        userAgent: ua,
        isIos,
        isSafariBrowser,
        result: isSafariBrowser || isIos
    });

    return isSafariBrowser || isIos;
}