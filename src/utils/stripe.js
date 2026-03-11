import { loadStripe } from '@stripe/stripe-js';
import { envConfig } from '@/env_config';

let stripePromise;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(envConfig.getConfigStripKey());
  }
  return stripePromise;
};

export default getStripe;
