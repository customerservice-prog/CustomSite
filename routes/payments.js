'use strict';

const express = require('express');
const Stripe = require('stripe');

const { getService } = require('../lib/supabase');
const { sendPaymentConfirmation } = require('../lib/email');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

const BUILD_PRICES = () => ({
  starter: process.env.STRIPE_PRICE_BUILD_STARTER,
  business: process.env.STRIPE_PRICE_BUILD_BUSINESS,
  ecommerce: process.env.STRIPE_PRICE_BUILD_ECOMMERCE,
});

const MAINT_PRICES = () => ({
  starter: process.env.STRIPE_PRICE_MAINT_STARTER_MONTHLY,
  business: process.env.STRIPE_PRICE_MAINT_BUSINESS_MONTHLY,
  ecommerce: process.env.STRIPE_PRICE_MAINT_ECOMMERCE_MONTHLY,
});

function siteUrl() {
  return process.env.PUBLIC_SITE_URL || 'http://localhost:3000';
}

router.post('/create-checkout', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    const { planId, invoiceId } = req.body || {};
    const allowed = ['starter', 'business', 'ecommerce'];
    if (!planId || !allowed.includes(planId)) {
      return res.status(400).json({ error: 'planId must be starter, business, or ecommerce' });
    }

    const prices = BUILD_PRICES();
    const priceId = prices[planId];
    if (!priceId) {
      return res.status(503).json({ error: `Missing Stripe price env for build plan: ${planId}` });
    }

    const metadata = {
      kind: 'build',
      planId,
    };

    if (invoiceId) {
      metadata.invoice_id = String(invoiceId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl()}/pricing.html?paid=1`,
      cancel_url: `${siteUrl()}/pricing.html?cancelled=1`,
      metadata,
      customer_creation: 'always',
    });

    return res.json({ url: session.url, id: session.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Checkout failed' });
  }
});

router.post('/create-subscription', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    const { planId } = req.body || {};
    const allowed = ['starter', 'business', 'ecommerce'];
    if (!planId || !allowed.includes(planId)) {
      return res.status(400).json({ error: 'planId must be starter, business, or ecommerce' });
    }

    const prices = MAINT_PRICES();
    const priceId = prices[planId];
    if (!priceId) {
      return res.status(503).json({
        error: `Missing monthly maintenance Stripe price for plan: ${planId}. Set STRIPE_PRICE_MAINT_* env vars.`,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl()}/pricing.html?subscribed=1`,
      cancel_url: `${siteUrl()}/pricing.html?cancelled=1`,
      metadata: {
        kind: 'maintenance',
        planId,
      },
    });

    return res.json({ url: session.url, id: session.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Subscription checkout failed' });
  }
});

router.get('/status/:invoiceId', requireAuth, async (req, res) => {
  try {
    const supabase = getService();
    const { data: inv, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', req.params.invoiceId)
      .single();

    if (error || !inv) return res.status(404).json({ error: 'Invoice not found' });

    if (req.profile.role !== 'admin' && inv.client_id !== req.profile.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({ invoice: inv });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

async function handleWebhook(req, res) {
  const stripe = getStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !whSecret) {
    return res.status(503).send('Stripe webhook not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], whSecret);
  } catch (err) {
    console.error('Webhook signature', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const supabase = getService();

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const meta = session.metadata || {};
      const invoiceId = meta.invoice_id;

      if (invoiceId) {
        const { error } = await supabase
          .from('invoices')
          .update({
            status: 'paid',
            stripe_payment_id: session.payment_intent || session.id,
          })
          .eq('id', invoiceId);

        if (error) console.error('invoice update', error);
      }

      const email =
        session.customer_details?.email ||
        session.customer_email ||
        null;

      const amountTotal = session.amount_total != null ? session.amount_total / 100 : null;

      if (email && amountTotal != null) {
        try {
          await sendPaymentConfirmation(
            email,
            `$${amountTotal.toFixed(2)}`,
            meta.planId ? `Plan: ${meta.planId}` : ''
          );
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (event.type === 'invoice.paid') {
      const inv = event.data.object;
      const stripeInvoiceId = inv.id;
      const { data: rows } = await supabase
        .from('invoices')
        .select('id')
        .eq('stripe_payment_id', stripeInvoiceId)
        .limit(1);

      if (rows && rows[0]) {
        await supabase
          .from('invoices')
          .update({ status: 'paid' })
          .eq('id', rows[0].id);
      }
    }
  } catch (e) {
    console.error(e);
  }

  return res.json({ received: true });
}

module.exports = { router, handleWebhook };
