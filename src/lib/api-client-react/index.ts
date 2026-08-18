import { useMutation, useQuery } from '@tanstack/react-query';

export type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  reference: string;
  customerName: string;
  phone: string;
  location: string;
  address: string;
  notes?: string;
  total: number;
  items: OrderItem[];
  status: string;
  createdAt: string;
};

let authTokenGetter: (() => Promise<string | null>) | null = null;

export const setAuthTokenGetter = (getter: (() => Promise<string | null>) | null) => {
  authTokenGetter = getter;
};

export const getListMyOrdersQueryKey = () => ['my-orders'];

export const useListMyOrders = () => {
  return useQuery<Order[]>({
    queryKey: getListMyOrdersQueryKey(),
    queryFn: async () => {
      // محاكاة استرجاع الطلبات من التخزين المحلي
      const stored = localStorage.getItem('mwd_orders');
      return stored ? JSON.parse(stored) : [];
    },
  });
};

export const useCreateOrder = () => {
  return useMutation({
    mutationFn: async ({ data }: { data: Omit<Order, 'id' | 'reference' | 'status' | 'createdAt'> }) => {
      // محاكاة إنشاء طلب جديد وحفظه في التخزين المحلي
      const newOrder: Order = {
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        reference: `MWD-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      
      const stored = localStorage.getItem('mwd_orders');
      const orders = stored ? JSON.parse(stored) : [];
      orders.unshift(newOrder);
      localStorage.setItem('mwd_orders', JSON.stringify(orders));
      
      return newOrder;
    },
  });
};
