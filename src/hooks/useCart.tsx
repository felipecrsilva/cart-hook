import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyExistsInCart = cart.find(product => product.id === productId)

      if (!productAlreadyExistsInCart) {
        const { data: product } = await api.get<Product>(`/products/${productId}`)
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`)

        if (stock.amount > 0) {
          setCart([ ...cart, { ...product, amount: 1 } ])
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([ ...cart, { ...product, amount: 1 } ]))
          toast.success('Adicionado ao carrinho')

          return;
        }
      }

      if (productAlreadyExistsInCart) {
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`)

        if (stock.amount > productAlreadyExistsInCart.amount) {
          const updateCart = cart.map(product => product.id === productId ? {
            ...product,
            amount: Number(product.amount) + 1
          } : product)

          setCart(updateCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart))
          toast.success('Adicionado ao carrinho')

          return;
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updateCart = cart.filter(product => product.id !== productId)
      setCart(updateCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart))
      toast.success('Produto removido');
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const { data } = await api.get<Stock>(`/stock/${productId}`)
      const productAmount = data.amount

      if (amount > productAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const productAlreadyExists = cart.some(product => product.id === productId)
      if (!productAlreadyExists) {
        toast.error('Erro na alteração de quantidade do produto');
        return;  
      }

      const updateCart = cart.map(product => product.id === productId ? {
        ...product,
        amount
      } : product)
      setCart(updateCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
