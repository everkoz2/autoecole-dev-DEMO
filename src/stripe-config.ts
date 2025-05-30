export const products = {
  forfait_5h: {
    priceId: 'price_1RSSCMBCORAXdXPVaXIxq507',
    name: 'Forfait 5h',
    description: '5 heures de conduite',
    mode: 'payment' as const,
  },
  forfait_20h: {
    priceId: 'price_1RSSx0BCORAXdXPVM76ep5Qw', // Remplacez par l'ID du prix créé dans Stripe
    name: 'Forfait 20h',
    description: '20 heures de conduite',
    mode: 'payment' as const,
  },
  forfait_test: {
    priceId: 'price_1RST4UBCORAXdXPVNX13rkQr', // Remplacez par l'ID du prix créé dans Stripe
    name: 'Forfait test',
    description: 'test',
    mode: 'payment' as const,
  },
} as const;
