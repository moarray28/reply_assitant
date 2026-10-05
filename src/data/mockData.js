export const brands = [
  { id: 'brand-glowcare', name: 'GlowCare' },
  { id: 'brand-purebottle', name: 'PureBottle' },
]

export const knowledgeByBrand = {
  'brand-glowcare': [
    { id: 'k1', category: 'Damaged Products', title: 'Damaged Products', content: 'Customers should report damaged products within 14 days of delivery. Eligible damaged products can be replaced according to policy.' },
    { id: 'k2', category: 'Returns', title: 'Returns', content: 'Returns are accepted within 30 days of delivery, subject to applicable conditions.' },
    { id: 'k3', category: 'Refunds', title: 'Refunds', content: 'Eligible refunds are generally processed within 7 business days after approval.' },
    { id: 'k4', category: 'Shipping', title: 'Shipping', content: 'Standard shipping generally takes 3-5 business days.' },
    { id: 'k5', category: 'Cancellation', title: 'Cancellation', content: 'Orders can be cancelled before shipment.' },
  ],
  'brand-purebottle': [
    { id: 'k6', category: 'Damaged Products', title: 'Damaged Products', content: 'Damaged products must be reported within 48 hours of delivery.' },
    { id: 'k7', category: 'Returns', title: 'Returns', content: 'Returns are accepted within 14 days of delivery, subject to applicable conditions.' },
    { id: 'k8', category: 'Refunds', title: 'Refunds', content: 'Eligible refunds are generally processed within 3 business days after approval.' },
    { id: 'k9', category: 'Shipping', title: 'Shipping', content: 'Standard shipping generally takes 5-7 business days.' },
    { id: 'k10', category: 'Cancellation', title: 'Cancellation', content: 'Orders can generally be cancelled within 1 hour of placing the order.' },
  ],
}

export const conversations = [
  {
    id: 'conv-1001',
    brandId: 'brand-glowcare',
    customerName: 'Sarah Miller',
    orderId: 'GC-1001',
    status: 'Delivered',
    messages: [
      { id: 'm1', sender: 'customer', content: 'My order was delivered but the bottle is broken. What can I do?' },
      { id: 'm2', sender: 'agent', content: 'I am checking the damaged product policy for your order.' },
    ],
  },
  {
    id: 'conv-1002',
    brandId: 'brand-purebottle',
    customerName: 'David Chen',
    orderId: 'PB-2205',
    status: 'In Transit',
    messages: [
      { id: 'm3', sender: 'customer', content: 'Can I still cancel my order if it has not shipped yet?' },
      { id: 'm4', sender: 'agent', content: 'Let me verify the order cancellation policy.' },
    ],
  },
  {
    id: 'conv-1003',
    brandId: 'brand-glowcare',
    customerName: 'Priya Shah',
    orderId: 'GC-1002',
    status: 'Delivered',
    messages: [
      { id: 'm5', sender: 'customer', content: 'I received my package and want to return it. What is the return window?' },
      { id: 'm6', sender: 'agent', content: 'I will check the return policy for your order.' },
    ],
  },
  {
    id: 'conv-1004',
    brandId: 'brand-purebottle',
    customerName: 'Marcus Lee',
    orderId: 'PB-2206',
    status: 'Processing',
    messages: [
      { id: 'm7', sender: 'customer', content: 'How long does shipping usually take for my order?' },
      { id: 'm8', sender: 'agent', content: 'I am checking the shipping details.' },
    ],
  },
  {
    id: 'conv-1005',
    brandId: 'brand-glowcare',
    customerName: 'Emma Johnson',
    orderId: 'GC-1003',
    status: 'Shipped',
    messages: [
      { id: 'm9', sender: 'customer', content: 'I want to cancel my order before shipment. Is that possible?' },
      { id: 'm10', sender: 'agent', content: 'Let me confirm the cancellation policy.' },
    ],
  },
  {
    id: 'conv-1006',
    brandId: 'brand-purebottle',
    customerName: 'Sarah Miller',
    orderId: 'PB-2207',
    status: 'Delivered',
    messages: [
      { id: 'm11', sender: 'customer', content: 'I need help with a custom issue that is not covered by the policy list.' },
      { id: 'm12', sender: 'agent', content: 'I will verify the available policy information first.' },
    ],
  },
  {
    id: 'conv-1007',
    brandId: 'brand-purebottle',
    customerName: 'Nina Patel',
    orderId: 'PB-2208',
    status: 'Delivered',
    messages: [
      { id: 'm13', sender: 'customer', content: 'When will my refund be processed?' },
      { id: 'm14', sender: 'agent', content: 'I will check the refund timeline for you.' },
    ],
  },
]
