/**
 * Ordered section template ids for full documents.
 * Each id must exist in `buildSectionByTemplateId` (section-catalog).
 */

/** Full homepage: conversion journey top → bottom. */
export const HOMEPAGE_BLUEPRINT: readonly string[] = [
  'hero-main',
  'trust-bar',
  'services-grid',
  'bundles',
  'comparison',
  'testimonials',
  'faq',
  'cta-main',
  'footer',
];

/** Single-offer landing interior (no nav). */
export const INTERIOR_LANDING_BLUEPRINT: readonly string[] = [
  'interior-hero',
  'problem',
  'solution',
  'proof-row',
  'offer-cards',
  'faq-compact',
  'cta-compact',
];

/** Service / detail interior. */
export const INTERIOR_SERVICE_BLUEPRINT: readonly string[] = [
  'interior-hero',
  'problem',
  'service-detail',
  'process',
  'proof-row',
  'cta-compact',
];
