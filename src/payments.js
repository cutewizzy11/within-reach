// Payment adapter.
//
// This app NEVER receives, stores or logs card numbers. Real card payments must go through a hosted
// payment page (for example Stripe Checkout or Adyen Drop-in), which keeps this server out of PCI DSS scope
// beyond SAQ A. See docs/PAYMENTS.md for the integration steps.
//
// A provider exposes:
//   methods                    list shown as radio buttons at checkout
//   begin(order, ctx)          returns { redirectTo } for hosted pages, or { paid: boolean, reference }
//
// The shipped `demo` provider takes no money. It exists so the whole flow can be exercised end to end.

const demo = {
  name: 'demo',
  methods: [
    { id: 'demo', label: 'Demo payment', help: 'No card details are needed and no money is taken.' },
    { id: 'invoice', label: 'Pay by invoice', help: 'We send an invoice with your order. Pay within 14 days by bank transfer. Nothing to type in today.' },
  ],
  async begin(order) {
    return { paid: order.payment_method === 'demo', reference: `demo-${order.number}` };
  },
};

export function getPaymentProvider(/* config */) {
  return demo;
}
